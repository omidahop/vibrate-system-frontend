import { createElement, html } from '../../utils/reactUtils.js';
import { validators } from '../../utils/validations.js';
import { uiUtils } from '../../utils/helpers.js';

export class ParameterInput {
    constructor(options = {}) {
        this.parameter = options.parameter || {};
        this.value = options.value || '';
        this.onValueChange = options.onValueChange || null;
        this.onEnterKey = options.onEnterKey || null;
        this.tabIndex = options.tabIndex || 0;
        this.showUnit = options.showUnit !== false;
        this.allowEmpty = options.allowEmpty !== false;
        this.autoValidate = options.autoValidate !== false;
        this.showValidationIcon = options.showValidationIcon !== false;
        this.element = null;
        this.hasError = false;
        this.isValid = false;
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        this.validate();
    }

    create() {
        const unitLabel = this.getUnitLabel();
        const unitDisplay = this.showUnit && unitLabel ? html`
            <div class="parameter-unit">${unitLabel}</div>
        ` : '';

        const validationIcon = this.showValidationIcon ? html`
            <div class="validation-icon" id="validation-icon-${this.parameter.id}">
                <i class="fas fa-circle"></i>
            </div>
        ` : '';

        this.element = createElement(html`
            <div class="parameter-input" data-parameter-id="${this.parameter.id}">
                <label class="parameter-label" for="param-${this.parameter.id}">
                    <div class="parameter-icon" style="color: ${this.parameter.color};">
                        <i class="${this.parameter.icon}"></i>
                    </div>
                    <div class="parameter-info">
                        <div class="parameter-name">${this.parameter.name}</div>
                        <div class="parameter-code">${this.parameter.code}</div>
                    </div>
                </label>
                
                <div class="parameter-input-container">
                    <input type="number" 
                           class="form-control parameter-field" 
                           id="param-${this.parameter.id}"
                           value="${this.value}"
                           placeholder="0.0"
                           step="0.01"
                           min="0"
                           max="${this.parameter.maxValue || (this.parameter.type === 'velocity' ? 20 : 2)}"
                           tabindex="${this.tabIndex}"
                           autocomplete="off">
                    ${unitDisplay}
                    ${validationIcon}
                </div>
                
                <div class="parameter-feedback">
                    <div class="parameter-error" id="error-${this.parameter.id}" style="display: none;"></div>
                    <div class="parameter-hint" id="hint-${this.parameter.id}">
                        حداکثر: ${this.parameter.maxValue || (this.parameter.type === 'velocity' ? 20 : 2)}
                    </div>
                </div>
            </div>
        `);
    }

