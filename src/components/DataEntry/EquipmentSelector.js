import { createElement, html } from '../../utils/reactUtils.js';
import { APP_CONFIG } from '../../utils/constants.js';
import { uiUtils } from '../../utils/helpers.js';

export class EquipmentSelector {
    constructor(options = {}) {
        this.unit = options.unit || 'DRI1';
        this.selectedEquipment = options.selectedEquipment || '';
        this.onEquipmentChange = options.onEquipmentChange || null;
        this.showSearch = options.showSearch !== false;
        this.groupByType = options.groupByType !== false;
        this.showCount = options.showCount !== false;
        this.element = null;
        this.searchTerm = '';
        
        this.init();
    }

    init() {
        this.create();
        this.attachEvents();
        this.updateEquipmentList();
    }

    create() {
        const searchSection = this.showSearch ? html`
            <div class="equipment-search">
                <div class="search-input-container">
                    <input type="text" 
                           class="form-control search-input" 
                           id="equipment-search"
                           placeholder="جستجو در تجهیزات..."
                           autocomplete="off">
                    <i class="fas fa-search search-icon"></i>
                </div>
            </div>
        ` : '';

        this.element = createElement(html`
            <div class="equipment-selector">
                <label class="form-label">
                    <i class="fas fa-cogs"></i>
                    انتخاب تجهیز
                    <span class="equipment-count" id="equipment-count" style="display: ${this.showCount ? 'inline' : 'none'};"></span>
                </label>
                
                ${searchSection}
                
                <div class="equipment-list" id="equipment-list">
                    <!-- Equipment items will be generated here -->
                </div>
                
                <div class="form-error" id="equipment-error"></div>
            </div>
        `);
    }

