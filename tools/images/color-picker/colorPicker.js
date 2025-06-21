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

    // --- Canvas and Context Setup ---

    // Off-screen canvas to hold the original, full-resolution image for accurate color data
    const fullResCanvas = document.createElement('canvas');
    const fullResCtx = fullResCanvas.getContext('2d');

    // A small, dedicated canvas for rendering the magnifier's zoomed view efficiently
    const magnifierDisplayCanvas = document.createElement('canvas');
    const magnifierDisplayCtx = magnifierDisplayCanvas.getContext('2d');

    // Ensure all canvases have image smoothing disabled for crisp pixels
    ctx.imageSmoothingEnabled = false;
    fullResCtx.imageSmoothingEnabled = false;
    magnifierDisplayCtx.imageSmoothingEnabled = false;


    // State
    let isEyedropperActive = false;
    let imageLoaded = false;
    let selectionPoint = { x: 0, y: 0 };
    let originalImage = null;
    let imageRenderInfo = { dx: 0, dy: 0, dWidth: 0, dHeight: 0, scale: 1 };


    // Magnifier Constants
    const ZOOM_LEVEL = 10;

    // --- Image Drawing and Scaling ---

    function drawImageToCanvas() {
        if (!originalImage || !canvas) return;

        const wrapper = canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        ctx.imageSmoothingEnabled = false;

        const imgRatio = originalImage.width / originalImage.height;
        const canvasRatio = canvas.width / canvas.height;

        let dWidth, dHeight, scale;

        if (imgRatio > canvasRatio) {
            dWidth = canvas.width;
            scale = canvas.width / originalImage.width;
            dHeight = originalImage.height * scale;
        } else {
            dHeight = canvas.height;
            scale = canvas.height / originalImage.height;
            dWidth = originalImage.width * scale;
        }

        const dx = (canvas.width - dWidth) / 2;
        const dy = (canvas.height - dHeight) / 2;

        imageRenderInfo = {
            dWidth: dWidth / dpr,
            dHeight: dHeight / dpr,
            dx: dx / dpr,
            dy: dy / dpr,
            scale: (scale / dpr)
        };

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, dx, dy, dWidth, dHeight);
    }

    window.addEventListener('resize', () => {
        if (imageLoaded) {
            drawImageToCanvas();
            if (isEyedropperActive && magnifier.classList.contains('inspecting')) {
                updateMagnifier(selectionPoint.x, selectionPoint.y);
            }
        }
    });


    // --- Tool State Management ---

    function resetToInitialState() {
        magnifierPlaceholder.textContent = 'Upload an image to begin.';
        resetPreviews();
        clearColorValues();
    }

    function resetPreviews() {
        magnifier.classList.remove('inspecting');
        magnifier.style.backgroundImage = 'none';
        magnifier.style.borderColor = 'var(--border-color)';
        colorPreview.style.backgroundColor = 'var(--disabled-bg-color)';
        if (imageLoaded) {
            magnifierPlaceholder.textContent = 'Activate eyedropper...';
        }
    }

    function clearColorValues() {
        hexValueInput.value = '';
        rgbValueInput.value = '';
        hslValueInput.value = '';
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

                    // Load full-res image into its dedicated canvas for picking
                    fullResCanvas.width = img.width;
                    fullResCanvas.height = img.height;
                    fullResCtx.imageSmoothingEnabled = false;
                    fullResCtx.drawImage(img, 0, 0);

                    // Setup the magnifier's dedicated canvas
                    const magElementSize = magnifier.clientWidth;
                    magnifierDisplayCanvas.width = magElementSize;
                    magnifierDisplayCanvas.height = magElementSize;
                    magnifierDisplayCtx.imageSmoothingEnabled = false;

                    drawImageToCanvas();

                    placeholder.classList.add('hidden');
                    canvas.style.display = 'block';
                    eyedropperBtn.disabled = false;
                    imageLoaded = true;

                    resetPreviews();
                    clearColorValues();
                    deactivateEyedropper();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Eyedropper Activation ---
    function activateEyedropper() {
        isEyedropperActive = true;
        canvas.classList.add('active');
        eyedropperBtn.classList.add('active');
        canvas.focus();
        eyedropperBtn.querySelector('span').textContent = 'Click or Use Arrows';
    }

    function deactivateEyedropper() {
        isEyedropperActive = false;
        canvas.classList.remove('active');
        eyedropperBtn.classList.remove('active');
        eyedropperBtn.querySelector('span').textContent = 'Activate Eyedropper';
        magnifier.classList.remove('inspecting');
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

    // --- Event Listeners for Color Selection ---
    function startInspection() {
        if (!magnifier.classList.contains('inspecting')) {
            magnifier.classList.add('inspecting');
        }
    }

    canvas.addEventListener('mousemove', (e) => {
        if (!imageLoaded || !isEyedropperActive) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (mouseX < imageRenderInfo.dx || mouseX > imageRenderInfo.dx + imageRenderInfo.dWidth ||
            mouseY < imageRenderInfo.dy || mouseY > imageRenderInfo.dy + imageRenderInfo.dHeight) {
            return;
        }

        startInspection();

        const xOnImage = mouseX - imageRenderInfo.dx;
        const yOnImage = mouseY - imageRenderInfo.dy;

        let originalX = Math.round(xOnImage / imageRenderInfo.scale);
        let originalY = Math.round(yOnImage / imageRenderInfo.scale);

        originalX = Math.max(0, Math.min(originalX, originalImage.width - 1));
        originalY = Math.max(0, Math.min(originalY, originalImage.height - 1));

        selectionPoint = { x: originalX, y: originalY };
        updateMagnifier(selectionPoint.x, selectionPoint.y);
        updateColorInfoFromPoint(selectionPoint.x, selectionPoint.y);
    });

    canvas.addEventListener('click', () => {
        if (!isEyedropperActive || !imageLoaded) return;
        updateColorInfoFromPoint(selectionPoint.x, selectionPoint.y);
        deactivateEyedropper();
    });


    // --- Keyboard Control ---
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
    });

    // --- Core Update Functions ---
    function updateColorInfoFromPoint(x, y) {
        // Get pixel data from the full-resolution offscreen canvas for perfect accuracy
        const pixel = fullResCtx.getImageData(x, y, 1, 1).data;
        const [r, g, b] = pixel;
        updateColorDisplay(r, g, b);
    }

    /**
     * ALIGNMENT FIX: This function now centers the source sampling area on the
     * middle of the target pixel (by adding 0.5) to ensure the highlight is perfect.
     */
    function updateMagnifier(x, y) {
        if (!originalImage) return;

        const magSize = magnifier.clientWidth;
        
        // The size of the source area on the full-res canvas to grab pixels from
        const sourcePixelArea = magSize / ZOOM_LEVEL;
        const halfSourcePixelArea = sourcePixelArea / 2;

        magnifierDisplayCtx.clearRect(0, 0, magSize, magSize);
        magnifierDisplayCtx.fillStyle = '#CCCCCC';
        magnifierDisplayCtx.fillRect(0, 0, magSize, magSize);
        
        // Draw the zoomed portion from the full-res offscreen canvas to our small magnifier canvas
        magnifierDisplayCtx.drawImage(
            fullResCanvas,
            // By sampling from the pixel's center (x + 0.5), we ensure perfect alignment
            (x + 0.5) - halfSourcePixelArea,
            (y + 0.5) - halfSourcePixelArea,
            sourcePixelArea,
            sourcePixelArea,
            0,
            0,
            magSize,
            magSize
        );

        // Use the small, pre-rendered canvas as the background for the magnifier element
        magnifier.style.backgroundImage = `url(${magnifierDisplayCanvas.toDataURL()})`;
        magnifier.style.backgroundSize = 'cover';
        magnifier.style.backgroundPosition = 'center';
    }


    function updateColorDisplay(r, g, b) {
        const hex = rgbToHex(r, g, b);
        const hsl = rgbToHsl(r, g, b);
        magnifier.style.borderColor = hex;
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

    // Run the initialization function when the page is ready
    resetToInitialState();
});