# Dropdown Hierarchy Inspector - Instructions

## How to Use

1. **Open the website** you want to inspect (e.g., `ojv.pjud.cl/kpitec-ojv-web/index`)

2. **Open Browser Developer Tools**:
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Or `Cmd+Option+I` (Mac)

3. **Go to the Console tab**

4. **Copy and paste** the entire contents of `dropdown-inspector.js` into the console

5. **Press Enter** to run the script

6. **The script will**:
   - Find all dropdown menus on the page
   - Display their structure and options
   - Monitor for dependencies between dropdowns
   - Store results in `window.dropdownAnalysis`

7. **To test dependencies**:
   - Change a dropdown value (e.g., select "Corte C.A de Santiago")
   - Watch the console for updates to other dropdowns
   - The script will detect when one dropdown affects another

8. **To view full results**:
   ```javascript
   console.log(JSON.stringify(window.dropdownAnalysis, null, 2))
   ```

9. **To export results**:
   ```javascript
   // Copy to clipboard
   copy(JSON.stringify(window.dropdownAnalysis, null, 2))
   ```

## Expected Output

The script will show:
- All dropdown menus found
- Their IDs, names, labels, and parent sections
- All available options for each dropdown
- Dependencies between dropdowns (when one affects another)

## For Your Specific Case

Based on your description:
- **Corte** dropdown (e.g., "Corte C.A de Santiago")
- **Tribunal** dropdown (should have 2 options when Corte is selected)
- **Ingreso demanda** section with its own dropdowns

The script will map how selecting "Corte C.A de Santiago" affects the "Tribunal" options.


