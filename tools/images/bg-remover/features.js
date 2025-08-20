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

    // State
    selectedColor: 'transparent', // Default to transparent
    isBrushActive: false,
    brushMode: 'delete', // 'delete' or 'restore'
    brushSize: 30,

    fetchElements: function() {
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
    },

    init: function() {
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
        }
    },

    toggleBrushActive: function() {
        this.isBrushActive = !this.isBrushActive;
        if (this.isBrushActive) {
            this.brushActivateBtn.textContent = 'Deactivate Brush';
            this.brushActivateBtn.classList.add('active');
            br.outputCanvas.style.cursor = 'crosshair';
        } else {
            this.brushActivateBtn.textContent = 'Activate Brush';
            this.brushActivateBtn.classList.remove('active');
            br.outputCanvas.style.cursor = 'default';
        }
    },

    setBrushMode: function(mode) {
        this.brushMode = mode;
        this.brushDeleteBtn.classList.toggle('active', mode === 'delete');
        this.brushRestoreBtn.classList.toggle('active', mode === 'restore');
    },

    setBrushSize: function(size) {
        this.brushSize = parseInt(size, 10);
        this.brushSizeValue.textContent = size;
    },

    show: function() {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'block';
        }
    },

    hide: function() {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'none';
            if (this.isBrushActive) { // Deactivate brush on hide
                this.toggleBrushActive();
            }
        }
    },

    applyBackgroundColor: function() {
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