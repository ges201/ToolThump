document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const imageLoader = document.getElementById('cp-image-loader');
    const canvas = document.getElementById('cp-canvas');
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('cp-canvas-placeholder');
    const eyedropperBtn = document.getElementById('cp-eyedropper-btn');
    const magnifier = document.getElementById('cp-magnifier');
    const magnifierPlaceholder = document.getElementById('cp-magnifier-placeholder');
    const colorPreview = document.getElementById('cp-color-preview');
    const hexValueInput = document.getElementById('cp-hex-value');
    const rgbValueInput = document.getElementById('cp-rgb-value');
    const hslValueInput = document.getElementById('cp-hsl-value');
    const zoomControlsWrapper = document.getElementById('cp-zoom-controls-wrapper');
    const zoomSlider = document.getElementById('cp-zoom-slider');
    const zoomResetBtn = document.getElementById('cp-zoom-reset-btn');
    const crosshair = document.getElementById('cp-crosshair'); // ADDED

    // --- Canvas and Context Setup ---
    const fullResCanvas = document.createElement('canvas');
    const fullResCtx = fullResCanvas.getContext('2d');
    const magnifierDisplayCanvas = document.createElement('canvas');
    const magnifierDisplayCtx = magnifierDisplayCanvas.getContext('2d');

    [ctx, fullResCtx, magnifierDisplayCtx].forEach(c => c.imageSmoothingEnabled = false);

    // --- State ---
    let isEyedropperActive = false;
    let imageLoaded = false;
    let selectionPoint = { x: 0, y: 0 };
    let originalImage = null;
    let baseFitInfo = { scale: 1 };
    let currentRender = { x: 0, y: 0, scale: 1 };
    let zoomLevel = 1;
    let panOffset = { x: 0, y: 0 };
    let isPanning = false;
    let startPanPoint = { x: 0, y: 0 };

    // --- Constants ---
    const ZOOM_LEVEL = 10; // For magnifier

    // --- Image Drawing, Scaling, and Panning ---
    function calculateBaseFit() {
        if (!originalImage) return;
        const wrapper = canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();
        const imgRatio = originalImage.width / originalImage.height;
        const canvasRatio = rect.width / rect.height;
        baseFitInfo.scale = (imgRatio > canvasRatio) ?
            rect.width / originalImage.width :
            rect.height / originalImage.height;
    }

    function drawImageToCanvas() {
        if (!originalImage) return;

        const wrapper = canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.imageSmoothingEnabled = false;

        currentRender.scale = baseFitInfo.scale * zoomLevel;
        currentRender.x = (rect.width / 2) - (originalImage.width * currentRender.scale / 2) + panOffset.x;
        currentRender.y = (rect.height / 2) - (originalImage.height * currentRender.scale / 2) + panOffset.y;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            originalImage,
            currentRender.x * dpr,
            currentRender.y * dpr,
            originalImage.width * currentRender.scale * dpr,
            originalImage.height * currentRender.scale * dpr
        );
    }

    window.addEventListener('resize', () => {
        if (imageLoaded) {
            calculateBaseFit();
            drawImageToCanvas();
            if (isEyedropperActive && magnifier.classList.contains('inspecting')) {
                updateMagnifier(selectionPoint.x, selectionPoint.y);
                updateCrosshairPosition(selectionPoint.x, selectionPoint.y); // ADDED
            }
        }
    });

    // --- Tool State Management ---
    function resetToInitialState() {
        magnifierPlaceholder.textContent = 'Upload an image to begin.';
        resetPreviews();
        clearColorValues();
        zoomControlsWrapper.classList.add('hidden');
        crosshair.classList.remove('visible'); // ADDED
    }

    function resetPreviews() {
        magnifier.classList.remove('inspecting');
        magnifier.style.backgroundImage = 'none';
        colorPreview.style.backgroundColor = 'var(--disabled-bg-color)';
        if (imageLoaded) {
            magnifierPlaceholder.textContent = 'Activate eyedropper...';
        }
    }

    function clearColorValues() {
        [hexValueInput, rgbValueInput, hslValueInput].forEach(input => input.value = '');
    }

    function updateCursor() {
        canvas.classList.remove('active', 'pannable', 'panning');
        if (isEyedropperActive) {
            canvas.classList.add('active');
        } else if (zoomLevel > 1) {
            canvas.classList.add('pannable');
        }
    }

    // --- Image Loading ---
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    originalImage = img;
                    fullResCanvas.width = img.width;
                    fullResCanvas.height = img.height;
                    fullResCtx.drawImage(img, 0, 0);

                    const magElementSize = magnifier.clientWidth;
                    magnifierDisplayCanvas.width = magElementSize;
                    magnifierDisplayCanvas.height = magElementSize;
                    magnifierDisplayCtx.imageSmoothingEnabled = false;

                    placeholder.classList.add('hidden');
                    canvas.style.display = 'block';
                    eyedropperBtn.disabled = false;
                    imageLoaded = true;

                    resetZoomAndPan();
                    zoomControlsWrapper.classList.remove('hidden');

                    resetPreviews();
                    clearColorValues();
                    deactivateEyedropper();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Eyedropper & Zoom/Pan Controls ---
    function activateEyedropper() {
        isEyedropperActive = true;
        eyedropperBtn.classList.add('active');
        canvas.focus();
        eyedropperBtn.querySelector('span').textContent = 'Click or Use Arrows';
        updateCursor();
    }

    function deactivateEyedropper() {
        isEyedropperActive = false;
        eyedropperBtn.classList.remove('active');
        eyedropperBtn.querySelector('span').textContent = 'Activate Eyedropper';
        magnifier.classList.remove('inspecting');
        crosshair.classList.remove('visible'); // ADDED
        updateCursor();
        magnifier.style.backgroundImage = 'none';
    }

    eyedropperBtn.addEventListener('click', () => {
        if (!imageLoaded) return;

        if (isEyedropperActive) {
            deactivateEyedropper();
            resetPreviews();
        } else {
            activateEyedropper();
        }
    });

    zoomSlider.addEventListener('input', (e) => {
        zoomLevel = parseFloat(e.target.value);
        drawImageToCanvas();
        if (crosshair.classList.contains('visible')) { // ADDED BLOCK
            updateCrosshairPosition(selectionPoint.x, selectionPoint.y);
        }
        updateCursor();
    });

    zoomResetBtn.addEventListener('click', resetZoomAndPan);

    function resetZoomAndPan() {
        zoomLevel = 1;
        zoomSlider.value = 1;
        panOffset = { x: 0, y: 0 };
        calculateBaseFit();
        drawImageToCanvas();
        crosshair.classList.remove('visible'); // ADDED
        updateCursor();
    }

    // --- Event Listeners for Color Selection & Panning ---
    function startInspection() {
        if (!magnifier.classList.contains('inspecting')) {
            magnifier.classList.add('inspecting');
        }
    }

    canvas.addEventListener('mousedown', (e) => {
        if (!isEyedropperActive && zoomLevel > 1) {
            isPanning = true;
            startPanPoint.x = e.clientX - panOffset.x;
            startPanPoint.y = e.clientY - panOffset.y;
            canvas.classList.add('panning');
            canvas.classList.remove('pannable');
            crosshair.classList.remove('visible'); // ADDED
        }
    });

    const endPan = () => {
        if (isPanning) {
            isPanning = false;
            canvas.classList.remove('panning');
            updateCursor();
        }
    };
    canvas.addEventListener('mouseup', endPan);
    canvas.addEventListener('mouseleave', endPan);

    canvas.addEventListener('mousemove', (e) => {
        if (!imageLoaded) return;

        if (isPanning) {
            panOffset.x = e.clientX - startPanPoint.x;
            panOffset.y = e.clientY - startPanPoint.y;
            drawImageToCanvas();
            return;
        }

        if (!isEyedropperActive) return;

        crosshair.classList.remove('visible'); // ADDED: Hide crosshair during mouse move

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const imgX = (mouseX - currentRender.x) / currentRender.scale;
        const imgY = (mouseY - currentRender.y) / currentRender.scale;

        if (imgX < 0 || imgX >= originalImage.width || imgY < 0 || imgY >= originalImage.height) {
            return;
        }

        startInspection();

        selectionPoint = { x: Math.round(imgX), y: Math.round(imgY) };
        updateMagnifier(selectionPoint.x, selectionPoint.y);
        updateColorInfoFromPoint(selectionPoint.x, selectionPoint.y);
    });

    canvas.addEventListener('click', (e) => {
        if (!isEyedropperActive || !imageLoaded) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const imgX = (mouseX - currentRender.x) / currentRender.scale;
        const imgY = (mouseY - currentRender.y) / currentRender.scale;
        if (imgX < 0 || imgX >= originalImage.width || imgY < 0 || imgY >= originalImage.height) return;

        updateColorInfoFromPoint(selectionPoint.x, selectionPoint.y);
        deactivateEyedropper();
    });

    canvas.addEventListener('keydown', (e) => {
        if (!isEyedropperActive) return;
        const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (!validKeys.includes(e.key)) return;

        e.preventDefault();
        startInspection();

        let { x, y } = selectionPoint;
        if (e.key === 'ArrowUp') y = Math.max(0, y - 1);
        else if (e.key === 'ArrowDown') y = Math.min(originalImage.height - 1, y + 1);
        else if (e.key === 'ArrowLeft') x = Math.max(0, x - 1);
        else if (e.key === 'ArrowRight') x = Math.min(originalImage.width - 1, x + 1);

        selectionPoint = { x, y };
        updateMagnifier(x, y);
        updateColorInfoFromPoint(x, y);
        updateCrosshairPosition(x, y); // ADDED
    });

    // --- Core Update Functions ---
    function updateColorInfoFromPoint(x, y) {
        const pixel = fullResCtx.getImageData(x, y, 1, 1).data;
        const [r, g, b] = pixel;
        updateColorDisplay(r, g, b);
    }

    // ADDED: New function to position the crosshair
    function updateCrosshairPosition(imgX, imgY) {
        if (!imageLoaded || !isEyedropperActive) {
            crosshair.classList.remove('visible');
            return;
        }
        // Calculate the center of the target pixel on the canvas
        const screenX = currentRender.x + ((imgX + 0.5) * currentRender.scale);
        const screenY = currentRender.y + ((imgY + 0.5) * currentRender.scale);

        // Update the crosshair style and make it visible
        crosshair.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
        crosshair.classList.add('visible');
    }

    function updateMagnifier(x, y) {
        if (!originalImage) return;
        const magSize = magnifier.clientWidth;
        const sourcePixelArea = magSize / ZOOM_LEVEL;
        const halfSourcePixelArea = sourcePixelArea / 2;

        magnifierDisplayCtx.clearRect(0, 0, magSize, magSize);
        magnifierDisplayCtx.drawImage(
            fullResCanvas,
            (x + 0.5) - halfSourcePixelArea,
            (y + 0.5) - halfSourcePixelArea,
            sourcePixelArea,
            sourcePixelArea,
            0, 0, magSize, magSize
        );

        magnifier.style.backgroundImage = `url(${magnifierDisplayCanvas.toDataURL()})`;
        magnifier.style.backgroundSize = 'cover';
        magnifier.style.backgroundPosition = 'center';
    }

    function updateColorDisplay(r, g, b) {
        const hex = rgbToHex(r, g, b);
        const hsl = rgbToHsl(r, g, b);
        colorPreview.style.backgroundColor = hex;
        hexValueInput.value = hex;
        rgbValueInput.value = `rgb(${r}, ${g}, ${b})`;
        hslValueInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }

    // --- Color Conversion & Clipboard ---
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-clipboard-target');
            const inputToCopy = document.querySelector(targetId);
            if (inputToCopy && inputToCopy.value) {
                navigator.clipboard.writeText(inputToCopy.value).then(() => {
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    setTimeout(() => { button.textContent = originalText; }, 1500);
                });
            }
        });
    });

    resetToInitialState();
});