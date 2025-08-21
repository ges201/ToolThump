const brFeatures = {
    // DOM Elements
    featuresContainer: null,
    bgColorContainer: null,
    bgColorPicker: null,
    bgColorSwatches: null,
    brushControls: null,
    brushActivateBtn: null,
    brushDeleteBtn: null,
    brushRestoreBtn: null,
    brushSizeSlider: null,
    brushSizeValue: null,
    brushFeatherSlider: null,
    brushFeatherValue: null,
    brushCursor: null, // Custom cursor element

    // State
    selectedColor: 'transparent', // Default to transparent
    isBrushActive: false,
    brushMode: 'delete', // 'delete' or 'restore'
    brushSize: 30,
    brushFeather: 0,

    fetchElements: function () {
        this.featuresContainer = document.getElementById('br-features-container');
        this.bgColorContainer = document.getElementById('br-bg-color-container');
        this.bgColorPicker = document.getElementById('br-bg-color-picker');
        this.bgColorSwatches = document.getElementById('br-bg-color-swatches');
        this.brushControls = document.getElementById('br-brush-controls');
        this.brushActivateBtn = document.getElementById('br-brush-activate-btn');
        this.brushDeleteBtn = document.getElementById('br-brush-delete-btn');
        this.brushRestoreBtn = document.getElementById('br-brush-restore-btn');
        this.brushSizeSlider = document.getElementById('br-brush-size-slider');
        this.brushSizeValue = document.getElementById('br-brush-size-value');
        this.brushFeatherSlider = document.getElementById('br-brush-feather-slider');
        this.brushFeatherValue = document.getElementById('br-brush-feather-value');
    },

    init: function () {
        this.fetchElements();
        if (!this.featuresContainer) return;

        // Background Color Listeners
        this.bgColorPicker.addEventListener('input', (e) => {
            this.selectedColor = e.target.value;
            this.applyBackgroundColor();
        });

        this.bgColorSwatches.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            if (color) {
                this.selectedColor = color;
                if (color !== 'transparent') {
                    this.bgColorPicker.value = this.selectedColor;
                }
                this.applyBackgroundColor();
            }
        });

        // Brush Listeners
        if (this.brushControls) {
            this.brushActivateBtn.addEventListener('click', () => this.toggleBrushActive());
            this.brushDeleteBtn.addEventListener('click', () => this.setBrushMode('delete'));
            this.brushRestoreBtn.addEventListener('click', () => this.setBrushMode('restore'));
            this.brushSizeSlider.addEventListener('input', (e) => this.setBrushSize(e.target.value));
            this.brushFeatherSlider.addEventListener('input', (e) => this.setBrushFeather(e.target.value));
            this.createBrushCursor();
            this.addCanvasCursorListeners();
        }
    },

    createBrushCursor: function () {
        if (!br.workspace) return;
        this.brushCursor = document.createElement('div');
        this.brushCursor.className = 'br-brush-cursor';
        br.workspace.appendChild(this.brushCursor);
        this.setBrushCursorSize();
    },

    addCanvasCursorListeners: function () {
        const canvas = br.outputCanvas;
        if (!canvas || !this.brushCursor) return;

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isBrushActive) return;

            // Get the canvas bounding rect
            const canvasRect = canvas.getBoundingClientRect();

            // Calculate position relative to the canvas element
            // Use offsetX and offsetY which are already relative to the target element (canvas)
            const x = e.offsetX;
            const y = e.offsetY;

            // Position the cursor relative to the canvas position in the workspace
            const workspaceRect = br.workspace.getBoundingClientRect();
            const cursorX = canvasRect.left - workspaceRect.left + x;
            const cursorY = canvasRect.top - workspaceRect.top + y;

            requestAnimationFrame(() => {
                this.brushCursor.style.left = `${cursorX}px`;
                this.brushCursor.style.top = `${cursorY}px`;
            });
        });

        canvas.addEventListener('mouseenter', () => {
            if (this.isBrushActive) {
                this.brushCursor.style.display = 'block';
            }
        });

        canvas.addEventListener('mouseleave', () => {
            this.brushCursor.style.display = 'none';
        });
    },

    toggleBrushActive: function () {
        this.isBrushActive = !this.isBrushActive;
        if (this.isBrushActive) {
            this.brushActivateBtn.textContent = 'Deactivate Brush';
            this.brushActivateBtn.classList.add('active');
            br.outputCanvas.style.cursor = 'none';
        } else {
            this.brushActivateBtn.textContent = 'Activate Brush';
            this.brushActivateBtn.classList.remove('active');
            br.outputCanvas.style.cursor = 'default';
            if (this.brushCursor) {
                this.brushCursor.style.display = 'none';
            }
        }
    },

    setBrushMode: function (mode) {
        this.brushMode = mode;
        this.brushDeleteBtn.classList.toggle('active', mode === 'delete');
        this.brushRestoreBtn.classList.toggle('active', mode === 'restore');
    },

    setBrushSize: function (size) {
        this.brushSize = parseInt(size, 10);
        this.brushSizeValue.textContent = size;
        this.setBrushCursorSize();
    },

    setBrushFeather: function (value) {
        this.brushFeather = parseInt(value, 10);
        this.brushFeatherValue.textContent = value;
    },

    setBrushCursorSize: function () {
        if (!this.brushCursor || !br.outputCanvas || br.outputCanvas.width === 0) return;

        const canvas = br.outputCanvas;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const canvasRatio = canvas.width / canvas.height;
        const containerRatio = rect.width / rect.height;

        let scale;
        if (canvasRatio > containerRatio) {
            // Wider than container, scaled by width
            scale = rect.width / canvas.width;
        } else {
            // Taller than container, scaled by height
            scale = rect.height / canvas.height;
        }

        const cursorSize = this.brushSize * scale;

        this.brushCursor.style.width = `${cursorSize}px`;
        this.brushCursor.style.height = `${cursorSize}px`;
    },

    show: function () {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'block';
            this.setBrushCursorSize(); // Update cursor size when features are shown
        }
    },

    hide: function () {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'none';
            if (this.isBrushActive) { // Deactivate brush on hide
                this.toggleBrushActive();
            }
        }
    },

    applyBackgroundColor: function () {
        if (br.outputCanvas && br.outputCanvas.style.display === 'block' && br.processedImage) {
            const ctx = br.outputCanvas.getContext('2d');
            ctx.clearRect(0, 0, br.outputCanvas.width, br.outputCanvas.height);

            if (this.selectedColor !== 'transparent') {
                ctx.fillStyle = this.selectedColor;
                ctx.fillRect(0, 0, br.outputCanvas.width, br.outputCanvas.height);
            }

            ctx.drawImage(br.processedImage, 0, 0);
        }
    }
};