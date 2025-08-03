import { createElement, html } from '../../utils/reactUtils.js';
import { APP_CONFIG } from '../../utils/constants.js';
import { dateUtils, arrayUtils } from '../../utils/helpers.js';
import { withAuth } from '../Auth/AuthGuard.js';
import LoadingSpinner from '../Common/LoadingSpinner.js';

export class Analysis {
    constructor(options = {}) {
        this.defaultThreshold = options.defaultThreshold || 20;
        this.defaultTimeRange = options.defaultTimeRange || 7;
        this.comparisonDays = options.comparisonDays || 1;
        this.onAlertClick = options.onAlertClick || null;
        this.showExportReport = options.showExportReport !== false;
        this.element = null;
        this.analysisData = {
            alerts: [],
            trends: [],
            statistics: {},
            recommendations: []
        };
        this.currentSettings = {
            threshold: this.defaultThreshold,
            timeRange: this.defaultTimeRange,
            comparisonDays: this.comparisonDays,
            unit: 'DRI1',
            selectedEquipments: []
        };
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        this.loadAnalysisSettings();
        this.runAnalysis();
    }

    create() {
        const exportButton = this.showExportReport ? html`
            <button class="btn btn-info" id="export-report-btn">
                <i class="fas fa-file-export"></i>
                گزارش تحلیل
            </button>
        ` : '';

        this.element = createElement(html`
            <div class="analysis-container">
                <div class="analysis-header">
                    <h3 class="analysis-title">
                        <i class="fas fa-search"></i>
                        آنالیز داده‌های ویبره
                    </h3>
                    <div class="analysis-actions">
                        ${exportButton}
                        <button class="btn btn-primary" id="run-analysis-btn">
                            <i class="fas fa-play"></i>
                            اجرای مجدد
                        </button>
                    </div>
                </div>

                <!-- Analysis Settings -->
                <div class="analysis-settings" id="analysis-settings">
                    <div class="settings-header">
                        <h4>تنظیمات آنالیز</h4>
                        <button class="btn btn-sm btn-secondary" id="toggle-settings-btn">
                            <i class="fas fa-cog"></i>
                            تنظیمات
                        </button>
                    </div>
                    
                    <div class="settings-content" id="settings-content">
                        <div class="settings-row">
                            <div class="setting-group">
                                <label class="setting-label">آستانه هشدار:</label>
                                <div class="input-with-unit">
                                    <input type="number" 
                                           class="form-control" 
                                           id="threshold-input"
                                           value="${this.currentSettings.threshold}"
                                           min="1" 
                                           max="100" 
                                           step="0.1">
                                    <span class="unit-label">%</span>
                                </div>
                            </div>

                            <div class="setting-group">
                                <label class="setting-label">بازه زمانی تحلیل:</label>
                                <select class="form-control" id="analysis-time-range">
                                    <option value="3" ${this.currentSettings.timeRange === 3 ? 'selected' : ''}>3 روز</option>
                                    <option value="7" ${this.currentSettings.timeRange === 7 ? 'selected' : ''}>7 روز</option>
                                    <option value="14" ${this.currentSettings.timeRange === 14 ? 'selected' : ''}>14 روز</option>
                                    <option value="30" ${this.currentSettings.timeRange === 30 ? 'selected' : ''}>30 روز</option>
                                </select>
                            </div>

                            <div class="setting-group">
                                <label class="setting-label">مقایسه با:</label>
                                <select class="form-control" id="comparison-days">
                                    <option value="1" ${this.currentSettings.comparisonDays === 1 ? 'selected' : ''}>1 روز قبل</option>
                                    <option value="7" ${this.currentSettings.comparisonDays === 7 ? 'selected' : ''}>1 هفته قبل</option>
                                    <option value="30" ${this.currentSettings.comparisonDays === 30 ? 'selected' : ''}>1 ماه قبل</option>
                                </select>
                            </div>

                            <div class="setting-group">
                                <label class="setting-label">واحد:</label>
                                <div class="unit-selector-small">
                                    ${APP_CONFIG.units.map(unit => html`
                                        <label class="radio-button-small">
                                            <input type="radio" name="analysis-unit" value="${unit.id}" 
                                                   ${unit.id === this.currentSettings.unit ? 'checked' : ''}>
                                            <span class="radio-label" style="color: ${unit.color};">
                                                ${unit.code}
                                            </span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="settings-actions">
                            <button class="btn btn-success" id="apply-settings-btn">
                                <i class="fas fa-check"></i>
                                اعمال تنظیمات
                            </button>
                            <button class="btn btn-secondary" id="reset-settings-btn">
                                <i class="fas fa-undo"></i>
                                بازنشانی
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Analysis Results -->
                <div class="analysis-results">
                    <!-- Loading State -->
                    <div class="analysis-loading" id="analysis-loading" style="display: none;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>در حال تحلیل داده‌ها...</span>
                    </div>

                    <!-- Alerts Section -->
                    <div class="analysis-section alerts-section">
                        <div class="section-header">
                            <h4 class="section-title">
                                <i class="fas fa-exclamation-triangle"></i>
                                هشدارها
                                <span class="alert-count" id="alert-count">0</span>
                            </h4>
                            <div class="section-actions">
                                <button class="btn btn-sm btn-secondary" id="filter-alerts-btn">
                                    <i class="fas fa-filter"></i>
                                    فیلتر
                                </button>
                            </div>
                        </div>
                        <div class="alerts-container" id="alerts-container">
                            <!-- Alert items will be generated here -->
                        </div>
                    </div>

                    <!-- Trends Section -->
                    <div class="analysis-section trends-section">
                        <div class="section-header">
                            <h4 class="section-title">
                                <i class="fas fa-chart-line"></i>
                                روندها
                            </h4>
                        </div>
                        <div class="trends-container" id="trends-container">
                            <!-- Trend items will be generated here -->
                        </div>
                    </div>

                    <!-- Statistics Section -->
                    <div class="analysis-section statistics-section">
                        <div class="section-header">
                            <h4 class="section-title">
                                <i class="fas fa-chart-bar"></i>
                                آمار کلی
                            </h4>
                        </div>
                        <div class="statistics-container" id="statistics-container">
                            <!-- Statistics will be generated here -->
                        </div>
                    </div>

                    <!-- Recommendations Section -->
                    <div class="analysis-section recommendations-section">
                        <div class="section-header">
                            <h4 class="section-title">
                                <i class="fas fa-lightbulb"></i>
                                توصیه‌ها
                            </h4>
                        </div>
                        <div class="recommendations-container" id="recommendations-container">
                            <!-- Recommendations will be generated here -->
                        </div>
                    </div>
                </div>

                <!-- No Analysis Data -->
                <div class="no-analysis-data" id="no-analysis-data" style="display: none;">
                    <i class="fas fa-search"></i>
                    <h4>داده‌ای برای تحلیل یافت نشد</h4>
                    <p>برای انجام تحلیل، داده‌های کافی در بازه زمانی انتخاب شده وجود ندارد.</p>
                    <button class="btn btn-primary" id="change-analysis-settings-btn">
                        <i class="fas fa-cog"></i>
                        تغییر تنظیمات
                    </button>
                </div>
            </div>
        `);
    }

    attachEvents() {
        // Settings toggle
        const toggleSettingsBtn = this.element.querySelector('#toggle-settings-btn');
        const settingsContent = this.element.querySelector('#settings-content');
        
        if (toggleSettingsBtn && settingsContent) {
            let settingsVisible = false;
            
            toggleSettingsBtn.addEventListener('click', () => {
                settingsVisible = !settingsVisible;
                settingsContent.style.display = settingsVisible ? 'block' : 'none';
                
                const icon = toggleSettingsBtn.querySelector('i');
                icon.className = settingsVisible ? 'fas fa-times' : 'fas fa-cog';
            });
        }

        // Settings inputs
        const thresholdInput = this.element.querySelector('#threshold-input');
        const timeRangeSelect = this.element.querySelector('#analysis-time-range');
        const comparisonSelect = this.element.querySelector('#comparison-days');
        
        if (thresholdInput) {
            thresholdInput.addEventListener('change', (e) => {
                this.currentSettings.threshold = parseFloat(e.target.value);
            });
        }

        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.currentSettings.timeRange = parseInt(e.target.value);
            });
        }

        if (comparisonSelect) {
            comparisonSelect.addEventListener('change', (e) => {
                this.currentSettings.comparisonDays = parseInt(e.target.value);
            });
        }

        // Unit selection
        const unitRadios = this.element.querySelectorAll('input[name="analysis-unit"]');
        unitRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.currentSettings.unit = e.target.value;
                }
            });
        });

        // Action buttons
        const applySettingsBtn = this.element.querySelector('#apply-settings-btn');
        const resetSettingsBtn = this.element.querySelector('#reset-settings-btn');
        const runAnalysisBtn = this.element.querySelector('#run-analysis-btn');
        const exportReportBtn = this.element.querySelector('#export-report-btn');

        if (applySettingsBtn) {
            applySettingsBtn.addEventListener('click', () => {
                this.saveAnalysisSettings();
                this.runAnalysis();
            });
        }

        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }

        if (runAnalysisBtn) {
            runAnalysisBtn.addEventListener('click', () => {
                this.runAnalysis(true);
            });
        }

        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => {
                this.exportAnalysisReport();
            });
        }

        // No data button
        const changeSettingsBtn = this.element.querySelector('#change-analysis-settings-btn');
        if (changeSettingsBtn) {
            changeSettingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }
    }

    async loadAnalysisSettings() {
        try {
            const { default: dataService } = await import('../../services/dataService.js');
            const settings = await dataService.getUserSettings();
            
            if (settings) {
                this.currentSettings.threshold = settings.analysisThreshold || this.defaultThreshold;
                this.currentSettings.timeRange = settings.analysisTimeRange || this.defaultTimeRange;
                this.currentSettings.comparisonDays = settings.analysisComparisonDays || this.comparisonDays;
                
                // Update UI
                this.updateSettingsUI();
            }
        } catch (error) {
            console.error('Error loading analysis settings:', error);
        }
    }

    updateSettingsUI() {
        const thresholdInput = this.element.querySelector('#threshold-input');
        const timeRangeSelect = this.element.querySelector('#analysis-time-range');
        const comparisonSelect = this.element.querySelector('#comparison-days');

        if (thresholdInput) thresholdInput.value = this.currentSettings.threshold;
        if (timeRangeSelect) timeRangeSelect.value = this.currentSettings.timeRange.toString();
        if (comparisonSelect) comparisonSelect.value = this.currentSettings.comparisonDays.toString();
    }

    async saveAnalysisSettings() {
        try {
            const { default: dataService } = await import('../../services/dataService.js');
            
            const settings = {
                analysisThreshold: this.currentSettings.threshold,
                analysisTimeRange: this.currentSettings.timeRange,
                analysisComparisonDays: this.currentSettings.comparisonDays
            };
            
            await dataService.saveUserSettings(settings);
        } catch (error) {
            console.error('Error saving analysis settings:', error);
        }
    }

    resetSettings() {
        this.currentSettings = {
            threshold: this.defaultThreshold,
            timeRange: this.defaultTimeRange,
            comparisonDays: this.comparisonDays,
            unit: 'DRI1',
            selectedEquipments: []
        };
        
        this.updateSettingsUI();
        
        // Update unit radio
        const unitRadio = this.element.querySelector(`input[value="${this.currentSettings.unit}"]`);
        if (unitRadio) unitRadio.checked = true;
    }

    async runAnalysis(forceRefresh = false) {
        if (this.isLoading) return;

        try {
            this.setLoading(true);
            this.hideNoDataMessage();

            // Get data for analysis
            const { default: dataService } = await import('../../services/dataService.js');
            
            const filters = {
                unitType: this.currentSettings.unit,
                dateFrom: dateUtils.getDaysAgo(this.currentSettings.timeRange),
                dateTo: dateUtils.getCurrentDate()
            };

            const data = await dataService.getData(filters, true);

            if (data.length === 0) {
                this.showNoDataMessage();
                return;
            }

            // Run analysis algorithms
            this.analysisData = await this.performAnalysis(data);
            
            // Render results
            this.renderAnalysisResults();

        } catch (error) {
            console.error('Error running analysis:', error);
            this.showError('خطا در انجام تحلیل داده‌ها');
        } finally {
            this.setLoading(false);
        }
    }

    async performAnalysis(data) {
        // Group data by equipment and parameter
        const groupedData = this.groupDataForAnalysis(data);
        
        const alerts = [];
        const trends = [];
        const statistics = {};
        const recommendations = [];

        // Analyze each equipment-parameter combination
        for (const [key, values] of Object.entries(groupedData)) {
            const [equipment, parameterId] = key.split('_');
            const parameter = APP_CONFIG.parameters.find(p => p.id === parameterId);
            const equipmentInfo = APP_CONFIG.equipments.find(e => e.id === equipment);

            if (!parameter || !equipmentInfo) continue;

            // Sort by date
            values.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Detect abnormal increases
            const abnormalIncrease = this.detectAbnormalIncrease(values);
            if (abnormalIncrease) {
                alerts.push({
                    type: 'abnormal_increase',
                    severity: abnormalIncrease.severity,
                    equipment: equipment,
                    equipmentName: equipmentInfo.name,
                    parameter: parameterId,
                    parameterName: parameter.name,
                    currentValue: abnormalIncrease.currentValue,
                    previousValue: abnormalIncrease.previousValue,
                    increasePercent: abnormalIncrease.increasePercent,
                    date: abnormalIncrease.date,
                    recommendation: this.generateRecommendation('abnormal_increase', abnormalIncrease)
                });
            }

            // Analyze trends
            const trend = this.analyzeTrend(values);
            if (trend) {
                trends.push({
                    equipment: equipment,
                    equipmentName: equipmentInfo.name,
                    parameter: parameterId,
                    parameterName: parameter.name,
                    trend: trend.direction,
                    slope: trend.slope,
                    confidence: trend.confidence,
                    prediction: trend.prediction
                });
            }

            // Calculate statistics
            if (!statistics[equipment]) {
                statistics[equipment] = {
                    equipmentName: equipmentInfo.name,
                    parameters: {}
                };
            }

            statistics[equipment].parameters[parameterId] = {
                parameterName: parameter.name,
                ...this.calculateStatistics(values)
            };
        }

        // Generate global recommendations
        const globalRecommendations = this.generateGlobalRecommendations(alerts, trends, statistics);
        recommendations.push(...globalRecommendations);

        return { alerts, trends, statistics, recommendations };
    }

    groupDataForAnalysis(data) {
        const grouped = {};

        data.forEach(entry => {
            if (!entry.parameters) return;

            Object.entries(entry.parameters).forEach(([parameterId, value]) => {
                const key = `${entry.equipment}_${parameterId}`;
                
                if (!grouped[key]) {
                    grouped[key] = [];
                }

                grouped[key].push({
                    date: entry.date,
                    value: parseFloat(value),
                    equipment: entry.equipment,
                    parameter: parameterId
                });
            });
        });

        return grouped;
    }

    detectAbnormalIncrease(values) {
        if (values.length < 2) return null;

        const comparisonDays = this.currentSettings.comparisonDays;
        const threshold = this.currentSettings.threshold / 100;
        
        // Get recent values for comparison
        const recentValues = values.slice(-comparisonDays * 2);
        if (recentValues.length < 2) return null;

        const currentValue = recentValues[recentValues.length - 1].value;
        const previousValue = recentValues[recentValues.length - 1 - comparisonDays]?.value;

        if (!previousValue) return null;

        const increasePercent = ((currentValue - previousValue) / previousValue) * 100;

        if (increasePercent > threshold * 100) {
            return {
                currentValue,
                previousValue,
                increasePercent: Math.round(increasePercent * 100) / 100,
                date: recentValues[recentValues.length - 1].date,
                severity: increasePercent > threshold * 200 ? 'critical' : 
                         increasePercent > threshold * 150 ? 'high' : 'medium'
            };
        }

        return null;
    }

    analyzeTrend(values) {
        if (values.length < 3) return null;

        // Simple linear regression
        const n = values.length;
        const x = values.map((_, i) => i);
        const y = values.map(v => v.value);

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared
        const meanY = sumY / n;
        const ssRes = y.reduce((sum, yi, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
        const rSquared = 1 - (ssRes / ssTot);

        // Predict next value
        const nextValue = slope * n + intercept;

        return {
            direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
            slope: Math.round(slope * 1000) / 1000,
            confidence: Math.round(rSquared * 100),
            prediction: Math.round(nextValue * 100) / 100
        };
    }

    calculateStatistics(values) {
        const nums = values.map(v => v.value);
        
        return {
            count: nums.length,
            min: Math.min(...nums),
            max: Math.max(...nums),
            avg: nums.reduce((a, b) => a + b, 0) / nums.length,
            std: this.calculateStandardDeviation(nums),
            latest: nums[nums.length - 1],
            firstDate: values[0].date,
            lastDate: values[values.length - 1].date
        };
    }

    calculateStandardDeviation(numbers) {
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
        return Math.sqrt(variance);
    }

    generateRecommendation(type, data) {
        switch (type) {
            case 'abnormal_increase':
                if (data.severity === 'critical') {
                    return 'توقف فوری تجهیز و بررسی دقیق توسط تکنسین';
                } else if (data.severity === 'high') {
                    return 'برنامه‌ریزی تعمیرات اضطراری در اولین فرصت';
                } else {
                    return 'افزایش نظارت و بررسی در روزهای آینده';
                }
            default:
                return 'نیاز به بررسی بیشتر';
        }
    }

    generateGlobalRecommendations(alerts, trends, statistics) {
        const recommendations = [];

        // Based on alerts
        const criticalAlerts = alerts.filter(a => a.severity === 'critical');
        if (criticalAlerts.length > 0) {
            recommendations.push({
                type: 'critical',
                title: 'هشدار بحرانی',
                description: `${criticalAlerts.length} تجهیز در وضعیت بحرانی قرار دارند`,
                action: 'توقف فوری تجهیزات و بررسی کامل'
            });
        }

        // Based on trends
        const increasingTrends = trends.filter(t => t.trend === 'increasing' && t.confidence > 70);
        if (increasingTrends.length > 2) {
            recommendations.push({
                type: 'trend',
                title: 'روند افزایشی',
                description: `${increasingTrends.length} تجهیز روند افزایشی قابل اعتماد دارند`,
                action: 'برنامه‌ریزی تعمیرات پیشگیرانه'
            });
        }

        return recommendations;
    }

    renderAnalysisResults() {
        this.renderAlerts();
        this.renderTrends();
        this.renderStatistics();
        this.renderRecommendations();
    }

    renderAlerts() {
        const alertsContainer = this.element.querySelector('#alerts-container');
        const alertCount = this.element.querySelector('#alert-count');
        
        if (!alertsContainer || !alertCount) return;

        alertCount.textContent = `(${this.analysisData.alerts.length})`;

        if (this.analysisData.alerts.length === 0) {
            alertsContainer.innerHTML = html`
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <span>هشداری یافت نشد</span>
                </div>
            `;
            return;
        }

        // Sort alerts by severity
        const sortedAlerts = this.analysisData.alerts.sort((a, b) => {
            const severityOrder = { critical: 3, high: 2, medium: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });

        alertsContainer.innerHTML = sortedAlerts.map(alert => html`
            <div class="alert-item alert-${alert.severity}" data-alert-id="${alert.equipment}_${alert.parameter}">
                <div class="alert-header">
                    <div class="alert-severity">
                        <i class="fas fa-${this.getAlertIcon(alert.severity)}"></i>
                        <span class="severity-text">${this.getSeverityText(alert.severity)}</span>
                    </div>
                    <div class="alert-date">${dateUtils.formatDate(alert.date)}</div>
                </div>
                
                <div class="alert-content">
                    <div class="alert-title">
                        <strong>${alert.equipmentName}</strong> - ${alert.parameterName}
                    </div>
                    <div class="alert-description">
                        افزایش ${alert.increasePercent}% نسبت به ${this.currentSettings.comparisonDays} روز قبل
                        (از ${alert.previousValue} به ${alert.currentValue})
                    </div>
                    <div class="alert-recommendation">
                        <i class="fas fa-lightbulb"></i>
                        ${alert.recommendation}
                    </div>
                </div>
                
                <div class="alert-actions">
                    <button class="btn btn-sm btn-primary alert-details-btn">
                        <i class="fas fa-chart-line"></i>
                        نمودار
                    </button>
                    <button class="btn btn-sm btn-secondary alert-dismiss-btn">
                        <i class="fas fa-check"></i>
                        تایید
                    </button>
                </div>
            </div>
        `).join('');

        // Attach events to alert buttons
        this.attachAlertEvents();
    }

    renderTrends() {
        const trendsContainer = this.element.querySelector('#trends-container');
        if (!trendsContainer) return;

        if (this.analysisData.trends.length === 0) {
            trendsContainer.innerHTML = html`
                <div class="no-trends">
                    <i class="fas fa-minus"></i>
                    <span>روند قابل اعتمادی یافت نشد</span>
                </div>
            `;
            return;
        }

        trendsContainer.innerHTML = this.analysisData.trends.map(trend => html`
            <div class="trend-item">
                <div class="trend-equipment">
                    <strong>${trend.equipmentName}</strong> - ${trend.parameterName}
                </div>
                <div class="trend-info">
                    <div class="trend-direction trend-${trend.trend}">
                        <i class="fas fa-arrow-${this.getTrendArrow(trend.trend)}"></i>
                        <span>${this.getTrendText(trend.trend)}</span>
                    </div>
                    <div class="trend-confidence">
                        اعتماد: ${trend.confidence}%
                    </div>
                    <div class="trend-prediction">
                        پیش‌بینی: ${trend.prediction}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderStatistics() {
        const statisticsContainer = this.element.querySelector('#statistics-container');
        if (!statisticsContainer) return;

        const stats = Object.values(this.analysisData.statistics);
        
        if (stats.length === 0) {
            statisticsContainer.innerHTML = html`
                <div class="no-statistics">
                    <span>آماری محاسبه نشد</span>
                </div>
            `;
            return;
        }

        statisticsContainer.innerHTML = stats.map(equipStat => html`
            <div class="equipment-statistics">
                <h5 class="equipment-name">${equipStat.equipmentName}</h5>
                <div class="parameters-stats">
                    ${Object.entries(equipStat.parameters).map(([paramId, paramStat]) => html`
                        <div class="parameter-stat">
                            <div class="parameter-name">${paramStat.parameterName}</div>
                            <div class="stat-values">
                                <div class="stat-item">
                                    <span class="stat-label">میانگین:</span>
                                    <span class="stat-value">${paramStat.avg.toFixed(2)}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">حداکثر:</span>
                                    <span class="stat-value">${paramStat.max.toFixed(2)}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">آخرین:</span>
                                    <span class="stat-value">${paramStat.latest.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderRecommendations() {
        const recommendationsContainer = this.element.querySelector('#recommendations-container');
        if (!recommendationsContainer) return;

        if (this.analysisData.recommendations.length === 0) {
            recommendationsContainer.innerHTML = html`
                <div class="no-recommendations">
                    <i class="fas fa-thumbs-up"></i>
                    <span>وضعیت کلی مناسب است</span>
                </div>
            `;
            return;
        }

        recommendationsContainer.innerHTML = this.analysisData.recommendations.map(rec => html`
            <div class="recommendation-item recommendation-${rec.type}">
                <div class="recommendation-header">
                    <i class="fas fa-${this.getRecommendationIcon(rec.type)}"></i>
                    <strong>${rec.title}</strong>
                </div>
                <div class="recommendation-description">
                    ${rec.description}
                </div>
                <div class="recommendation-action">
                    <strong>اقدام پیشنهادی:</strong> ${rec.action}
                </div>
            </div>
        `).join('');
    }

        attachAlertEvents() {
        const alertItems = this.element.querySelectorAll('.alert-item');
        
        alertItems.forEach(item => {
            const alertId = item.getAttribute('data-alert-id');
            
            // Chart button
            const chartBtn = item.querySelector('.alert-details-btn');
            if (chartBtn) {
                chartBtn.addEventListener('click', () => {
                    this.showAlertChart(alertId);
                });
            }
            
            // Dismiss button
            const dismissBtn = item.querySelector('.alert-dismiss-btn');
            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => {
                    this.dismissAlert(alertId);
                });
            }
            
            // Click handler for entire alert
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.alert-actions')) {
                    if (this.onAlertClick) {
                        this.onAlertClick(alertId);
                    }
                }
            });
        });
    }

