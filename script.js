// Image Manipulator Script
// Handles image upload, zoom, pan, and filter operations

// Plot size definitions (in mm)
const PLOT_SIZES = {
    'A4_portrait': { width: 210, height: 297 },
    'A4_landscape': { width: 297, height: 210 },
    'A3_portrait': { width: 297, height: 420 },
    'A3_landscape': { width: 420, height: 297 },
    'A2_portrait': { width: 420, height: 594 },
    'A2_landscape': { width: 594, height: 420 }
};

const CANVAS_SQUARE_SIZE = 600;

// State variables
let canvas, ctx;
let originalImage = null;
let currentImage = null;
let imageScale = 1.0;
let imageOffsetX = 0;
let imageOffsetY = 0;
let initialScale = 1.0;
let initialOffsetX = 0;
let initialOffsetY = 0;
let currentPlotSize = 'CustomGlobal';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeCanvas();
    setupEventListeners();

    // Listen for global config changes
    if (typeof machineConfig !== 'undefined') {
        machineConfig.addListener(() => {
            // Update inputs if Global is selected
            if (currentPlotSize === 'CustomGlobal') {
                updateCustomInputsVisibility(); // This will sync values

                if (originalImage) {
                    calculateInitialTransform();
                    redrawCanvas();
                } else {
                    redrawCanvas();
                }
            }
        });
    }
});

function initializeCanvas() {
    canvas = document.getElementById('imageCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    ctx = canvas.getContext('2d');

    // Set canvas size
    resizeCanvas();

    // Draw initial placeholder
    drawPlaceholder();
}

function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;

    // Use a fixed square size for the visual area
    canvas.width = CANVAS_SQUARE_SIZE;
    canvas.height = CANVAS_SQUARE_SIZE;

    // Ensure it doesn't overflow container width visually
    const parentWidth = container.offsetWidth - 40;
    if (parentWidth < CANVAS_SQUARE_SIZE) {
        canvas.style.width = parentWidth + 'px';
        canvas.style.height = parentWidth + 'px';
    } else {
        canvas.style.width = CANVAS_SQUARE_SIZE + 'px';
        canvas.style.height = CANVAS_SQUARE_SIZE + 'px';
    }
}

function getPlotVisualRect() {
    const plotSize = getPlotDimensions(currentPlotSize);
    const margin = 20;
    const availableSize = CANVAS_SQUARE_SIZE - margin * 2;

    const plotAspect = plotSize.width / plotSize.height;

    let visualWidth, visualHeight;
    if (plotAspect > 1) { // Landscape
        visualWidth = availableSize;
        visualHeight = visualWidth / plotAspect;
    } else { // Portrait
        visualHeight = availableSize;
        visualWidth = visualHeight * plotAspect;
    }

    return {
        x: (CANVAS_SQUARE_SIZE - visualWidth) / 2,
        y: (CANVAS_SQUARE_SIZE - visualHeight) / 2,
        width: visualWidth,
        height: visualHeight
    };
}

function setupEventListeners() {
    // Image upload
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }

    // Plot size selection
    const plotSize = document.getElementById('plotSize');
    const customInputs = document.getElementById('customSizeInputs');
    const customWidth = document.getElementById('customWidth');
    const customHeight = document.getElementById('customHeight');

    if (plotSize) {
        plotSize.addEventListener('change', (e) => {
            handlePlotSizeChange(e);
            updateCustomInputsVisibility();
        });
        // Initialize
        currentPlotSize = plotSize.value;
        updateCustomInputsVisibility();
    }

    // Custom inputs listeners
    if (customWidth && customHeight) {
        const updateCustom = () => {
            if (currentPlotSize === 'Custom') {
                if (originalImage) {
                    calculateInitialTransform();
                    redrawCanvas();
                } else {
                    redrawCanvas();
                }
            }
        };
        customWidth.addEventListener('input', updateCustom);
        customHeight.addEventListener('input', updateCustom);
    }

    // Zoom controls
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    if (zoomIn) zoomIn.addEventListener('click', () => adjustZoom(1.2));
    if (zoomOut) zoomOut.addEventListener('click', () => adjustZoom(0.8));

    // Pan controls
    const panUp = document.getElementById('panUp');
    const panDown = document.getElementById('panDown');
    const panLeft = document.getElementById('panLeft');
    const panRight = document.getElementById('panRight');
    if (panUp) panUp.addEventListener('click', () => adjustPan(0, -20));
    if (panDown) panDown.addEventListener('click', () => adjustPan(0, 20));
    if (panLeft) panLeft.addEventListener('click', () => adjustPan(-20, 0));
    if (panRight) panRight.addEventListener('click', () => adjustPan(20, 0));

    // Reset button
    const resetImage = document.getElementById('resetImage');
    if (resetImage) {
        resetImage.addEventListener('click', resetImageTransform);
    }

    // Download button
    const downloadImage = document.getElementById('downloadImage');
    if (downloadImage) {
        downloadImage.addEventListener('click', downloadProcessedImage);
    }

    // Apply filters button
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applySpiralBettyFilter);
    }

    // Window resize
    window.addEventListener('resize', function () {
        resizeCanvas();
        if (currentImage) {
            redrawCanvas();
        }
    });
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            originalImage = img;
            currentImage = img;
            calculateInitialTransform();
            redrawCanvas();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handlePlotSizeChange(event) {
    currentPlotSize = event.target.value;
    if (originalImage) {
        calculateInitialTransform();
        redrawCanvas();
    }
}

