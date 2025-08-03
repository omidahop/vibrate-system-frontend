import { createElement, html } from '../../utils/reactUtils.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useTheme } from '../../hooks/useLocalStorage.js';
import { uiUtils } from '../../utils/helpers.js';

export class Header {
    constructor(options = {}) {
        this.title = options.title || 'سیستم ثبت داده‌های ویبره';
        this.showUserMenu = options.showUserMenu !== false;
        this.onUserMenuClick = options.onUserMenuClick || null;
        this.element = null;
        this.userMenuVisible = false;
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        this.updateUserInfo();
        
        // Listen for auth changes
        if (typeof useAuth === 'function') {
            const auth = useAuth();
            auth.addAuthListener(() => {
                this.updateUserInfo();
            });
        }
    }

    create() {
        this.element = createElement(html`
            <header class="header" id="app-header">
                <div class="container">
                    <div class="header-content">
                        <div class="logo">
                            <i class="fas fa-chart-line"></i>
                            <span class="logo-text">${this.title}</span>
                        </div>
                        
                        <div class="header-actions">
                            <div class="connection-status" id="connection-status">
                                <i class="fas fa-wifi" id="connection-icon" title="وضعیت اتصال"></i>
                            </div>
                            
                            <button class="theme-toggle" id="theme-toggle" title="تغییر تم">
                                <i class="fas fa-moon"></i>
                            </button>
                            
                            <div class="user-menu-container" ${this.showUserMenu ? '' : 'style="display: none;"'}>
                                <button class="user-menu-trigger" id="user-menu-trigger">
                                    <div class="user-avatar" id="user-avatar">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <span class="user-name" id="user-name">کاربر میهمان</span>
                                    <i class="fas fa-chevron-down user-menu-arrow"></i>
                                </button>
                                
                                <div class="user-menu" id="user-menu">
                                    <div class="user-menu-header">
                                        <div class="user-avatar" id="user-menu-avatar">
                                            <i class="fas fa-user"></i>
                                        </div>
                                        <div class="user-info">
                                            <div class="user-name" id="user-menu-name">کاربر میهمان</div>
                                            <div class="user-role" id="user-menu-role">نقش کاربری</div>
                                        </div>
                                    </div>
                                    
                                    <div class="user-menu-divider"></div>
                                    
                                    <div class="user-menu-items">
                                        <button class="user-menu-item" data-action="profile">
                                            <i class="fas fa-user-edit"></i>
                                            <span>ویرایش پروفایل</span>
                                        </button>
                                        <button class="user-menu-item" data-action="settings">
                                            <i class="fas fa-cog"></i>
                                            <span>تنظیمات</span>
                                        </button>
                                        <button class="user-menu-item" data-action="sync" id="sync-menu-item">
                                            <i class="fas fa-sync"></i>
                                            <span>همگام‌سازی</span>
                                        </button>
                                        <div class="user-menu-divider"></div>
                                        <button class="user-menu-item text-danger" data-action="logout">
                                            <i class="fas fa-sign-out-alt"></i>
                                            <span>خروج</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <button class="mobile-menu-toggle" id="mobile-menu-toggle">
                                <i class="fas fa-bars"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        `);
    }