    async showAlertChart(alertId) {
        const [equipment, parameterId] = alertId.split('_');
        
        if (this.onAlertClick) {
            this.onAlertClick({
                type: 'show_chart',
                equipment,
                parameterId,
                unit: this.currentSettings.unit
            });
        }
    }

    dismissAlert(alertId) {
        const alertElement = this.element.querySelector(`[data-alert-id="${alertId}"]`);
        if (alertElement) {
            alertElement.style.opacity = '0.5';
            alertElement.classList.add('dismissed');
            
            // Remove from analysis data
            this.analysisData.alerts = this.analysisData.alerts.filter(
                alert => `${alert.equipment}_${alert.parameter}` !== alertId
            );
            
            // Update count
            const alertCount = this.element.querySelector('#alert-count');
            if (alertCount) {
                alertCount.textContent = `(${this.analysisData.alerts.length})`;
            }
        }
    }

    getAlertIcon(severity) {
        const icons = {
            critical: 'exclamation-circle',
            high: 'exclamation-triangle',
            medium: 'exclamation'
        };
        return icons[severity] || 'info-circle';
    }

    getSeverityText(severity) {
        const texts = {
            critical: 'بحرانی',
            high: 'بالا',
            medium: 'متوسط'
        };
        return texts[severity] || severity;
    }

