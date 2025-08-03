import { createElement, html } from '../../utils/reactUtils.js';
import { APP_CONFIG } from '../../utils/constants.js';
import { validators, batchValidators } from '../../utils/validations.js';
import { uiUtils, dateUtils } from '../../utils/helpers.js';
import EquipmentSelector from './EquipmentSelector.js';
import ParameterInput from './ParameterInput.js';

export class DataEntryForm {
    constructor(options = {}) {
        this.onDataSave = options.onDataSave || null;
        this.onUnitChange = options.onUnitChange || null;
        this.initialUnit = options.initialUnit || 'DRI1';
        this.autoSave = options.autoSave || false;
        this.showNotes = options.showNotes !== false;
        this.element = null;
        this.equipmentSelector = null;
        this.parameterInputs = new Map();
        this.currentData = {
            unit: this.initialUnit,
            equipment: '',
            equipmentName: '',
            date: dateUtils.getCurrentDate(),
            parameters: {},
            notes: ''
        };
        
        this.init();
    }

    init() {
        this.create();
        this.setupComponents();
        this.attachEvents();
        this.loadPreviousData();
    }

    create() {
        const notesSection = this.showNotes ? html`
            <div class="form-group notes-section">
                <label class="form-label">
                    <i class="fas fa-sticky-note"></i>
                    یادداشت‌ها
                </label>
                <textarea 
                    class="form-control notes-textarea" 
                    id="data-notes"
                    placeholder="یادداشت‌های اضافی درباره این اندازه‌گیری..."
                    maxlength="500"
                    rows="3"></textarea>
                <div class="notes-counter">
                    <span id="notes-counter">0</span> / 500
                </div>
            </div>
        ` : '';

        this.element = createElement(html`
            <div class="data-entry-form">
                <div class="form-header">
                    <h3 class="form-title">
                        <i class="fas fa-edit"></i>
                        ثبت داده‌های جدید
                    </h3>
                    <div class="form-actions">
                        <div class="save-status" id="save-status">
                            <i class="fas fa-save"></i>
                            <span>ذخیره محلی</span>
                        </div>
                    </div>
                </div>

                <form id="data-entry-form" novalidate>
                    <!-- Unit Selection -->
                    <div class="form-section unit-section">
                        <label class="form-label">
                            <i class="fas fa-building"></i>
                            انتخاب واحد
                        </label>
                        <div class="unit-selector">
                            ${APP_CONFIG.units.map(unit => html`
                                <label class="radio-card">
                                    <input type="radio" name="unit" value="${unit.id}" 
                                           ${unit.id === this.initialUnit ? 'checked' : ''}>
                                    <div class="radio-card-content" style="border-color: ${unit.color};">
                                        <div class="unit-icon" style="color: ${unit.color};">
                                            <i class="fas fa-industry"></i>
                                        </div>
                                        <div class="unit-info">
                                            <div class="unit-name">${unit.name}</div>
                                            <div class="unit-code">${unit.code}</div>
                                        </div>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Date Selection -->
                    <div class="form-section date-section">
                        <label class="form-label" for="measurement-date">
                            <i class="fas fa-calendar-alt"></i>
                            تاریخ اندازه‌گیری
                        </label>
                        <div class="date-input-container">
                            <input type="date" 
                                   class="form-control" 
                                   id="measurement-date"
                                   value="${dateUtils.getCurrentDate()}"
                                   max="${dateUtils.getCurrentDate()}"
                                   required>
                            <div class="date-shortcuts">
                                <button type="button" class="btn btn-sm btn-secondary" 
                                        data-date-offset="0">امروز</button>
                                <button type="button" class="btn btn-sm btn-secondary" 
                                        data-date-offset="-1">دیروز</button>
                            </div>
                        </div>
                        <div class="form-error" id="date-error"></div>
                    </div>

                    <!-- Equipment Selection -->
                    <div class="form-section equipment-section" id="equipment-container">
                        <!-- EquipmentSelector will be mounted here -->
                    </div>

                    <!-- Parameter Inputs -->
                    <div class="form-section parameters-section">
                        <div class="section-header">
                            <h4 class="section-title">
                                <i class="fas fa-sliders-h"></i>
                                پارامترها
                            </h4>
                            <div class="parameter-mode-selector" id="parameter-mode">
                                <button type="button" class="mode-btn active" data-mode="connected">
                                    <i class="fas fa-link"></i>
                                    متصل
                                </button>
                                <button type="button" class="mode-btn" data-mode="free">
                                    <i class="fas fa-unlink"></i>
                                    آزاد
                                </button>
                                <button type="button" class="mode-btn" data-mode="all">
                                    <i class="fas fa-list"></i>
                                    همه
                                </button>
                            </div>
                        </div>
                        <div class="parameters-grid" id="parameters-container">
                            <!-- Parameter inputs will be generated here -->
                        </div>
                    </div>

                    ${notesSection}

                    <!-- Form Actions -->
                    <div class="form-actions-section">
                        <div class="action-buttons">
                            <button type="button" class="btn btn-secondary" id="clear-form-btn">
                                <i class="fas fa-eraser"></i>
                                پاک کردن فرم
                            </button>
                            
                            <button type="button" class="btn btn-success" id="save-data-btn">
                                <i class="fas fa-save"></i>
                                ذخیره داده
                            </button>
                            
                            <button type="button" class="btn btn-primary" id="quick-save-btn" 
                                    title="ذخیره سریع با Enter">
                                <i class="fas fa-bolt"></i>
                                ذخیره سریع
                            </button>
                        </div>
                        
                        <div class="form-info">
                            <div class="last-entry-info" id="last-entry-info" style="display: none;">
                                <i class="fas fa-clock"></i>
                                <span>آخرین ورودی: <strong id="last-entry-text"></strong></span>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `);
    }

    setupComponents() {
        // Setup Equipment Selector
        const equipmentContainer = this.element.querySelector('#equipment-container');
        this.equipmentSelector = new EquipmentSelector({
            unit: this.currentData.unit,
            onEquipmentChange: (equipment, equipmentName) => {
                this.currentData.equipment = equipment;
                this.currentData.equipmentName = equipmentName;
                this.loadExistingData();
                this.validateForm();
            }
        });
        this.equipmentSelector.mount(equipmentContainer);

        // Setup Parameter Inputs
        this.setupParameterInputs('connected'); // Start with connected mode
    }

    setupParameterInputs(mode = 'all') {
        const parametersContainer = this.element.querySelector('#parameters-container');
        if (!parametersContainer) return;

        // Clear existing inputs
        parametersContainer.innerHTML = '';
        this.parameterInputs.clear();

        // Filter parameters based on mode
        let parameters = APP_CONFIG.parameters;
        if (mode === 'connected') {
            parameters = parameters.filter(p => p.category === 'connected');
        } else if (mode === 'free') {
            parameters = parameters.filter(p => p.category === 'free');
        }

        // Sort parameters by order
        parameters.sort((a, b) => a.order - b.order);

        // Create parameter inputs
        parameters.forEach((parameter, index) => {
            const parameterInput = new ParameterInput({
                parameter,
                value: this.currentData.parameters[parameter.id] || '',
                tabIndex: index + 1,
                onValueChange: (paramId, value) => {
                    this.currentData.parameters[paramId] = value;
                    this.validateParameter(paramId);
                    
                    if (this.autoSave) {
                        this.debounceAutoSave();
                    }
                },
                onEnterKey: () => {
                    this.handleQuickSave();
                }
            });

            const parameterWrapper = document.createElement('div');
            parameterWrapper.className = 'parameter-wrapper';
            parameterInput.mount(parameterWrapper);
            parametersContainer.appendChild(parameterWrapper);

            this.parameterInputs.set(parameter.id, parameterInput);
        });

        // Focus first input
        const firstInput = parametersContainer.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    attachEvents() {
        const form = this.element.querySelector('#data-entry-form');
        
        // Unit change
        const unitRadios = this.element.querySelectorAll('input[name="unit"]');
        unitRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.handleUnitChange(e.target.value);
                }
            });
        });

        // Date change
        const dateInput = this.element.querySelector('#measurement-date');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                this.currentData.date = dateInput.value;
                this.loadExistingData();
                this.validateForm();
            });
        }

        // Date shortcuts
        const dateShortcuts = this.element.querySelectorAll('[data-date-offset]');
        dateShortcuts.forEach(btn => {
            btn.addEventListener('click', () => {
                const offset = parseInt(btn.getAttribute('data-date-offset'));
                const date = new Date();
                date.setDate(date.getDate() + offset);
                dateInput.value = date.toISOString().split('T')[0];
                this.currentData.date = dateInput.value;
                this.loadExistingData();
            });
        });

        // Parameter mode selector
        const modeButtons = this.element.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update parameters view
                const mode = btn.getAttribute('data-mode');
                this.setupParameterInputs(mode);
            });
        });

        // Notes handling
        const notesTextarea = this.element.querySelector('#data-notes');
        if (notesTextarea) {
            notesTextarea.addEventListener('input', (e) => {
                this.currentData.notes = e.target.value;
                this.updateNotesCounter();
                this.validateForm();
            });
        }

        // Form action buttons
        const clearBtn = this.element.querySelector('#clear-form-btn');
        const saveBtn = this.element.querySelector('#save-data-btn');
        const quickSaveBtn = this.element.querySelector('#quick-save-btn');

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearForm();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.handleSaveData();
            });
        }

        if (quickSaveBtn) {
            quickSaveBtn.addEventListener('click', () => {
                this.handleQuickSave();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.closest('.data-entry-form')) {
                this.handleKeyboardShortcuts(e);
            }
        });

        // Form validation on change
        form.addEventListener('input', () => {
            this.validateForm();
        });

        // Prevent form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveData();
        });
    }

    handleUnitChange(unitId) {
        this.currentData.unit = unitId;
        
        // Update equipment selector
        if (this.equipmentSelector) {
            this.equipmentSelector.setUnit(unitId);
        }
        
        // Clear current data
        this.currentData.equipment = '';
        this.currentData.parameters = {};
        
        // Reset parameter inputs
        this.parameterInputs.forEach(input => {
            input.setValue('');
        });

        // Notify parent
        if (this.onUnitChange) {
            this.onUnitChange(unitId);
        }

        this.validateForm();
    }

    async loadExistingData() {
        if (!this.currentData.unit || !this.currentData.equipment || !this.currentData.date) {
            return;
        }

        try {
            const { default: dataService } = await import('../../services/dataService.js');
            
            const existingData = await dataService.getFromLocal({
                unit: this.currentData.unit,
                equipment: this.currentData.equipment,
                date: this.currentData.date
            });

            if (existingData.length > 0) {
                const data = existingData[0];
                
                // Update parameters
                this.currentData.parameters = { ...data.parameters };
                this.parameterInputs.forEach((input, paramId) => {
                    input.setValue(data.parameters[paramId] || '');
                });

                // Update notes
                this.currentData.notes = data.notes || '';
                const notesTextarea = this.element.querySelector('#data-notes');
                if (notesTextarea) {
                    notesTextarea.value = this.currentData.notes;
                    this.updateNotesCounter();
                }

                // Show existing data indicator
                this.showExistingDataIndicator();
            } else {
                this.hideExistingDataIndicator();
            }

        } catch (error) {
            console.error('Error loading existing data:', error);
        }
    }

    showExistingDataIndicator() {
        let indicator = this.element.querySelector('.existing-data-indicator');
        if (!indicator) {
            indicator = createElement(html`
                <div class="existing-data-indicator">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>داده‌ای برای این تجهیز و تاریخ موجود است. در صورت ذخیره، داده قبلی جایگزین می‌شود.</span>
                </div>
            `);
            
            const formHeader = this.element.querySelector('.form-header');
            formHeader.after(indicator);
        }
        
        indicator.style.display = 'flex';
    }

    hideExistingDataIndicator() {
        const indicator = this.element.querySelector('.existing-data-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    validateForm() {
        let isValid = true;
        const errors = [];

        try {
            // Validate basic data
            const validationData = {
                unitType: this.currentData.unit,
                equipmentId: this.currentData.equipment,
                measurementDate: this.currentData.date,
                parameters: this.currentData.parameters,
                notes: this.currentData.notes
            };

            batchValidators.vibrateDataEntry(validationData);
            
            // Clear form errors
            this.clearFormErrors();

        } catch (validationErrors) {
            isValid = false;
            
            if (Array.isArray(validationErrors)) {
                validationErrors.forEach(error => {
                    this.showFieldError(error.field, error.message);
                });
            } else {
                errors.push(validationErrors.message);
            }
        }

        // Update save button state
        const saveBtn = this.element.querySelector('#save-data-btn');
        const quickSaveBtn = this.element.querySelector('#quick-save-btn');
        
        if (saveBtn) {
            saveBtn.disabled = !isValid;
        }
        if (quickSaveBtn) {
            quickSaveBtn.disabled = !isValid;
        }

        return isValid;
    }

    validateParameter(paramId) {
        const input = this.parameterInputs.get(paramId);
        const value = this.currentData.parameters[paramId];

        if (!input) return true;

        try {
            if (value !== undefined && value !== '') {
                validators.parameter.value(value, paramId);
            }
            input.clearError();
            return true;
        } catch (error) {
            input.showError(error.message);
            return false;
        }
    }

    async handleSaveData() {
        if (!this.validateForm()) {
            uiUtils.showNotification('لطفاً خطاهای فرم را تصحیح کنید', 'warning');
            return;
        }

        try {
            this.setLoading(true);

            if (this.onDataSave) {
                await this.onDataSave(this.currentData);
            } else {
                // Default save behavior
                const { default: dataService } = await import('../../services/dataService.js');
                
                const result = await dataService.saveData({
                    unit: this.currentData.unit,
                    equipment: this.currentData.equipment,
                    equipmentName: this.currentData.equipmentName,
                    date: this.currentData.date,
                    parameters: this.currentData.parameters,
                    notes: this.currentData.notes
                });

                if (result.success) {
                    uiUtils.showNotification('داده با موفقیت ذخیره شد', 'success');
                    this.updateLastEntryInfo();
                    this.clearForm();
                }
            }

        } catch (error) {
            uiUtils.showNotification(error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    handleQuickSave() {
        // Quick save with current valid parameters
        const validParams = {};
        let hasValidData = false;

        // Collect valid parameters
        Object.entries(this.currentData.parameters).forEach(([paramId, value]) => {
            if (value !== undefined && value !== '') {
                try {
                    validators.parameter.value(value, paramId);
                    validParams[paramId] = value;
                    hasValidData = true;
                } catch (error) {
                    // Skip invalid parameters in quick save
                }
            }
        });

        if (!hasValidData) {
            uiUtils.showNotification('لطفاً حداقل یک پارامتر معتبر وارد کنید', 'warning');
            return;
        }

        if (!this.currentData.unit || !this.currentData.equipment || !this.currentData.date) {
            uiUtils.showNotification('لطفاً واحد، تجهیز و تاریخ را انتخاب کنید', 'warning');
            return;
        }

        // Save with valid parameters
        this.currentData.parameters = validParams;
        this.handleSaveData();
    }

    clearForm() {
        // Reset data
        this.currentData = {
            unit: this.currentData.unit, // Keep current unit
            equipment: '',
            equipmentName: '',
            date: dateUtils.getCurrentDate(),
            parameters: {},
            notes: ''
        };

        // Reset equipment selector
        if (this.equipmentSelector) {
            this.equipmentSelector.reset();
        }

        // Reset parameter inputs
        this.parameterInputs.forEach(input => {
            input.setValue('');
            input.clearError();
        });

        // Reset notes
        const notesTextarea = this.element.querySelector('#data-notes');
        if (notesTextarea) {
            notesTextarea.value = '';
            this.updateNotesCounter();
        }

        // Reset date to today
        const dateInput = this.element.querySelector('#measurement-date');
        if (dateInput) {
            dateInput.value = dateUtils.getCurrentDate();
        }

        // Clear form errors
        this.clearFormErrors();
        
        // Hide existing data indicator
        this.hideExistingDataIndicator();

        // Focus first input
        setTimeout(() => {
            const firstInput = this.element.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    handleKeyboardShortcuts(e) {
        // Enter key - Quick save (if not in textarea)
        if (e.key === 'Enter' && !e.target.matches('textarea')) {
            e.preventDefault();
            this.handleQuickSave();
        }
        
        // Ctrl/Cmd + S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.handleSaveData();
        }
        
        // Escape - Clear form
        if (e.key === 'Escape') {
            e.preventDefault();
            this.clearForm();
        }
    }

    updateNotesCounter() {
        const counter = this.element.querySelector('#notes-counter');
        if (counter) {
            counter.textContent = this.currentData.notes.length;
        }
    }

    updateLastEntryInfo() {
        const lastEntryInfo = this.element.querySelector('#last-entry-info');
        const lastEntryText = this.element.querySelector('#last-entry-text');
        
        if (lastEntryInfo && lastEntryText) {
            const now = new Date();
            lastEntryText.textContent = `${this.currentData.equipmentName} - ${now.toLocaleTimeString('fa-IR')}`;
            lastEntryInfo.style.display = 'flex';
            
            // Hide after 5 seconds
            setTimeout(() => {
                lastEntryInfo.style.display = 'none';
            }, 5000);
        }
    }

    showFieldError(field, message) {
        const errorElement = this.element.querySelector(`#${field}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearFormErrors() {
        const errorElements = this.element.querySelectorAll('.form-error');
        errorElements.forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
    }

    setLoading(loading) {
        const saveBtn = this.element.querySelector('#save-data-btn');
        const quickSaveBtn = this.element.querySelector('#quick-save-btn');
        const form = this.element.querySelector('#data-entry-form');

        if (saveBtn) {
            if (loading) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال ذخیره...';
            } else {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> ذخیره داده';
            }
        }

        if (quickSaveBtn) {
            quickSaveBtn.disabled = loading;
        }

        if (form) {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.disabled = loading;
            });
        }
    }

    // Auto save functionality
    debounceAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            if (this.validateForm()) {
                this.handleSaveData();
            }
        }, 2000); // Auto save after 2 seconds of inactivity
    }

    loadPreviousData() {
        // Load any previously incomplete data from localStorage
        const savedData = localStorage.getItem('incomplete_data_entry');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (data.date === dateUtils.getCurrentDate()) {
                    this.currentData = { ...this.currentData, ...data };
                    this.populateForm();
                }
            } catch (error) {
                console.error('Error loading previous data:', error);
            }
        }
    }

    savePreviousData() {
        // Save current form state for recovery
        localStorage.setItem('incomplete_data_entry', JSON.stringify(this.currentData));
    }

    populateForm() {
        // Populate form with current data
        if (this.equipmentSelector && this.currentData.equipment) {
            this.equipmentSelector.setEquipment(this.currentData.equipment);
        }

        this.parameterInputs.forEach((input, paramId) => {
            if (this.currentData.parameters[paramId]) {
                input.setValue(this.currentData.parameters[paramId]);
            }
        });

        const notesTextarea = this.element.querySelector('#data-notes');
        if (notesTextarea && this.currentData.notes) {
            notesTextarea.value = this.currentData.notes;
            this.updateNotesCounter();
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
        // Save current state before destroying
        if (Object.keys(this.currentData.parameters).length > 0) {
            this.savePreviousData();
        }

        // Clear auto save timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        // Destroy child components
        if (this.equipmentSelector) {
            this.equipmentSelector.destroy();
        }

        this.parameterInputs.forEach(input => {
            input.destroy();
        });

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default DataEntryForm;