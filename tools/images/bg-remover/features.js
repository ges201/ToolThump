const brFeatures = {
    // DOM Elements
    featuresContainer: null, bgColorContainer: null, bgColorPicker: null,
    bgColorSwatches: null, brushControls: null, brushActivateBtn: null,
    brushDeleteBtn: null, brushRestoreBtn: null, brushSizeSlider: null,
    brushSizeValue: null, brushFeatherSlider: null, brushFeatherValue: null,
    featherEdgesSlider: null, featherEdgesValue: null,
    maskAdjustSlider: null, maskAdjustValue: null,

    // State
    selectedColor: 'transparent',
    featherEdges: 0,
    maskAdjust: 0,
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
        this.maskAdjustSlider = document.getElementById('br-mask-adjust-slider');
        this.maskAdjustValue = document.getElementById('br-mask-adjust-value');
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
            if (this.maskAdjustSlider) {
                this.maskAdjustSlider.addEventListener('input', (e) => this.setMaskAdjust(e.target.value));
            }
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

        if (this.maskAdjustSlider) {
            this.maskAdjust = 0;
            this.maskAdjustSlider.value = 0;
            this.maskAdjustValue.textContent = 0;
        }

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

    setMaskAdjust: function (value) {
        this.maskAdjust = parseInt(value, 10);
        this.maskAdjustValue.textContent = value;
        this.updateProcessedImage();
        this.applyBackgroundColor();
        this.setDirty();
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

        // --- Stage 1: Apply Shrink/Expand to an intermediate canvas ---
        const adjustedMask = document.createElement('canvas');
        adjustedMask.width = br.maskCanvas.width;
        adjustedMask.height = br.maskCanvas.height;
        const adjustedMaskCtx = adjustedMask.getContext('2d');

        const baseRadius = Math.round(Math.abs(this.maskAdjust) / 100 * 30);

        if (baseRadius > 0) {
            // Performance Optimization: Process a downscaled version
            const MAX_DIM = 480;
            const srcWidth = br.maskCanvas.width;
            const srcHeight = br.maskCanvas.height;
            let scale = 1.0;
            let procWidth = srcWidth;
            let procHeight = srcHeight;

            if (procWidth > MAX_DIM || procHeight > MAX_DIM) {
                scale = (procWidth > procHeight) ? (MAX_DIM / procWidth) : (MAX_DIM / procHeight);
                procWidth = Math.round(srcWidth * scale);
                procHeight = Math.round(srcHeight * scale);
            }

            const radius = Math.max(1, Math.round(baseRadius * scale));
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = procWidth;
            tempCanvas.height = procHeight;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

            tempCtx.drawImage(br.maskCanvas, 0, 0, procWidth, procHeight);
            const srcData = tempCtx.getImageData(0, 0, procWidth, procHeight);
            const tempAlpha = new Uint8ClampedArray(procWidth * procHeight);
            const destData = new ImageData(procWidth, procHeight);
            const isErode = this.maskAdjust < 0;

            // Horizontal pass
            for (let y = 0; y < procHeight; y++) {
                for (let x = 0; x < procWidth; x++) {
                    let bestAlpha = isErode ? 255 : 0;
                    for (let i = -radius; i <= radius; i++) {
                        const nx = Math.max(0, Math.min(procWidth - 1, x + i));
                        const alpha = srcData.data[(y * procWidth + nx) * 4 + 3];
                        if (isErode) { bestAlpha = Math.min(bestAlpha, alpha); }
                        else { bestAlpha = Math.max(bestAlpha, alpha); }
                    }
                    tempAlpha[y * procWidth + x] = bestAlpha;
                }
            }

            // Vertical pass
            for (let y = 0; y < procHeight; y++) {
                for (let x = 0; x < procWidth; x++) {
                    let bestAlpha = isErode ? 255 : 0;
                    for (let j = -radius; j <= radius; j++) {
                        const ny = Math.max(0, Math.min(procHeight - 1, y + j));
                        const alpha = tempAlpha[ny * procWidth + x];
                        if (isErode) { bestAlpha = Math.min(bestAlpha, alpha); }
                        else { bestAlpha = Math.max(bestAlpha, alpha); }
                    }
                    destData.data[(y * procWidth + x) * 4 + 3] = bestAlpha;
                }
            }
            tempCtx.putImageData(destData, 0, 0);

            // Draw the processed small mask back to our intermediate canvas
            adjustedMaskCtx.imageSmoothingEnabled = true;
            adjustedMaskCtx.imageSmoothingQuality = 'high';
            adjustedMaskCtx.drawImage(tempCanvas, 0, 0, srcWidth, srcHeight);

        } else {
            // No shrink/expand, just copy the current mask
            adjustedMaskCtx.drawImage(br.maskCanvas, 0, 0);
        }

        // --- Stage 2: Apply Feather Edges using the result from Stage 1 ---
        const finalMask = document.createElement('canvas');
        finalMask.width = br.maskCanvas.width;
        finalMask.height = br.maskCanvas.height;
        const finalMaskCtx = finalMask.getContext('2d');

        if (this.featherEdges > 0) {
            finalMaskCtx.filter = `blur(${this.featherEdges}px)`;
            // Draw the adjusted mask (input) to the final mask (output) to apply the filter
            finalMaskCtx.drawImage(adjustedMask, 0, 0);
            finalMaskCtx.filter = 'none';
        } else {
            // No feather, just copy the adjusted mask
            finalMaskCtx.drawImage(adjustedMask, 0, 0);
        }

        // --- Final Clipping ---
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
    },

    redrawOutputCanvas: function() {
        if (!br.outputCanvas || !br.originalImage || !br.maskCanvas) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = br.originalImage.naturalWidth;
        tempCanvas.height = br.originalImage.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // Clip original image with the current mask
        tempCtx.drawImage(br.originalImage, 0, 0);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(br.maskCanvas, 0, 0);
        
        // Now draw this clipped image onto the main canvas with the background color
        const outCtx = br.outputCanvas.getContext('2d');
        outCtx.clearRect(0, 0, br.outputCanvas.width, br.outputCanvas.height);
        if (this.selectedColor !== 'transparent') {
            outCtx.fillStyle = this.selectedColor;
            outCtx.fillRect(0, 0, outCtx.canvas.width, outCtx.canvas.height);
        }
        outCtx.drawImage(tempCanvas, 0, 0);
    }
};