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
let currentPlotSize = 'A4_portrait';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCanvas();
    setupEventListeners();
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
    if (container) {
        canvas.width = container.offsetWidth || 800;
        canvas.height = Math.max(600, window.innerHeight * 0.6);
    }
}

function setupEventListeners() {
    // Image upload
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }
    
    // Plot size selection
    const plotSize = document.getElementById('plotSize');
    if (plotSize) {
        plotSize.addEventListener('change', handlePlotSizeChange);
        currentPlotSize = plotSize.value;
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
    window.addEventListener('resize', function() {
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
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
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

function calculateInitialTransform() {
    if (!originalImage || !canvas) return;
    
    const plotSize = PLOT_SIZES[currentPlotSize];
    if (!plotSize) return;
    
    // Calculate scale to fit image within plot area
    // Convert mm to pixels (assuming 96 DPI: 1mm ≈ 3.7795 pixels)
    const mmToPx = 3.7795;
    const plotWidthPx = plotSize.width * mmToPx;
    const plotHeightPx = plotSize.height * mmToPx;
    
    // Calculate available canvas space (leave some margin)
    const margin = 40;
    const availableWidth = canvas.width - margin * 2;
    const availableHeight = canvas.height - margin * 2;
    
    // Calculate scale to fit plot area within canvas
    const scaleX = availableWidth / plotWidthPx;
    const scaleY = availableHeight / plotHeightPx;
    const plotScale = Math.min(scaleX, scaleY);
    
    // Calculate scale to fit image within plot area
    const imgAspect = originalImage.width / originalImage.height;
    const plotAspect = plotSize.width / plotSize.height;
    
    let imageScaleX, imageScaleY;
    if (imgAspect > plotAspect) {
        // Image is wider - fit to width
        imageScaleX = plotWidthPx / originalImage.width;
        imageScaleY = imageScaleX;
    } else {
        // Image is taller - fit to height
        imageScaleY = plotHeightPx / originalImage.height;
        imageScaleX = imageScaleY;
    }
    
    initialScale = imageScaleX * plotScale;
    imageScale = initialScale;
    
    // Center image
    const scaledWidth = originalImage.width * imageScale;
    const scaledHeight = originalImage.height * imageScale;
    initialOffsetX = (canvas.width - scaledWidth) / 2;
    initialOffsetY = (canvas.height - scaledHeight) / 2;
    imageOffsetX = initialOffsetX;
    imageOffsetY = initialOffsetY;
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
    
    // Clear canvas
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!currentImage) {
        drawPlaceholder();
        return;
    }
    
    // Draw plot area border (white box)
    const plotSize = PLOT_SIZES[currentPlotSize];
    if (plotSize) {
        const mmToPx = 3.7795;
        const plotWidthPx = plotSize.width * mmToPx;
        const plotHeightPx = plotSize.height * mmToPx;
        
        // Calculate plot area position (centered)
        const plotX = (canvas.width - plotWidthPx) / 2;
        const plotY = (canvas.height - plotHeightPx) / 2;
        
        // Draw white background for plot area
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(plotX, plotY, plotWidthPx, plotHeightPx);
        
        // Draw border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(plotX, plotY, plotWidthPx, plotHeightPx);
    }
    
    // Draw image
    const scaledWidth = currentImage.width * imageScale;
    const scaledHeight = currentImage.height * imageScale;
    
    ctx.save();
    
    // Create clipping region for plot area
    if (plotSize) {
        const mmToPx = 3.7795;
        const plotWidthPx = plotSize.width * mmToPx;
        const plotHeightPx = plotSize.height * mmToPx;
        const plotX = (canvas.width - plotWidthPx) / 2;
        const plotY = (canvas.height - plotHeightPx) / 2;
        
        ctx.beginPath();
        ctx.rect(plotX, plotY, plotWidthPx, plotHeightPx);
        ctx.clip();
    }
    
    ctx.drawImage(currentImage, imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
    
    ctx.restore();
}

function drawPlaceholder() {
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#999999';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sube una imagen para comenzar', canvas.width / 2, canvas.height / 2);
}

function downloadProcessedImage() {
    if (!currentImage || !canvas) {
        alert('Por favor, sube una imagen primero.');
        return;
    }
    
    // Create a temporary canvas for the cropped image
    const plotSize = PLOT_SIZES[currentPlotSize];
    if (!plotSize) return;
    
    const mmToPx = 3.7795;
    const plotWidthPx = plotSize.width * mmToPx;
    const plotHeightPx = plotSize.height * mmToPx;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = plotWidthPx;
    tempCanvas.height = plotHeightPx;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Fill with white background
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, plotWidthPx, plotHeightPx);
    
    // Calculate source region from original image
    const plotX = (canvas.width - plotWidthPx) / 2;
    const plotY = (canvas.height - plotHeightPx) / 2;
    
    // Calculate what part of the image is visible in the plot area
    const sourceX = Math.max(0, (plotX - imageOffsetX) / imageScale);
    const sourceY = Math.max(0, (plotY - imageOffsetY) / imageScale);
    const sourceWidth = Math.min(currentImage.width - sourceX, plotWidthPx / imageScale);
    const sourceHeight = Math.min(currentImage.height - sourceY, plotHeightPx / imageScale);
    
    // Draw the visible portion
    if (sourceWidth > 0 && sourceHeight > 0) {
        tempCtx.drawImage(
            currentImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, plotWidthPx, plotHeightPx
        );
    }
    
    // Download
    tempCanvas.toBlob(function(blob) {
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
    filteredImage.onload = function() {
        currentImage = filteredImage;
        redrawCanvas();
    };
    filteredImage.src = tempCanvas.toDataURL();
}

