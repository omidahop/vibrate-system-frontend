import { APP_CONFIG } from '../utils/constants.js';
import { uiUtils, storageUtils } from '../utils/helpers.js';
import { eventBus } from '../utils/reactUtils.js';

// Import Components
import Header from '../components/Layout/Header.js';
import Navigation from '../components/Layout/Navigation.js';
import Footer from '../components/Layout/Footer.js';
import DataEntryForm from '../components/DataEntry/DataEntryForm.js';
import Charts from '../components/Dashboard/Charts.js';
import Analysis from '../components/Dashboard/Analysis.js';
import DatabaseStats from '../components/Dashboard/DatabaseStats.js';

class VibrateApp {
    constructor() {
        this.currentSection = 'data-entry';
        this.components = {};
        this.isInitialized = false;
        this.authService = null;
        this.dataService = null;
        this.realtimeService = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Vibrate System App v' + APP_CONFIG.version);
            
            // Load core services
            await this.loadServices();
            
            // Initialize layout components
            await this.initializeLayout();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Handle initial route
            this.handleInitialRoute();
            
            // Load initial content
            await this.loadSection(this.currentSection);
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Hide loading screen
            window.hideLoadingScreen();
            
            console.log('✅ App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            window.showErrorMessage('خطا در راه‌اندازی برنامه: ' + error.message);
        }
    }

    async loadServices() {
        try {
            // Load authentication service
            const { default: AuthService } = await import('../services/authService.js');
            this.authService = AuthService;
            
            // Load data service
            const { default: DataService } = await import('../services/dataService.js');
            this.dataService = DataService;
            
            // Load realtime service
            const { default: RealtimeService } = await import('../services/realtimeService.js');
            this.realtimeService = RealtimeService;
            
            console.log('✅ Services loaded');
        } catch (error) {
            console.error('❌ Failed to load services:', error);
            throw new Error('خطا در بارگذاری سرویس‌ها');
        }
    }

    async initializeLayout() {
        try {
            // Header
            this.components.header = new Header({
                title: APP_CONFIG.version ? `سیستم ویبره v${APP_CONFIG.version}` : 'سیستم ویبره'
            });
            this.components.header.mount('header-container');
            
            // Navigation
            this.components.navigation = new Navigation({
                currentSection: this.currentSection,
                onSectionChange: (section) => {
                    this.navigateToSection(section);
                }
            });
            this.components.navigation.mount('navigation-container');
            
            // Footer
            this.components.footer = new Footer({
                showVersion: true,
                showStatus: true
            });
            this.components.footer.mount('footer-container');
            
            console.log('✅ Layout components initialized');
        } catch (error) {
            console.error('❌ Failed to initialize layout:', error);
            throw new Error('خطا در راه‌اندازی رابط کاربری');
        }
    }

