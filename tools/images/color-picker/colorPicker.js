document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const imageLoader = document.getElementById('cp-image-loader');
    const canvas = document.getElementById('cp-canvas');
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('cp-canvas-placeholder');
    const eyedropperBtn = document.getElementById('cp-eyedropper-btn');
    const magnifier = document.getElementById('cp-magnifier');

    const colorPreview = document.getElementById('cp-color-preview');
    const hexValueInput = document.getElementById('cp-hex-value');
    const rgbValueInput = document.getElementById('cp-rgb-value');
    const hslValueInput = document.getElementById('cp-hsl-value');

    // State
    let isEyedropperActive = false;
    let imageLoaded = false;
    let selectionPoint = { x: 0, y: 0 };

    // Magnifier Constants
    const MAGNIFIER_SIZE = 150; // px, must match CSS
    const ZOOM_LEVEL = 10;

    // --- Image Loading ---
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    placeholder.classList.add('hidden');
                    canvas.style.display = 'block';

                    eyedropperBtn.disabled = false;
                    imageLoaded = true;
                    selectionPoint = { x: Math.floor(canvas.width / 2), y: Math.floor(canvas.height / 2) };
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
        canvas.focus(); // Set focus for keyboard events
        eyedropperBtn.querySelector('span').textContent = 'Click or Use Arrows';
        updateColorInfoFromPoint(selectionPoint.x, selectionPoint.y);
    }

    function deactivateEyedropper() {
        isEyedropperActive = false;
        canvas.classList.remove('active');
        eyedropperBtn.querySelector('span').textContent = 'Activate Eyedropper';
    }

    eyedropperBtn.addEventListener('click', () => {
        if (!imageLoaded) return;
        isEyedropperActive ? deactivateEyedropper() : activateEyedropper();
    });

    // --- Event Listeners for Color Selection ---
    canvas.addEventListener('mousemove', (e) => {
        if (!imageLoaded) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        selectionPoint.x = Math.floor((e.clientX - rect.left) * scaleX);
        selectionPoint.y = Math.floor((e.clientY - rect.top) * scaleY);

        updateMagnifier(selectionPoint.x, selectionPoint.y, e.clientX, e.clientY);

        if (isEyedropperActive) {
            updateColorInfoFromPoint(selectionPoint.x, selectionPoint.y);
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (imageLoaded) magnifier.style.display = 'none';
    });

    canvas.addEventListener('mouseenter', () => {
        if (imageLoaded) magnifier.style.display = 'block';
    });

    canvas.addEventListener('click', () => {
        if (!isEyedropperActive || !imageLoaded) return;
        updateColorInfoFromPoint(selectionPoint.x, selectionPoint.y); // Finalize color
        deactivateEyedropper();
    });

    // --- Keyboard Control ---
    canvas.addEventListener('keydown', (e) => {
        if (!isEyedropperActive) return;

        e.preventDefault(); // Prevent page scrolling
        const { x, y } = selectionPoint;
        let newX = x, newY = y;

        if (e.key === 'ArrowUp') newY = Math.max(0, y - 1);
        else if (e.key === 'ArrowDown') newY = Math.min(canvas.height - 1, y + 1);
        else if (e.key === 'ArrowLeft') newX = Math.max(0, x - 1);
        else if (e.key === 'ArrowRight') newX = Math.min(canvas.width - 1, x + 1);

        if (newX !== x || newY !== y) {
            selectionPoint = { x: newX, y: newY };

            // Calculate screen position from canvas data point for magnifier positioning
            const rect = canvas.getBoundingClientRect();
            const canvasScreenX = (newX / canvas.width) * rect.width + rect.left;
            const canvasScreenY = (newY / canvas.height) * rect.height + rect.top;

            updateMagnifier(newX, newY, canvasScreenX, canvasScreenY);
            updateColorInfoFromPoint(newX, newY);
        }
    });

    // --- Core Update Functions ---
    function updateColorInfoFromPoint(x, y) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const [r, g, b] = pixel;
        updateColorDisplay(r, g, b);
    }

    function updateMagnifier(x, y, mouseX, mouseY) {
        const OFFSET = 25; // Space between cursor and magnifier
        const HALF_MAG_SIZE = MAGNIFIER_SIZE / 2;

        // Center magnifier vertically on the cursor/point
        magnifier.style.top = `${mouseY - HALF_MAG_SIZE}px`;

        // Dynamically position to the left or right to stay within the viewport
        if (mouseX + OFFSET + MAGNIFIER_SIZE < window.innerWidth) {
            // Enough space on the right, place it there
            magnifier.style.left = `${mouseX + OFFSET}px`;
        } else {
            // Not enough space, place on the left
            magnifier.style.left = `${mouseX - MAGNIFIER_SIZE - OFFSET}px`;
        }

        // Set the zoomed background image
        magnifier.style.backgroundImage = `url(${canvas.toDataURL()})`;
        magnifier.style.backgroundSize = `${canvas.width * ZOOM_LEVEL}px ${canvas.height * ZOOM_LEVEL}px`;

        // Calculate background position to center the target pixel.
        const bgX = -((x + 0.5) * ZOOM_LEVEL - HALF_MAG_SIZE);
        const bgY = -((y + 0.5) * ZOOM_LEVEL - HALF_MAG_SIZE);
        magnifier.style.backgroundPosition = `${bgX}px ${bgY}px`;
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
});