function getPlotDimensions(sizeKey) {
    if (sizeKey === 'CustomGlobal') {
        if (typeof machineConfig !== 'undefined') {
            return {
                width: machineConfig.getWorkingX(),
                height: machineConfig.getWorkingY()
            };
        } else {
            return { width: 210, height: 297 }; // Fallback A4
        }
    } else if (sizeKey === 'Custom') {
        const w = parseFloat(document.getElementById('customWidth')?.value) || 100;
        const h = parseFloat(document.getElementById('customHeight')?.value) || 100;
        return { width: w, height: h };
    }
    return PLOT_SIZES[sizeKey];
}

function updateCustomInputsVisibility() {
    const plotSize = document.getElementById('plotSize');
    const customInputs = document.getElementById('customSizeInputs');
    const customWidth = document.getElementById('customWidth');
    const customHeight = document.getElementById('customHeight');

    if (!plotSize || !customInputs) return;

    const val = plotSize.value;
    if (val === 'CustomGlobal') {
        customInputs.style.display = 'block';
        if (customWidth) customWidth.disabled = true;
        if (customHeight) customHeight.disabled = true;
        // Sync values for display
        if (typeof machineConfig !== 'undefined') {
            if (customWidth) customWidth.value = machineConfig.getWorkingX();
            if (customHeight) customHeight.value = machineConfig.getWorkingY();
        }
    } else if (val === 'Custom') {
        customInputs.style.display = 'block';
        if (customWidth) customWidth.disabled = false;
        if (customHeight) customHeight.disabled = false;
    } else {
        customInputs.style.display = 'none';
    }
}

function calculateInitialTransform() {
    if (!originalImage || !canvas) return;

    const visualPlot = getPlotVisualRect();

    // Calculate initial scale to fit image within the visual plotter rectangle
    const imgAspect = originalImage.width / originalImage.height;
    const plotAspect = visualPlot.width / visualPlot.height;

    if (imgAspect > plotAspect) {
        // Image is wider - fit to width
        imageScale = visualPlot.width / originalImage.width;
    } else {
        // Image is taller - fit to height
        imageScale = visualPlot.height / originalImage.height;
    }

    initialScale = imageScale;

    // Center image relative to visualPlot
    const scaledWidth = originalImage.width * imageScale;
    const scaledHeight = originalImage.height * imageScale;

    imageOffsetX = visualPlot.x + (visualPlot.width - scaledWidth) / 2;
    imageOffsetY = visualPlot.y + (visualPlot.height - scaledHeight) / 2;

    initialOffsetX = imageOffsetX;
    initialOffsetY = imageOffsetY;
}

function adjustZoom(factor) {
    if (!currentImage) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Zoom towards center
    const oldScale = imageScale;
    imageScale *= factor;
    imageScale = Math.max(0.1, Math.min(10, imageScale)); // Clamp zoom

    // Adjust offset to zoom towards center
    const scaleChange = imageScale / oldScale;
    imageOffsetX = centerX - (centerX - imageOffsetX) * scaleChange;
    imageOffsetY = centerY - (centerY - imageOffsetY) * scaleChange;

    redrawCanvas();
}

function adjustPan(deltaX, deltaY) {
    if (!currentImage) return;

    imageOffsetX += deltaX;
    imageOffsetY += deltaY;

    redrawCanvas();
}

function resetImageTransform() {
    if (!originalImage) return;

    imageScale = initialScale;
    imageOffsetX = initialOffsetX;
    imageOffsetY = initialOffsetY;

    redrawCanvas();
}