    attachEvents() {
        const input = this.element.querySelector('.parameter-field');
        
        if (input) {
            // Value change detection
            input.addEventListener('input', (e) => {
                this.handleValueChange(e.target.value);
            });

            // Real-time validation on blur
            input.addEventListener('blur', () => {
                this.validate();
            });

            // Clear error on focus
            input.addEventListener('focus', () => {
                this.clearError();
                this.updateValidationIcon('focus');
            });

            // Enter key handling
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.validate();
                    
                    if (this.isValid && this.onEnterKey) {
                        this.onEnterKey();
                    } else if (this.isValid) {
                        this.moveToNextInput();
                    }
                }
                
                // Tab key handling
                if (e.key === 'Tab' && this.hasError) {
                    // Don't move to next input if there's an error
                    e.preventDefault();
                    this.validate();
                }
            });

            // Format value on paste
            input.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.formatValue();
                }, 0);
            });

            // Handle mouse wheel (prevent accidental changes)
            input.addEventListener('wheel', (e) => {
                if (document.activeElement === input) {
                    e.preventDefault();
                }
            });
        }
    }

    handleValueChange(newValue) {
        this.value = newValue;
        
        // Auto-validate if enabled
        if (this.autoValidate) {
            this.validate(false); // Silent validation
        }

        // Notify parent
        if (this.onValueChange) {
            this.onValueChange(this.parameter.id, newValue);
        }

        // Update validation icon
        this.updateValidationIcon(newValue ? 'typing' : 'empty');
    }

    validate(showErrors = true) {
        const input = this.element.querySelector('.parameter-field');
        const currentValue = input ? input.value : this.value;

        // Reset states
        this.hasError = false;
        this.isValid = false;

        // Allow empty values if permitted
        if (!currentValue || currentValue.trim() === '') {
            if (this.allowEmpty) {
                this.isValid = true;
                if (showErrors) {
                    this.clearError();
                }
                this.updateValidationIcon('empty');
                return true;
            } else {
                this.hasError = true;
                if (showErrors) {
                    this.showError('مقدار الزامی است');
                }
                this.updateValidationIcon('error');
                return false;
            }
        }

        try {
            // Validate using validators
            const validatedValue = validators.parameter.value(currentValue, this.parameter.id);
            
            // Update formatted value
            if (input && validatedValue !== parseFloat(currentValue)) {
                input.value = validatedValue;
                this.value = validatedValue.toString();
            }

            this.isValid = true;
            
            if (showErrors) {
                this.clearError();
            }
            
            this.updateValidationIcon('valid');
            return true;

        } catch (error) {
            this.hasError = true;
            
            if (showErrors) {
                this.showError(error.message);
            }
            
            this.updateValidationIcon('error');
            return false;
        }
    }

    formatValue() {
        const input = this.element.querySelector('.parameter-field');
        if (!input) return;

        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            // Format to 2 decimal places if needed
            const formatted = Math.round(value * 100) / 100;
            input.value = formatted;
            this.value = formatted.toString();
            this.handleValueChange(formatted.toString());
        }
    }

    getUnitLabel() {
        if (this.parameter.type === 'velocity') {
            return 'mm/s';
        } else if (this.parameter.type === 'acceleration') {
            return 'g';
        }
        return '';
    }

    updateValidationIcon(state) {
        if (!this.showValidationIcon) return;

        const icon = this.element.querySelector(`#validation-icon-${this.parameter.id} i`);
        if (!icon) return;

        // Remove all state classes
        icon.className = 'fas';

        switch (state) {
            case 'empty':
                icon.classList.add('fa-circle');
                icon.style.color = '#e5e7eb';
                break;
            case 'typing':
                icon.classList.add('fa-circle');
                icon.style.color = '#fbbf24';
                break;
            case 'focus':
                icon.classList.add('fa-circle');
                icon.style.color = '#3b82f6';
                break;
            case 'valid':
                icon.classList.add('fa-check-circle');
                icon.style.color = '#10b981';
                break;
            case 'error':
                icon.classList.add('fa-exclamation-circle');
                icon.style.color = '#ef4444';
                break;
        }
    }

    showError(message) {
        const errorElement = this.element.querySelector(`#error-${this.parameter.id}`);
        const hintElement = this.element.querySelector(`#hint-${this.parameter.id}`);
        const input = this.element.querySelector('.parameter-field');

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        if (hintElement) {
            hintElement.style.display = 'none';
        }

        if (input) {
            input.classList.add('error');
        }

        this.element.classList.add('has-error');
        this.hasError = true;
    }

    clearError() {
        const errorElement = this.element.querySelector(`#error-${this.parameter.id}`);
        const hintElement = this.element.querySelector(`#hint-${this.parameter.id}`);
        const input = this.element.querySelector('.parameter-field');

        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }

        if (hintElement) {
            hintElement.style.display = 'block';
        }

        if (input) {
            input.classList.remove('error');
        }

        this.element.classList.remove('has-error');
        this.hasError = false;
    }

    moveToNextInput() {
        // Find next parameter input in the form
        const form = this.element.closest('form');
        if (!form) return;

        const allInputs = form.querySelectorAll('.parameter-field');
        const currentIndex = Array.from(allInputs).indexOf(this.element.querySelector('.parameter-field'));
        
        if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
            allInputs[currentIndex + 1].focus();
        } else {
            // Focus on notes or submit button
            const notesTextarea = form.querySelector('#data-notes');
            const submitButton = form.querySelector('#save-data-btn');
            
            if (notesTextarea) {
                notesTextarea.focus();
            } else if (submitButton) {
                submitButton.focus();
            }
        }
    }

    setValue(newValue) {
        const input = this.element.querySelector('.parameter-field');
        
        this.value = newValue;
        
        if (input) {
            input.value = newValue;
        }

        this.validate(false); // Silent validation
    }

    getValue() {
        return this.value;
    }

    getNumericValue() {
        const num = parseFloat(this.value);
        return isNaN(num) ? null : num;
    }

    focus() {
        const input = this.element.querySelector('.parameter-field');
        if (input) {
            input.focus();
        }
    }

    setEnabled(enabled) {
        const input = this.element.querySelector('.parameter-field');
        
        if (input) {
            input.disabled = !enabled;
        }

        this.element.classList.toggle('disabled', !enabled);
    }

    setRequired(required) {
        this.allowEmpty = !required;
        
        const label = this.element.querySelector('.parameter-label');
        if (label) {
            if (required && !label.textContent.includes('*')) {
                label.innerHTML += ' <span class="required-asterisk">*</span>';
            } else if (!required) {
                const asterisk = label.querySelector('.required-asterisk');
                if (asterisk) {
                    asterisk.remove();
                }
            }
        }
    }

    // Highlight parameter (for guidance)
    highlight(duration = 2000) {
        this.element.classList.add('highlighted');
        
        setTimeout(() => {
            this.element.classList.remove('highlighted');
        }, duration);
    }

    // Add threshold warning
    setThreshold(threshold, warningMessage) {
        const currentValue = this.getNumericValue();
        
        if (currentValue !== null && currentValue > threshold) {
            this.showWarning(warningMessage || `مقدار بیش از آستانه ${threshold} است`);
        } else {
            this.clearWarning();
        }
    }

    showWarning(message) {
        let warningElement = this.element.querySelector('.parameter-warning');
        
        if (!warningElement) {
            warningElement = createElement(html`
                <div class="parameter-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span></span>
                </div>
            `);
            
            const feedback = this.element.querySelector('.parameter-feedback');
            feedback.appendChild(warningElement);
        }
        
        warningElement.querySelector('span').textContent = message;
        warningElement.style.display = 'flex';
        
        this.element.classList.add('has-warning');
    }

    clearWarning() {
        const warningElement = this.element.querySelector('.parameter-warning');
        if (warningElement) {
            warningElement.style.display = 'none';
        }
        
        this.element.classList.remove('has-warning');
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

export default ParameterInput;