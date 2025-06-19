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

    // Off-screen canvas for the magnifier
    const magnifierCanvas = document.createElement('canvas');
    const magnifierCtx = magnifierCanvas.getContext('2d');
    magnifierCanvas.style.imageRendering = 'pixelated';

    // State
    let isEyedropperActive = false;
    let imageLoaded = false;
    let selectionPoint = { x: 0, y: 0 };
    let originalImage = null;

    // Magnifier Constants
    const ZOOM_LEVEL = 10;

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
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    magnifierCanvas.width = img.width;
                    magnifierCanvas.height = img.height;
                    magnifierCtx.drawImage(img, 0, 0);

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
            // MODIFIED: Also reset the previews, treating it as a "cancel" action.
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

        startInspection();

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        selectionPoint.x = Math.floor((e.clientX - rect.left) * scaleX);
        selectionPoint.y = Math.floor((e.clientY - rect.top) * scaleY);

        updateMagnifier(selectionPoint.x, selectionPoint.y);
        updateColorInfoFromPoint(selectionPoint.x, selectionPoint.y);
    });

    // MODIFIED: This is the core change.
    canvas.addEventListener('click', () => {
        if (!isEyedropperActive || !imageLoaded) return;

        // Finalize color selection at the current point.
        updateColorInfoFromPoint(selectionPoint.x, selectionPoint.y);

        // Deactivate the eyedropper to "lock" the selection, but keep the visuals.
        // This makes the selection result persistent until the next action.
        isEyedropperActive = false;
        canvas.classList.remove('active'); // Stop the crosshair cursor.
        eyedropperBtn.classList.remove('active'); // Reset the button's visual state.
        eyedropperBtn.querySelector('span').textContent = 'Activate Eyedropper';

        // By not calling deactivateEyedropper() or resetPreviews(), the magnifier
        // and color swatches remain visible with the selected color.
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
        else if (e.key === 'ArrowDown') y = Math.min(canvas.height - 1, y + 1);
        else if (e.key === 'ArrowLeft') x = Math.max(0, x - 1);
        else if (e.key === 'ArrowRight') x = Math.min(canvas.width - 1, x + 1);

        selectionPoint = { x, y };
        updateMagnifier(x, y);
        updateColorInfoFromPoint(x, y);
    });

    // --- Core Update Functions ---
    function updateColorInfoFromPoint(x, y) {
        const pixel = magnifierCtx.getImageData(x, y, 1, 1).data;
        const [r, g, b] = pixel;
        updateColorDisplay(r, g, b);
    }

    function updateMagnifier(x, y) {
        if (!originalImage) return;
        const magSize = magnifier.offsetWidth;
        const halfMagSize = magSize / 2;
        magnifier.style.backgroundImage = `url(${originalImage.src})`;
        magnifier.style.backgroundSize = `${canvas.width * ZOOM_LEVEL}px ${canvas.height * ZOOM_LEVEL}px`;
        const bgX = -((x + 0.5) * ZOOM_LEVEL - halfMagSize);
        const bgY = -((y + 0.5) * ZOOM_LEVEL - halfMagSize);
        magnifier.style.backgroundPosition = `${bgX}px ${bgY}px`;
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