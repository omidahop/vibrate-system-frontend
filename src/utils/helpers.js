import { APP_CONFIG, VALIDATION_RULES } from './constants.js';

// Date utilities
export const dateUtils = {
    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    },
    
    formatDate(dateString, locale = 'fa-IR') {
        const date = new Date(dateString);
        return date.toLocaleDateString(locale);
    },
    
    formatDateTime(dateString, locale = 'fa-IR') {
        const date = new Date(dateString);
        return date.toLocaleString(locale);
    },
    
    isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    },
    
    getDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }
};

// Data validation utilities
export const validation = {
    validateParameterValue(value, parameterId) {
        const num = parseFloat(value);
        
        if (isNaN(num) || num < VALIDATION_RULES.parameters.minValue) {
            return { valid: false, message: 'مقدار باید عدد مثبت باشد' };
        }
        
        const parameter = APP_CONFIG.parameters.find(p => p.id === parameterId);
        if (!parameter) {
            return { valid: false, message: 'پارامتر نامعتبر' };
        }
        
        const maxValue = parameter.maxValue || (parameter.type === 'velocity' ? 20 : 2);
        if (num > maxValue) {
            return { valid: false, message: `حداکثر مقدار ${maxValue} است` };
        }
        
        const decimalPlaces = (num.toString().split('.')[1] || '').length;
        if (decimalPlaces > VALIDATION_RULES.parameters.maxDecimalPlaces) {
            return { valid: false, message: `حداکثر ${VALIDATION_RULES.parameters.maxDecimalPlaces} رقم اعشار مجاز است` };
        }
        
        return { valid: true, value: num };
    },
    
    validateNotes(notes) {
        if (notes.length > VALIDATION_RULES.notes.maxLength) {
            return { 
                valid: false, 
                message: `حداکثر ${VALIDATION_RULES.notes.maxLength} کاراکتر مجاز است` 
            };
        }
        return { valid: true, value: notes };
    },
    
    validateUserName(name) {
        const trimmedName = name.trim();
        if (trimmedName.length < VALIDATION_RULES.user.nameMinLength) {
            return { 
                valid: false, 
                message: `نام باید حداقل ${VALIDATION_RULES.user.nameMinLength} کاراکتر باشد` 
            };
        }
        if (trimmedName.length > VALIDATION_RULES.user.nameMaxLength) {
            return { 
                valid: false, 
                message: `نام نباید بیشتر از ${VALIDATION_RULES.user.nameMaxLength} کاراکتر باشد` 
            };
        }
        return { valid: true, value: trimmedName };
    },
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'فرمت ایمیل نامعتبر است' };
        }
        return { valid: true, value: email };
    }
};

// UI utilities
export const uiUtils = {
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
    },
    
    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    },
    
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    },
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            // Focus management
            const firstInput = modal.querySelector('input, textarea, select, button');
            if (firstInput) {
                firstInput.focus();
            }
        }
    },
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    toggleLoading(elementId, isLoading) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (isLoading) {
            element.disabled = true;
            const originalText = element.textContent;
            element.dataset.originalText = originalText;
            element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال پردازش...';
        } else {
            element.disabled = false;
            const originalText = element.dataset.originalText;
            if (originalText) {
                element.textContent = originalText;
            }
        }
    },
    
    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    },
    
    setElementHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    }
};

// Local storage utilities
export const storageUtils = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// Array utilities
export const arrayUtils = {
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = groups[item[key]] || [];
            groups[item[key]] = [...group, item];
            return groups;
        }, {});
    },
    
    sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'desc') {
                return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        });
    },
    
    unique(array, key) {
        if (key) {
            const seen = new Set();
            return array.filter(item => {
                const keyValue = item[key];
                if (seen.has(keyValue)) {
                    return false;
                }
                seen.add(keyValue);
                return true;
            });
        }
        return [...new Set(array)];
    }
};

// Error handling utilities
export const errorUtils = {
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        let message = 'خطای غیرمنتظره‌ای رخ داد';
        
        if (error.message) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
                message = 'خطا در اتصال به سرور';
            } else if (error.message.includes('auth')) {
                message = 'خطا در احراز هویت';
            } else {
                message = error.message;
            }
        }
        
        uiUtils.showNotification(message, 'error');
        return message;
    },
    
    isNetworkError(error) {
        return error.message && (
            error.message.includes('network') || 
            error.message.includes('fetch') ||
            error.message.includes('NetworkError')
        );
    },
    
    isAuthError(error) {
        return error.message && error.message.includes('auth');
    }
};

// URL and query utilities
export const urlUtils = {
    getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },
    
    setQueryParam(name, value) {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        window.history.replaceState({}, '', url);
    },
    
    removeQueryParam(name) {
        const url = new URL(window.location);
        url.searchParams.delete(name);
        window.history.replaceState({}, '', url);
    }
};

// Random utilities
export const randomUtils = {
    getRandomColor() {
        return APP_CONFIG.colors.randomColors[
            Math.floor(Math.random() * APP_CONFIG.colors.randomColors.length)
        ];
    },
    
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
};