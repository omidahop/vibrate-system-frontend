import { createElement, html } from '../../utils/reactUtils.js';
import { useAuth } from '../../hooks/useAuth.js';

export class Navigation {
    constructor(options = {}) {
        this.currentSection = options.currentSection || 'data-entry';
        this.onSectionChange = options.onSectionChange || null;
        this.restrictedSections = options.restrictedSections || ['charts', 'analysis'];
        this.element = null;
        this.isMobileMenuOpen = false;
        
        this.navigationItems = [
            {
                id: 'data-entry',
                title: 'ثبت داده',
                icon: 'fas fa-edit',
                requiresAuth: false,
                description: 'ثبت داده‌های جدید'
            },
            {
                id: 'view-data',
                title: 'مشاهده داده‌ها',
                icon: 'fas fa-table',
                requiresAuth: false,
                description: 'مشاهده داده‌های ثبت شده'
            },
            {
                id: 'charts',
                title: 'نمودارها',
                icon: 'fas fa-chart-area',
                requiresAuth: true,
                description: 'نمودارهای تحلیلی'
            },
            {
                id: 'analysis',
                title: 'آنالیز',
                icon: 'fas fa-search',
                requiresAuth: true,
                description: 'تحلیل داده‌ها'
            },
            {
                id: 'slideshow',
                title: 'اسلایدشو',
                icon: 'fas fa-play',
                requiresAuth: false,
                description: 'نمایش اسلایدشو داده‌ها'
            },
            {
                id: 'database',
                title: 'دیتابیس',
                icon: 'fas fa-database',
                requiresAuth: false,
                description: 'مدیریت دیتابیس'
            },
            {
                id: 'settings',
                title: 'تنظیمات',
                icon: 'fas fa-cog',
                requiresAuth: false,
                description: 'تنظیمات برنامه'
            }
        ];
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        this.updateAuthState();
        
        // Listen for mobile menu toggle from header
        document.addEventListener('toggle-mobile-menu', () => {
            this.toggleMobileMenu();
        });
        
        // Listen for navigation events
        document.addEventListener('navigate-to-section', (e) => {
            if (e.detail && e.detail.section) {
                this.setActiveSection(e.detail.section);
            }
        });
    }

    create() {
        const navItems = this.navigationItems.map(item => {
            const isRestricted = item.requiresAuth && this.restrictedSections.includes(item.id);
            const isActive = item.id === this.currentSection;
            
            return html`
                <button class="nav-tab ${isActive ? 'active' : ''} ${isRestricted ? 'restricted' : ''}" 
                        data-section="${item.id}"
                        title="${item.description}"
                        ${isRestricted ? 'disabled' : ''}>
                    <i class="${item.icon}"></i>
                    <span class="nav-text">${item.title}</span>
                    ${isRestricted ? '<i class="fas fa-lock restricted-icon"></i>' : ''}
                </button>
            `;
        }).join('');

        this.element = createElement(html`
            <nav class="navigation" id="main-navigation">
                <div class="nav-container">
                    <div class="nav-tabs" id="nav-tabs">
                        ${navItems}
                    </div>
                    
                    <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
                </div>
            </nav>
        `);
    }