function redrawCanvas() {
    if (!canvas || !ctx) return;

    // 1. Clear entire square canvas with light gray
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Calculate and draw the "Working Area" (Dark Gray)
    const visualPlot = getPlotVisualRect();
    ctx.fillStyle = '#444444';
    ctx.fillRect(visualPlot.x, visualPlot.y, visualPlot.width, visualPlot.height);

    if (!currentImage) {
        drawPlaceholder();
        return;
    }

    // 3. Draw image clipped to the dark gray area
    const scaledWidth = currentImage.width * imageScale;
    const scaledHeight = currentImage.height * imageScale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(visualPlot.x, visualPlot.y, visualPlot.width, visualPlot.height);
    ctx.clip();

    ctx.drawImage(currentImage, imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
    ctx.restore();
}

function drawPlaceholder() {
    if (!canvas || !ctx) return;

    const visualPlot = getPlotVisualRect();
    ctx.fillStyle = '#999999';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sube una imagen para comenzar', visualPlot.x + visualPlot.width / 2, visualPlot.y + visualPlot.height / 2);

    const plotSize = getPlotDimensions(currentPlotSize);
    ctx.font = '12px Arial';
    ctx.fillText(`${plotSize.width}x${plotSize.height}mm`, visualPlot.x + visualPlot.width / 2, visualPlot.y + visualPlot.height / 2 + 30);
}

function downloadProcessedImage() {
    if (!currentImage || !canvas) {
        alert('Por favor, sube una imagen primero.');
        return;
    }

    const plotSize = getPlotDimensions(currentPlotSize);
    const visualPlot = getPlotVisualRect();

    // Final output resolution (mm to pixels)
    const exportScale = 10;
    const plotWidthPx = plotSize.width * exportScale;
    const plotHeightPx = plotSize.height * exportScale;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = plotWidthPx;
    tempCanvas.height = plotHeightPx;
    const tempCtx = tempCanvas.getContext('2d');

    // Background white
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, plotWidthPx, plotHeightPx);

    // Calculate scaling from visual "Working Area" to absolute exported pixels
    const visualToExport = plotWidthPx / visualPlot.width;

    // Adjust offsets relative to the visualPlot top-left
    const localOffsetX = (imageOffsetX - visualPlot.x) * visualToExport;
    const localOffsetY = (imageOffsetY - visualPlot.y) * visualToExport;
    const exportImageWidth = (currentImage.width * imageScale) * visualToExport;
    const exportImageHeight = (currentImage.height * imageScale) * visualToExport;

    // Draw the image
    tempCtx.save();
    tempCtx.beginPath();
    tempCtx.rect(0, 0, plotWidthPx, plotHeightPx);
    tempCtx.clip();

    tempCtx.drawImage(
        currentImage,
        localOffsetX, localOffsetY, exportImageWidth, exportImageHeight
    );
    tempCtx.restore();

    // Download
    tempCanvas.toBlob(function (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'imagen_ploteable.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function applySpiralBettyFilter() {
    if (!originalImage) {
        alert('Por favor, sube una imagen primero.');
        return;
    }

    // Create a copy of the original image to apply filter
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // Apply SpiralBetty filter (spiral-like effect)
    // This is a placeholder implementation - you can enhance it
    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % tempCanvas.width;
        const y = Math.floor((i / 4) / tempCanvas.width);

        // Calculate distance from center
        const centerX = tempCanvas.width / 2;
        const centerY = tempCanvas.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Create spiral effect
        const spiralFactor = (distance / Math.max(centerX, centerY)) * 2;
        const spiralAngle = angle + spiralFactor * Math.PI * 2;

        // Sample from original image with spiral offset
        const sampleX = Math.floor(centerX + Math.cos(spiralAngle) * distance);
        const sampleY = Math.floor(centerY + Math.sin(spiralAngle) * distance);

        if (sampleX >= 0 && sampleX < tempCanvas.width &&
            sampleY >= 0 && sampleY < tempCanvas.height) {
            const sampleIdx = (sampleY * tempCanvas.width + sampleX) * 4;
            data[i] = imageData.data[sampleIdx];     // R
            data[i + 1] = imageData.data[sampleIdx + 1]; // G
            data[i + 2] = imageData.data[sampleIdx + 2]; // B
            // Alpha stays the same
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // Create new image from filtered canvas
    const filteredImage = new Image();
    filteredImage.onload = function () {
        currentImage = filteredImage;
        redrawCanvas();
    };
    filteredImage.src = tempCanvas.toDataURL();
}


