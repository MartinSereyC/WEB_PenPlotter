/**
 * Machine Configuration Manager
 * Centralized management of support profiles, tool profiles, and Z-safety validation
 * for CNC Pen Plotter G-code generators.
 */

class MachineConfig {
    constructor() {
        this.STORAGE_KEY = 'cnc_machine_config';
        this.listeners = [];
        this.load();
    }

    // --- Default Profiles ---
    getDefaultConfig() {
        return {
            supportProfiles: [
                { id: 'paper', name: 'Paper (flat)', thickness: 0, description: 'Standard flat paper on bed' },
                { id: 'canvas_3cm', name: 'Canvas 3cm', thickness: 30, description: '3cm thick stretched canvas' },
                { id: 'wood_2cm', name: 'Wood Panel 2cm', thickness: 20, description: '2cm thick wood panel' }
            ],
            toolProfiles: [
                { id: 'pen_fine', name: 'Fine Pen', workingZ: 2, travelClearance: 5, description: 'Fine point pen for detailed work' },
                { id: 'brush', name: 'Brush', workingZ: 5, travelClearance: 10, description: 'Paint brush for broader strokes' },
                { id: 'marker', name: 'Marker', workingZ: 3, travelClearance: 8, description: 'Standard marker' }
            ],
            activeSupportId: 'paper',
            activeToolId: 'pen_fine',
            workingX: 700,
            workingY: 850
        };
    }

