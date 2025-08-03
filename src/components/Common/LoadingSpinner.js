import { createElement, html } from '../../utils/reactUtils.js';

export class LoadingSpinner {
    constructor(options = {}) {
        this.size = options.size || 'medium'; // small, medium, large
        this.color = options.color || 'primary'; // primary, secondary, success, etc.
        this.text = options.text || '';
        this.overlay = options.overlay || false;
        this.element = null;
        
        this.create();
    }

    create() {
        const sizeClass = `spinner-${this.size}`;
        const colorClass = `spinner-${this.color}`;
        const overlayClass = this.overlay ? 'spinner-overlay' : '';
        
        const textElement = this.text ? html`
            <div class="spinner-text">${this.text}</div>
        ` : '';

        this.element = createElement(html`
            <div class="loading-spinner ${sizeClass} ${colorClass} ${overlayClass}">
                <div class="spinner-container">
                    <div class="spinner">
                        <div class="spinner-dot"></div>
                        <div class="spinner-dot"></div>
                        <div class="spinner-dot"></div>
                        <div class="spinner-dot"></div>
                    </div>
                    ${textElement}
                </div>
            </div>
        `);
    }

    show(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (!container) {
            container = document.body;
        }
        
        container.appendChild(this.element);
        return this;
    }

    hide() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        return this;
    }

    setText(newText) {
        const textElement = this.element.querySelector('.spinner-text');
        if (textElement) {
            textElement.textContent = newText;
        } else if (newText) {
            // Add text element if it doesn't exist
            const container = this.element.querySelector('.spinner-container');
            const textEl = createElement(html`<div class="spinner-text">${newText}</div>`);
            container.appendChild(textEl);
        }
        return this;
    }

    destroy() {
        this.hide();
        this.element = null;
    }

    // Static methods for global loading states
    static showGlobal(text = 'در حال بارگذاری...') {
        const existingSpinner = document.querySelector('.global-loading-spinner');
        if (existingSpinner) {
            existingSpinner.remove();
        }

        const spinner = new LoadingSpinner({
            size: 'large',
            text: text,
            overlay: true
        });
        
        spinner.element.classList.add('global-loading-spinner');
        document.body.appendChild(spinner.element);
        
        return spinner;
    }

    static hideGlobal() {
        const spinner = document.querySelector('.global-loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

export default LoadingSpinner;