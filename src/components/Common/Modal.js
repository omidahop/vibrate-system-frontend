import { createElement, html } from '../../utils/reactUtils.js';
import { uiUtils } from '../../utils/helpers.js';

export class Modal {
    constructor(options = {}) {
        this.id = options.id || `modal-${Date.now()}`;
        this.title = options.title || '';
        this.content = options.content || '';
        this.showCloseButton = options.showCloseButton !== false;
        this.escapeToClose = options.escapeToClose !== false;
        this.backdropToClose = options.backdropToClose !== false;
        this.size = options.size || 'medium'; // small, medium, large
        this.onClose = options.onClose || null;
        this.onOpen = options.onOpen || null;
        this.isVisible = false;
        this.element = null;
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        this.appendToDOM();
    }

    create() {
        const sizeClass = `modal-${this.size}`;
        const closeButton = this.showCloseButton ? html`
            <button class="modal-close" data-modal-close>
                <i class="fas fa-times"></i>
            </button>
        ` : '';

        this.element = createElement(html`
            <div class="modal ${sizeClass}" id="${this.id}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title">
                <div class="modal-backdrop" data-modal-backdrop></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="${this.id}-title">${this.title}</h3>
                        ${closeButton}
                    </div>
                    <div class="modal-body">
                        ${this.content}
                    </div>
                    <div class="modal-footer" style="display: none;">
                        <!-- Footer content will be added dynamically -->
                    </div>
                </div>
            </div>
        `);
    }

    attachEvents() {
        // Close button
        const closeBtn = this.element.querySelector('[data-modal-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Backdrop click
        if (this.backdropToClose) {
            const backdrop = this.element.querySelector('[data-modal-backdrop]');
            if (backdrop) {
                backdrop.addEventListener('click', () => this.close());
            }
        }

        // Escape key
        if (this.escapeToClose) {
            this.keydownHandler = (e) => {
                if (e.key === 'Escape' && this.isVisible) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.keydownHandler);
        }
    }

    appendToDOM() {
        document.body.appendChild(this.element);
    }

    open() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.element.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Focus management
        this.previouslyFocused = document.activeElement;
        const firstFocusable = this.element.querySelector('input, textarea, select, button, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }

        // Callback
        if (this.onOpen) {
            this.onOpen(this);
        }

        return this;
    }

    close() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.element.classList.remove('active');
        document.body.classList.remove('modal-open');
        
        // Restore focus
        if (this.previouslyFocused) {
            this.previouslyFocused.focus();
        }

        // Callback
        if (this.onClose) {
            this.onClose(this);
        }

        return this;
    }

    setTitle(title) {
        const titleElement = this.element.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
        return this;
    }

    setContent(content) {
        const bodyElement = this.element.querySelector('.modal-body');
        if (bodyElement) {
            if (typeof content === 'string') {
                bodyElement.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                bodyElement.innerHTML = '';
                bodyElement.appendChild(content);
            }
        }
        return this;
    }

    addFooter(footerContent) {
        const footerElement = this.element.querySelector('.modal-footer');
        if (footerElement) {
            footerElement.style.display = 'block';
            if (typeof footerContent === 'string') {
                footerElement.innerHTML = footerContent;
            } else if (footerContent instanceof HTMLElement) {
                footerElement.innerHTML = '';
                footerElement.appendChild(footerContent);
            }
        }
        return this;
    }

    addButton(text, classes = 'btn btn-secondary', onClick = null) {
        const footerElement = this.element.querySelector('.modal-footer');
        if (footerElement) {
            footerElement.style.display = 'block';
            
            const button = createElement(html`
                <button class="${classes}" type="button">${text}</button>
            `);
            
            if (onClick) {
                button.addEventListener('click', (e) => onClick(e, this));
            }
            
            footerElement.appendChild(button);
        }
        return this;
    }

    destroy() {
        this.close();
        
        // Remove event listeners
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        
        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    static createConfirmModal(options = {}) {
        const modal = new Modal({
            title: options.title || 'تایید',
            content: options.message || 'آیا مطمئن هستید؟',
            size: 'small'
        });

        return new Promise((resolve) => {
            modal
                .addButton('تایید', 'btn btn-success', () => {
                    modal.destroy();
                    resolve(true);
                })
                .addButton('لغو', 'btn btn-secondary', () => {
                    modal.destroy();
                    resolve(false);
                })
                .open();
        });
    }

    static createAlertModal(message, title = 'پیام') {
        const modal = new Modal({
            title,
            content: message,
            size: 'small'
        });

        modal
            .addButton('تایید', 'btn btn-primary', () => {
                modal.destroy();
            })
            .open();

        return modal;
    }
}

// Utility functions for quick modal creation
export const modalUtils = {
    confirm: (message, title) => Modal.createConfirmModal({ message, title }),
    alert: (message, title) => Modal.createAlertModal(message, title),
    
    create: (options) => new Modal(options),
    
    // Show existing modal by ID
    show: (modalId) => {
        uiUtils.showModal(modalId);
    },
    
    // Hide existing modal by ID
    hide: (modalId) => {
        uiUtils.closeModal(modalId);
    }
};