import { useState, useEffect } from '../utils/reactUtils.js';
import authService from '../services/authService.js';
import { uiUtils, storageUtils } from '../utils/helpers.js';
import { APP_CONFIG } from '../utils/constants.js';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Initialize auth state
        const initializeAuth = async () => {
            try {
                setIsLoading(true);
                
                // Wait for auth service to initialize
                while (!authService.isInitialized) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const currentUser = authService.getCurrentUser();
                const currentProfile = authService.getCurrentUserProfile();

                if (currentUser) {
                    setUser(currentUser);
                    setProfile(currentProfile);
                    setIsAuthenticated(true);
                } else {
                    // Check localStorage for cached user data
                    const cachedUser = storageUtils.get(APP_CONFIG.storageKeys.user);
                    if (cachedUser) {
                        setUser(cachedUser);
                        setProfile(cachedUser.profile);
                        setIsAuthenticated(true);
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth changes
        const unsubscribe = authService.addAuthListener((event, userData) => {
            switch (event) {
                case 'SIGNED_IN':
                    setUser(userData);
                    setProfile(authService.getCurrentUserProfile());
                    setIsAuthenticated(true);
                    setError(null);
                    break;
                case 'SIGNED_OUT':
                    setUser(null);
                    setProfile(null);
                    setIsAuthenticated(false);
                    setError(null);
                    break;
                case 'USER_UPDATED':
                    setUser(userData);
                    setProfile(authService.getCurrentUserProfile());
                    break;
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    // Login function
    const login = async (email, password) => {
        try {
            setIsLoading(true);
            setError(null);
            
            const result = await authService.login(email, password);
            
            if (result.success) {
                uiUtils.showNotification(result.message, 'success');
                return result;
            }
        } catch (error) {
            setError(error.message);
            uiUtils.showNotification(error.message, 'error');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Register function
    const register = async (userData) => {
        try {
            setIsLoading(true);
            setError(null);
            
            const result = await authService.register(userData);
            
            if (result.success) {
                uiUtils.showNotification(result.message, 'success');
                return result;
            }
        } catch (error) {
            setError(error.message);
            uiUtils.showNotification(error.message, 'error');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const logout = async () => {
        try {
            setIsLoading(true);
            
            const result = await authService.logout();
            
            if (result.success) {
                uiUtils.showNotification(result.message, 'success');
                return result;
            }
        } catch (error) {
            setError(error.message);
            uiUtils.showNotification(error.message, 'error');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Update profile function
    const updateProfile = async (profileData) => {
        try {
            setIsLoading(true);
            setError(null);
            
            const result = await authService.updateProfile(profileData);
            
            if (result.success) {
                setProfile(result.profile);
                uiUtils.showNotification(result.message, 'success');
                return result;
            }
        } catch (error) {
            setError(error.message);
            uiUtils.showNotification(error.message, 'error');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Reset password function
    const resetPassword = async (email) => {
        try {
            setIsLoading(true);
            setError(null);
            
            const result = await authService.resetPassword(email);
            
            if (result.success) {
                uiUtils.showNotification(result.message, 'success');
                return result;
            }
        } catch (error) {
            setError(error.message);
            uiUtils.showNotification(error.message, 'error');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Validate invite token
    const validateInvite = async (token) => {
        try {
            setIsLoading(true);
            setError(null);
            
            const result = await authService.validateInviteToken(token);
            return result;
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Check if user has specific role
    const hasRole = (role) => {
        return authService.hasRole(role);
    };

    // Check if user has any of the specified roles
    const hasAnyRole = (roles) => {
        return authService.hasAnyRole(roles);
    };

    return {
        // State
        user,
        profile,
        isAuthenticated,
        isLoading,
        error,
        
        // Actions
        login,
        register,
        logout,
        updateProfile,
        resetPassword,
        validateInvite,
        
        // Utilities
        hasRole,
        hasAnyRole,
        
        // Clear error
        clearError: () => setError(null)
    };
}