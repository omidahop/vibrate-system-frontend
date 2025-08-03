import { createElement, html } from '../../utils/reactUtils.js';
import { validation, validators } from '../../utils/validations.js';
import { uiUtils, urlUtils } from '../../utils/helpers.js';
import LoadingSpinner from '../Common/LoadingSpinner.js';

export class LoginForm {
    constructor(options = {}) {
        this.onLogin = options.onLogin || null;
        this.onForgotPassword = options.onForgotPassword || null;
        this.onSwitchToRegister = options.onSwitchToRegister || null;
        this.autoFocus = options.autoFocus !== false;
        this.showRememberMe = options.showRememberMe !== false;
        this.showForgotPassword = options.showForgotPassword !== false;
        this.element = null;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        
        if (this.autoFocus) {
            setTimeout(() => {
                const emailInput = this.element.querySelector('#login-email');
                if (emailInput) emailInput.focus();
            }, 100);
        }
    }

    create() {
        const forgotPasswordLink = this.showForgotPassword ? html`
            <div class="forgot-password-link">
                <a href="#" id="forgot-password-link">فراموشی رمز عبور</a>
            </div>
        ` : '';

        const rememberMeField = this.showRememberMe ? html`
            <div class="form-group">
                <label class="checkbox-container">
                    <input type="checkbox" id="remember-me">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">مرا به خاطر بسپار</span>
                </label>
            </div>
        ` : '';

        this.element = createElement(html`
            <div class="login-form-container">
                <div class="auth-header">
                    <div class="auth-logo">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h2 class="auth-title">ورود به سیستم</h2>
                    <p class="auth-subtitle">برای ادامه وارد حساب کاربری خود شوید</p>
                </div>
                
                <form class="login-form" id="login-form" novalidate>
                    <div class="form-group">
                        <label class="form-label" for="login-email">
                            <i class="fas fa-envelope"></i>
                            ایمیل
                        </label>
                        <input 
                            type="email" 
                            class="form-control" 
                            id="login-email" 
                            name="email"
                            placeholder="example@domain.com"
                            required
                            autocomplete="email"
                            spellcheck="false">
                        <div class="form-error" id="email-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="login-password">
                            <i class="fas fa-lock"></i>
                            رمز عبور
                        </label>
                        <div class="password-input-container">
                            <input 
                                type="password" 
                                class="form-control" 
                                id="login-password" 
                                name="password"
                                placeholder="رمز عبور خود را وارد کنید"
                                required
                                autocomplete="current-password">
                            <button type="button" class="password-toggle" id="password-toggle">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div class="form-error" id="password-error"></div>
                    </div>
                    
                    ${rememberMeField}
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary btn-lg" id="login-button">
                            <i class="fas fa-sign-in-alt"></i>
                            ورود
                        </button>
                    </div>
                    
                    ${forgotPasswordLink}
                </form>
                
                <div class="auth-divider">
                    <span>یا</span>
                </div>
                
                <div class="auth-switch">
                    <p>حساب کاربری ندارید؟ 
                        <a href="#" id="switch-to-register">ثبت‌نام کنید</a>
                    </p>
                </div>
                
                <div class="offline-notice" id="offline-notice" style="display: none;">
                    <i class="fas fa-wifi-slash"></i>
                    <span>در حالت آفلاین می‌توانید از قابلیت‌های محدود استفاده کنید</span>
                </div>
            </div>
        `);
    }

    attachEvents() {
        const form = this.element.querySelector('#login-form');
        const emailInput = this.element.querySelector('#login-email');
        const passwordInput = this.element.querySelector('#login-password');
        const passwordToggle = this.element.querySelector('#password-toggle');
        const forgotPasswordLink = this.element.querySelector('#forgot-password-link');
        const switchToRegisterLink = this.element.querySelector('#switch-to-register');

        // Form submission
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Real-time validation
        if (emailInput) {
            emailInput.addEventListener('blur', () => {
                this.validateEmail();
            });
            
            emailInput.addEventListener('input', () => {
                this.clearError('email');
            });
        }

        if (passwordInput) {
            passwordInput.addEventListener('blur', () => {
                this.validatePassword();
            });
            
            passwordInput.addEventListener('input', () => {
                this.clearError('password');
            });
        }

        // Password visibility toggle
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Forgot password link
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }

