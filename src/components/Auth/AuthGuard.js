import { useAuth } from '../../hooks/useAuth.js';
import { uiUtils } from '../../utils/helpers.js';
import LoadingSpinner from '../Common/LoadingSpinner.js';

export class AuthGuard {
    constructor(options = {}) {
        this.requireAuth = options.requireAuth || false;
        this.allowedRoles = options.allowedRoles || [];
        this.redirectTo = options.redirectTo || '/login.html';
        this.fallbackComponent = options.fallbackComponent || null;
        this.showLoginPrompt = options.showLoginPrompt !== false;
        this.autoRedirect = options.autoRedirect !== false;
        this.onAuthRequired = options.onAuthRequired || null;
        this.onAccessDenied = options.onAccessDenied || null;
        
        this.checkAccess();
    }

    async checkAccess() {
        try {
            const { default: authService } = await import('../../services/authService.js');
            
            // Wait for auth service to initialize
            while (!authService.isInitialized) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const isAuthenticated = authService.isAuthenticated();
            const userProfile = authService.getCurrentUserProfile();

            // Check authentication requirement
            if (this.requireAuth && !isAuthenticated) {
                this.handleAuthRequired();
                return false;
            }

            // Check role requirements
            if (this.allowedRoles.length > 0 && isAuthenticated) {
                const userRole = userProfile?.role;
                
                if (!userRole || !this.allowedRoles.includes(userRole)) {
                    this.handleAccessDenied(userRole);
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error('Error in AuthGuard:', error);
            this.handleError(error);
            return false;
        }
    }

    handleAuthRequired() {
        if (this.onAuthRequired) {
            this.onAuthRequired();
            return;
        }

        if (this.showLoginPrompt) {
            this.showAuthRequiredModal();
        } else if (this.autoRedirect) {
            this.redirectToLogin();
        } else if (this.fallbackComponent) {
            this.showFallback();
        }
    }

    handleAccessDenied(userRole) {
        if (this.onAccessDenied) {
            this.onAccessDenied(userRole);
            return;
        }

        const requiredRoles = this.allowedRoles.map(role => this.getRoleLabel(role)).join(', ');
        
        uiUtils.showNotification(
            `دسترسی محدود: این بخش فقط برای ${requiredRoles} در دسترس است`,
            'warning',
            5000
        );

        if (this.fallbackComponent) {
            this.showFallback();
        }
    }

    handleError(error) {
        uiUtils.showNotification(
            'خطا در بررسی دسترسی. لطفاً دوباره تلاش کنید.',
            'error'
        );
    }

    async showAuthRequiredModal() {
        const { modalUtils } = await import('../Common/Modal.js');

        const confirmed = await modalUtils.confirm(
            'برای دسترسی به این بخش باید وارد سیستم شوید. آیا می‌خواهید اکنون وارد شوید؟',
            'ورود مورد نیاز'
        );

        if (confirmed) {
            this.redirectToLogin();
        } else if (this.fallbackComponent) {
            this.showFallback();
        }
    }

    redirectToLogin() {
        // Store current URL for redirect after login
        const currentUrl = window.location.pathname + window.location.search;
        const redirectUrl = `${this.redirectTo}?redirect=${encodeURIComponent(currentUrl)}`;
        
        window.location.href = redirectUrl;
    }

    showFallback() {
        if (this.fallbackComponent) {
            if (typeof this.fallbackComponent === 'function') {
                this.fallbackComponent();
            } else if (typeof this.fallbackComponent === 'string') {
                document.body.innerHTML = this.fallbackComponent;
            }
        }
    }

    getRoleLabel(role) {
        const labels = {
            operator: 'اپراتور',
            technician: 'تکنسین', 
            engineer: 'مهندس',
            supervisor: 'سرپرست'
        };
        
        return labels[role] || role;
    }

    // Static method to check access without creating instance
    static async checkAccess(options = {}) {
        const guard = new AuthGuard({ ...options, showLoginPrompt: false, autoRedirect: false });
        return await guard.checkAccess();
    }

    // Static method to protect a function
    static protect(fn, options = {}) {
        return async (...args) => {
            const hasAccess = await AuthGuard.checkAccess(options);
            
            if (hasAccess) {
                return fn(...args);
            } else {
                if (options.fallback) {
                    return options.fallback(...args);
                }
                throw new Error('Access denied');
            }
        };
    }

    // Static method to protect a component
    static protectComponent(ComponentClass, options = {}) {
        return class ProtectedComponent extends ComponentClass {
            constructor(componentOptions = {}) {
                super(componentOptions);
                
                // Check access before mounting
                this.originalMount = this.mount;
                this.mount = this.protectedMount.bind(this);
            }

            async protectedMount(container) {
                const guard = new AuthGuard(options);
                const hasAccess = await guard.checkAccess();

                if (hasAccess) {
                    return this.originalMount(container);
                } else {
                    // Show loading or fallback
                    if (options.fallbackComponent) {
                        const fallback = document.createElement('div');
                        fallback.innerHTML = options.fallbackComponent;
                        
                        if (typeof container === 'string') {
                            container = document.getElementById(container);
                        }
                        
                        if (container) {
                            container.appendChild(fallback);
                        }
                    }
                    return null;
                }
            }
        };
    }
}

// Higher-order function to protect routes
export function withAuth(component, authOptions = {}) {
    return async (container, componentOptions = {}) => {
        const guard = new AuthGuard({
            requireAuth: true,
            showLoginPrompt: true,
            autoRedirect: true,
            ...authOptions
        });

        const hasAccess = await guard.checkAccess();

        if (hasAccess) {
            return component(container, componentOptions);
        }

        return null;
    };
}

// Higher-order function to protect functions with role requirements
export function withRole(roles = []) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function(...args) {
            try {
                const { default: authService } = await import('../../services/authService.js');
                
                if (!authService.isAuthenticated()) {
                    throw new Error('Authentication required');
                }

                const userProfile = authService.getCurrentUserProfile();
                const userRole = userProfile?.role;

                if (roles.length > 0 && (!userRole || !roles.includes(userRole))) {
                    const requiredRoles = roles.map(role => {
                        const labels = {
                            operator: 'اپراتور',
                            technician: 'تکنسین',
                            engineer: 'مهندس', 
                            supervisor: 'سرپرست'
                        };
                        return labels[role] || role;
                    }).join(', ');

                    throw new Error(`دسترسی محدود: این عملیات فقط برای ${requiredRoles} مجاز است`);
                }

                return await originalMethod.apply(this, args);

            } catch (error) {
                uiUtils.showNotification(error.message, 'error');
                throw error;
            }
        };

        return descriptor;
    };
}