    attachEvents() {
        // Search functionality
        const searchInput = this.element.querySelector('#equipment-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.updateEquipmentList();
            });
        }
    }

    updateEquipmentList() {
        const equipmentList = this.element.querySelector('#equipment-list');
        const equipmentCount = this.element.querySelector('#equipment-count');
        
        if (!equipmentList) return;

        // Filter equipments by unit
        let equipments = APP_CONFIG.equipments.filter(eq => 
            eq.id.includes(this.unit)
        );

        // Apply search filter
        if (this.searchTerm) {
            equipments = equipments.filter(eq => 
                eq.name.toLowerCase().includes(this.searchTerm) ||
                eq.code.toLowerCase().includes(this.searchTerm) ||
                eq.id.toLowerCase().includes(this.searchTerm)
            );
        }

        // Update count
        if (equipmentCount) {
            equipmentCount.textContent = `(${equipments.length} مورد)`;
        }

        // Group equipments by type if enabled
        let groupedEquipments = equipments;
        if (this.groupByType) {
            groupedEquipments = this.groupEquipmentsByType(equipments);
        }

        // Generate HTML
        equipmentList.innerHTML = this.generateEquipmentHTML(groupedEquipments);

        // Attach click events
        this.attachEquipmentEvents();
    }

    groupEquipmentsByType(equipments) {
        const groups = {
            'GB': { name: 'گیربکس‌ها', icon: 'fas fa-cog', items: [] },
            'CP': { name: 'کمپرسورها', icon: 'fas fa-compress', items: [] },
            'FN': { name: 'فن‌ها', icon: 'fas fa-fan', items: [] }
        };

        equipments.forEach(equipment => {
            const type = equipment.id.split('-')[0];
            if (groups[type]) {
                groups[type].items.push(equipment);
            }
        });

        return groups;
    }

    generateEquipmentHTML(data) {
        if (this.groupByType && typeof data === 'object' && !Array.isArray(data)) {
            // Grouped display
            return Object.entries(data)
                .filter(([type, group]) => group.items.length > 0)
                .map(([type, group]) => html`
                    <div class="equipment-group">
                        <div class="group-header">
                            <i class="${group.icon}"></i>
                            <span>${group.name}</span>
                            <span class="group-count">(${group.items.length})</span>
                        </div>
                        <div class="group-items">
                            ${group.items.map(equipment => this.generateEquipmentItem(equipment)).join('')}
                        </div>
                    </div>
                `).join('');
        } else {
            // Simple list display
            return data.map(equipment => this.generateEquipmentItem(equipment)).join('');
        }
    }

    generateEquipmentItem(equipment) {
        const isSelected = this.selectedEquipment === equipment.id;
        
        return html`
            <div class="equipment-item ${isSelected ? 'selected' : ''}" 
                 data-equipment-id="${equipment.id}"
                 data-equipment-name="${equipment.name}">
                <div class="equipment-icon" style="color: ${equipment.color};">
                    <i class="${equipment.icon}"></i>
                </div>
                <div class="equipment-info">
                    <div class="equipment-name">${equipment.name}</div>
                    <div class="equipment-code">${equipment.code}</div>
                </div>
                <div class="equipment-selection-indicator">
                    <i class="fas fa-check"></i>
                </div>
            </div>
        `;
    }

    attachEquipmentEvents() {
        const equipmentItems = this.element.querySelectorAll('.equipment-item');
        
        equipmentItems.forEach(item => {
            item.addEventListener('click', () => {
                const equipmentId = item.getAttribute('data-equipment-id');
                const equipmentName = item.getAttribute('data-equipment-name');
                this.selectEquipment(equipmentId, equipmentName);
            });

            // Keyboard navigation
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });

        // Make items focusable for keyboard navigation
        equipmentItems.forEach((item, index) => {
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            item.setAttribute('aria-label', item.getAttribute('data-equipment-name'));
        });
    }

    selectEquipment(equipmentId, equipmentName) {
        // Update selection
        this.selectedEquipment = equipmentId;

        // Update visual state
        const equipmentItems = this.element.querySelectorAll('.equipment-item');
        equipmentItems.forEach(item => {
            item.classList.remove('selected');
            if (item.getAttribute('data-equipment-id') === equipmentId) {
                item.classList.add('selected');
            }
        });

        // Clear any errors
        this.clearError();

        // Notify parent
        if (this.onEquipmentChange) {
            this.onEquipmentChange(equipmentId, equipmentName);
        }

        // Show selection feedback
        uiUtils.showNotification(`${equipmentName} انتخاب شد`, 'info', 1500);
    }

    setUnit(unit) {
        if (this.unit !== unit) {
            this.unit = unit;
            this.selectedEquipment = ''; // Reset selection when unit changes
            this.updateEquipmentList();
            this.clearError();
        }
    }

    setEquipment(equipmentId) {
        // Find equipment by ID
        const equipment = APP_CONFIG.equipments.find(eq => eq.id === equipmentId);
        
        if (equipment) {
            this.selectEquipment(equipment.id, equipment.name);
        }
    }

    getSelectedEquipment() {
        return {
            id: this.selectedEquipment,
            name: this.selectedEquipment ? 
                APP_CONFIG.equipments.find(eq => eq.id === this.selectedEquipment)?.name : ''
        };
    }

    reset() {
        this.selectedEquipment = '';
        this.searchTerm = '';
        
        const searchInput = this.element.querySelector('#equipment-search');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.updateEquipmentList();
        this.clearError();
    }

    showError(message) {
        const errorElement = this.element.querySelector('#equipment-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        // Add error class to selector
        this.element.classList.add('has-error');
    }

    clearError() {
        const errorElement = this.element.querySelector('#equipment-error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }

        // Remove error class
        this.element.classList.remove('has-error');
    }

    // Enable/disable selector
    setEnabled(enabled) {
        const equipmentItems = this.element.querySelectorAll('.equipment-item');
        const searchInput = this.element.querySelector('#equipment-search');

        equipmentItems.forEach(item => {
            if (enabled) {
                item.removeAttribute('disabled');
                item.setAttribute('tabindex', '0');
            } else {
                item.setAttribute('disabled', 'true');
                item.setAttribute('tabindex', '-1');
            }
        });

        if (searchInput) {
            searchInput.disabled = !enabled;
        }

        this.element.classList.toggle('disabled', !enabled);
    }

    // Add custom equipment (for dynamic additions)
    addCustomEquipment(equipment) {
        // Validate equipment object
        if (!equipment.id || !equipment.name) {
            console.error('Invalid equipment object');
            return false;
        }

        // Add to config (temporarily)
        const customEquipment = {
            ...equipment,
            icon: equipment.icon || 'fas fa-cog',
            color: equipment.color || '#6b7280',
            code: equipment.code || equipment.id
        };

        // Check if equipment with same ID exists
        const existingIndex = APP_CONFIG.equipments.findIndex(eq => eq.id === equipment.id);
        if (existingIndex >= 0) {
            APP_CONFIG.equipments[existingIndex] = customEquipment;
        } else {
            APP_CONFIG.equipments.push(customEquipment);
        }

        // Update list
        this.updateEquipmentList();
        
        return true;
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

export default EquipmentSelector;