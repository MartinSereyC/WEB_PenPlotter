/**
 * Dropdown Hierarchy Inspector
 * Run this script in the browser console (F12) on the page you want to inspect
 * It will analyze all dropdown menus and their dependencies
 */

(function() {
    console.log('🔍 Starting Dropdown Hierarchy Analysis...\n');
    
    const results = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        dropdowns: [],
        dependencies: [],
        hierarchy: {}
    };
    
    // Find all select elements
    const selects = document.querySelectorAll('select');
    
    console.log(`Found ${selects.length} dropdown(s)\n`);
    
    selects.forEach((select, index) => {
        const selectInfo = {
            id: select.id || `select-${index}`,
            name: select.name || '',
            className: select.className || '',
            label: '',
            options: [],
            currentValue: select.value,
            parent: null,
            siblings: []
        };
        
        // Try to find associated label
        if (select.id) {
            const label = document.querySelector(`label[for="${select.id}"]`);
            if (label) {
                selectInfo.label = label.textContent.trim();
            }
        }
        
        // Check parent element for context
        const parent = select.closest('div, form, section, fieldset');
        if (parent) {
            const parentLabel = parent.querySelector('label, h3, h4, .label, [class*="label"]');
            if (parentLabel) {
                selectInfo.parent = parentLabel.textContent.trim();
            } else {
                selectInfo.parent = parent.className || parent.id || 'unknown';
            }
        }
        
        // Get all options
        Array.from(select.options).forEach((option, optIndex) => {
            selectInfo.options.push({
                index: optIndex,
                value: option.value,
                text: option.text.trim(),
                selected: option.selected,
                disabled: option.disabled
            });
        });
        
        results.dropdowns.push(selectInfo);
        
        console.log(`📋 Dropdown ${index + 1}: ${selectInfo.label || selectInfo.id}`);
        console.log(`   ID: ${selectInfo.id}`);
        console.log(`   Name: ${selectInfo.name}`);
        console.log(`   Parent: ${selectInfo.parent || 'N/A'}`);
        console.log(`   Current Value: ${selectInfo.currentValue}`);
        console.log(`   Options: ${selectInfo.options.length}`);
        selectInfo.options.forEach(opt => {
            console.log(`      - ${opt.text} (value: ${opt.value})${opt.selected ? ' [SELECTED]' : ''}`);
        });
        console.log('');
    });
    
    // Detect dependencies by monitoring change events
    console.log('🔗 Monitoring dropdown dependencies...\n');
    
    const dependencyMap = {};
    const originalValues = {};
    
    selects.forEach((select, index) => {
        originalValues[select.id || index] = select.value;
        
        select.addEventListener('change', function() {
            const changedSelect = this;
            const changedId = changedSelect.id || `select-${index}`;
            const newValue = changedSelect.value;
            
            console.log(`⚡ ${changedId} changed to: ${newValue}`);
            
            // Check all other selects for changes
            selects.forEach((otherSelect, otherIndex) => {
                if (otherSelect !== changedSelect) {
                    const otherId = otherSelect.id || `select-${otherIndex}`;
                    const beforeValue = otherSelect.value;
                    const beforeOptions = Array.from(otherSelect.options).map(o => o.value);
                    
                    // Wait a bit for potential updates
                    setTimeout(() => {
                        const afterValue = otherSelect.value;
                        const afterOptions = Array.from(otherSelect.options).map(o => o.value);
                        
                        // Check if options changed
                        if (JSON.stringify(beforeOptions) !== JSON.stringify(afterOptions)) {
                            console.log(`   → ${otherId} options updated!`);
                            console.log(`     Before: ${beforeOptions.length} options`);
                            console.log(`     After: ${afterOptions.length} options`);
                            
                            if (!dependencyMap[changedId]) {
                                dependencyMap[changedId] = [];
                            }
                            
                            dependencyMap[changedId].push({
                                target: otherId,
                                triggerValue: newValue,
                                optionsBefore: beforeOptions,
                                optionsAfter: afterOptions
                            });
                            
                            results.dependencies.push({
                                from: changedId,
                                to: otherId,
                                triggerValue: newValue,
                                optionsChanged: true
                            });
                        }
                        
                        // Check if value changed
                        if (beforeValue !== afterValue) {
                            console.log(`   → ${otherId} value changed from "${beforeValue}" to "${afterValue}"`);
                            
                            if (!dependencyMap[changedId]) {
                                dependencyMap[changedId] = [];
                            }
                            
                            dependencyMap[changedId].push({
                                target: otherId,
                                triggerValue: newValue,
                                valueChanged: true,
                                from: beforeValue,
                                to: afterValue
                            });
                        }
                    }, 500);
                }
            });
        }, true);
    });
    
    results.dependencyMap = dependencyMap;
    
    // Build hierarchy structure
    results.hierarchy = {
        structure: results.dropdowns.map(d => ({
            id: d.id,
            label: d.label,
            parent: d.parent,
            optionsCount: d.options.length
        })),
        dependencies: results.dependencies
    };
    
    // Store results globally for easy access
    window.dropdownAnalysis = results;
    
    console.log('\n✅ Analysis Complete!');
    console.log('\n📊 Summary:');
    console.log(`   Total Dropdowns: ${results.dropdowns.length}`);
    console.log(`   Dependencies Found: ${results.dependencies.length}`);
    console.log('\n💾 Results stored in: window.dropdownAnalysis');
    console.log('📋 To view full results, type: console.log(JSON.stringify(window.dropdownAnalysis, null, 2))');
    console.log('\n💡 To test dependencies:');
    console.log('   1. Change a dropdown value');
    console.log('   2. Watch the console for dependency updates');
    console.log('   3. Check window.dropdownAnalysis.dependencyMap for relationships');
    
    return results;
})();