// Utility function to check if user has specific permission
export async function hasPermission(requiredRoles = []) {
    try {
        const { default: authService } = await import('../../services/authService.js');
        
        if (!authService.isAuthenticated()) {
            return false;
        }

        if (requiredRoles.length === 0) {
            return true;
        }

        const userProfile = authService.getCurrentUserProfile();
        const userRole = userProfile?.role;

        return userRole && requiredRoles.includes(userRole);

    } catch (error) {
        return false;
    }
}

// Create auth-protected version of an element
export function createProtectedElement(elementCreator, authOptions = {}) {
    return async (container) => {
        const guard = new AuthGuard({
            showLoginPrompt: false,
            autoRedirect: false,
            ...authOptions
        });

        const hasAccess = await guard.checkAccess();

        if (hasAccess) {
            return elementCreator(container);
        } else {
            // Create fallback element
            const fallback = document.createElement('div');
            fallback.className = 'auth-required-message';
            fallback.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-lock" style="font-size: 2rem; color: var(--warning-color); margin-bottom: 1rem;"></i>
                    <h4>دسترسی محدود</h4>
                    <p>برای استفاده از این بخش نیاز به ورود دارید</p>
                    <button class="btn btn-primary" onclick="window.location.href='/login.html'">
                        <i class="fas fa-sign-in-alt"></i>
                        ورود به سیستم
                    </button>
                </div>
            `;

            if (typeof container === 'string') {
                container = document.getElementById(container);
            }

            if (container) {
                container.appendChild(fallback);
            }

            return fallback;
        }
    };
}

export default AuthGuard;