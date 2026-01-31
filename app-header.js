/**
 * App Header Component
 * Persistent navigation and configuration header for all G-code generator pages
 */

class AppHeader {
    constructor() {
        // Navigation items
        this.navItems = [
            { id: 'home', name: 'Home', href: 'index.html', icon: '🏠' },
            { id: 'image-points', name: 'Image to Points', href: 'Imagen a puntos por capas.html', icon: '🖼️' },
            { id: 'radial', name: 'Radial', href: 'Radial WEB.html', icon: '🔘' },
            { id: 'random', name: 'Random Path', href: 'suncho perforacione y ramaño ajustable- WEB.html', icon: '🎲' }
        ];

        this.init();
    }

    init() {
        // Create header container if it doesn't exist
        if (!document.getElementById('app-header')) {
            this.injectHeader();
        }

        this.setupEventListeners();
        this.updateDisplay();

        // Listen for config changes
        if (typeof machineConfig !== 'undefined') {
            machineConfig.addListener(() => this.updateDisplay());
        }
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';

        for (const item of this.navItems) {
            if (filename === item.href ||
                (filename === '' && item.id === 'home') ||
                (filename === '/' && item.id === 'home')) {
                return item.id;
            }
        }
        return 'home';
    }

    injectHeader() {
        const currentPage = this.getCurrentPage();

        const headerHTML = `
            <header id="app-header" class="app-header">
                <div class="app-header__nav-row">
                    <div class="app-header__logo">
                        <span class="app-header__logo-icon">🖊️</span>
                        <span class="app-header__logo-text">G-Code Tools</span>
                    </div>
                    <nav class="app-header__nav">
                        ${this.navItems.map(item => `
                            <a href="${item.href}" 
                               class="app-header__nav-item ${currentPage === item.id ? 'app-header__nav-item--active' : ''}"
                               data-page="${item.id}">
                                <span class="app-header__nav-icon">${item.icon}</span>
                                <span class="app-header__nav-text">${item.name}</span>
                            </a>
                        `).join('')}
                    </nav>
                    <button class="app-header__manage-btn" id="header-manage-btn">
                        ⚙️ Manage
                    </button>
                </div>
                <div class="app-header__config-row">
                    <div class="app-header__config-item">
                        <label for="header-support-select">Support:</label>
                        <select id="header-support-select" class="app-header__select"></select>
                    </div>
                    <div class="app-header__config-item">
                        <label for="header-working-x">X:</label>
                        <input type="number" id="header-working-x" class="app-header__input" min="0" step="10">
                        <span class="app-header__unit">mm</span>
                    </div>
                    <div class="app-header__config-item">
                        <label for="header-working-y">Y:</label>
                        <input type="number" id="header-working-y" class="app-header__input" min="0" step="10">
                        <span class="app-header__unit">mm</span>
                    </div>
                    <button id="header-apply-dimensions" class="app-header__apply-btn">Update All Tools</button>
                    <div class="app-header__config-item">
                        <label for="header-tool-select">Tool:</label>
                        <select id="header-tool-select" class="app-header__select"></select>
                    </div>
                    <div class="app-header__safety" id="header-safety-info">
                        <!-- Safety info populated dynamically -->
                    </div>
                </div>
            </header>
            <div class="app-header__spacer"></div>
        `;

        // Insert at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
    }

    updateDisplay() {
        if (typeof machineConfig === 'undefined') return;

        // Update support dropdown
        const supportSelect = document.getElementById('header-support-select');
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
        const toolSelect = document.getElementById('header-tool-select');
        if (toolSelect) {
            const tools = machineConfig.getToolProfiles();
            const activeTool = machineConfig.getActiveTool();

            toolSelect.innerHTML = tools.map(t =>
                `<option value="${t.id}" ${t.id === activeTool?.id ? 'selected' : ''}>
                    ${t.name}
                </option>`
            ).join('');
        }

        // Update dimension inputs
        const xInput = document.getElementById('header-working-x');
        const yInput = document.getElementById('header-working-y');
        if (xInput && xInput !== document.activeElement) {
            xInput.value = machineConfig.getWorkingX();
        }
        if (yInput && yInput !== document.activeElement) {
            yInput.value = machineConfig.getWorkingY();
        }

        // Show/hide update button based on changes
        // Now always visible, but we can highlight it
        this.toggleUpdateButton();

        // Update safety info
        const safetyInfo = document.getElementById('header-safety-info');
        if (safetyInfo) {
            const summary = machineConfig.getSafetySummary();

            if (!summary.configured) {
                safetyInfo.innerHTML = `<span class="app-header__safety-warning">⚠️ Configure profiles</span>`;
            } else {
                safetyInfo.innerHTML = `
                    <span class="app-header__safety-ok">
                        ✓ Min Z: ${summary.minWorkingZ}mm
                    </span>
                `;
            }
        }
    }

