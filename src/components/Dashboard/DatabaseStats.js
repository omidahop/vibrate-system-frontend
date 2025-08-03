import { createElement, html } from '../../utils/reactUtils.js';
import { APP_CONFIG } from '../../utils/constants.js';
import { dateUtils } from '../../utils/helpers.js';
import LoadingSpinner from '../Common/LoadingSpinner.js';

export class DatabaseStats {
    constructor(options = {}) {
        this.refreshInterval = options.refreshInterval || 30000; // 30 seconds
        this.showDetailedStats = options.showDetailedStats !== false;
        this.showRecentEntries = options.showRecentEntries !== false;
        this.onStatsUpdate = options.onStatsUpdate || null;
        this.element = null;
        this.stats = null;
        this.refreshTimer = null;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        this.loadStats();
        this.startAutoRefresh();
    }

    create() {
        this.element = createElement(html`
            <div class="database-stats">
                <div class="stats-header">
                    <h3 class="stats-title">
                        <i class="fas fa-database"></i>
                        آمار دیتابیس
                    </h3>
                    <div class="stats-actions">
                        <button class="btn btn-sm btn-secondary" id="refresh-stats-btn">
                            <i class="fas fa-sync"></i>
                            به‌روزرسانی
                        </button>
                        <button class="btn btn-sm btn-info" id="export-stats-btn">
                            <i class="fas fa-download"></i>
                            دانلود آمار
                        </button>
                    </div>
                </div>

                <!-- Loading State -->
                <div class="stats-loading" id="stats-loading" style="display: none;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>در حال بارگذاری آمار...</span>
                </div>

                <!-- Overview Cards -->
                <div class="stats-overview">
                    <div class="stats-card total-records">
                        <div class="card-header">
                            <i class="fas fa-chart-bar"></i>
                            <span>کل رکوردها</span>
                        </div>
                        <div class="card-value" id="total-records">-</div>
                        <div class="card-subtitle">محلی + سرور</div>
                    </div>

                    <div class="stats-card pending-sync">
                        <div class="card-header">
                            <i class="fas fa-clock"></i>
                            <span>در انتظار همگام‌سازی</span>
                        </div>
                        <div class="card-value" id="pending-sync">-</div>
                        <div class="card-subtitle">رکوردهای محلی</div>
                    </div>

                    <div class="stats-card dri1-count">
                        <div class="card-header">
                            <i class="fas fa-industry" style="color: #3b82f6;"></i>
                            <span>DRI 1</span>
                        </div>
                        <div class="card-value" id="dri1-count">-</div>
                        <div class="card-subtitle">رکورد</div>
                    </div>

                    <div class="stats-card dri2-count">
                        <div class="card-header">
                            <i class="fas fa-industry" style="color: #ef4444;"></i>
                            <span>DRI 2</span>
                        </div>
                        <div class="card-value" id="dri2-count">-</div>
                        <div class="card-subtitle">رکورد</div>
                    </div>
                </div>

                <!-- Detailed Stats -->
                <div class="detailed-stats" ${this.showDetailedStats ? '' : 'style="display: none;"'}>
                    <!-- Local vs Server Stats -->
                    <div class="stats-section">
                        <h4 class="section-title">
                            <i class="fas fa-chart-pie"></i>
                            آمار محلی در مقابل سرور
                        </h4>
                        <div class="stats-comparison">
                            <div class="comparison-item local-stats">
                                <h5>دیتابیس محلی</h5>
                                <div class="stats-grid">
                                    <div class="stat-item">
                                        <span class="stat-label">کل رکوردها:</span>
                                        <span class="stat-value" id="local-total">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">DRI1:</span>
                                        <span class="stat-value" id="local-dri1">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">DRI2:</span>
                                        <span class="stat-value" id="local-dri2">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">در انتظار همگام‌سازی:</span>
                                        <span class="stat-value" id="local-pending">0</span>
                                    </div>
                                </div>
                            </div>

                            <div class="comparison-item server-stats">
                                <h5>سرور</h5>
                                <div class="stats-grid">
                                    <div class="stat-item">
                                        <span class="stat-label">کل رکوردها:</span>
                                        <span class="stat-value" id="server-total">-</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">DRI1:</span>
                                        <span class="stat-value" id="server-dri1">-</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">DRI2:</span>
                                        <span class="stat-value" id="server-dri2">-</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">وضعیت اتصال:</span>
                                        <span class="stat-value connection-status" id="connection-status">بررسی...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Equipment Stats -->
                    <div class="stats-section">
                        <h4 class="section-title">
                            <i class="fas fa-cogs"></i>
                            آمار تجهیزات
                        </h4>
                        <div class="equipment-stats" id="equipment-stats">
                            <!-- Equipment statistics will be generated here -->
                        </div>
                    </div>

                    <!-- Parameters Stats -->
                    <div class="stats-section">
                        <h4 class="section-title">
                            <i class="fas fa-sliders-h"></i>
                            آمار پارامترها
                        </h4>
                        <div class="parameters-stats" id="parameters-stats">
                            <!-- Parameters statistics will be generated here -->
                        </div>
                    </div>
                </div>

                <!-- Recent Entries -->
                <div class="recent-entries-section" ${this.showRecentEntries ? '' : 'style="display: none;"'}>
                    <h4 class="section-title">
                        <i class="fas fa-history"></i>
                        آخرین ورودی‌ها
                        <span class="entries-count" id="entries-count">(10 مورد)</span>
                    </h4>
                    <div class="recent-entries" id="recent-entries">
                        <!-- Recent entries will be generated here -->
                    </div>
                </div>

                <!-- Sync Information -->
                <div class="sync-info-section">
                    <h4 class="section-title">
                        <i class="fas fa-sync"></i>
                        اطلاعات همگام‌سازی
                    </h4>
                    <div class="sync-info">
                        <div class="sync-item">
                            <span class="sync-label">آخرین همگام‌سازی:</span>
                            <span class="sync-value" id="last-sync-time">هرگز</span>
                        </div>
                        <div class="sync-item">
                            <span class="sync-label">وضعیت احراز هویت:</span>
                            <span class="sync-value" id="auth-status">بررسی...</span>
                        </div>
                        <div class="sync-item">
                            <span class="sync-label">اتصال به سرور:</span>
                            <span class="sync-value" id="server-connection">بررسی...</span>
                        </div>
                    </div>
                </div>

                <!-- Last Update Info -->
                <div class="update-info">
                    <div class="update-time">
                        آخرین به‌روزرسانی: <span id="last-update-time">-</span>
                    </div>
                    <div class="auto-refresh-info">
                        به‌روزرسانی خودکار هر ${this.refreshInterval / 1000} ثانیه
                    </div>
                </div>
            </div>
        `);
    }

