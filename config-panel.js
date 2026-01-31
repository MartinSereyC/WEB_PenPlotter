/**
 * Configuration Panel UI Component
 * Embeddable UI for selecting support and tool profiles with safety display
 */

class ConfigPanel {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            showManageButton: true,
            showSafetyInfo: true,
            compact: false,
            onProfileChange: null,
            ...options
        };

        if (!this.container) {
            console.error(`ConfigPanel: Container #${containerId} not found`);
            return;
        }

        this.render();
        this.attachListeners();

        // Listen for config changes from other panels/pages
        machineConfig.addListener(() => this.updateDisplay());
    }

    render() {
        const compact = this.options.compact;

        this.container.innerHTML = `
            <div class="config-panel ${compact ? 'config-panel--compact' : ''}">
                <div class="config-panel__header">
                    <span class="config-panel__icon">⚙️</span>
                    <span class="config-panel__title">Safety Configuration</span>
                </div>
                
                <div class="config-panel__selectors">
                    <div class="config-panel__selector">
                        <label for="config-support-select">Support:</label>
                        <select id="config-support-select"></select>
                    </div>
                    <div class="config-panel__selector">
                        <label for="config-tool-select">Tool:</label>
                        <select id="config-tool-select"></select>
                    </div>
                </div>
                
                ${this.options.showSafetyInfo ? `
                <div class="config-panel__safety" id="config-safety-info">
                    <!-- Safety info populated by updateDisplay() -->
                </div>
                ` : ''}
                
                ${this.options.showManageButton ? `
                <button class="config-panel__manage-btn" id="config-manage-btn">
                    Manage Profiles
                </button>
                ` : ''}
            </div>
            
            <!-- Profile Management Modal -->
            <div class="config-modal" id="config-modal" style="display: none;">
                <div class="config-modal__content">
                    <div class="config-modal__header">
                        <h2>Manage Profiles</h2>
                        <button class="config-modal__close" id="config-modal-close">&times;</button>
                    </div>
                    <div class="config-modal__body">
                        <div class="config-modal__tabs">
                            <button class="config-modal__tab active" data-tab="machine">Machine Settings</button>
                            <button class="config-modal__tab" data-tab="support">Support Profiles</button>
                            <button class="config-modal__tab" data-tab="tool">Tool Profiles</button>
                        </div>
                        
                        <div class="config-modal__tab-content" id="machine-tab">
                            <div class="config-modal__form">
                                <h4>Machine Dimensions</h4>
                                <div class="config-modal__field">
                                    <label>Working Width (X):</label>
                                    <input type="number" id="config-modal-working-x" placeholder="700"> mm
                                </div>
                                <div class="config-modal__field">
                                    <label>Working Height (Y):</label>
                                    <input type="number" id="config-modal-working-y" placeholder="850"> mm
                                </div>
                                <button id="config-save-machine-btn" style="margin-top: 15px; background: #ff6b35;">Save Dimensions</button>
                            </div>
                        </div>

                        <div class="config-modal__tab-content" id="support-tab" style="display: none;">
                            <div class="config-modal__list" id="support-list"></div>
                            <div class="config-modal__form">
                                <h4>Add New Support Profile</h4>
                                <input type="text" id="new-support-name" placeholder="Name (e.g., Canvas 5cm)">
                                <input type="number" id="new-support-thickness" placeholder="Thickness (mm)" min="0" step="1">
                                <input type="text" id="new-support-desc" placeholder="Description (optional)">
                                <button id="add-support-btn">Add Support</button>
                            </div>
                        </div>
                        
                        <div class="config-modal__tab-content" id="tool-tab" style="display: none;">
                            <div class="config-modal__list" id="tool-list"></div>
                            <div class="config-modal__form">
                                <h4>Add New Tool Profile</h4>
                                <input type="text" id="new-tool-name" placeholder="Name (e.g., Thick Brush)">
                                <input type="number" id="new-tool-workingz" placeholder="Working Z (mm)" min="0" step="1">
                                <input type="number" id="new-tool-clearance" placeholder="Travel Clearance (mm)" min="0" step="1">
                                <input type="text" id="new-tool-desc" placeholder="Description (optional)">
                                <button id="add-tool-btn">Add Tool</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.updateDisplay();
    }

    updateDisplay() {
        // Update support dropdown
        const supportSelect = document.getElementById('config-support-select');
        if (supportSelect) {
            const supports = machineConfig.getSupportProfiles();
            const activeSupport = machineConfig.getActiveSupport();

            supportSelect.innerHTML = supports.map(s =>
                `<option value="${s.id}" ${s.id === activeSupport?.id ? 'selected' : ''}>
                    ${s.name} (${s.thickness}mm)
                </option>`
            ).join('');
        }

        // Update tool dropdown
        const toolSelect = document.getElementById('config-tool-select');
        if (toolSelect) {
            const tools = machineConfig.getToolProfiles();
            const activeTool = machineConfig.getActiveTool();

            toolSelect.innerHTML = tools.map(t =>
                `<option value="${t.id}" ${t.id === activeTool?.id ? 'selected' : ''}>
                    ${t.name}
                </option>`
            ).join('');
        }

        // Update safety info
        const safetyInfo = document.getElementById('config-safety-info');
        if (safetyInfo) {
            const summary = machineConfig.getSafetySummary();

            if (!summary.configured) {
                safetyInfo.innerHTML = `
                    <div class="config-panel__warning">
                        ⚠️ Please select both support and tool profiles
                    </div>
                `;
            } else {
                safetyInfo.innerHTML = `
                    <div class="config-panel__limits">
                        <div class="config-panel__limit">
                            <span class="config-panel__limit-label">Min Working Z:</span>
                            <span class="config-panel__limit-value">${summary.minWorkingZ}mm</span>
                        </div>
                        <div class="config-panel__limit">
                            <span class="config-panel__limit-label">Min Travel Z:</span>
                            <span class="config-panel__limit-value">${summary.minTravelZ}mm</span>
                        </div>
                    </div>
                `;
            }
        }

        // Update modal lists if open
        this.updateModalLists();

        // Notify callback
        if (this.options.onProfileChange) {
            this.options.onProfileChange(machineConfig.getSafetySummary());
        }
    }

    updateModalLists() {
        // Support list
        const supportList = document.getElementById('support-list');
        if (supportList) {
            const supports = machineConfig.getSupportProfiles();
            supportList.innerHTML = supports.map(s => `
                <div class="config-modal__item">
                    <div class="config-modal__item-info">
                        <strong>${s.name}</strong>
                        <span>Thickness: ${s.thickness}mm</span>
                        ${s.description ? `<small>${s.description}</small>` : ''}
                    </div>
                    <button class="config-modal__delete-btn" data-type="support" data-id="${s.id}">Delete</button>
                </div>
            `).join('');
        }

        // Tool list
        const toolList = document.getElementById('tool-list');
        if (toolList) {
            const tools = machineConfig.getToolProfiles();
            toolList.innerHTML = tools.map(t => `
                <div class="config-modal__item">
                    <div class="config-modal__item-info">
                        <strong>${t.name}</strong>
                        <span>Working Z: ${t.workingZ}mm, Clearance: ${t.travelClearance}mm</span>
                        ${t.description ? `<small>${t.description}</small>` : ''}
                    </div>
                    <button class="config-modal__delete-btn" data-type="tool" data-id="${t.id}">Delete</button>
                </div>
            `).join('');
        }

        // Machine settings
        const modalX = document.getElementById('config-modal-working-x');
        const modalY = document.getElementById('config-modal-working-y');
        if (modalX && modalY) {
            modalX.value = machineConfig.getWorkingX();
            modalY.value = machineConfig.getWorkingY();
        }
    }

    attachListeners() {
        // Support select change
        const supportSelect = document.getElementById('config-support-select');
        if (supportSelect) {
            supportSelect.addEventListener('change', (e) => {
                machineConfig.setActiveSupport(e.target.value);
            });
        }

        // Tool select change
        const toolSelect = document.getElementById('config-tool-select');
        if (toolSelect) {
            toolSelect.addEventListener('change', (e) => {
                machineConfig.setActiveTool(e.target.value);
            });
        }

        // Manage button
        const manageBtn = document.getElementById('config-manage-btn');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => this.openModal());
        }

        // Modal close
        const closeBtn = document.getElementById('config-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Modal backdrop click
        const modal = document.getElementById('config-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }

        // Tab switching
        document.querySelectorAll('.config-modal__tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;

                // Update active tab
                document.querySelectorAll('.config-modal__tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');

                // Show/hide content
                document.getElementById('machine-tab').style.display = tabName === 'machine' ? 'block' : 'none';
                document.getElementById('support-tab').style.display = tabName === 'support' ? 'block' : 'none';
                document.getElementById('tool-tab').style.display = tabName === 'tool' ? 'block' : 'none';
            });
        });

        // Save machine dimensions
        const saveMachineBtn = document.getElementById('config-save-machine-btn');
        if (saveMachineBtn) {
            saveMachineBtn.addEventListener('click', () => {
                const x = document.getElementById('config-modal-working-x').value;
                const y = document.getElementById('config-modal-working-y').value;
                if (typeof machineConfig !== 'undefined') {
                    machineConfig.setWorkingDimensions(x, y);
                    alert('Machine dimensions updated!');
                }
            });
        }

        // Add support button
        const addSupportBtn = document.getElementById('add-support-btn');
        if (addSupportBtn) {
            addSupportBtn.addEventListener('click', () => {
                const name = document.getElementById('new-support-name').value.trim();
                const thickness = parseFloat(document.getElementById('new-support-thickness').value);
                const description = document.getElementById('new-support-desc').value.trim();

                if (!name || isNaN(thickness)) {
                    alert('Please enter a name and thickness');
                    return;
                }

                machineConfig.addSupportProfile({ name, thickness, description });

                // Clear form
                document.getElementById('new-support-name').value = '';
                document.getElementById('new-support-thickness').value = '';
                document.getElementById('new-support-desc').value = '';

                this.updateDisplay();
            });
        }

        // Add tool button
        const addToolBtn = document.getElementById('add-tool-btn');
        if (addToolBtn) {
            addToolBtn.addEventListener('click', () => {
                const name = document.getElementById('new-tool-name').value.trim();
                const workingZ = parseFloat(document.getElementById('new-tool-workingz').value);
                const travelClearance = parseFloat(document.getElementById('new-tool-clearance').value);
                const description = document.getElementById('new-tool-desc').value.trim();

                if (!name || isNaN(workingZ) || isNaN(travelClearance)) {
                    alert('Please enter a name, working Z, and travel clearance');
                    return;
                }

                machineConfig.addToolProfile({ name, workingZ, travelClearance, description });

                // Clear form
                document.getElementById('new-tool-name').value = '';
                document.getElementById('new-tool-workingz').value = '';
                document.getElementById('new-tool-clearance').value = '';
                document.getElementById('new-tool-desc').value = '';

                this.updateDisplay();
            });
        }

        // Delete buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('config-modal__delete-btn')) {
                const type = e.target.dataset.type;
                const id = e.target.dataset.id;

                if (confirm(`Delete this ${type} profile?`)) {
                    if (type === 'support') {
                        machineConfig.deleteSupportProfile(id);
                    } else {
                        machineConfig.deleteToolProfile(id);
                    }
                    this.updateDisplay();
                }
            }
        });
    }

    openModal() {
        const modal = document.getElementById('config-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateModalLists();
        }
    }

    closeModal() {
        const modal = document.getElementById('config-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Export for module systems (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConfigPanel };
}