    getTrendArrow(trend) {
        const arrows = {
            increasing: 'up',
            decreasing: 'down',
            stable: 'right'
        };
        return arrows[trend] || 'right';
    }

    getTrendText(trend) {
        const texts = {
            increasing: 'افزایشی',
            decreasing: 'کاهشی',
            stable: 'پایدار'
        };
        return texts[trend] || trend;
    }

    getRecommendationIcon(type) {
        const icons = {
            critical: 'exclamation-triangle',
            trend: 'chart-line',
            maintenance: 'tools',
            monitoring: 'eye'
        };
        return icons[type] || 'lightbulb';
    }

    showSettings() {
        const settingsContent = this.element.querySelector('#settings-content');
        if (settingsContent) {
            settingsContent.style.display = 'block';
            settingsContent.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showNoDataMessage() {
        const noDataElement = this.element.querySelector('#no-analysis-data');
        const resultsElement = this.element.querySelector('.analysis-results');
        
        if (noDataElement) noDataElement.style.display = 'flex';
        if (resultsElement) resultsElement.style.display = 'none';
    }

    hideNoDataMessage() {
        const noDataElement = this.element.querySelector('#no-analysis-data');
        const resultsElement = this.element.querySelector('.analysis-results');
        
        if (noDataElement) noDataElement.style.display = 'none';
        if (resultsElement) resultsElement.style.display = 'block';
    }

    showError(message) {
        import('../Common/NotificationToast.js').then(({ NotificationToast }) => {
            NotificationToast.error(message);
        });
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingElement = this.element.querySelector('#analysis-loading');
        const runAnalysisBtn = this.element.querySelector('#run-analysis-btn');
        const applySettingsBtn = this.element.querySelector('#apply-settings-btn');

        if (loadingElement) {
            loadingElement.style.display = loading ? 'flex' : 'none';
        }

        if (runAnalysisBtn) {
            runAnalysisBtn.disabled = loading;
            if (loading) {
                runAnalysisBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تحلیل...';
            } else {
                runAnalysisBtn.innerHTML = '<i class="fas fa-play"></i> اجرای مجدد';
            }
        }

        if (applySettingsBtn) {
            applySettingsBtn.disabled = loading;
        }
    }

    async exportAnalysisReport() {
        try {
            const reportData = {
                date: new Date().toISOString(),
                settings: this.currentSettings,
                analysis: this.analysisData,
                metadata: {
                    version: APP_CONFIG.version,
                    unit: this.currentSettings.unit
                }
            };

            // Create report content
            const reportContent = this.generateReportHTML(reportData);
            
            // Create and download
            const blob = new Blob([reportContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `analysis-report-${this.currentSettings.unit}-${dateUtils.getCurrentDate()}.html`;
            link.click();
            
            URL.revokeObjectURL(url);

            // Show success message
            const { NotificationToast } = await import('../Common/NotificationToast.js');
            NotificationToast.success('گزارش تحلیل دانلود شد');

        } catch (error) {
            console.error('Error exporting report:', error);
            const { NotificationToast } = await import('../Common/NotificationToast.js');
            NotificationToast.error('خطا در دانلود گزارش');
        }
    }

    generateReportHTML(reportData) {
        return html`
            <!DOCTYPE html>
            <html dir="rtl" lang="fa">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>گزارش تحلیل ویبره - ${reportData.settings.unit}</title>
                <style>
                    body { font-family: 'Tahoma', sans-serif; margin: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .section { margin: 20px 0; }
                    .alert-critical { color: #dc2626; }
                    .alert-high { color: #ea580c; }
                    .alert-medium { color: #ca8a04; }
                    .trend-increasing { color: #dc2626; }
                    .trend-decreasing { color: #16a34a; }
                    .trend-stable { color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>گزارش تحلیل داده‌های ویبره</h1>
                    <p>واحد: ${reportData.settings.unit} | تاریخ: ${dateUtils.formatDate(new Date())}</p>
                </div>

                <div class="section">
                    <h2>تنظیمات تحلیل</h2>
                    <p>آستانه هشدار: ${reportData.settings.threshold}%</p>
                    <p>بازه زمانی: ${reportData.settings.timeRange} روز</p>
                    <p>مقایسه با: ${reportData.settings.comparisonDays} روز قبل</p>
                </div>

                <div class="section">
                    <h2>هشدارها (${reportData.analysis.alerts.length})</h2>
                    ${reportData.analysis.alerts.map(alert => html`
                        <div class="alert-${alert.severity}">
                            <strong>${alert.equipmentName}</strong> - ${alert.parameterName}<br>
                            افزایش: ${alert.increasePercent}% | تاریخ: ${dateUtils.formatDate(alert.date)}<br>
                            توصیه: ${alert.recommendation}
                        </div>
                    `).join('')}
                </div>

                <div class="section">
                    <h2>تحلیل روندها</h2>
                    ${reportData.analysis.trends.map(trend => html`
                        <div class="trend-${trend.trend}">
                            ${trend.equipmentName} - ${trend.parameterName}: 
                            ${this.getTrendText(trend.trend)} (اعتماد: ${trend.confidence}%)
                        </div>
                    `).join('')}
                </div>

                <div class="section">
                    <h2>توصیه‌های کلی</h2>
                    ${reportData.analysis.recommendations.map(rec => html`
                        <div>
                            <strong>${rec.title}:</strong> ${rec.description}<br>
                            <em>اقدام: ${rec.action}</em>
                        </div>
                    `).join('')}
                </div>
            </body>
            </html>
        `;
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

export default withAuth(Analysis, { requireAuth: true });