    attachEvents() {
        // Theme toggle
        const themeToggle = this.element.querySelector('#theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // User menu toggle
        const userMenuTrigger = this.element.querySelector('#user-menu-trigger');
        const userMenu = this.element.querySelector('#user-menu');
        
        if (userMenuTrigger && userMenu) {
            userMenuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.element.contains(e.target)) {
                    this.closeUserMenu();
                }
            });
        }

        // User menu actions
        const menuItems = this.element.querySelectorAll('.user-menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleUserMenuAction(action);
                this.closeUserMenu();
            });
        });

        // Mobile menu toggle
        const mobileMenuToggle = this.element.querySelector('#mobile-menu-toggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Connection status updates
        this.updateConnectionStatus();
        setInterval(() => {
            this.updateConnectionStatus();
        }, 30000); // Update every 30 seconds
    }

    toggleTheme() {
        const themeToggle = this.element.querySelector('#theme-toggle i');
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('vibrate_theme', newTheme);
        
        if (themeToggle) {
            themeToggle.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
        
        uiUtils.showNotification(`تم ${newTheme === 'light' ? 'روشن' : 'تیره'} فعال شد`, 'info', 1500);
    }

    toggleUserMenu() {
        const userMenu = this.element.querySelector('#user-menu');
        const arrow = this.element.querySelector('.user-menu-arrow');
        
        if (userMenu) {
            this.userMenuVisible = !this.userMenuVisible;
            
            if (this.userMenuVisible) {
                userMenu.classList.add('active');
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            } else {
                userMenu.classList.remove('active');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        }
    }

    closeUserMenu() {
        const userMenu = this.element.querySelector('#user-menu');
        const arrow = this.element.querySelector('.user-menu-arrow');
        
        if (userMenu && this.userMenuVisible) {
            this.userMenuVisible = false;
            userMenu.classList.remove('active');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    }

    toggleMobileMenu() {
        // This would integrate with Navigation component
        const event = new CustomEvent('toggle-mobile-menu');
        document.dispatchEvent(event);
    }

    handleUserMenuAction(action) {
        switch (action) {
            case 'profile':
                this.showProfileModal();
                break;
            case 'settings':
                this.navigateToSettings();
                break;
            case 'sync':
                this.syncData();
                break;
            case 'logout':
                this.logout();
                break;
        }
    }

    async showProfileModal() {
        const { Modal } = await import('../Common/Modal.js');
        const { default: authService } = await import('../../services/authService.js');
        
        const user = authService.getCurrentUserProfile();
        
        const modal = new Modal({
            title: 'ویرایش پروفایل',
            content: this.createProfileForm(user),
            size: 'medium'
        });
        
        modal
            .addButton('ذخیره', 'btn btn-success', async () => {
                await this.saveProfile(modal);
            })
            .addButton('انصراف', 'btn btn-secondary', () => {
                modal.destroy();
            })
            .open();
    }

    createProfileForm(user) {
        return html`
            <form id="profile-form">
                <div class="form-group">
                    <label class="form-label">نام کامل:</label>
                    <input type="text" class="form-control" id="profile-name" 
                           value="${user?.full_name || ''}" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">نقش:</label>
                    <select class="form-control" id="profile-role">
                        <option value="operator" ${user?.role === 'operator' ? 'selected' : ''}>اپراتور</option>
                        <option value="technician" ${user?.role === 'technician' ? 'selected' : ''}>تکنسین</option>
                        <option value="engineer" ${user?.role === 'engineer' ? 'selected' : ''}>مهندس</option>
                        <option value="supervisor" ${user?.role === 'supervisor' ? 'selected' : ''}>سرپرست</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">تغییر رمز عبور (اختیاری):</label>
                    <input type="password" class="form-control" id="profile-password" 
                           placeholder="رمز عبور جدید">
                </div>
            </form>
        `;
    }

    async saveProfile(modal) {
        const { default: authService } = await import('../../services/authService.js');
        
        const form = document.getElementById('profile-form');
        const formData = new FormData(form);
        
        const profileData = {
            fullName: document.getElementById('profile-name').value,
            role: document.getElementById('profile-role').value
        };
        
        const password = document.getElementById('profile-password').value;
        
        try {
            await authService.updateProfile(profileData);
            
            if (password) {
                await authService.updatePassword(password);
            }
            
            this.updateUserInfo();
            modal.destroy();
            uiUtils.showNotification('پروفایل با موفقیت به‌روزرسانی شد', 'success');
            
        } catch (error) {
            uiUtils.showNotification(error.message, 'error');
        }
    }

    navigateToSettings() {
        const event = new CustomEvent('navigate-to-section', {
            detail: { section: 'settings' }
        });
        document.dispatchEvent(event);
    }

    async syncData() {
        const { default: dataService } = await import('../../services/dataService.js');
        const { default: LoadingSpinner } = await import('../Common/LoadingSpinner.js');
        
        const syncItem = this.element.querySelector('#sync-menu-item');
        const originalContent = syncItem.innerHTML;
        
        try {
            syncItem.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>در حال همگام‌سازی...</span>';
            syncItem.disabled = true;
            
            const result = await dataService.syncToServer();
            uiUtils.showNotification(result.message, 'success');
            
        } catch (error) {
            uiUtils.showNotification(error.message, 'error');
        } finally {
            syncItem.innerHTML = originalContent;
            syncItem.disabled = false;
        }
    }

    async logout() {
        const { modalUtils } = await import('../Common/Modal.js');
        
        const confirmed = await modalUtils.confirm(
            'آیا از خروج از سیستم اطمینان دارید؟',
            'تایید خروج'
        );
        
        if (confirmed) {
            const { default: authService } = await import('../../services/authService.js');
            
            try {
                await authService.logout();
                // Redirect to login or refresh page
                window.location.href = '/login.html';
            } catch (error) {
                uiUtils.showNotification(error.message, 'error');
            }
        }
    }

    updateUserInfo() {
        // This would be called when user data changes
        const getUserData = async () => {
            const { default: authService } = await import('../../services/authService.js');
            
            const user = authService.getCurrentUser();
            const profile = authService.getCurrentUserProfile();
            
            if (user && profile) {
                // Update user name
                const userNameElements = this.element.querySelectorAll('#user-name, #user-menu-name');
                userNameElements.forEach(el => {
                    el.textContent = profile.full_name || user.email;
                });
                
                // Update user role
                const roleElement = this.element.querySelector('#user-menu-role');
                if (roleElement) {
                    const roleLabels = {
                        operator: 'اپراتور',
                        technician: 'تکنسین',
                        engineer: 'مهندس',
                        supervisor: 'سرپرست'
                    };
                    roleElement.textContent = roleLabels[profile.role] || profile.role;
                }
                
                // Update avatar
                const avatarElements = this.element.querySelectorAll('#user-avatar, #user-menu-avatar');
                avatarElements.forEach(avatar => {
                    if (profile.full_name) {
                        avatar.innerHTML = profile.full_name.charAt(0).toUpperCase();
                    } else {
                        avatar.innerHTML = '<i class="fas fa-user"></i>';
                    }
                });
                
                // Show sync option for authenticated users
                const syncItem = this.element.querySelector('#sync-menu-item');
                if (syncItem) {
                    syncItem.style.display = 'flex';
                }
            } else {
                // Guest user
                const userNameElements = this.element.querySelectorAll('#user-name, #user-menu-name');
                userNameElements.forEach(el => {
                    el.textContent = 'کاربر میهمان';
                });
                
                const roleElement = this.element.querySelector('#user-menu-role');
                if (roleElement) {
                    roleElement.textContent = 'کاربر مهمان';
                }
                
                // Hide sync option
                const syncItem = this.element.querySelector('#sync-menu-item');
                if (syncItem) {
                    syncItem.style.display = 'none';
                }
            }
        };
        
        getUserData();
    }

    async updateConnectionStatus() {
        const connectionIcon = this.element.querySelector('#connection-icon');
        const connectionStatus = this.element.querySelector('#connection-status');
        
        if (!connectionIcon || !connectionStatus) return;
        
        try {
            const { supabaseHelpers } = await import('../../services/supabaseClient.js');
            const { default: authService } = await import('../../services/authService.js');
            
            const isOnline = navigator.onLine;
            const isConnected = isOnline && await supabaseHelpers.checkConnection();
            const isAuthenticated = authService.isAuthenticated();
            
            if (isAuthenticated && isConnected) {
                connectionIcon.className = 'fas fa-wifi';
                connectionIcon.style.color = 'var(--success-color)';
                connectionStatus.title = 'آنلاین و متصل به سرور';
            } else if (isOnline && !isAuthenticated) {
                connectionIcon.className = 'fas fa-wifi';
                connectionIcon.style.color = 'var(--warning-color)';
                connectionStatus.title = 'آنلاین اما وارد نشده';
            } else if (!isOnline) {
                connectionIcon.className = 'fas fa-wifi-slash';
                connectionIcon.style.color = 'var(--error-color)';
                connectionStatus.title = 'آفلاین';
            } else {
                connectionIcon.className = 'fas fa-exclamation-triangle';
                connectionIcon.style.color = 'var(--warning-color)';
                connectionStatus.title = 'مشکل در اتصال به سرور';
            }
        } catch (error) {
            console.error('Error updating connection status:', error);
            connectionIcon.className = 'fas fa-question-circle';
            connectionIcon.style.color = 'var(--text-muted)';
            connectionStatus.title = 'وضعیت اتصال نامشخص';
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

export default Header;