    attachEvents() {
        // Desktop navigation clicks
        const navTabs = this.element.querySelectorAll('.nav-tab:not(.restricted)');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const section = tab.getAttribute('data-section');
                this.setActiveSection(section);
            });
        });

        // Restricted section clicks
        const restrictedTabs = this.element.querySelectorAll('.nav-tab.restricted');
        restrictedTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAuthRequiredMessage();
            });
        });

        // Mobile overlay click
        const mobileOverlay = this.element.querySelector('#mobile-nav-overlay');
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }

        // Close mobile menu on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileMenuOpen) {
                this.closeMobileMenu();
            }
        });

        // Close mobile menu on window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.innerWidth > 768 && this.isMobileMenuOpen) {
                    this.closeMobileMenu();
                }
            }, 100);
        });
    }

    setActiveSection(sectionId) {
        const item = this.navigationItems.find(item => item.id === sectionId);
        
        if (!item) return;
        
        // Check if section requires authentication
        if (item.requiresAuth && !this.isAuthenticated()) {
            this.showAuthRequiredMessage();
            return;
        }
        
        // Update current section
        this.currentSection = sectionId;
        
        // Update visual state
        const navTabs = this.element.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-section') === sectionId) {
                tab.classList.add('active');
            }
        });
        
        // Close mobile menu
        this.closeMobileMenu();
        
        // Notify parent component
        if (this.onSectionChange) {
            this.onSectionChange(sectionId);
        }
        
        // Dispatch custom event
        const event = new CustomEvent('section-changed', {
            detail: { section: sectionId }
        });
        document.dispatchEvent(event);
    }

    async showAuthRequiredMessage() {
        const { NotificationToast } = await import('../Common/NotificationToast.js');
        
        NotificationToast.warning('برای استفاده از این بخش باید وارد سیستم شوید', {
            duration: 4000,
            onClick: () => {
                // Navigate to login or show login modal
                this.showLoginPrompt();
            }
        });
    }

    async showLoginPrompt() {
        const { modalUtils } = await import('../Common/Modal.js');
        
        const confirmed = await modalUtils.confirm(
            'برای استفاده از این قابلیت باید وارد سیستم شوید. آیا می‌خواهید هم‌اکنون وارد شوید؟',
            'ورود به سیستم'
        );
        
        if (confirmed) {
            window.location.href = '/login.html';
        }
    }

    toggleMobileMenu() {
        if (this.isMobileMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        this.isMobileMenuOpen = true;
        this.element.classList.add('mobile-menu-open');
        document.body.classList.add('mobile-menu-active');
        
        // Focus first nav item
        const firstTab = this.element.querySelector('.nav-tab:not([disabled])');
        if (firstTab) {
            firstTab.focus();
        }
    }

    closeMobileMenu() {
        this.isMobileMenuOpen = false;
        this.element.classList.remove('mobile-menu-open');
        document.body.classList.remove('mobile-menu-active');
    }

    async updateAuthState() {
        const isAuth = await this.isAuthenticated();
        
        const restrictedTabs = this.element.querySelectorAll('.nav-tab.restricted');
        
        restrictedTabs.forEach(tab => {
            const restrictedIcon = tab.querySelector('.restricted-icon');
            
            if (isAuth) {
                tab.classList.remove('restricted');
                tab.disabled = false;
                if (restrictedIcon) restrictedIcon.remove();
                
                // Re-attach click event for previously restricted tabs
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = tab.getAttribute('data-section');
                    this.setActiveSection(section);
                });
            } else {
                tab.classList.add('restricted');
                tab.disabled = true;
                
                if (!restrictedIcon) {
                    tab.insertAdjacentHTML('beforeend', '<i class="fas fa-lock restricted-icon"></i>');
                }
            }
        });
    }

    async isAuthenticated() {
        try {
            const { default: authService } = await import('../../services/authService.js');
            return authService.isAuthenticated();
        } catch (error) {
            return false;
        }
    }

    getCurrentSection() {
        return this.currentSection;
    }

    // Enable or disable specific sections
    setSection(sectionId, enabled) {
        const tab = this.element.querySelector(`[data-section="${sectionId}"]`);
        if (tab) {
            if (enabled) {
                tab.classList.remove('restricted');
                tab.disabled = false;
            } else {
                tab.classList.add('restricted');
                tab.disabled = true;
            }
        }
    }

    // Add badge to navigation item
    addBadge(sectionId, text, type = 'info') {
        const tab = this.element.querySelector(`[data-section="${sectionId}"]`);
        if (tab) {
            // Remove existing badge
            const existingBadge = tab.querySelector('.nav-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add new badge
            const badge = createElement(html`
                <span class="nav-badge badge-${type}">${text}</span>
            `);
            
            tab.appendChild(badge);
        }
    }

    // Remove badge from navigation item
    removeBadge(sectionId) {
        const tab = this.element.querySelector(`[data-section="${sectionId}"]`);
        if (tab) {
            const badge = tab.querySelector('.nav-badge');
            if (badge) {
                badge.remove();
            }
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

export default Navigation;