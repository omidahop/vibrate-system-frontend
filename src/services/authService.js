import { supabase, supabaseHelpers, handleSupabaseError, TABLES } from './supabaseClient.js';
import { storageUtils } from '../utils/helpers.js';
import { APP_CONFIG } from '../utils/constants.js';
import { validators } from '../utils/validations.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.currentUserProfile = null;
        this.authListeners = [];
        this.isInitialized = false;
        
        // Initialize auth state
        this.initialize();
    }

    async initialize() {
        try {
            // Check existing session
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;

            if (session?.user) {
                await this.setCurrentUser(session.user);
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);
                
                switch (event) {
                    case 'SIGNED_IN':
                        if (session?.user) {
                            await this.setCurrentUser(session.user);
                            this.notifyAuthListeners('SIGNED_IN', session.user);
                        }
                        break;
                    case 'SIGNED_OUT':
                        this.clearCurrentUser();
                        this.notifyAuthListeners('SIGNED_OUT', null);
                        break;
                    case 'TOKEN_REFRESHED':
                        console.log('Token refreshed successfully');
                        break;
                    case 'USER_UPDATED':
                        if (session?.user) {
                            await this.setCurrentUser(session.user);
                            this.notifyAuthListeners('USER_UPDATED', session.user);
                        }
                        break;
                }
            });

            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing auth service:', error);
        }
    }

    // Register new user with invite token
    async register(userData) {
        try {
            // Validate input data
            validators.user.name(userData.fullName);
            validators.user.email(userData.email);
            validators.user.password(userData.password);
            validators.user.role(userData.role);
            validators.invite.token(userData.inviteToken);

            // First validate invite token
            const inviteValidation = await this.validateInviteToken(userData.inviteToken);
            if (!inviteValidation.valid) {
                throw new Error(inviteValidation.message);
            }

            // Register user with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        full_name: userData.fullName,
                        role: userData.role,
                        invite_token: userData.inviteToken
                    }
                }
            });

            if (authError) throw authError;
            
            if (!authData.user) {
                throw new Error('خطا در ایجاد حساب کاربری');
            }

            // Create user profile
            const { error: profileError } = await supabase
                .from(TABLES.USER_PROFILES)
                .insert({
                    id: authData.user.id,
                    full_name: userData.fullName,
                    role: userData.role
                });

            if (profileError) throw profileError;

            // Mark invite token as used
            await this.markInviteTokenAsUsed(userData.inviteToken, authData.user.id);

            return {
                success: true,
                user: authData.user,
                message: 'حساب کاربری با موفقیت ایجاد شد'
            };

        } catch (error) {
            const errorInfo = handleSupabaseError(error, 'ثبت‌نام');
            throw new Error(errorInfo.message);
        }
    }

    // Login user
    async login(email, password) {
        try {
            validators.user.email(email);
            validators.user.password(password);

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (!data.user) {
                throw new Error('خطا در ورود به سیستم');
            }

            await this.setCurrentUser(data.user);

            return {
                success: true,
                user: data.user,
                message: 'با موفقیت وارد شدید'
            };

        } catch (error) {
            const errorInfo = handleSupabaseError(error, 'ورود');
            throw new Error(errorInfo.message);
        }
    }

    // Logout user
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            this.clearCurrentUser();

            return {
                success: true,
                message: 'با موفقیت خارج شدید'
            };

        } catch (error) {
            const errorInfo = handleSupabaseError(error, 'خروج');
            throw new Error(errorInfo.message);
        }
    }

    // Validate invite token
    async validateInviteToken(token) {
        try {
            const { data, error } = await supabase.functions.invoke('validate-invite', {
                body: { token }
            });

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('Error validating invite token:', error);
            return {
                valid: false,
                message: 'خطا در اعتبارسنجی لینک دعوت'
            };
        }
    }

    // Mark invite token as used
    async markInviteTokenAsUsed(token, userId) {
        try {
            const { error } = await supabase
                .from(TABLES.INVITE_LINKS)
                .update({
                    used_by: userId,
                    is_used: true,
                    current_uses: supabase.sql`current_uses + 1`
                })
                .eq('token', token);

            if (error) throw error;

        } catch (error) {
            console.error('Error marking invite token as used:', error);
            // Don't throw here as user is already created
        }
    }

    // Set current user and load profile
    async setCurrentUser(user) {
        this.currentUser = user;
        
        try {
            // Load user profile
            const profile = await supabaseHelpers.getUserProfile(user.id);
            this.currentUserProfile = profile;
            
            // Store in localStorage
            storageUtils.set(APP_CONFIG.storageKeys.user, {
                id: user.id,
                email: user.email,
                profile: profile
            });

        } catch (error) {
            console.error('Error loading user profile:', error);
            // Continue without profile if there's an error
        }
    }

    // Clear current user
    clearCurrentUser() {
        this.currentUser = null;
        this.currentUserProfile = null;
        storageUtils.remove(APP_CONFIG.storageKeys.user);
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get current user profile
    getCurrentUserProfile() {
        return this.currentUserProfile;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Update user profile
    async updateProfile(profileData) {
        try {
            if (!this.currentUser) {
                throw new Error('کاربر وارد نشده است');
            }

            const updateData = {};
            
            if (profileData.fullName) {
                updateData.full_name = validators.user.name(profileData.fullName);
            }
            
            if (profileData.role) {
                updateData.role = validators.user.role(profileData.role);
            }

            if (profileData.avatarUrl) {
                updateData.avatar_url = profileData.avatarUrl;
            }

            const { data, error } = await supabase
                .from(TABLES.USER_PROFILES)
                .update(updateData)
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            this.currentUserProfile = data;
            
            // Update localStorage
            const userData = storageUtils.get(APP_CONFIG.storageKeys.user);
            if (userData) {
                userData.profile = data;
                storageUtils.set(APP_CONFIG.storageKeys.user, userData);
            }

            return {
                success: true,
                profile: data,
                message: 'پروفایل با موفقیت به‌روزرسانی شد'
            };

        } catch (error) {
            const errorInfo = handleSupabaseError(error, 'به‌روزرسانی پروفایل');
            throw new Error(errorInfo.message);
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            validators.user.email(email);

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) throw error;

            return {
                success: true,
                message: 'ایمیل بازیابی رمز عبور ارسال شد'
            };

        } catch (error) {
            const errorInfo = handleSupabaseError(error, 'بازیابی رمز عبور');
            throw new Error(errorInfo.message);
        }
    }

    // Update password
    async updatePassword(newPassword) {
        try {
            validators.user.password(newPassword);

            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return {
                success: true,
                message: 'رمز عبور با موفقیت تغییر کرد'
            };

        } catch (error) {
            const errorInfo = handleSupabaseError(error, 'تغییر رمز عبور');
            throw new Error(errorInfo.message);
        }
    }

    // Add auth state listener
    addAuthListener(callback) {
        this.authListeners.push(callback);
        return () => {
            this.authListeners = this.authListeners.filter(listener => listener !== callback);
        };
    }

    // Notify auth listeners
    notifyAuthListeners(event, user) {
        this.authListeners.forEach(listener => {
            try {
                listener(event, user);
            } catch (error) {
                console.error('Error in auth listener:', error);
            }
        });
    }

    // Check if user has role
    hasRole(role) {
        return this.currentUserProfile?.role === role;
    }

    // Check if user has any of the roles
    hasAnyRole(roles) {
        return roles.includes(this.currentUserProfile?.role);
    }

    // Refresh session
    async refreshSession() {
        try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            
            return {
                success: true,
                session: data.session
            };

        } catch (error) {
            const errorInfo = handleSupabaseError(error, 'تازه‌سازی نشست');
            throw new Error(errorInfo.message);
        }
    }
}

// Create singleton instance
const authService = new AuthService();

export default authService;