        // Switch to register link
        if (switchToRegisterLink) {
            switchToRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.onSwitchToRegister) {
                    this.onSwitchToRegister();
                } else {
                    // Default behavior - redirect to register page
                    window.location.href = '/register.html';
                }
            });
        }

        // Network status monitoring
        const updateOfflineNotice = () => {
            const offlineNotice = this.element.querySelector('#offline-notice');
            if (offlineNotice) {
                if (navigator.onLine) {
                    offlineNotice.style.display = 'none';
                } else {
                    offlineNotice.style.display = 'block';
                }
            }
        };

        window.addEventListener('online', updateOfflineNotice);
        window.addEventListener('offline', updateOfflineNotice);
        updateOfflineNotice();
    }

    async handleSubmit() {
        if (this.isLoading) return;

        // Clear previous errors
        this.clearAllErrors();

        // Validate form
        const isValid = this.validateForm();
        if (!isValid) return;

        // Get form data
        const formData = this.getFormData();

        try {
            this.setLoading(true);

            if (this.onLogin) {
                await this.onLogin(formData);
            } else {
                // Default login behavior
                const { default: authService } = await import('../../services/authService.js');
                const result = await authService.login(formData.email, formData.password);
                
                if (result.success) {
                    // Handle remember me
                    if (formData.rememberMe) {
                        localStorage.setItem('rememberMe', 'true');
                    }
                    
                    // Redirect or notify parent
                    const redirectTo = urlUtils.getQueryParam('redirect') || '/';
                    window.location.href = redirectTo;
                }
            }

        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoading(false);
        }
    }

    async handleForgotPassword() {
        const emailInput = this.element.querySelector('#login-email');
        const email = emailInput ? emailInput.value.trim() : '';

        if (!email) {
            this.showError('email', 'لطفاً ابتدا ایمیل خود را وارد کنید');
            emailInput?.focus();
            return;
        }

        try {
            // Validate email format
            validators.user.email(email);
            
            if (this.onForgotPassword) {
                await this.onForgotPassword(email);
            } else {
                // Default forgot password behavior
                const { default: authService } = await import('../../services/authService.js');
                const result = await authService.resetPassword(email);
                
                if (result.success) {
                    uiUtils.showNotification(
                        'ایمیل بازیابی رمز عبور ارسال شد. لطفاً صندوق ورودی خود را بررسی کنید.',
                        'success',
                        5000
                    );
                }
            }
        } catch (error) {
            if (error.field === 'email') {
                this.showError('email', error.message);
            } else {
                uiUtils.showNotification(error.message, 'error');
            }
        }
    }

    validateForm() {
        let isValid = true;

        // Validate email
        if (!this.validateEmail()) {
            isValid = false;
        }

        // Validate password
        if (!this.validatePassword()) {
            isValid = false;
        }

        return isValid;
    }

    validateEmail() {
        const emailInput = this.element.querySelector('#login-email');
        const email = emailInput ? emailInput.value.trim() : '';

        try {
            validators.user.email(email);
            this.clearError('email');
            return true;
        } catch (error) {
            this.showError('email', error.message);
            return false;
        }
    }

    validatePassword() {
        const passwordInput = this.element.querySelector('#login-password');
        const password = passwordInput ? passwordInput.value : '';

        if (!password) {
            this.showError('password', 'رمز عبور الزامی است');
            return false;
        }

        this.clearError('password');
        return true;
    }

    getFormData() {
        const emailInput = this.element.querySelector('#login-email');
        const passwordInput = this.element.querySelector('#login-password');
        const rememberMeInput = this.element.querySelector('#remember-me');

        return {
            email: emailInput ? emailInput.value.trim() : '',
            password: passwordInput ? passwordInput.value : '',
            rememberMe: rememberMeInput ? rememberMeInput.checked : false
        };
    }

    showError(field, message) {
        const errorElement = this.element.querySelector(`#${field}-error`);
        const inputElement = this.element.querySelector(`#login-${field}`);

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    clearError(field) {
        const errorElement = this.element.querySelector(`#${field}-error`);
        const inputElement = this.element.querySelector(`#login-${field}`);

        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }

        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }

    clearAllErrors() {
        const errorElements = this.element.querySelectorAll('.form-error');
        const inputElements = this.element.querySelectorAll('.form-control');

        errorElements.forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });

        inputElements.forEach(el => {
            el.classList.remove('error');
        });
    }

    handleError(error) {
        if (error.message.includes('Email not confirmed')) {
            uiUtils.showNotification(
                'لطفاً ابتدا ایمیل خود را تایید کنید. لینک تایید به ایمیل شما ارسال شده است.',
                'warning',
                5000
            );
        } else if (error.message.includes('Invalid login credentials')) {
            this.showError('password', 'ایمیل یا رمز عبور اشتباه است');
        } else if (error.message.includes('Email rate limit exceeded')) {
            uiUtils.showNotification(
                'تعداد تلاش‌های ورود زیاد است. لطفاً کمی صبر کنید.',
                'warning',
                5000
            );
        } else {
            uiUtils.showNotification(error.message, 'error');
        }
    }

    togglePasswordVisibility() {
        const passwordInput = this.element.querySelector('#login-password');
        const passwordToggle = this.element.querySelector('#password-toggle i');

        if (passwordInput && passwordToggle) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordToggle.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                passwordToggle.className = 'fas fa-eye';
            }
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const button = this.element.querySelector('#login-button');
        const form = this.element.querySelector('#login-form');

        if (button) {
            if (loading) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال ورود...';
            } else {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> ورود';
            }
        }

        if (form) {
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                input.disabled = loading;
            });
        }
    }

    // Prefill email if provided
    setEmail(email) {
        const emailInput = this.element.querySelector('#login-email');
        if (emailInput) {
            emailInput.value = email;
        }
    }

    // Focus on email input
    focus() {
        const emailInput = this.element.querySelector('#login-email');
        if (emailInput) {
            emailInput.focus();
        }
    }

    // Reset form
    reset() {
        const form = this.element.querySelector('#login-form');
        if (form) {
            form.reset();
        }
        this.clearAllErrors();
    }

    mount(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (container) {
            container.appendChild(this.element);
        }

        return this;
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default LoginForm;