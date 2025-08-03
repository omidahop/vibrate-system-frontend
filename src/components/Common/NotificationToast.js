import { createElement, html } from '../../utils/reactUtils.js';

export class NotificationToast {
    constructor(options = {}) {
        this.id = options.id || `toast-${Date.now()}`;
        this.message = options.message || '';
        this.type = options.type || 'info'; // success, error, warning, info
        this.duration = options.duration || 3000; // 0 for persistent
        this.position = options.position || 'top-right'; // top-right, top-left, bottom-right, bottom-left
        this.showIcon = options.showIcon !== false;
        this.showClose = options.showClose !== false;
        this.onClick = options.onClick || null;
        this.onClose = options.onClose || null;
        this.element = null;
        this.timer = null;
        
        this.init();
    }

    init() {
        this.create();
        this.show();
        this.startTimer();
    }

    create() {
        const icon = this.getIcon();
        const iconElement = this.showIcon ? html`
            <div class="toast-icon">
                <i class="fas fa-${icon}"></i>
            </div>
        ` : '';
        
        const closeButton = this.showClose ? html`
            <button class="toast-close" aria-label="بستن">
                <i class="fas fa-times"></i>
            </button>
        ` : '';

        this.element = createElement(html`
            <div class="notification-toast toast-${this.type}" id="${this.id}" role="alert" aria-live="polite">
                ${iconElement}
                <div class="toast-content">
                    <div class="toast-message">${this.message}</div>
                </div>
                ${closeButton}
                ${this.duration > 0 ? '<div class="toast-progress"></div>' : ''}
            </div>
        `);

        this.attachEvents();
    }

    attachEvents() {
        // Close button
        const closeBtn = this.element.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Click handler
        if (this.onClick) {
            this.element.addEventListener('click', (e) => {
                if (!e.target.closest('.toast-close')) {
                    this.onClick(e, this);
                }
            });
            this.element.style.cursor = 'pointer';
        }
    }

    show() {
        const container = this.getContainer();
        container.appendChild(this.element);
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.element.classList.add('toast-show');
        });
    }

    close() {
        this.element.classList.add('toast-hide');
        
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            
            if (this.onClose) {
                this.onClose(this);
            }
        }, 300);
        
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    startTimer() {
        if (this.duration > 0) {
            const progressBar = this.element.querySelector('.toast-progress');
            
            if (progressBar) {
                progressBar.style.animationDuration = `${this.duration}ms`;
            }
            
            this.timer = setTimeout(() => {
                this.close();
            }, this.duration);
        }
    }

    getContainer() {
        const containerId = `toast-container-${this.position}`;
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = createElement(html`
                <div class="toast-container toast-${this.position}" id="${containerId}"></div>
            `);
            document.body.appendChild(container);
        }
        
        return container;
    }

    getIcon() {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        return icons[this.type] || icons.info;
    }

    // Static methods for quick toast creation
    static success(message, options = {}) {
        return new NotificationToast({
            message,
            type: 'success',
            ...options
        });
    }

    static error(message, options = {}) {
        return new NotificationToast({
            message,
            type: 'error',
            duration: 5000, // Longer for errors
            ...options
        });
    }

    static warning(message, options = {}) {
        return new NotificationToast({
            message,
            type: 'warning',
            ...options
        });
    }

    static info(message, options = {}) {
        return new NotificationToast({
            message,
            type: 'info',
            ...options
        });
    }

    // Clear all toasts
    static clearAll() {
        const containers = document.querySelectorAll('.toast-container');
        containers.forEach(container => {
            const toasts = container.querySelectorAll('.notification-toast');
            toasts.forEach(toast => {
                toast.classList.add('toast-hide');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            });
        });
    }
}

export default NotificationToast;