    setupEventListeners() {
        // Navigation events
        eventBus.on('section-changed', (data) => {
            this.handleSectionChange(data.section);
        });
        
        // Auth events
        eventBus.on('auth-changed', (data) => {
            this.handleAuthChange(data);
        });
        
        // Data sync events
        eventBus.on('data-synced', (data) => {
            this.handleDataSync(data);
        });
        
        // Network status events
        window.addEventListener('online', () => {
            this.handleNetworkChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.handleNetworkChange(false);
        });
        
        // Window events
        window.addEventListener('beforeunload', (e) => {
            this.handleBeforeUnload(e);
        });
        
        window.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // Service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event);
            });
        }
        
        console.log('✅ Event listeners setup');
    }

    handleInitialRoute() {
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        const action = urlParams.get('action');
        
        if (section && this.isValidSection(section)) {
            this.currentSection = section;
        }
        
        if (action === 'new-entry') {
            this.currentSection = 'data-entry';
        }
        
        // Update navigation active state
        if (this.components.navigation) {
            this.components.navigation.setActiveSection(this.currentSection);
        }
        
        console.log(`🔗 Initial route: ${this.currentSection}`);
    }

    async loadSection(sectionId) {
        try {
            const contentContainer = document.getElementById('content-container');
            if (!contentContainer) return;
            
            // Show loading
            contentContainer.innerHTML = `
                <div class="section-loading">
                    <div class="loading-spinner">
                        <div class="spinner">
                            <div class="spinner-dot"></div>
                            <div class="spinner-dot"></div>
                            <div class="spinner-dot"></div>
                            <div class="spinner-dot"></div>
                        </div>
                    </div>
                    <div class="loading-text">در حال بارگذاری ${this.getSectionTitle(sectionId)}...</div>
                </div>
            `;
            
            // Cleanup previous components
            this.cleanupSectionComponents();
            
            // Load section component
            let component;
            
            switch (sectionId) {
                case 'data-entry':
                    component = await this.loadDataEntrySection();
                    break;
                    
                case 'view-data':
                    component = await this.loadViewDataSection();
                    break;
                    
                case 'charts':
                    component = await this.loadChartsSection();
                    break;
                    
                case 'analysis':
                    component = await this.loadAnalysisSection();
                    break;
                    
                case 'slideshow':
                    component = await this.loadSlideshowSection();
                    break;
                    
                case 'database':
                    component = await this.loadDatabaseSection();
                    break;
                    
                case 'settings':
                    component = await this.loadSettingsSection();
                    break;
                    
                default:
                    throw new Error(`بخش نامعتبر: ${sectionId}`);
            }
            
            // Clear loading and mount component
            contentContainer.innerHTML = '';
            
            if (component) {
                component.mount(contentContainer);
                this.components.currentSection = component;
            }
            
            // Update page title
            this.updatePageTitle(sectionId);
            
            console.log(`✅ Section loaded: ${sectionId}`);
            
        } catch (error) {
            console.error(`❌ Failed to load section ${sectionId}:`, error);
            this.showSectionError(sectionId, error);
        }
    }

    async loadDataEntrySection() {
        const dataEntryForm = new DataEntryForm({
            autoSave: false,
            onDataSave: async (data) => {
                try {
                    const result = await this.dataService.saveData(data);
                    if (result.success) {
                        // Update navigation badge for view-data section
                        this.updateSectionBadge('view-data');
                        
                        // Show success notification
                        uiUtils.showNotification('داده با موفقیت ذخیره شد', 'success');
                        
                        return result;
                    }
                } catch (error) {
                    throw error;
                }
            },
            onUnitChange: (unit) => {
                // Update URL parameter
                this.updateURLParameter('unit', unit);
            }
        });
        
        return dataEntryForm;
    }

    async loadViewDataSection() {
        // Create a custom view data component
        const viewDataContainer = document.createElement('div');
        viewDataContainer.className = 'view-data-container';
        
        // Add filters and data table
        viewDataContainer.innerHTML = `
            <div class="view-data-header">
                <h2>
                    <i class="fas fa-table"></i>
                    مشاهده داده‌ها
                </h2>
                <div class="view-actions">
                    <button class="btn btn-secondary" id="export-data-btn">
                        <i class="fas fa-download"></i>
                        دانلود داده‌ها
                    </button>
                    <button class="btn btn-primary" id="refresh-data-btn">
                        <i class="fas fa-sync"></i>
                        به‌روزرسانی
                    </button>
                </div>
            </div>
            
            <div class="view-data-filters">
                <!-- Data filters will be added here -->
            </div>
            
            <div class="view-data-table">
                <!-- Data table will be generated here -->
            </div>
        `;
        
        // Add event listeners and load data
        this.setupViewDataEvents(viewDataContainer);
        await this.loadViewData(viewDataContainer);
        
        return {
            mount: (container) => {
                container.appendChild(viewDataContainer);
            },
            destroy: () => {
                if (viewDataContainer.parentNode) {
                    viewDataContainer.parentNode.removeChild(viewDataContainer);
                }
            }
        };
    }

    async loadChartsSection() {
        if (!this.authService.isAuthenticated()) {
            return this.createAuthRequiredComponent('نمودارها');
        }
        
        const charts = new Charts({
            defaultTimeRange: 7,
            allowMultipleParameters: true,
            onFilterChange: (filters, data) => {
                // Update URL with filters
                this.updateURLParameters(filters);
            }
        });
        
        return charts;
    }

    async loadAnalysisSection() {
        if (!this.authService.isAuthenticated()) {
            return this.createAuthRequiredComponent('آنالیز');
        }
        
        const analysis = new Analysis({
            onAlertClick: (alertData) => {
                if (alertData.type === 'show_chart') {
                    // Navigate to charts with specific filters
                    this.navigateToSection('charts', {
                        unit: alertData.unit,
                        equipment: alertData.equipment,
                        parameters: [alertData.parameterId]
                    });
                }
            }
        });
        
        return analysis;
    }

    async loadSlideshowSection() {
        // Create slideshow component
        const slideshowContainer = document.createElement('div');
        slideshowContainer.className = 'slideshow-container';
        slideshowContainer.innerHTML = `
            <div class="slideshow-header">
                <h2>
                    <i class="fas fa-play"></i>
                    اسلایدشو داده‌ها
                </h2>
                <div class="slideshow-controls">
                    <button class="btn btn-primary" id="start-slideshow-btn">
                        <i class="fas fa-play"></i>
                        شروعاسلایدشو
                    </button>
                    <button class="btn btn-secondary" id="fullscreen-btn">
                        <i class="fas fa-expand"></i>
                        تمام صفحه
                    </button>
                </div>
            </div>
            
            <div class="slideshow-settings">
                <!-- Slideshow settings -->
            </div>
            
            <div class="slideshow-viewer">
                <div class="slideshow-message">
                    <i class="fas fa-play-circle"></i>
                    <h3>آماده برای شروع اسلایدشو</h3>
                    <p>دکمه شروع را برای نمایش اسلایدشو فشار دهید</p>
                </div>
            </div>
        `;
        
        return {
            mount: (container) => {
                container.appendChild(slideshowContainer);
                this.setupSlideshowEvents(slideshowContainer);
            },
            destroy: () => {
                if (slideshowContainer.parentNode) {
                    slideshowContainer.parentNode.removeChild(slideshowContainer);
                }
            }
        };
    }

    async loadDatabaseSection() {
        const databaseStats = new DatabaseStats({
            refreshInterval: 30000,
            showDetailedStats: true,
            onStatsUpdate: (stats, syncStatus) => {
                // Update navigation badges
                this.updateNavigationBadges(stats);
            }
        });
        
        return databaseStats;
    }

    async loadSettingsSection() {
        // Create settings component
        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'settings-container';
        settingsContainer.innerHTML = await this.generateSettingsHTML();
        
        return {
            mount: (container) => {
                container.appendChild(settingsContainer);
                this.setupSettingsEvents(settingsContainer);
                this.loadCurrentSettings(settingsContainer);
            },
            destroy: () => {
                if (settingsContainer.parentNode) {
                    settingsContainer.parentNode.removeChild(settingsContainer);
                }
            }
        };
    }

    createAuthRequiredComponent(sectionName) {
        const authRequiredContainer = document.createElement('div');
        authRequiredContainer.className = 'auth-required-container';
        authRequiredContainer.innerHTML = `
            <div class="auth-required-content">
                <div class="auth-required-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h3>ورود به سیستم مورد نیاز</h3>
                <p>برای استفاده از بخش ${sectionName} باید وارد سیستم شوید</p>
                <div class="auth-required-actions">
                    <a href="/login.html" class="btn btn-primary">
                        <i class="fas fa-sign-in-alt"></i>
                        ورود به سیستم
                    </a>
                    <button class="btn btn-secondary" onclick="history.back()">
                        <i class="fas fa-arrow-right"></i>
                        بازگشت
                    </button>
                </div>
                
                <div class="offline-alternative">
                    <h4>قابلیت‌های آفلاین</h4>
                    <p>در حالت آفلاین می‌توانید از این قابلیت‌ها استفاده کنید:</p>
                    <ul>
                        <li>ثبت داده‌های جدید</li>
                        <li>مشاهده داده‌های محلی</li>
                        <li>مدیریت تنظیمات</li>
                    </ul>
                </div>
            </div>
        `;
        
        return {
            mount: (container) => {
                container.appendChild(authRequiredContainer);
            },
            destroy: () => {
                if (authRequiredContainer.parentNode) {
                    authRequiredContainer.parentNode.removeChild(authRequiredContainer);
                }
            }
        };
    }

    // Event Handlers
    async navigateToSection(sectionId, params = {}) {
        if (!this.isValidSection(sectionId)) {
            console.error('Invalid section:', sectionId);
            return;
        }
        
        if (this.currentSection === sectionId) {
            return;
        }
        
        this.currentSection = sectionId;
        
        // Update URL
        this.updateURL(sectionId, params);
        
        // Update navigation
        if (this.components.navigation) {
            this.components.navigation.setActiveSection(sectionId);
        }
        
        // Load section content
        await this.loadSection(sectionId);
        
        console.log(`🔄 Navigated to: ${sectionId}`);
    }

    handleSectionChange(sectionId) {
        this.navigateToSection(sectionId);
    }

    handleAuthChange(data) {
        console.log('Auth state changed:', data);
        
        // Refresh components that depend on auth
        if (this.components.navigation) {
            this.components.navigation.updateAuthState();
        }
        
        if (this.components.header) {
            this.components.header.updateUserInfo();
        }
        
        // Reload current section if it requires auth
        const authRequiredSections = ['charts', 'analysis'];
        if (authRequiredSections.includes(this.currentSection)) {
            this.loadSection(this.currentSection);
        }
    }

    handleDataSync(data) {
        console.log('Data synced:', data);
        
        // Update badges and stats
        this.updateNavigationBadges();
        
        // Show notification
        if (data.success && data.syncedCount > 0) {
            uiUtils.showNotification(
                `${data.syncedCount} رکورد همگام‌سازی شد`,
                'success'
            );
        }
    }

    handleNetworkChange(isOnline) {
        console.log('Network status changed:', isOnline ? 'online' : 'offline');
        
        if (isOnline) {
            uiUtils.showNotification('اتصال اینترنت برقرار شد', 'info', 2000);
            
            // Try to sync pending data
            if (this.authService.isAuthenticated()) {
                this.dataService.syncToServer().catch(error => {
                    console.error('Auto-sync failed:', error);
                });
            }
        } else {
            uiUtils.showNotification(
                'اتصال اینترنت قطع شد. برنامه در حالت آفلاین ادامه می‌دهد',
                'warning',
                4000
            );
        }
    }

    handleBeforeUnload(e) {
        // Check if there are unsaved changes
        if (this.components.currentSection && 
            typeof this.components.currentSection.hasUnsavedChanges === 'function' &&
            this.components.currentSection.hasUnsavedChanges()) {
            
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden
            console.log('Page hidden');
        } else {
            // Page is visible
            console.log('Page visible');
            
            // Refresh current section
            if (this.components.currentSection && 
                typeof this.components.currentSection.refresh === 'function') {
                this.components.currentSection.refresh();
            }
        }
    }

    handleServiceWorkerMessage(event) {
        console.log('Service worker message:', event.data);
        
        if (event.data.type === 'UPDATE_AVAILABLE') {
            this.showUpdateAvailableNotification();
        }
    }

    // Helper Methods
    isValidSection(sectionId) {
        const validSections = ['data-entry', 'view-data', 'charts', 'analysis', 'slideshow', 'database', 'settings'];
        return validSections.includes(sectionId);
    }

    getSectionTitle(sectionId) {
        const titles = {
            'data-entry': 'ثبت داده',
            'view-data': 'مشاهده داده‌ها',
            'charts': 'نمودارها',
            'analysis': 'آنالیز',
            'slideshow': 'اسلایدشو',
            'database': 'دیتابیس',
            'settings': 'تنظیمات'
        };
        return titles[sectionId] || sectionId;
    }

    updatePageTitle(sectionId) {
        const sectionTitle = this.getSectionTitle(sectionId);
        document.title = `${sectionTitle} - سیستم ویبره`;
    }

    updateURL(sectionId, params = {}) {
        const url = new URL(window.location);
        url.searchParams.set('section', sectionId);
        
        // Add additional parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            }
        });
        
        window.history.replaceState({}, '', url);
    }

    updateURLParameter(key, value) {
        const url = new URL(window.location);
        if (value) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
        window.history.replaceState({}, '', url);
    }

    updateURLParameters(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value && value !== '') {
                url.searchParams.set(key, Array.isArray(value) ? value.join(',') : value);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.replaceState({}, '', url);
    }

    cleanupSectionComponents() {
        if (this.components.currentSection && 
            typeof this.components.currentSection.destroy === 'function') {
            this.components.currentSection.destroy();
            this.components.currentSection = null;
        }
    }

    showSectionError(sectionId, error) {
        const contentContainer = document.getElementById('content-container');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="section-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>خطا در بارگذاری ${this.getSectionTitle(sectionId)}</h3>
                    <p class="error-message">${error.message}</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="location.reload()">
                            <i class="fas fa-redo"></i>
                            تلاش مجدد
                        </button>
                        <button class="btn btn-secondary" onclick="history.back()">
                            <i class="fas fa-arrow-right"></i>
                            بازگشت
                        </button>
                    </div>
                </div>
            `;
        }
    }

    updateNavigationBadges(stats = null) {
        if (!this.components.navigation) return;
        
        // Update badges based on stats or fetch them
        if (stats) {
            // Update view-data badge with local data count
            if (stats.local && stats.local.totalRecords > 0) {
                this.components.navigation.addBadge('view-data', stats.local.totalRecords, 'info');
            } else {
                this.components.navigation.removeBadge('view-data');
            }
            
            // Update database badge with pending sync count
            if (stats.local && stats.local.pendingSync > 0) {
                this.components.navigation.addBadge('database', stats.local.pendingSync, 'warning');
            } else {
                this.components.navigation.removeBadge('database');
            }
        }
    }

    updateSectionBadge(sectionId) {
        // Simple badge update - could be expanded based on needs
        if (this.components.navigation) {
            // Add a temporary badge to indicate new data
            this.components.navigation.addBadge(sectionId, 'جدید', 'success');
            
            // Remove badge after 3 seconds
            setTimeout(() => {
                this.components.navigation.removeBadge(sectionId);
            }, 3000);
        }
    }

    showUpdateAvailableNotification() {
        uiUtils.showNotification(
            'نسخه جدید برنامه در دسترس است.',
            'info',
            0, // Persistent
            () => {
                // Reload page to update
                window.location.reload();
            }
        );
    }

    // Cleanup
    destroy() {
        // Cleanup all components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        // Remove event listeners
        eventBus.removeAllListeners();
        
        console.log('🧹 App destroyed');
    }
}

// Initialize app
export function initializeApp() {
    // Create global app instance
    window.vibrateApp = new VibrateApp();
    return window.vibrateApp;
}

// Export for module usage
export default VibrateApp;