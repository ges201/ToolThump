const brFeatures = {
    // DOM Elements
    featuresContainer: null, bgColorContainer: null, bgColorPicker: null,
    bgColorSwatches: null, brushControls: null, brushActivateBtn: null,
    brushDeleteBtn: null, brushRestoreBtn: null, brushSizeSlider: null,
    brushSizeValue: null, brushFeatherSlider: null, brushFeatherValue: null,
    featherEdgesSlider: null, featherEdgesValue: null,

    // State
    selectedColor: 'transparent',
    featherEdges: 0,
    originalMask: null,
    isDirty: false,

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
        this.featherEdgesSlider = document.getElementById('br-feather-edges-slider');
        this.featherEdgesValue = document.getElementById('br-feather-edges-value');
    },

    init: function () {
        this.fetchElements();
        if (!this.featuresContainer) return;

        canvasEditor.init();

        this.bgColorPicker.addEventListener('input', (e) => {
            this.selectedColor = e.target.value;
            this.applyBackgroundColor();
            this.setDirty();
        });

        this.bgColorSwatches.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            if (color) {
                this.selectedColor = color;
                if (color !== 'transparent') {
                    this.bgColorPicker.value = this.selectedColor;
                }
                this.applyBackgroundColor();
                this.setDirty();
            }
        });

        if (br.resetBtn) {
            br.resetBtn.addEventListener('click', () => this.resetChanges());
        }

        if (this.brushControls) {
            this.brushActivateBtn.addEventListener('click', () => this.toggleBrushActive());
            this.brushDeleteBtn.addEventListener('click', () => this.setBrushMode('delete'));
            this.brushRestoreBtn.addEventListener('click', () => this.setBrushMode('restore'));
            this.brushSizeSlider.addEventListener('input', (e) => this.setBrushSize(e.target.value));
            this.brushFeatherSlider.addEventListener('input', (e) => this.setBrushFeather(e.target.value));
            this.featherEdgesSlider.addEventListener('input', (e) => this.setFeatherEdges(e.target.value));
        }
    },

    storeOriginalMask: function (maskCanvas) {
        this.originalMask = document.createElement('canvas');
        this.originalMask.width = maskCanvas.width;
        this.originalMask.height = maskCanvas.height;
        this.originalMask.getContext('2d').drawImage(maskCanvas, 0, 0);
    },

    setDirty: function () {
        if (!this.isDirty) {
            this.isDirty = true;
        }
    },

    resetChanges: function () {
        if (!this.originalMask || !br.maskCanvas) return;

        const currentMaskCtx = br.maskCanvas.getContext('2d');
        currentMaskCtx.globalCompositeOperation = 'source-over';
        currentMaskCtx.clearRect(0, 0, br.maskCanvas.width, br.maskCanvas.height);
        currentMaskCtx.drawImage(this.originalMask, 0, 0);

        this.selectedColor = 'transparent';
        this.bgColorPicker.value = '#FFFFFF';

        this.featherEdges = 0;
        this.featherEdgesSlider.value = 0;
        this.featherEdgesValue.textContent = 0;

        this.updateProcessedImage();
        this.applyBackgroundColor();

        this.isDirty = false;
    },

    toggleBrushActive: function () {
        const wasActive = canvasEditor.isBrushActive;
        canvasEditor.toggleBrushActive(!wasActive);
        
        if (canvasEditor.isBrushActive) {
            this.brushActivateBtn.textContent = 'Deactivate Brush';
            this.brushActivateBtn.classList.add('active');
        } else {
            this.brushActivateBtn.textContent = 'Activate Brush';
            this.brushActivateBtn.classList.remove('active');
        }
    },

    setBrushMode: function (mode) {
        canvasEditor.setBrushMode(mode);
        this.brushDeleteBtn.classList.toggle('active', mode === 'delete');
        this.brushRestoreBtn.classList.toggle('active', mode === 'restore');
    },

    setBrushSize: function (size) {
        this.brushSizeValue.textContent = size;
        canvasEditor.setBrushSize(size);
    },

    setBrushFeather: function (value) {
        this.brushFeatherValue.textContent = value;
        canvasEditor.setBrushFeather(value);
    },

    setFeatherEdges: function (value) {
        this.featherEdges = parseInt(value, 10);
        this.featherEdgesValue.textContent = value;
        this.updateProcessedImage();
        this.applyBackgroundColor();
        this.setDirty();
    },

    updateProcessedImage: function () {
        if (!br.originalImage || !br.maskCanvas) return;

        const finalMask = document.createElement('canvas');
        finalMask.width = br.maskCanvas.width;
        finalMask.height = br.maskCanvas.height;
        const finalMaskCtx = finalMask.getContext('2d');

        if (this.featherEdges > 0) {
            finalMaskCtx.filter = `blur(${this.featherEdges}px)`;
        }
        finalMaskCtx.drawImage(br.maskCanvas, 0, 0);
        finalMaskCtx.filter = 'none';

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = br.originalImage.naturalWidth;
        tempCanvas.height = br.originalImage.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(br.originalImage, 0, 0);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(finalMask, 0, 0);
        tempCtx.globalCompositeOperation = 'source-over';
        br.processedImage = tempCanvas;
    },

    show: function () {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'block';
            canvasEditor.setBrushCursorSize();
            if (br.resetBtn) {
                br.resetBtn.style.display = 'inline-flex';
            }
        }
    },

    hide: function () {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'none';
            if (canvasEditor.isBrushActive) this.toggleBrushActive();
            if (br.resetBtn) {
                br.resetBtn.style.display = 'none';
            }
            this.isDirty = false;
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