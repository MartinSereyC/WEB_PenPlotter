// p5.js sketch for Image to G-Code Generator
// Uses instance mode to avoid conflicts

let sketch = function(p) {
    let img = null;
    let processedLayers = [];
    let gcodeFiles = [];
    
    p.setup = function() {
        let canvasDiv = document.getElementById('p5Canvas');
        let canvasWidth = canvasDiv.offsetWidth || 800;
        let canvasHeight = 600;
        
        p.createCanvas(canvasWidth, canvasHeight).parent('p5Canvas');
        p.background(255);
        
        // Setup event listeners
        setupEventListeners();
    };
    
    function setupEventListeners() {
        // Image upload
        document.getElementById('imageUpload').addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                let reader = new FileReader();
                reader.onload = function(event) {
                    img = p.loadImage(event.target.result, function() {
                        p.redraw();
                    });
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
        
        // Plotter size change
        document.getElementById('plotterSize').addEventListener('change', function(e) {
            let customInputs = document.getElementById('customSizeInputs');
            if (e.target.value === 'Custom') {
                customInputs.style.display = 'block';
            } else {
                customInputs.style.display = 'none';
            }
        });
        
        // Generate G-Code button
        document.getElementById('generateGCode').addEventListener('click', function() {
            if (!img) {
                alert('Please upload an image first!');
                return;
            }
            generateGCode();
        });
        
        // Download All button
        document.getElementById('downloadAll').addEventListener('click', function() {
            if (gcodeFiles.length === 0) {
                alert('Please generate G-Code first!');
                return;
            }
            downloadAllGCode();
        });
    }
    
    p.draw = function() {
        p.background(255);
        
        if (img) {
            // Calculate display size maintaining aspect ratio
            let displayWidth = p.width - 40;
            let displayHeight = p.height - 40;
            let imgAspect = img.width / img.height;
            let displayAspect = displayWidth / displayHeight;
            
            let drawWidth, drawHeight;
            if (imgAspect > displayAspect) {
                drawWidth = displayWidth;
                drawHeight = displayWidth / imgAspect;
            } else {
                drawHeight = displayHeight;
                drawWidth = displayHeight * imgAspect;
            }
            
            let x = (p.width - drawWidth) / 2;
            let y = (p.height - drawHeight) / 2;
            
            p.image(img, x, y, drawWidth, drawHeight);
            
            // Draw point overlay if layers are processed
            if (processedLayers.length > 0) {
                drawPointOverlay(x, y, drawWidth, drawHeight);
            }
        } else {
            p.fill(200);
            p.textAlign(p.CENTER, p.CENTER);
            p.text('Upload an image to begin', p.width / 2, p.height / 2);
        }
    };
    
    function drawPointOverlay(offsetX, offsetY, displayWidth, displayHeight) {
        let gridSize = parseInt(document.getElementById('gridSize').value) || 4;
        let numLayers = parseInt(document.getElementById('numLayers').value) || 4;
        
        // Calculate scale factors
        let scaleX = displayWidth / img.width;
        let scaleY = displayHeight / img.height;
        
        p.loadPixels();
        img.loadPixels();
        
        for (let layer = 0; layer < processedLayers.length; layer++) {
            let points = processedLayers[layer];
            let brightness = (layer + 1) / numLayers;
            
            p.fill(255 * (1 - brightness), 0, 0, 150);
            p.noStroke();
            
            for (let point of points) {
                let screenX = offsetX + point.x * scaleX;
                let screenY = offsetY + point.y * scaleY;
                p.ellipse(screenX, screenY, 3, 3);
            }
        }
    }
    
    function generateGCode() {
        if (!img) return;
        
        // Get parameters
        let numLayers = parseInt(document.getElementById('numLayers').value) || 4;
        let gridSize = parseInt(document.getElementById('gridSize').value) || 4;
        let pointDiameter = parseFloat(document.getElementById('pointDiameter').value) || 4;
        let zPoint = parseFloat(document.getElementById('zPoint').value) || 0;
        let zTravel = parseFloat(document.getElementById('zTravel').value) || 10;
        let feedRateXY = parseFloat(document.getElementById('feedRateXY').value) || 13000;
        let feedRateZ = parseFloat(document.getElementById('feedRateZ').value) || 2500;
        
        // Get plotter size
        let plotterSize = document.getElementById('plotterSize').value;
        let plotWidth, plotHeight;
        
        if (plotterSize === 'A4') {
            plotWidth = 210;
            plotHeight = 297;
        } else if (plotterSize === 'A3') {
            plotWidth = 297;
            plotHeight = 420;
        } else if (plotterSize === 'A2') {
            plotWidth = 420;
            plotHeight = 594;
        } else {
            plotWidth = parseFloat(document.getElementById('customWidth').value) || 210;
            plotHeight = parseFloat(document.getElementById('customHeight').value) || 297;
        }
        
        // Process image into layers
        processedLayers = [];
        img.loadPixels();
        
        // Calculate points for each layer
        for (let layer = 0; layer < numLayers; layer++) {
            let layerPoints = [];
            let minBrightness = (layer / numLayers) * 255;
            let maxBrightness = ((layer + 1) / numLayers) * 255;
            
            for (let y = 0; y < img.height; y += gridSize) {
                for (let x = 0; x < img.width; x += gridSize) {
                    let idx = (y * img.width + x) * 4;
                    let r = img.pixels[idx];
                    let g = img.pixels[idx + 1];
                    let b = img.pixels[idx + 2];
                    
                    // Calculate brightness (luminance)
                    let brightness = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    if (brightness >= minBrightness && brightness < maxBrightness) {
                        // Convert pixel coordinates to mm
                        let mmX = (x / img.width) * plotWidth;
                        let mmY = (y / img.height) * plotHeight;
                        layerPoints.push({ x: mmX, y: mmY, brightness: brightness });
                    }
                }
            }
            
            processedLayers.push(layerPoints);
        }
        
        // Generate G-code for each layer
        gcodeFiles = [];
        for (let layer = 0; layer < processedLayers.length; layer++) {
            let gcode = generateLayerGCode(processedLayers[layer], layer + 1, 
                zPoint, zTravel, feedRateXY, feedRateZ, pointDiameter);
            gcodeFiles.push({
                name: `layer_${layer + 1}.gcode`,
                content: gcode
            });
        }
        
        // Display G-code output
        displayGCodeOutput();
        
        // Redraw to show points
        p.redraw();
    }
    
    function generateLayerGCode(points, layerNum, zPoint, zTravel, feedRateXY, feedRateZ, pointDiameter) {
        let gcode = [];
        
        // G-code header
        gcode.push('; G-Code generated for Layer ' + layerNum);
        gcode.push('; Point Diameter: ' + pointDiameter + ' mm');
        gcode.push('; Number of points: ' + points.length);
        gcode.push('');
        gcode.push('G21 ; Set units to millimeters');
        gcode.push('G90 ; Set to absolute positioning');
        gcode.push('G28 ; Home all axes');
        gcode.push('G0 Z' + zTravel + ' F' + feedRateZ + ' ; Move to travel height');
        gcode.push('');
        
        // Sort points for efficient path (simple nearest neighbor)
        let sortedPoints = optimizePath(points);
        
        // Generate G-code for each point
        let firstPoint = true;
        for (let point of sortedPoints) {
            if (firstPoint) {
                gcode.push('G0 X' + point.x.toFixed(3) + ' Y' + point.y.toFixed(3) + ' F' + feedRateXY);
                gcode.push('G0 Z' + zPoint + ' F' + feedRateZ);
                firstPoint = false;
            } else {
                gcode.push('G0 X' + point.x.toFixed(3) + ' Y' + point.y.toFixed(3) + ' F' + feedRateXY);
                gcode.push('G0 Z' + zPoint + ' F' + feedRateZ);
            }
            
            // Move back up
            gcode.push('G0 Z' + zTravel + ' F' + feedRateZ);
        }
        
        // End
        gcode.push('');
        gcode.push('G28 ; Home all axes');
        gcode.push('M30 ; Program end');
        
        return gcode.join('\n');
    }
    
    function optimizePath(points) {
        // Simple nearest neighbor optimization
        if (points.length === 0) return [];
        
        let sorted = [points[0]];
        let remaining = points.slice(1);
        
        while (remaining.length > 0) {
            let lastPoint = sorted[sorted.length - 1];
            let minDist = Infinity;
            let minIdx = 0;
            
            for (let i = 0; i < remaining.length; i++) {
                let dist = Math.sqrt(
                    Math.pow(remaining[i].x - lastPoint.x, 2) + 
                    Math.pow(remaining[i].y - lastPoint.y, 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    minIdx = i;
                }
            }
            
            sorted.push(remaining[minIdx]);
            remaining.splice(minIdx, 1);
        }
        
        return sorted;
    }
    
    function displayGCodeOutput() {
        let outputSection = document.getElementById('gcode-output-section');
        outputSection.innerHTML = '<h2>Generated G-Code Files</h2>';
        
        for (let i = 0; i < gcodeFiles.length; i++) {
            let file = gcodeFiles[i];
            let fileDiv = document.createElement('div');
            fileDiv.style.marginBottom = '15px';
            fileDiv.style.padding = '10px';
            fileDiv.style.background = '#2C2C2C';
            fileDiv.style.borderRadius = '6px';
            
            let fileName = document.createElement('h3');
            fileName.textContent = file.name;
            fileName.style.color = '#FF6B35';
            fileName.style.marginTop = '0';
            fileName.style.marginBottom = '10px';
            
            let downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download ' + file.name;
            downloadBtn.style.marginBottom = '10px';
            downloadBtn.addEventListener('click', function() {
                downloadFile(file.name, file.content);
            });
            
            let preview = document.createElement('pre');
            preview.style.background = '#1a1a1a';
            preview.style.color = '#00FF00';
            preview.style.padding = '10px';
            preview.style.borderRadius = '4px';
            preview.style.overflow = 'auto';
            preview.style.maxHeight = '200px';
            preview.style.fontSize = '0.85em';
            preview.textContent = file.content.substring(0, 1000) + (file.content.length > 1000 ? '\n... (truncated)' : '');
            
            fileDiv.appendChild(fileName);
            fileDiv.appendChild(downloadBtn);
            fileDiv.appendChild(preview);
            outputSection.appendChild(fileDiv);
        }
    }
    
    function downloadFile(filename, content) {
        let blob = new Blob([content], { type: 'text/plain' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function downloadAllGCode() {
        for (let file of gcodeFiles) {
            setTimeout(function() {
                downloadFile(file.name, file.content);
            }, 100 * gcodeFiles.indexOf(file));
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        let canvasDiv = document.getElementById('p5Canvas');
        if (canvasDiv) {
            let canvasWidth = canvasDiv.offsetWidth || 800;
            p.resizeCanvas(canvasWidth, 600);
            p.redraw();
        }
    });
};

// Initialize p5.js in instance mode
new p5(sketch);