    setupEventListeners() {
        // Support select change
        document.getElementById('header-support-select')?.addEventListener('change', (e) => {
            if (typeof machineConfig !== 'undefined') {
                machineConfig.setActiveSupport(e.target.value);
            }
        });

        // Tool select change
        document.getElementById('header-tool-select')?.addEventListener('change', (e) => {
            if (typeof machineConfig !== 'undefined') {
                machineConfig.setActiveTool(e.target.value);
            }
        });

        // X dimension change
        document.getElementById('header-working-x')?.addEventListener('input', () => this.toggleUpdateButton());

        // Y dimension change
        document.getElementById('header-working-y')?.addEventListener('input', () => this.toggleUpdateButton());

        // Apply dimensions button
        document.getElementById('header-apply-dimensions')?.addEventListener('click', () => {
            const x = document.getElementById('header-working-x').value;
            const y = document.getElementById('header-working-y').value;
            if (typeof machineConfig !== 'undefined') {
                machineConfig.setWorkingDimensions(x, y);
                // Visual feedback
                const btn = document.getElementById('header-apply-dimensions');
                const originalText = btn.textContent;
                btn.textContent = '✓ Updated!';
                btn.classList.add('app-header__apply-btn--success');
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('app-header__apply-btn--success');
                    this.toggleUpdateButton();
                }, 2000);
            }
        });

        // Manage button - open modal if ConfigPanel exists
        document.getElementById('header-manage-btn')?.addEventListener('click', () => {
            // Look for existing config modal or create one
            let modal = document.getElementById('config-modal');
            if (modal) {
                modal.style.display = 'flex';
                // Trigger update of modal lists
                if (typeof configPanelInstance !== 'undefined' && configPanelInstance.updateModalLists) {
                    configPanelInstance.updateModalLists();
                }
            } else {
                // Create inline modal for profile management
                this.showManageModal();
            }
        });
    }

    showManageModal() {
        // Create a simple modal for managing profiles
        const existingModal = document.getElementById('header-manage-modal');
        if (existingModal) {
            existingModal.style.display = 'flex';
            this.updateManageModal();
            return;
        }

        const modalHTML = `
            <div class="config-modal" id="header-manage-modal">
                <div class="config-modal__content">
                    <div class="config-modal__header">
                        <h2>Manage Profiles</h2>
                        <button class="config-modal__close" id="header-modal-close">&times;</button>
                    </div>
                    <div class="config-modal__body">
                        <div class="config-modal__tabs">
                            <button class="config-modal__tab active" data-tab="machine">Machine Settings</button>
                            <button class="config-modal__tab" data-tab="support">Support Profiles</button>
                            <button class="config-modal__tab" data-tab="tool">Tool Profiles</button>
                        </div>
                        
                        <div class="config-modal__tab-content" id="header-machine-tab">
                            <div class="config-modal__form">
                                <h4>Machine Dimensions</h4>
                                <div class="config-modal__field">
                                    <label>Working Width (X):</label>
                                    <input type="number" id="modal-working-x" placeholder="700"> mm
                                </div>
                                <div class="config-modal__field">
                                    <label>Working Height (Y):</label>
                                    <input type="number" id="modal-working-y" placeholder="850"> mm
                                </div>
                                <button id="header-save-machine-btn" style="margin-top: 15px; background: #ff6b35;">Save Dimensions</button>
                            </div>
                        </div>

                        <div class="config-modal__tab-content" id="header-support-tab" style="display: none;">
                            <div class="config-modal__list" id="header-support-list"></div>
                            <div class="config-modal__form">
                                <h4>Add New Support Profile</h4>
                                <input type="text" id="header-new-support-name" placeholder="Name (e.g., Canvas 5cm)">
                                <input type="number" id="header-new-support-thickness" placeholder="Thickness (mm)" min="0" step="1">
                                <button id="header-add-support-btn">Add Support</button>
                            </div>
                        </div>
                        
                        <div class="config-modal__tab-content" id="header-tool-tab" style="display: none;">
                            <div class="config-modal__list" id="header-tool-list"></div>
                            <div class="config-modal__form">
                                <h4>Add New Tool Profile</h4>
                                <input type="text" id="header-new-tool-name" placeholder="Name (e.g., Thick Brush)">
                                <input type="number" id="header-new-tool-workingz" placeholder="Working Z (mm)" min="0" step="1">
                                <input type="number" id="header-new-tool-clearance" placeholder="Travel Clearance (mm)" min="0" step="1">
                                <button id="header-add-tool-btn">Add Tool</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalListeners();
        this.updateManageModal();
    }

    updateManageModal() {
        if (typeof machineConfig === 'undefined') return;

        // Support list
        const supportList = document.getElementById('header-support-list');
        if (supportList) {
            const supports = machineConfig.getSupportProfiles();
            supportList.innerHTML = supports.map(s => `
                <div class="config-modal__item">
                    <div class="config-modal__item-info">
                        <strong>${s.name}</strong>
                        <span>Thickness: ${s.thickness}mm</span>
                    </div>
                    <button class="config-modal__delete-btn" data-type="support" data-id="${s.id}">Delete</button>
                </div>
            `).join('');
        }

        // Tool list
        const toolList = document.getElementById('header-tool-list');
        if (toolList) {
            const tools = machineConfig.getToolProfiles();
            toolList.innerHTML = tools.map(t => `
                <div class="config-modal__item">
                    <div class="config-modal__item-info">
                        <strong>${t.name}</strong>
                        <span>Working Z: ${t.workingZ}mm, Clearance: ${t.travelClearance}mm</span>
                    </div>
                    <button class="config-modal__delete-btn" data-type="tool" data-id="${t.id}">Delete</button>
                </div>
            `).join('');
        }

        // Machine settings
        const modalX = document.getElementById('modal-working-x');
        const modalY = document.getElementById('modal-working-y');
        if (modalX && modalY) {
            modalX.value = machineConfig.getWorkingX();
            modalY.value = machineConfig.getWorkingY();
        }
    }

    toggleUpdateButton() {
        if (typeof machineConfig === 'undefined') return;

        const xInput = document.getElementById('header-working-x');
        const yInput = document.getElementById('header-working-y');
        const applyBtn = document.getElementById('header-apply-dimensions');

        if (!xInput || !yInput || !applyBtn) return;

        const currentX = machineConfig.getWorkingX();
        const currentY = machineConfig.getWorkingY();
        const newX = parseFloat(xInput.value);
        const newY = parseFloat(yInput.value);

        if (newX !== currentX || newY !== currentY) {
            applyBtn.classList.add('app-header__apply-btn--dirty');
        } else {
            applyBtn.classList.remove('app-header__apply-btn--dirty');
        }
    }

    setupModalListeners() {
        const modal = document.getElementById('header-manage-modal');
        if (!modal) return;

        // Close button
        document.getElementById('header-modal-close')?.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        // Tab switching
        modal.querySelectorAll('.config-modal__tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;

                modal.querySelectorAll('.config-modal__tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');

                document.getElementById('header-machine-tab').style.display = tabName === 'machine' ? 'block' : 'none';
                document.getElementById('header-support-tab').style.display = tabName === 'support' ? 'block' : 'none';
                document.getElementById('header-tool-tab').style.display = tabName === 'tool' ? 'block' : 'none';
            });
        });

        // Save machine dimensions
        document.getElementById('header-save-machine-btn')?.addEventListener('click', () => {
            const x = document.getElementById('modal-working-x').value;
            const y = document.getElementById('modal-working-y').value;
            if (typeof machineConfig !== 'undefined') {
                machineConfig.setWorkingDimensions(x, y);
                alert('Machine dimensions updated!');
            }
        });

        // Add support
        document.getElementById('header-add-support-btn')?.addEventListener('click', () => {
            const name = document.getElementById('header-new-support-name').value.trim();
            const thickness = parseFloat(document.getElementById('header-new-support-thickness').value);

            if (!name || isNaN(thickness)) {
                alert('Please enter a name and thickness');
                return;
            }

            machineConfig.addSupportProfile({ name, thickness });
            document.getElementById('header-new-support-name').value = '';
            document.getElementById('header-new-support-thickness').value = '';
            this.updateManageModal();
            this.updateDisplay();
        });

        // Add tool
        document.getElementById('header-add-tool-btn')?.addEventListener('click', () => {
            const name = document.getElementById('header-new-tool-name').value.trim();
            const workingZ = parseFloat(document.getElementById('header-new-tool-workingz').value);
            const travelClearance = parseFloat(document.getElementById('header-new-tool-clearance').value);

            if (!name || isNaN(workingZ) || isNaN(travelClearance)) {
                alert('Please enter a name, working Z, and travel clearance');
                return;
            }

            machineConfig.addToolProfile({ name, workingZ, travelClearance });
            document.getElementById('header-new-tool-name').value = '';
            document.getElementById('header-new-tool-workingz').value = '';
            document.getElementById('header-new-tool-clearance').value = '';
            this.updateManageModal();
            this.updateDisplay();
        });

        // Delete buttons (delegated)
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('config-modal__delete-btn')) {
                const type = e.target.dataset.type;
                const id = e.target.dataset.id;

                if (confirm(`Delete this ${type} profile?`)) {
                    if (type === 'support') {
                        machineConfig.deleteSupportProfile(id);
                    } else {
                        machineConfig.deleteToolProfile(id);
                    }
                    this.updateManageModal();
                    this.updateDisplay();
                }
            }
        });
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Only init if machineConfig exists
    if (typeof machineConfig !== 'undefined') {
        window.appHeader = new AppHeader();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppHeader };
}
