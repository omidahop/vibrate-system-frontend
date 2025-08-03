import { createElement, html } from '../../utils/reactUtils.js';
import { validators } from '../../utils/validations.js';
import { uiUtils, urlUtils } from '../../utils/helpers.js';
import LoadingSpinner from '../Common/LoadingSpinner.js';

export class RegisterForm {
    constructor(options = {}) {
        this.onRegister = options.onRegister || null;
        this.onSwitchToLogin = options.onSwitchToLogin || null;
        this.autoFocus = options.autoFocus !== false;
        this.inviteToken = options.inviteToken || urlUtils.getQueryParam('token');
        this.element = null;
        this.isLoading = false;
        this.inviteValid = false;
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        
        // Validate invite token if provided
        if (this.inviteToken) {
            this.validateInviteToken();
        } else {
            this.showInviteTokenRequired();
        }
        
        if (this.autoFocus) {
            setTimeout(() => {
                const nameInput = this.element.querySelector('#register-name');
                if (nameInput) nameInput.focus();
            }, 100);
        }
    }

    create() {
        this.element = createElement(html`
            <div class="register-form-container">
                <div class="auth-header">
                    <div class="auth-logo">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <h2 class="auth-title">ثبت‌نام</h2>
                    <p class="auth-subtitle">حساب کاربری جدید ایجاد کنید</p>
                </div>
                
                <!-- Invite Token Section -->
                <div class="invite-section" id="invite-section">
                    <div class="invite-status" id="invite-status">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>در حال بررسی لینک دعوت...</span>
                    </div>
                </div>
                
                <form class="register-form" id="register-form" novalidate style="display: none;">
                    <div class="form-group">
                        <label class="form-label" for="register-name">
                            <i class="fas fa-user"></i>
                            نام کامل *
                        </label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="register-name" 
                            name="fullName"
                            placeholder="نام و نام خانوادگی خود را وارد کنید"
                            required
                            autocomplete="name"
                            maxlength="50">
                        <div class="form-error" id="name-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="register-email">
                            <i class="fas fa-envelope"></i>
                            ایمیل *
                        </label>
                        <input 
                            type="email" 
                            class="form-control" 
                            id="register-email" 
                            name="email"
                            placeholder="example@domain.com"
                            required
                            autocomplete="email"
                            spellcheck="false">
                        <div class="form-error" id="email-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="register-password">
                            <i class="fas fa-lock"></i>
                            رمز عبور *
                        </label>
                        <div class="password-input-container">
                            <input 
                                type="password" 
                                class="form-control" 
                                id="register-password" 
                                name="password"
                                placeholder="حداقل ۶ کاراکتر"
                                required
                                autocomplete="new-password"
                                minlength="6">
                            <button type="button" class="password-toggle" id="password-toggle">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div class="password-strength" id="password-strength"></div>
                        <div class="form-error" id="password-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="register-confirm-password">
                            <i class="fas fa-check-circle"></i>
                            تایید رمز عبور *
                        </label>
                        <input 
                            type="password" 
                            class="form-control" 
                            id="register-confirm-password" 
                            name="confirmPassword"
                            placeholder="رمز عبور را دوباره وارد کنید"
                            required
                            autocomplete="new-password">
                        <div class="form-error" id="confirm-password-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="register-role">
                            <i class="fas fa-id-badge"></i>
                            نقش کاری *
                        </label>
                        <select class="form-control" id="register-role" name="role" required>
                            <option value="">انتخاب کنید</option>
                            <option value="operator">اپراتور تجهیزات</option>
                            <option value="technician">تکنسین</option>
                            <option value="engineer">مهندس</option>
                            <option value="supervisor">سرپرست</option>
                        </select>
                        <div class="form-error" id="role-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-container">
                            <input type="checkbox" id="terms-checkbox" required>
                            <span class="checkmark"></span>
                            <span class="checkbox-text">
                                شرایط و قوانین استفاده را می‌پذیرم 
                                <a href="#" id="terms-link">مطالعه کنید</a>
                            </span>
                        </label>
                        <div class="form-error" id="terms-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-success btn-lg" id="register-button">
                            <i class="fas fa-user-plus"></i>
                            ثبت‌نام
                        </button>
                    </div>
                </form>
                
                <div class="auth-divider">
                    <span>یا</span>
                </div>
                
                <div class="auth-switch">
                    <p>قبلاً ثبت‌نام کرده‌اید؟ 
                        <a href="#" id="switch-to-login">وارد شوید</a>
                    </p>
                </div>
            </div>
        `);
    }