    // --- Persistence ---
    load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.getDefaultConfig(), ...parsed };
            } else {
                this.config = this.getDefaultConfig();
            }
        } catch (e) {
            console.warn('Failed to load machine config, using defaults:', e);
            this.config = this.getDefaultConfig();
        }
    }

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
            this.notifyListeners();
        } catch (e) {
            console.error('Failed to save machine config:', e);
        }
    }

    // --- Event System ---
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.config);
            } catch (e) {
                console.error('Config listener error:', e);
            }
        });
    }

    // --- Support Profiles ---
    getSupportProfiles() {
        return this.config.supportProfiles || [];
    }

    getSupportProfile(id) {
        return this.getSupportProfiles().find(p => p.id === id);
    }

    getActiveSupport() {
        return this.getSupportProfile(this.config.activeSupportId);
    }

    setActiveSupport(id) {
        if (this.getSupportProfile(id)) {
            this.config.activeSupportId = id;
            this.save();
            return true;
        }
        return false;
    }

    addSupportProfile(profile) {
        if (!profile.id) {
            profile.id = 'support_' + Date.now();
        }
        this.config.supportProfiles.push(profile);
        this.save();
        return profile.id;
    }

    updateSupportProfile(id, updates) {
        const profile = this.getSupportProfile(id);
        if (profile) {
            Object.assign(profile, updates);
            this.save();
            return true;
        }
        return false;
    }

    deleteSupportProfile(id) {
        const index = this.config.supportProfiles.findIndex(p => p.id === id);
        if (index > -1) {
            this.config.supportProfiles.splice(index, 1);
            if (this.config.activeSupportId === id) {
                this.config.activeSupportId = this.config.supportProfiles[0]?.id || null;
            }
            this.save();
            return true;
        }
        return false;
    }

    // --- Tool Profiles ---
    getToolProfiles() {
        return this.config.toolProfiles || [];
    }

    getToolProfile(id) {
        return this.getToolProfiles().find(p => p.id === id);
    }

    getActiveTool() {
        return this.getToolProfile(this.config.activeToolId);
    }

    setActiveTool(id) {
        if (this.getToolProfile(id)) {
            this.config.activeToolId = id;
            this.save();
            return true;
        }
        return false;
    }

    addToolProfile(profile) {
        if (!profile.id) {
            profile.id = 'tool_' + Date.now();
        }
        this.config.toolProfiles.push(profile);
        this.save();
        return profile.id;
    }

    updateToolProfile(id, updates) {
        const profile = this.getToolProfile(id);
        if (profile) {
            Object.assign(profile, updates);
            this.save();
            return true;
        }
        return false;
    }

    deleteToolProfile(id) {
        const index = this.config.toolProfiles.findIndex(p => p.id === id);
        if (index > -1) {
            this.config.toolProfiles.splice(index, 1);
            if (this.config.activeToolId === id) {
                this.config.activeToolId = this.config.toolProfiles[0]?.id || null;
            }
            this.save();
            return true;
        }
        return false;
    }

    // --- Working Dimensions ---
    getWorkingX() {
        return this.config.workingX || 700;
    }

    setWorkingX(value) {
        this.config.workingX = Math.max(0, parseFloat(value) || 700);
        this.save();
    }

    getWorkingY() {
        return this.config.workingY || 850;
    }

    setWorkingY(value) {
        this.config.workingY = Math.max(0, parseFloat(value) || 850);
        this.save();
    }

    getWorkingDimensions() {
        return {
            x: this.getWorkingX(),
            y: this.getWorkingY()
        };
    }

    setWorkingDimensions(x, y) {
        this.config.workingX = Math.max(0, parseFloat(x) || 700);
        this.config.workingY = Math.max(0, parseFloat(y) || 850);
        this.save();
    }

    // --- Z-Safety Calculations ---

    /**
     * Get the minimum safe Z for working (tool contact with surface)
     * Based on: support thickness + tool working Z
     */
    getMinWorkingZ() {
        const support = this.getActiveSupport();
        const tool = this.getActiveTool();

        if (!support || !tool) {
            return null; // No profiles selected
        }

        return support.thickness + tool.workingZ;
    }

    /**
     * Get the minimum safe Z for travel (tool clearance during movement)
     * Based on: support thickness + tool travel clearance
     */
    getMinTravelZ() {
        const support = this.getActiveSupport();
        const tool = this.getActiveTool();

        if (!support || !tool) {
            return null;
        }

        return support.thickness + tool.travelClearance;
    }

    /**
     * Validate if a working Z value is safe
     * @param {number} zValue - The Z value to validate
     * @returns {object} { safe: boolean, minRequired: number, message: string }
     */
    validateWorkingZ(zValue) {
        const minZ = this.getMinWorkingZ();

        if (minZ === null) {
            return {
                safe: false,
                minRequired: null,
                message: '⚠️ No support or tool profile selected. Please configure profiles first.'
            };
        }

        if (zValue < minZ) {
            return {
                safe: false,
                minRequired: minZ,
                message: `⚠️ UNSAFE: Z=${zValue}mm is below minimum safe Z of ${minZ}mm. Risk of collision!`
            };
        }

        return {
            safe: true,
            minRequired: minZ,
            message: `✓ Z=${zValue}mm is safe (minimum: ${minZ}mm)`
        };
    }

    /**
     * Validate if a travel Z value is safe
     * @param {number} zValue - The Z value to validate
     * @returns {object} { safe: boolean, minRequired: number, message: string }
     */
    validateTravelZ(zValue) {
        const minZ = this.getMinTravelZ();

        if (minZ === null) {
            return {
                safe: false,
                minRequired: null,
                message: '⚠️ No support or tool profile selected. Please configure profiles first.'
            };
        }

        if (zValue < minZ) {
            return {
                safe: false,
                minRequired: minZ,
                message: `⚠️ UNSAFE: Travel Z=${zValue}mm is below minimum safe Z of ${minZ}mm. Risk of collision!`
            };
        }

        return {
            safe: true,
            minRequired: minZ,
            message: `✓ Travel Z=${zValue}mm is safe (minimum: ${minZ}mm)`
        };
    }

    /**
     * Validate multiple Z values at once
     * @param {object} zValues - { working: number[], travel: number[] }
     * @returns {object} { allSafe: boolean, errors: string[] }
     */
    validateAllZ(zValues) {
        const errors = [];
        let allSafe = true;

        if (zValues.working) {
            for (const z of zValues.working) {
                const result = this.validateWorkingZ(z);
                if (!result.safe) {
                    allSafe = false;
                    errors.push(result.message);
                }
            }
        }

        if (zValues.travel) {
            for (const z of zValues.travel) {
                const result = this.validateTravelZ(z);
                if (!result.safe) {
                    allSafe = false;
                    errors.push(result.message);
                }
            }
        }

        return { allSafe, errors };
    }

    /**
     * Get a summary of current safety configuration
     */
    getSafetySummary() {
        const support = this.getActiveSupport();
        const tool = this.getActiveTool();

        return {
            support: support ? `${support.name} (${support.thickness}mm)` : 'Not selected',
            tool: tool ? `${tool.name}` : 'Not selected',
            minWorkingZ: this.getMinWorkingZ(),
            minTravelZ: this.getMinTravelZ(),
            configured: !!(support && tool)
        };
    }

    /**
     * Reset to default configuration
     */
    resetToDefaults() {
        this.config = this.getDefaultConfig();
        this.save();
    }
}

// Create global singleton instance
const machineConfig = new MachineConfig();

// Export for module systems (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MachineConfig, machineConfig };
}