    attachEvents() {
        // Refresh button
        const refreshBtn = this.element.querySelector('#refresh-stats-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadStats(true);
            });
        }

        // Export button
        const exportBtn = this.element.querySelector('#export-stats-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportStats();
            });
        }

        // Click events for cards (show details)
        const statsCards = this.element.querySelectorAll('.stats-card');
        statsCards.forEach(card => {
            card.addEventListener('click', () => {
                this.showCardDetails(card);
            });
        });
    }

    async loadStats(forceRefresh = false) {
        if (this.isLoading && !forceRefresh) return;

        try {
            this.setLoading(true);

            const { default: dataService } = await import('../../services/dataService.js');
            const { default: authService } = await import('../../services/authService.js');

            // Get database statistics
            this.stats = await dataService.getDatabaseStats();
            
            // Get sync status
            const syncStatus = dataService.getSyncStatus();
            
            // Get authentication status
            const isAuthenticated = authService.isAuthenticated();

            // Update UI
            this.updateOverviewCards();
            if (this.showDetailedStats) {
                this.updateDetailedStats();
            }
            if (this.showRecentEntries) {
                this.updateRecentEntries();
            }
            this.updateSyncInfo(syncStatus, isAuthenticated);
            this.updateTimestamp();

            // Notify parent
            if (this.onStatsUpdate) {
                this.onStatsUpdate(this.stats, syncStatus);
            }

        } catch (error) {
            console.error('Error loading database stats:', error);
            this.showError();
        } finally {
            this.setLoading(false);
        }
    }

    updateOverviewCards() {
        if (!this.stats) return;

        // Total records
        const totalRecords = (this.stats.local?.totalRecords || 0) + (this.stats.server?.totalRecords || 0);
        this.updateElement('#total-records', totalRecords.toLocaleString('fa-IR'));

        // Pending sync
        this.updateElement('#pending-sync', (this.stats.local?.pendingSync || 0).toLocaleString('fa-IR'));

        // DRI counts (combined local + server)
        const dri1Total = (this.stats.local?.byUnit?.DRI1 || 0) + (this.stats.server?.byUnit?.DRI1 || 0);
        const dri2Total = (this.stats.local?.byUnit?.DRI2 || 0) + (this.stats.server?.byUnit?.DRI2 || 0);
        
        this.updateElement('#dri1-count', dri1Total.toLocaleString('fa-IR'));
        this.updateElement('#dri2-count', dri2Total.toLocaleString('fa-IR'));
    }

    updateDetailedStats() {
        if (!this.stats) return;

        // Local stats
        this.updateElement('#local-total', (this.stats.local?.totalRecords || 0).toLocaleString('fa-IR'));
        this.updateElement('#local-dri1', (this.stats.local?.byUnit?.DRI1 || 0).toLocaleString('fa-IR'));
        this.updateElement('#local-dri2', (this.stats.local?.byUnit?.DRI2 || 0).toLocaleString('fa-IR'));
        this.updateElement('#local-pending', (this.stats.local?.pendingSync || 0).toLocaleString('fa-IR'));

        // Server stats
        if (this.stats.server) {
            this.updateElement('#server-total', this.stats.server.totalRecords.toLocaleString('fa-IR'));
            this.updateElement('#server-dri1', this.stats.server.byUnit.DRI1.toLocaleString('fa-IR'));
            this.updateElement('#server-dri2', this.stats.server.byUnit.DRI2.toLocaleString('fa-IR'));
            
            const connectionStatus = this.element.querySelector('#connection-status');
            if (connectionStatus) {
                connectionStatus.textContent = 'متصل';
                connectionStatus.className = 'stat-value connection-status connected';
            }
        } else {
            this.updateElement('#server-total', 'غیرقابل دسترس');
            this.updateElement('#server-dri1', '-');
            this.updateElement('#server-dri2', '-');
            
            const connectionStatus = this.element.querySelector('#connection-status');
            if (connectionStatus) {
                connectionStatus.textContent = 'قطع شده';
                connectionStatus.className = 'stat-value connection-status disconnected';
            }
        }

        // Equipment stats
        this.updateEquipmentStats();
        
        // Parameters stats
        this.updateParametersStats();
    }

    updateEquipmentStats() {
        const equipmentStatsContainer = this.element.querySelector('#equipment-stats');
        if (!equipmentStatsContainer || !this.stats) return;

        // Calculate equipment statistics from available data
        const equipmentStats = this.calculateEquipmentStats();

        if (Object.keys(equipmentStats).length === 0) {
            equipmentStatsContainer.innerHTML = html`
                <div class="no-equipment-stats">
                    <span>آماری برای تجهیزات موجود نیست</span>
                </div>
            `;
            return;
        }

        equipmentStatsContainer.innerHTML = Object.entries(equipmentStats)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, 10) // Top 10 equipments
            .map(([equipmentId, stats]) => {
                const equipmentInfo = APP_CONFIG.equipments.find(eq => eq.id === equipmentId);
                const equipmentName = equipmentInfo?.name || equipmentId;
                
                return html`
                    <div class="equipment-stat-item">
                        <div class="equipment-info">
                            <div class="equipment-icon" style="color: ${equipmentInfo?.color || '#6b7280'};">
                                <i class="${equipmentInfo?.icon || 'fas fa-cog'}"></i>
                            </div>
                            <div class="equipment-name">${equipmentName}</div>
                        </div>
                        <div class="equipment-counts">
                            <div class="count-item">
                                <span class="count-value">${stats.total}</span>
                                <span class="count-label">کل</span>
                            </div>
                            <div class="count-item">
                                <span class="count-value">${stats.recent || 0}</span>
                                <span class="count-label">اخیر</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
    }

    updateParametersStats() {
        const parametersStatsContainer = this.element.querySelector('#parameters-stats');
        if (!parametersStatsContainer) return;

        // Calculate parameter usage statistics
        const parameterStats = this.calculateParameterStats();

        parametersStatsContainer.innerHTML = APP_CONFIG.parameters.map(parameter => {
            const stats = parameterStats[parameter.id] || { count: 0, avgValue: 0 };
            
            return html`
                <div class="parameter-stat-item">
                    <div class="parameter-info">
                        <div class="parameter-icon" style="color: ${parameter.color};">
                            <i class="${parameter.icon}"></i>
                        </div>
                        <div class="parameter-details">
                            <div class="parameter-name">${parameter.name}</div>
                            <div class="parameter-code">${parameter.code}</div>
                        </div>
                    </div>
                    <div class="parameter-stats-values">
                        <div class="stat-value">
                            <span class="value">${stats.count}</span>
                            <span class="label">ثبت</span>
                        </div>
                        <div class="stat-value">
                            <span class="value">${stats.avgValue.toFixed(1)}</span>
                            <span class="label">میانگین</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    calculateEquipmentStats() {
        // This is a simplified calculation
        // In a real scenario, you would analyze the actual data
        const stats = {};
        
        if (this.stats?.server?.recentEntries) {
            this.stats.server.recentEntries.forEach(entry => {
                if (!stats[entry.equipment]) {
                    stats[entry.equipment] = { total: 0, recent: 0 };
                }
                stats[entry.equipment].total++;
                
                // Count recent entries (last 7 days)
                const entryDate = new Date(entry.date);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                
                if (entryDate > sevenDaysAgo) {
                    stats[entry.equipment].recent++;
                }
            });
        }
        
        return stats;
    }

    calculateParameterStats() {
        // Simplified parameter statistics calculation
        const stats = {};
        
        // Initialize with zeros
        APP_CONFIG.parameters.forEach(param => {
            stats[param.id] = { count: 0, avgValue: 0, totalValue: 0 };
        });
        
        // This would normally analyze actual data from the database
        // For now, return placeholder stats
        return stats;
    }

    updateRecentEntries() {
        const recentEntriesContainer = this.element.querySelector('#recent-entries');
        if (!recentEntriesContainer) return;

        const recentEntries = this.stats?.server?.recentEntries || [];

        if (recentEntries.length === 0) {
            recentEntriesContainer.innerHTML = html`
                <div class="no-recent-entries">
                    <span>ورودی اخیری یافت نشد</span>
                </div>
            `;
            return;
        }

        recentEntriesContainer.innerHTML = recentEntries.map(entry => {
            const equipmentInfo = APP_CONFIG.equipments.find(eq => eq.id === entry.equipment);
            const unitInfo = APP_CONFIG.units.find(u => u.id === entry.unit);
            
            return html`
                <div class="recent-entry-item">
                    <div class="entry-info">
                        <div class="entry-equipment">
                            <div class="equipment-icon" style="color: ${equipmentInfo?.color || '#6b7280'};">
                                <i class="${equipmentInfo?.icon || 'fas fa-cog'}"></i>
                            </div>
                            <div class="equipment-details">
                                <div class="equipment-name">${equipmentInfo?.name || entry.equipment}</div>
                                <div class="unit-name" style="color: ${unitInfo?.color};">${unitInfo?.code}</div>
                            </div>
                        </div>
                        
                        <div class="entry-details">
                            <div class="entry-user">
                                <i class="fas fa-user"></i>
                                <span>${entry.userName}</span>
                            </div>
                            <div class="entry-date">
                                <i class="fas fa-calendar"></i>
                                <span>${dateUtils.formatDate(entry.date)}</span>
                            </div>
                            <div class="entry-time">
                                <i class="fas fa-clock"></i>
                                <span>${dateUtils.formatDateTime(entry.timestamp)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateSyncInfo(syncStatus, isAuthenticated) {
        // Last sync time
        const lastSyncTime = syncStatus.lastSync ? 
            dateUtils.formatDateTime(syncStatus.lastSync) : 'هرگز';
        this.updateElement('#last-sync-time', lastSyncTime);

        // Auth status
        const authStatus = this.element.querySelector('#auth-status');
        if (authStatus) {
            authStatus.textContent = isAuthenticated ? 'وارد شده' : 'وارد نشده';
            authStatus.className = `sync-value ${isAuthenticated ? 'authenticated' : 'not-authenticated'}`;
        }

        // Server connection
        const serverConnection = this.element.querySelector('#server-connection');
        if (serverConnection) {
            const isConnected = this.stats?.server !== null;
            serverConnection.textContent = isConnected ? 'متصل' : 'قطع شده';
            serverConnection.className = `sync-value ${isConnected ? 'connected' : 'disconnected'}`;
        }
    }

    updateTimestamp() {
        const lastUpdateTime = this.element.querySelector('#last-update-time');
        if (lastUpdateTime) {
            lastUpdateTime.textContent = dateUtils.formatDateTime(new Date());
        }
    }

    updateElement(selector, text) {
        const element = this.element.querySelector(selector);
        if (element) {
            element.textContent = text;
        }
    }

    showCardDetails(card) {
        // Show detailed information for the clicked card
        const cardClasses = card.className;
        let detailType = '';
        
        if (cardClasses.includes('total-records')) {
            detailType = 'total';
        } else if (cardClasses.includes('pending-sync')) {
            detailType = 'pending';
        } else if (cardClasses.includes('dri1-count')) {
            detailType = 'dri1';
        } else if (cardClasses.includes('dri2-count')) {
            detailType = 'dri2';
        }

        this.showDetailModal(detailType);
    }

    async showDetailModal(type) {
        const { Modal } = await import('../Common/Modal.js');

        let title = '';
        let content = '';

        switch (type) {
            case 'total':
                title = 'جزئیات کل رکوردها';
                content = this.generateTotalRecordsDetail();
                break;
            case 'pending':
                title = 'رکوردهای در انتظار همگام‌سازی';
                content = this.generatePendingSyncDetail();
                break;
            case 'dri1':
                title = 'جزئیات واحد DRI1';
                content = this.generateUnitDetail('DRI1');
                break;
            case 'dri2':
                title = 'جزئیات واحد DRI2';
                content = this.generateUnitDetail('DRI2');
                break;
            default:
                return;
        }

        const modal = new Modal({
            title: title,
            content: content,
            size: 'large'
        });

        modal.addButton('بستن', 'btn btn-primary', () => {
            modal.destroy();
        }).open();
    }

    generateTotalRecordsDetail() {
        const localTotal = this.stats?.local?.totalRecords || 0;
        const serverTotal = this.stats?.server?.totalRecords || 0;

        return html`
            <div class="records-detail">
                <div class="detail-section">
                    <h5>دیتابیس محلی</h5>
                    <p>تعداد رکوردها: <strong>${localTotal.toLocaleString('fa-IR')}</strong></p>
                    <p>در انتظار همگام‌سازی: <strong>${(this.stats?.local?.pendingSync || 0).toLocaleString('fa-IR')}</strong></p>
                </div>
                
                <div class="detail-section">
                    <h5>سرور</h5>
                    <p>تعداد رکوردها: <strong>${serverTotal > 0 ? serverTotal.toLocaleString('fa-IR') : 'غیرقابل دسترس'}</strong></p>
                </div>
                
                <div class="detail-section">
                    <h5>کل</h5>
                    <p>مجموع رکوردها: <strong>${(localTotal + serverTotal).toLocaleString('fa-IR')}</strong></p>
                </div>
            </div>
        `;
    }

    generatePendingSyncDetail() {
        const pendingCount = this.stats?.local?.pendingSync || 0;
        
        return html`
            <div class="pending-detail">
                <p>تعداد رکوردهای در انتظار همگام‌سازی: <strong>${pendingCount.toLocaleString('fa-IR')}</strong></p>
                
                ${pendingCount > 0 ? html`
                    <div class="sync-recommendation">
                        <h5>توصیه:</h5>
                        <p>برای همگام‌سازی رکوردهای باقیمانده، از منوی کاربری گزینه "همگام‌سازی" را انتخاب کنید.</p>
                    </div>
                ` : html`
                    <div class="sync-status">
                        <i class="fas fa-check-circle" style="color: #10b981;"></i>
                        <span>همه رکوردها همگام‌سازی شده‌اند</span>
                    </div>
                `}
            </div>
        `;
    }

    generateUnitDetail(unitId) {
        const unitInfo = APP_CONFIG.units.find(u => u.id === unitId);
        const localCount = this.stats?.local?.byUnit?.[unitId] || 0;
        const serverCount = this.stats?.server?.byUnit?.[unitId] || 0;

        return html`
            <div class="unit-detail">
                <div class="unit-header">
                    <h5 style="color: ${unitInfo?.color}">${unitInfo?.name}</h5>
                </div>
                
                <div class="unit-stats">
                    <div class="stat-row">
                        <span>دیتابیس محلی:</span>
                        <strong>${localCount.toLocaleString('fa-IR')} رکورد</strong>
                    </div>
                    <div class="stat-row">
                        <span>سرور:</span>
                        <strong>${serverCount > 0 ? serverCount.toLocaleString('fa-IR') : 'غیرقابل دسترس'} رکورد</strong>
                    </div>
                    <div class="stat-row">
                        <span>کل:</span>
                        <strong>${(localCount + serverCount).toLocaleString('fa-IR')} رکورد</strong>
                    </div>
                </div>
                
                <div class="unit-equipments">
                    <h6>تجهیزات این واحد:</h6>
                    <div class="equipments-list">
                        ${APP_CONFIG.equipments
                            .filter(eq => eq.id.includes(unitId))
                            .map(eq => html`
                                <div class="equipment-item">
                                    <i class="${eq.icon}" style="color: ${eq.color};"></i>
                                    <span>${eq.name}</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    showError() {
        import('../Common/NotificationToast.js').then(({ NotificationToast }) => {
            NotificationToast.error('خطا در بارگذاری آمار دیتابیس');
        });
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingElement = this.element.querySelector('#stats-loading');
        const refreshBtn = this.element.querySelector('#refresh-stats-btn');

        if (loadingElement) {
            loadingElement.style.display = loading ? 'flex' : 'none';
        }

        if (refreshBtn) {
            refreshBtn.disabled = loading;
            if (loading) {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال بارگذاری...';
            } else {
                refreshBtn.innerHTML = '<i class="fas fa-sync"></i> به‌روزرسانی';
            }
        }
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.loadStats();
        }, this.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    async exportStats() {
        try {
            const exportData = {
                exportDate: new Date().toISOString(),
                stats: this.stats,
                summary: {
                    totalRecords: (this.stats?.local?.totalRecords || 0) + (this.stats?.server?.totalRecords || 0),
                    pendingSync: this.stats?.local?.pendingSync || 0,
                    dri1Records: (this.stats?.local?.byUnit?.DRI1 || 0) + (this.stats?.server?.byUnit?.DRI1 || 0),
                    dri2Records: (this.stats?.local?.byUnit?.DRI2 || 0) + (this.stats?.server?.byUnit?.DRI2 || 0)
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `database-stats-${dateUtils.getCurrentDate()}.json`;
            link.click();
            
            URL.revokeObjectURL(url);

            const { NotificationToast } = await import('../Common/NotificationToast.js');
            NotificationToast.success('آمار دیتابیس دانلود شد');

        } catch (error) {
            console.error('Error exporting stats:', error);
            const { NotificationToast } = await import('../Common/NotificationToast.js');
            NotificationToast.error('خطا در دانلود آمار');
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
        this.stopAutoRefresh();
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default DatabaseStats;