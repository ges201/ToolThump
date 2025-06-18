document.addEventListener('DOMContentLoaded', () => {
    const imageLoader = document.getElementById('cp-image-loader');
    const canvas = document.getElementById('cp-canvas');
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('cp-canvas-placeholder');
    const eyedropperBtn = document.getElementById('cp-eyedropper-btn');

    const colorPreview = document.getElementById('cp-color-preview');
    const hexValueInput = document.getElementById('cp-hex-value');
    const rgbValueInput = document.getElementById('cp-rgb-value');
    const hslValueInput = document.getElementById('cp-hsl-value');

    let isEyedropperActive = false;
    let imageLoaded = false;

    // Load image and draw to canvas
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Set canvas dimensions to match image
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Show canvas, hide placeholder
                    canvas.style.display = 'block';
                    placeholder.classList.add('hidden');

                    // Enable eyedropper button
                    eyedropperBtn.disabled = false;
                    imageLoaded = true;
                    isEyedropperActive = false;
                    canvas.classList.remove('active');
                    eyedropperBtn.querySelector('span').textContent = 'Activate Eyedropper';
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Toggle eyedropper activation
    eyedropperBtn.addEventListener('click', () => {
        if (!imageLoaded) return;
        isEyedropperActive = !isEyedropperActive;
        canvas.classList.toggle('active', isEyedropperActive);
        eyedropperBtn.querySelector('span').textContent = isEyedropperActive ? 'Click on Image to Pick' : 'Activate Eyedropper';
    });

    // Get color on canvas click
    canvas.addEventListener('click', (e) => {
        if (!isEyedropperActive) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const [r, g, b] = pixel;

        updateColorInfo(r, g, b);

        // Deactivate eyedropper after picking a color
        isEyedropperActive = false;
        canvas.classList.remove('active');
        eyedropperBtn.querySelector('span').textContent = 'Activate Eyedropper';
    });

    function updateColorInfo(r, g, b) {
        const hex = rgbToHex(r, g, b);
        const hsl = rgbToHsl(r, g, b);

        colorPreview.style.backgroundColor = hex;
        hexValueInput.value = hex;
        rgbValueInput.value = `rgb(${r}, ${g}, ${b})`;
        hslValueInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }

    // --- Color Conversion Utilities ---
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    // --- Clipboard Functionality ---
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-clipboard-target');
            const inputToCopy = document.querySelector(targetId);
            if (inputToCopy && inputToCopy.value) {
                navigator.clipboard.writeText(inputToCopy.value).then(() => {
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            }
        });
    });
});