    attachEvents() {
        const form = this.element.querySelector('#register-form');
        const inputs = this.element.querySelectorAll('input[required]');
        const passwordInput = this.element.querySelector('#register-password');
        const confirmPasswordInput = this.element.querySelector('#register-confirm-password');
        const passwordToggle = this.element.querySelector('#password-toggle');
        const termsLink = this.element.querySelector('#terms-link');
        const switchToLoginLink = this.element.querySelector('#switch-to-login');

        // Form submission
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Real-time validation for inputs
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                this.clearError(input.name || input.id.replace('register-', ''));
            });
        });

        // Password strength indicator
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                this.updatePasswordStrength();
                if (confirmPasswordInput.value) {
                    this.validateConfirmPassword();
                }
            });
        }

        // Confirm password validation
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validateConfirmPassword();
            });
        }

        // Password visibility toggle
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Terms and conditions link
        if (termsLink) {
            termsLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showTermsModal();
            });
        }

        // Switch to login link
        if (switchToLoginLink) {
            switchToLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.onSwitchToLogin) {
                    this.onSwitchToLogin();
                } else {
                    window.location.href = '/login.html';
                }
            });
        }
    }

    async validateInviteToken() {
        const inviteStatus = this.element.querySelector('#invite-status');
        const form = this.element.querySelector('#register-form');

        try {
            const { default: authService } = await import('../../services/authService.js');
            const result = await authService.validateInviteToken(this.inviteToken);

            if (result.valid) {
                this.inviteValid = true;
                inviteStatus.innerHTML = `
                    <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                    <span>لینک دعوت معتبر است. می‌توانید ثبت‌نام کنید.</span>
                `;
                form.style.display = 'block';
            } else {
                this.showInvalidInvite(result.message);
            }

        } catch (error) {
            this.showInvalidInvite('خطا در بررسی لینک دعوت');
        }
    }

    showInviteTokenRequired() {
        const inviteStatus = this.element.querySelector('#invite-status');
        inviteStatus.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: var(--warning-color);"></i>
            <div>
                <p><strong>لینک دعوت مورد نیاز است</strong></p>
                <p>برای ثبت‌نام نیاز به لینک دعوت دارید. لطفاً از مدیر سیستم درخواست کنید.</p>
            </div>
        `;
    }

    showInvalidInvite(message) {
        const inviteStatus = this.element.querySelector('#invite-status');
        inviteStatus.innerHTML = `
            <i class="fas fa-times-circle" style="color: var(--error-color);"></i>
            <div>
                <p><strong>لینک دعوت نامعتبر</strong></p>
                <p>${message}</p>
                <button class="btn btn-secondary btn-sm" onclick="window.location.href='/login.html'">
                    بازگشت به ورود
                </button>
            </div>
        `;
    }

    async handleSubmit() {
        if (this.isLoading || !this.inviteValid) return;

        // Clear previous errors
        this.clearAllErrors();

        // Validate form
        const isValid = this.validateForm();
        if (!isValid) return;

        // Get form data
        const formData = this.getFormData();

        try {
            this.setLoading(true);

            if (this.onRegister) {
                await this.onRegister(formData);
            } else {
                // Default register behavior
                const { default: authService } = await import('../../services/authService.js');
                const result = await authService.register({
                    ...formData,
                    inviteToken: this.inviteToken
                });

                if (result.success) {
                    uiUtils.showNotification(
                        'ثبت‌نام با موفقیت انجام شد. لطفاً ایمیل خود را بررسی کنید.',
                        'success',
                        5000
                    );
                    
                    // Redirect to login after delay
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                }
            }

        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoading(false);
        }
    }

    validateForm() {
        let isValid = true;
        const inputs = this.element.querySelectorAll('input[required], select[required]');

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        // Additional validations
        if (!this.validateConfirmPassword()) {
            isValid = false;
        }

        return isValid;
    }

    validateField(input) {
        const fieldName = input.name || input.id.replace('register-', '');
        const value = input.value.trim();

        try {
            switch (fieldName) {
                case 'fullName':
                case 'name':
                    validators.user.name(value);
                    break;
                case 'email':
                    validators.user.email(value);
                    break;
                case 'password':
                    validators.user.password(value);
                    break;
                case 'role':
                    validators.user.role(value);
                    break;
                case 'terms-checkbox':
                    if (!input.checked) {
                        throw new Error('پذیرش شرایط و قوانین الزامی است');
                    }
                    break;
                default:
                    if (input.required && !value) {
                        throw new Error('این فیلد الزامی است');
                    }
                    break;
            }

            this.clearError(fieldName);
            return true;

        } catch (error) {
            this.showError(fieldName === 'terms-checkbox' ? 'terms' : fieldName, error.message);
            return false;
        }
    }

    validateConfirmPassword() {
        const passwordInput = this.element.querySelector('#register-password');
        const confirmPasswordInput = this.element.querySelector('#register-confirm-password');

        const password = passwordInput ? passwordInput.value : '';
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

        if (!confirmPassword) {
            this.showError('confirm-password', 'تایید رمز عبور الزامی است');
            return false;
        }

        if (password !== confirmPassword) {
            this.showError('confirm-password', 'رمز عبور و تایید آن یکسان نیستند');
            return false;
        }

        this.clearError('confirm-password');
        return true;
    }

    updatePasswordStrength() {
        const passwordInput = this.element.querySelector('#register-password');
        const strengthIndicator = this.element.querySelector('#password-strength');

        if (!passwordInput || !strengthIndicator) return;

        const password = passwordInput.value;
        const strength = this.calculatePasswordStrength(password);

        strengthIndicator.className = `password-strength strength-${strength.level}`;
        strengthIndicator.textContent = strength.text;
    }

    calculatePasswordStrength(password) {
        let score = 0;
        let feedback = [];

        if (password.length >= 6) score += 1;
        else feedback.push('حداقل ۶ کاراکتر');

        if (password.length >= 8) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

        const levels = [
            { level: 'very-weak', text: 'بسیار ضعیف', color: '#ef4444' },
            { level: 'weak', text: 'ضعیف', color: '#f59e0b' },
            { level: 'fair', text: 'متوسط', color: '#eab308' },
            { level: 'good', text: 'خوب', color: '#22c55e' },
            { level: 'strong', text: 'قوی', color: '#16a34a' },
            { level: 'very-strong', text: 'بسیار قوی', color: '#15803d' }
        ];

        const levelIndex = Math.min(score, levels.length - 1);
        return levels[levelIndex];
    }

    async showTermsModal() {
        const { Modal } = await import('../Common/Modal.js');

        const termsContent = html`
            <div class="terms-content">
                <h4>شرایط و قوانین استفاده</h4>
                
                <div class="terms-section">
                    <h5>1. پذیرش شرایط</h5>
                    <p>با استفاده از این سیستم، شما شرایط و قوانین زیر را می‌پذیرید.</p>
                </div>
                
                <div class="terms-section">
                    <h5>2. حریم خصوصی</h5>
                    <p>اطلاعات شما محفوظ نگهداری می‌شود و تنها برای اهداف سیستم استفاده خواهد شد.</p>
                </div>
                
                <div class="terms-section">
                    <h5>3. مسئولیت کاربر</h5>
                    <p>کاربران موظفند داده‌های صحیح وارد کرده و از سیستم به درستی استفاده نمایند.</p>
                </div>
                
                <div class="terms-section">
                    <h5>4. امنیت حساب کاربری</h5>
                    <p>نگهداری رمز عبور و امنیت حساب کاربری بر عهده خود کاربر است.</p>
                </div>
                
                <div class="terms-section">
                    <h5>5. محدودیت‌ها</h5>
                    <p>استفاده نامناسب از سیستم ممنوع بوده و ممکن است منجر به مسدود شدن حساب کاربری شود.</p>
                </div>
            </div>
        `;

        const modal = new Modal({
            title: 'شرایط و قوانین استفاده',
            content: termsContent,
            size: 'large'
        });

        modal.addButton('موافقم', 'btn btn-success', () => {
            const termsCheckbox = this.element.querySelector('#terms-checkbox');
            if (termsCheckbox) {
                termsCheckbox.checked = true;
                this.clearError('terms');
            }
            modal.destroy();
        }).addButton('بستن', 'btn btn-secondary', () => {
            modal.destroy();
        }).open();
    }

    getFormData() {
        const nameInput = this.element.querySelector('#register-name');
        const emailInput = this.element.querySelector('#register-email');
        const passwordInput = this.element.querySelector('#register-password');
        const roleInput = this.element.querySelector('#register-role');

        return {
            fullName: nameInput ? nameInput.value.trim() : '',
            email: emailInput ? emailInput.value.trim() : '',
            password: passwordInput ? passwordInput.value : '',
            role: roleInput ? roleInput.value : ''
        };
    }

    showError(field, message) {
        const errorElement = this.element.querySelector(`#${field}-error`);
        const inputElement = this.element.querySelector(`#register-${field}`) || 
                           this.element.querySelector(`#${field}`) ||
                           this.element.querySelector(`#${field}-checkbox`);

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
        const inputElement = this.element.querySelector(`#register-${field}`) || 
                           this.element.querySelector(`#${field}`) ||
                           this.element.querySelector(`#${field}-checkbox`);

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
        const inputElements = this.element.querySelectorAll('.form-control, input');

        errorElements.forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });

        inputElements.forEach(el => {
            el.classList.remove('error');
        });
    }

    handleError(error) {
        if (error.message.includes('Email already registered')) {
            this.showError('email', 'این ایمیل قبلاً ثبت شده است');
        } else if (error.message.includes('Invite token')) {
            uiUtils.showNotification('مشکل در لینک دعوت. لطفاً مجدد تلاش کنید.', 'error');
        } else {
            uiUtils.showNotification(error.message, 'error');
        }
    }

    togglePasswordVisibility() {
        const passwordInput = this.element.querySelector('#register-password');
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
        const button = this.element.querySelector('#register-button');
        const form = this.element.querySelector('#register-form');

        if (button) {
            if (loading) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال ثبت‌نام...';
            } else {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus"></i> ثبت‌نام';
            }
        }

        if (form) {
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = loading;
            });
        }
    }

    reset() {
        const form = this.element.querySelector('#register-form');
        if (form) {
            form.reset();
        }
        this.clearAllErrors();
        
        const strengthIndicator = this.element.querySelector('#password-strength');
        if (strengthIndicator) {
            strengthIndicator.textContent = '';
            strengthIndicator.className = 'password-strength';
        }
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

export default RegisterForm;