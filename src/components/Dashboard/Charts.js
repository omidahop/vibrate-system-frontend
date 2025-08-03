import { createElement, html } from '../../utils/reactUtils.js';
import { APP_CONFIG } from '../../utils/constants.js';
import { dateUtils, arrayUtils } from '../../utils/helpers.js';
import { withAuth } from '../Auth/AuthGuard.js';
import LoadingSpinner from '../Common/LoadingSpinner.js';

export class Charts {
    constructor(options = {}) {
        this.onFilterChange = options.onFilterChange || null;
        this.defaultTimeRange = options.defaultTimeRange || 7;
        this.showExportButton = options.showExportButton !== false;
        this.allowMultipleParameters = options.allowMultipleParameters !== false;
        this.element = null;
        this.chartInstance = null;
        this.chartLib = null;
        this.currentFilters = {
            unit: 'DRI1',
            equipment: '',
            parameters: ['V1'],
            timeRange: this.defaultTimeRange,
            dateFrom: dateUtils.getDaysAgo(this.defaultTimeRange),
            dateTo: dateUtils.getCurrentDate()
        };
        this.data = [];
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        await this.loadChartLibrary();
        this.create();
        this.attachEvents();
        this.loadData();
    }

    async loadChartLibrary() {
        try {
            // Load Chart.js from CDN
            if (!window.Chart) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
                document.head.appendChild(script);
                
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }
            
            this.chartLib = window.Chart;
        } catch (error) {
            console.error('Error loading Chart.js:', error);
            throw new Error('خطا در بارگذاری کتابخانه نمودار');
        }
    }

    create() {
        const exportButton = this.showExportButton ? html`
            <button class="btn btn-secondary" id="export-chart-btn">
                <i class="fas fa-download"></i>
                دانلود نمودار
            </button>
        ` : '';

        this.element = createElement(html`
            <div class="charts-container">
                <div class="charts-header">
                    <h3 class="charts-title">
                        <i class="fas fa-chart-area"></i>
                        نمودارهای تحلیلی
                    </h3>
                    <div class="chart-actions">
                        ${exportButton}
                        <button class="btn btn-primary" id="refresh-chart-btn">
                            <i class="fas fa-sync"></i>
                            به‌روزرسانی
                        </button>
                    </div>
                </div>

                <!-- Chart Filters -->
                <div class="chart-filters" id="chart-filters">
                    <div class="filter-section">
                        <div class="filter-group">
                            <label class="filter-label">واحد:</label>
                            <div class="unit-filters">
                                ${APP_CONFIG.units.map(unit => html`
                                    <label class="radio-button">
                                        <input type="radio" name="chart-unit" value="${unit.id}" 
                                               ${unit.id === this.currentFilters.unit ? 'checked' : ''}>
                                        <span class="radio-label" style="color: ${unit.color};">
                                            ${unit.code}
                                        </span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <div class="filter-group">
                            <label class="filter-label">تجهیز:</label>
                            <select class="form-control" id="equipment-filter">
                                <option value="">همه تجهیزات</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label class="filter-label">بازه زمانی:</label>
                            <select class="form-control" id="time-range-filter">
                                <option value="7" ${this.currentFilters.timeRange === 7 ? 'selected' : ''}>7 روز گذشته</option>
                                <option value="14" ${this.currentFilters.timeRange === 14 ? 'selected' : ''}>14 روز گذشته</option>
                                <option value="30" ${this.currentFilters.timeRange === 30 ? 'selected' : ''}>30 روز گذشته</option>
                                <option value="60" ${this.currentFilters.timeRange === 60 ? 'selected' : ''}>60 روز گذشته</option>
                                <option value="custom">بازه دلخواه</option>
                            </select>
                        </div>

                        <div class="filter-group custom-date-range" id="custom-date-range" style="display: none;">
                            <label class="filter-label">از تاریخ:</label>
                            <input type="date" class="form-control" id="date-from" 
                                   value="${this.currentFilters.dateFrom}">
                            <label class="filter-label">تا تاریخ:</label>
                            <input type="date" class="form-control" id="date-to" 
                                   value="${this.currentFilters.dateTo}">
                        </div>
                    </div>

                    <div class="parameters-section">
                        <label class="filter-label">پارامترها:</label>
                        <div class="parameters-grid" id="parameters-grid">
                            <!-- Parameter checkboxes will be generated here -->
                        </div>
                    </div>

                    <div class="filter-actions">
                        <button class="btn btn-success" id="apply-filters-btn">
                            <i class="fas fa-filter"></i>
                            اعمال فیلترها
                        </button>
                        <button class="btn btn-secondary" id="reset-filters-btn">
                            <i class="fas fa-undo"></i>
                            بازنشانی
                        </button>
                    </div>
                </div>

                <!-- Chart Container -->
                <div class="chart-section">
                    <div class="chart-container" id="chart-container">
                        <div class="chart-loading" id="chart-loading" style="display: none;">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>در حال بارگذاری نمودار...</span>
                        </div>
                        <canvas id="main-chart" width="800" height="400"></canvas>
                    </div>

                    <div class="chart-info" id="chart-info">
                        <div class="chart-stats">
                            <div class="stat-item">
                                <div class="stat-label">تعداد نقاط:</div>
                                <div class="stat-value" id="points-count">0</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">بازه زمانی:</div>
                                <div class="stat-value" id="time-span">-</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">آخرین به‌روزرسانی:</div>
                                <div class="stat-value" id="last-update">-</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart Legend -->
                <div class="chart-legend" id="chart-legend">
                    <!-- Legend items will be generated dynamically -->
                </div>

                <!-- No Data Message -->
                <div class="no-data-message" id="no-data-message" style="display: none;">
                    <i class="fas fa-chart-area"></i>
                    <h4>داده‌ای یافت نشد</h4>
                    <p>برای نمایش نمودار، داده‌هایی با فیلترهای انتخاب شده وجود ندارد.</p>
                    <button class="btn btn-primary" id="change-filters-btn">
                        <i class="fas fa-filter"></i>
                        تغییر فیلترها
                    </button>
                </div>
            </div>
        `);
    }

    attachEvents() {
        // Unit filter change
        const unitRadios = this.element.querySelectorAll('input[name="chart-unit"]');
        unitRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.currentFilters.unit = e.target.value;
                    this.updateEquipmentFilter();
                    this.updateParametersGrid();
                }
            });
        });

        // Equipment filter
        const equipmentFilter = this.element.querySelector('#equipment-filter');
        if (equipmentFilter) {
            equipmentFilter.addEventListener('change', (e) => {
                this.currentFilters.equipment = e.target.value;
            });
        }

        // Time range filter
        const timeRangeFilter = this.element.querySelector('#time-range-filter');
        if (timeRangeFilter) {
            timeRangeFilter.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value === 'custom') {
                    this.showCustomDateRange(true);
                } else {
                    this.showCustomDateRange(false);
                    this.currentFilters.timeRange = parseInt(value);
                    this.updateDateRange();
                }
            });
        }

        // Custom date inputs
        const dateFromInput = this.element.querySelector('#date-from');
        const dateToInput = this.element.querySelector('#date-to');
        
        if (dateFromInput) {
            dateFromInput.addEventListener('change', (e) => {
                this.currentFilters.dateFrom = e.target.value;
            });
        }
        
        if (dateToInput) {
            dateToInput.addEventListener('change', (e) => {
                this.currentFilters.dateTo = e.target.value;
            });
        }

        // Action buttons
        const applyFiltersBtn = this.element.querySelector('#apply-filters-btn');
        const resetFiltersBtn = this.element.querySelector('#reset-filters-btn');
        const refreshBtn = this.element.querySelector('#refresh-chart-btn');
        const exportBtn = this.element.querySelector('#export-chart-btn');

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.loadData();
            });
        }

        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData(true);
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportChart();
            });
        }

        // No data change filters button
        const changeFiltersBtn = this.element.querySelector('#change-filters-btn');
        if (changeFiltersBtn) {
            changeFiltersBtn.addEventListener('click', () => {
                this.scrollToFilters();
            });
        }

        // Initialize sub-components
        this.updateEquipmentFilter();
        this.updateParametersGrid();
    }

    updateEquipmentFilter() {
        const equipmentFilter = this.element.querySelector('#equipment-filter');
        if (!equipmentFilter) return;

        // Clear current options (except "همه تجهیزات")
        equipmentFilter.innerHTML = '<option value="">همه تجهیزات</option>';

        // Filter equipments by selected unit
        const equipments = APP_CONFIG.equipments.filter(eq => 
            eq.id.includes(this.currentFilters.unit)
        );

        // Add equipment options
        equipments.forEach(equipment => {
            const option = document.createElement('option');
            option.value = equipment.id;
            option.textContent = equipment.name;
            option.selected = equipment.id === this.currentFilters.equipment;
            equipmentFilter.appendChild(option);
        });
    }

    updateParametersGrid() {
        const parametersGrid = this.element.querySelector('#parameters-grid');
        if (!parametersGrid) return;

        // Clear current parameters
        parametersGrid.innerHTML = '';

        // Add parameter checkboxes
        APP_CONFIG.parameters.forEach(parameter => {
            const isSelected = this.currentFilters.parameters.includes(parameter.id);
            
            const parameterCheckbox = createElement(html`
                <label class="parameter-checkbox">
                    <input type="checkbox" 
                           value="${parameter.id}" 
                           ${isSelected ? 'checked' : ''}
                           ${this.allowMultipleParameters ? '' : 'name="single-parameter"'}>
                    <div class="parameter-info">
                        <div class="parameter-icon" style="color: ${parameter.color};">
                            <i class="${parameter.icon}"></i>
                        </div>
                        <div class="parameter-text">
                            <div class="parameter-name">${parameter.name}</div>
                            <div class="parameter-code">${parameter.code}</div>
                        </div>
                    </div>
                </label>
            `);

            const checkbox = parameterCheckbox.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                this.updateParameterSelection(e.target.value, e.target.checked);
            });

            parametersGrid.appendChild(parameterCheckbox);
        });
    }

    updateParameterSelection(parameterId, isSelected) {
        if (this.allowMultipleParameters) {
            // Multiple parameters allowed
            if (isSelected) {
                if (!this.currentFilters.parameters.includes(parameterId)) {
                    this.currentFilters.parameters.push(parameterId);
                }
            } else {
                this.currentFilters.parameters = this.currentFilters.parameters.filter(
                    id => id !== parameterId
                );
            }
        } else {
            // Single parameter only
            if (isSelected) {
                this.currentFilters.parameters = [parameterId];
                
                // Uncheck other checkboxes
                const checkboxes = this.element.querySelectorAll('input[name="single-parameter"]');
                checkboxes.forEach(cb => {
                    if (cb.value !== parameterId) {
                        cb.checked = false;
                    }
                });
            }
        }
    }

    showCustomDateRange(show) {
        const customDateRange = this.element.querySelector('#custom-date-range');
        if (customDateRange) {
            customDateRange.style.display = show ? 'flex' : 'none';
        }
    }

    updateDateRange() {
        const dateFromInput = this.element.querySelector('#date-from');
        const dateToInput = this.element.querySelector('#date-to');

        this.currentFilters.dateFrom = dateUtils.getDaysAgo(this.currentFilters.timeRange);
        this.currentFilters.dateTo = dateUtils.getCurrentDate();

        if (dateFromInput) dateFromInput.value = this.currentFilters.dateFrom;
        if (dateToInput) dateToInput.value = this.currentFilters.dateTo;
    }

    resetFilters() {
        this.currentFilters = {
            unit: 'DRI1',
            equipment: '',
            parameters: ['V1'],
            timeRange: this.defaultTimeRange,
            dateFrom: dateUtils.getDaysAgo(this.defaultTimeRange),
            dateTo: dateUtils.getCurrentDate()
        };

        // Update UI
        const unitRadio = this.element.querySelector(`input[value="${this.currentFilters.unit}"]`);
        if (unitRadio) unitRadio.checked = true;

        const timeRangeSelect = this.element.querySelector('#time-range-filter');
        if (timeRangeSelect) timeRangeSelect.value = this.currentFilters.timeRange.toString();

        this.updateEquipmentFilter();
        this.updateParametersGrid();
        this.showCustomDateRange(false);
        this.updateDateRange();
    }

    async loadData(forceRefresh = false) {
        if (this.isLoading) return;

        try {
            this.setLoading(true);

            const { default: dataService } = await import('../../services/dataService.js');

            const filters = {
                unitType: this.currentFilters.unit,
                equipmentId: this.currentFilters.equipment || undefined,
                dateFrom: this.currentFilters.dateFrom,
                dateTo: this.currentFilters.dateTo
            };

            // Get data from server (authenticated users) or combined local/server
            this.data = await dataService.getData(filters, true);

            if (this.data.length === 0) {
                this.showNoDataMessage();
            } else {
                this.hideNoDataMessage();
                this.processChartData();
                this.renderChart();
                this.updateChartInfo();
            }

            // Notify parent about filter change
            if (this.onFilterChange) {
                this.onFilterChange(this.currentFilters, this.data);
            }

        } catch (error) {
            console.error('Error loading chart data:', error);
            this.showError('خطا در بارگذاری داده‌های نمودار');
        } finally {
            this.setLoading(false);
        }
    }

    processChartData() {
        // Filter data by selected parameters and group by date
        const chartData = [];
        const datasets = [];

        this.currentFilters.parameters.forEach(parameterId => {
            const parameter = APP_CONFIG.parameters.find(p => p.id === parameterId);
            if (!parameter) return;

            const parameterData = [];
            const dataByDate = {};

            // Group data by date
            this.data.forEach(entry => {
                if (entry.parameters && entry.parameters[parameterId] !== undefined) {
                    const date = entry.date;
                    if (!dataByDate[date]) {
                        dataByDate[date] = [];
                    }
                    dataByDate[date].push({
                        date: date,
                        value: parseFloat(entry.parameters[parameterId]),
                        equipment: entry.equipment,
                        equipmentName: entry.equipmentName
                    });
                }
            });

            // Convert to chart data format
            Object.keys(dataByDate).sort().forEach(date => {
                const dayData = dataByDate[date];
                const avgValue = dayData.reduce((sum, item) => sum + item.value, 0) / dayData.length;
                
                parameterData.push({
                    x: date,
                    y: avgValue,
                    details: dayData
                });
            });

            // Create dataset for this parameter
            datasets.push({
                label: parameter.name,
                data: parameterData,
                borderColor: parameter.color,
                backgroundColor: parameter.color + '20',
                fill: false,
                tension: 0.1,
                pointRadius: 4,
                pointHoverRadius: 6
            });
        });

        this.chartData = {
            datasets: datasets
        };
    }

    renderChart() {
        const canvas = this.element.querySelector('#main-chart');
        if (!canvas) return;

        // Destroy existing chart
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Chart configuration
        const config = {
            type: 'line',
            data: this.chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: this.getChartTitle(),
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                return `تاریخ: ${dateUtils.formatDate(context[0].parsed.x)}`;
                            },
                            label: (context) => {
                                const dataset = context.dataset;
                                const dataPoint = dataset.data[context.dataIndex];
                                return `${dataset.label}: ${context.parsed.y.toFixed(2)} ${this.getParameterUnit(dataset.label)}`;
                            },
                            afterLabel: (context) => {
                                const dataset = context.dataset;
                                const dataPoint = dataset.data[context.dataIndex];
                                if (dataPoint.details && dataPoint.details.length > 1) {
                                    return `تعداد اندازه‌گیری: ${dataPoint.details.length}`;
                                }
                                return null;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'YYYY-MM-DD'
                            }
                        },
                        title: {
                            display: true,
                            text: 'تاریخ'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: this.getYAxisLabel()
                        },
                        beginAtZero: true
                    }
                }
            }
        };

        // Create chart
        this.chartInstance = new this.chartLib(canvas, config);
    }

    getChartTitle() {
        const unitName = APP_CONFIG.units.find(u => u.id === this.currentFilters.unit)?.name;
        const parameterNames = this.currentFilters.parameters
            .map(id => APP_CONFIG.parameters.find(p => p.id === id)?.name)
            .filter(Boolean)
            .join(', ');
            
        return `${unitName} - ${parameterNames}`;
    }

    getYAxisLabel() {
        if (this.currentFilters.parameters.length === 1) {
            const parameter = APP_CONFIG.parameters.find(p => p.id === this.currentFilters.parameters[0]);
            return parameter ? this.getParameterUnit(parameter.name) : 'مقدار';
        }
        return 'مقدار';
    }

    getParameterUnit(parameterName) {
        const parameter = APP_CONFIG.parameters.find(p => p.name === parameterName);
        if (parameter) {
            return parameter.type === 'velocity' ? 'mm/s' : 'g';
        }
        return '';
    }

    updateChartInfo() {
        const pointsCount = this.element.querySelector('#points-count');
        const timeSpan = this.element.querySelector('#time-span');
        const lastUpdate = this.element.querySelector('#last-update');

        if (pointsCount) {
            const totalPoints = this.chartData.datasets.reduce(
                (sum, dataset) => sum + dataset.data.length, 0
            );
            pointsCount.textContent = totalPoints;
        }

        if (timeSpan) {
            const fromDate = dateUtils.formatDate(this.currentFilters.dateFrom);
            const toDate = dateUtils.formatDate(this.currentFilters.dateTo);
            timeSpan.textContent = `${fromDate} تا ${toDate}`;
        }

        if (lastUpdate) {
            lastUpdate.textContent = dateUtils.formatDateTime(new Date());
        }
    }

    showNoDataMessage() {
        const noDataMessage = this.element.querySelector('#no-data-message');
        const chartContainer = this.element.querySelector('#chart-container');
        const chartInfo = this.element.querySelector('#chart-info');

        if (noDataMessage) noDataMessage.style.display = 'flex';
        if (chartContainer) chartContainer.style.display = 'none';
        if (chartInfo) chartInfo.style.display = 'none';
    }

    hideNoDataMessage() {
        const noDataMessage = this.element.querySelector('#no-data-message');
        const chartContainer = this.element.querySelector('#chart-container');
        const chartInfo = this.element.querySelector('#chart-info');

        if (noDataMessage) noDataMessage.style.display = 'none';
        if (chartContainer) chartContainer.style.display = 'block';
        if (chartInfo) chartInfo.style.display = 'block';
    }

    showError(message) {
        const { NotificationToast } = import('../Common/NotificationToast.js');
        NotificationToast.error(message);
    }

    setLoading(loading) {
        this.isLoading = loading;
        const chartLoading = this.element.querySelector('#chart-loading');
        const applyFiltersBtn = this.element.querySelector('#apply-filters-btn');
        const refreshBtn = this.element.querySelector('#refresh-chart-btn');

        if (chartLoading) {
            chartLoading.style.display = loading ? 'flex' : 'none';
        }

        if (applyFiltersBtn) {
            applyFiltersBtn.disabled = loading;
            if (loading) {
                applyFiltersBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال بارگذاری...';
            } else {
                applyFiltersBtn.innerHTML = '<i class="fas fa-filter"></i> اعمال فیلترها';
            }
        }

        if (refreshBtn) {
            refreshBtn.disabled = loading;
        }
    }

    async exportChart() {
        if (!this.chartInstance) return;

        try {
            // Get chart as image
            const canvas = this.chartInstance.canvas;
            const imageData = canvas.toDataURL('image/png');

            // Create download link
            const link = document.createElement('a');
            link.download = `chart-${this.currentFilters.unit}-${dateUtils.getCurrentDate()}.png`;
            link.href = imageData;
            link.click();

            // Show success message
            const { NotificationToast } = await import('../Common/NotificationToast.js');
            NotificationToast.success('نمودار با موفقیت دانلود شد');

        } catch (error) {
            console.error('Error exporting chart:', error);
            const { NotificationToast } = await import('../Common/NotificationToast.js');
            NotificationToast.error('خطا در دانلود نمودار');
        }
    }

    scrollToFilters() {
        const filtersElement = this.element.querySelector('#chart-filters');
        if (filtersElement) {
            filtersElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Public methods for external control
    setFilters(filters) {
        this.currentFilters = { ...this.currentFilters, ...filters };
        this.updateEquipmentFilter();
        this.updateParametersGrid();
        this.updateDateRange();
    }

    addParameterThreshold(parameterId, threshold, color = '#ef4444') {
        if (!this.chartInstance) return;

        const parameter = APP_CONFIG.parameters.find(p => p.id === parameterId);
        if (!parameter) return;

        // Add threshold line to chart
        this.chartInstance.data.datasets.push({
            label: `آستانه ${parameter.name}`,
            data: [
                { x: this.currentFilters.dateFrom, y: threshold },
                { x: this.currentFilters.dateTo, y: threshold }
            ],
            borderColor: color,
            backgroundColor: 'transparent',
            fill: false,
            borderDash: [5, 5],
            pointRadius: 0,
            borderWidth: 2
        });

        this.chartInstance.update();
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
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export with authentication guard
export default withAuth(Charts, { requireAuth: true });