const brFeatures = {
    // DOM Elements
    featuresContainer: null, bgColorContainer: null, bgColorPicker: null,
    bgColorSwatches: null, brushControls: null, brushActivateBtn: null,
    brushDeleteBtn: null, brushRestoreBtn: null, brushSizeSlider: null,
    brushSizeValue: null, brushFeatherSlider: null, brushFeatherValue: null,
    brushCursor: null,

    // State
    selectedColor: 'transparent',
    isBrushActive: false,
    brushMode: 'delete',
    brushSize: 30,
    brushFeather: 0,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    originalMask: null,
    isDirty: false,

    // State for panning and zooming
    isPanning: false,
    viewTransform: { x: 0, y: 0, scale: 1 },
    lastPanMidpoint: null,

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
            this.createBrushCursor();
            this.addCanvasCursorListeners();

            // Mouse events for drawing
            br.outputCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
            br.outputCanvas.addEventListener('mouseup', () => this.stopDrawing());
            br.outputCanvas.addEventListener('mousemove', (e) => this.draw(e));
            br.outputCanvas.addEventListener('mouseleave', () => this.stopDrawing());

            // Touch events for drawing and panning
            br.outputCanvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            br.outputCanvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            br.outputCanvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            br.outputCanvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
        }
    },

    storeOriginalMask: function(maskCanvas) {
        this.originalMask = document.createElement('canvas');
        this.originalMask.width = maskCanvas.width;
        this.originalMask.height = maskCanvas.height;
        this.originalMask.getContext('2d').drawImage(maskCanvas, 0, 0);
    },

    setDirty: function() {
        if (!this.isDirty) {
            this.isDirty = true;
        }
    },

    resetChanges: function() {
        if (!this.originalMask || !br.maskCanvas) return;

        // Restore the mask
        const currentMaskCtx = br.maskCanvas.getContext('2d');
        currentMaskCtx.clearRect(0, 0, br.maskCanvas.width, br.maskCanvas.height);
        currentMaskCtx.drawImage(this.originalMask, 0, 0);

        // Reset background color to transparent
        this.selectedColor = 'transparent';
        this.bgColorPicker.value = '#FFFFFF'; // Reset picker to a default

        // Re-apply the image with the restored mask and new bg color
        this.updateProcessedImage();
        this.applyBackgroundColor();

        this.isDirty = false;
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

        const updateCursorPosition = (e) => {
            if (!this.isBrushActive) return;
            const point = e.touches ? e.touches[0] : e;
            const canvasRect = canvas.getBoundingClientRect();
            const x = point.clientX - canvasRect.left;
            const y = point.clientY - canvasRect.top;

            const workspaceRect = br.workspace.getBoundingClientRect();
            const cursorX = canvasRect.left - workspaceRect.left + x;
            const cursorY = canvasRect.top - workspaceRect.top + y;

            requestAnimationFrame(() => {
                this.brushCursor.style.left = `${cursorX}px`;
                this.brushCursor.style.top = `${cursorY}px`;
            });
        };

        canvas.addEventListener('mousemove', updateCursorPosition);
        canvas.addEventListener('touchmove', updateCursorPosition);

        canvas.addEventListener('mouseenter', () => {
            if (this.isBrushActive) this.brushCursor.style.display = 'block';
        });
        canvas.addEventListener('mouseleave', () => {
            this.brushCursor.style.display = 'none';
        });

        canvas.addEventListener('touchstart', () => {
            if (this.isBrushActive) this.brushCursor.style.display = 'block';
        });
        canvas.addEventListener('touchend', () => {
            this.brushCursor.style.display = 'none';
        });
        canvas.addEventListener('touchcancel', () => {
            this.brushCursor.style.display = 'none';
        });
    },

    toggleBrushActive: function () {
        this.isBrushActive = !this.isBrushActive;
        if (this.isBrushActive) {
            this.brushActivateBtn.textContent = 'Deactivate Brush';
            this.brushActivateBtn.classList.add('active');
            br.outputCanvas.style.cursor = 'none';
            br.outputCanvas.classList.add('brush-active');
        } else {
            this.brushActivateBtn.textContent = 'Activate Brush';
            this.brushActivateBtn.classList.remove('active');
            br.outputCanvas.style.cursor = 'default';
            if (this.brushCursor) this.brushCursor.style.display = 'none';
            br.outputCanvas.classList.remove('brush-active');
            this.resetTransform();
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
        const scale = (canvas.width / canvas.height > rect.width / rect.height)
            ? rect.width / canvas.width
            : rect.height / canvas.height;
        const cursorSize = this.brushSize * scale;
        this.brushCursor.style.width = `${cursorSize}px`;
        this.brushCursor.style.height = `${cursorSize}px`;
    },

    getCanvasCoordinates: function (e) {
        const canvas = br.outputCanvas;
        const rect = canvas.getBoundingClientRect();
        const point = e.touches ? e.touches[0] : e;

        const viewX = point.clientX - rect.left;
        const viewY = point.clientY - rect.top;

        const scale = (canvas.width / canvas.height > rect.width / rect.height)
            ? rect.width / canvas.width
            : rect.height / canvas.height;
        const offsetX = (rect.width - canvas.width * scale) / 2;
        const offsetY = (rect.height - canvas.height * scale) / 2;

        const x = (viewX - offsetX) / scale;
        const y = (viewY - offsetY) / scale;
        return { x, y };
    },

    startDrawing: function (e) {
        if (!this.isBrushActive) return;
        this.isDrawing = true;
        const { x, y } = this.getCanvasCoordinates(e);
        this.lastX = x;
        this.lastY = y;
        // For a single click, draw a line of zero length. lineCap='round' turns it into a circle.
        this.applyBrushStroke(this.lastX, this.lastY, x, y);
        this.updateProcessedImage();
        this.applyBackgroundColor();
        this.setDirty();
    },

    stopDrawing: function () {
        if (!this.isDrawing) return;
        this.isDrawing = false;
    },

    draw: function (e) {
        if (!this.isDrawing || !this.isBrushActive) return;
        const { x, y } = this.getCanvasCoordinates(e);
        this.applyBrushStroke(this.lastX, this.lastY, x, y);
        [this.lastX, this.lastY] = [x, y];
        this.updateProcessedImage();
        this.applyBackgroundColor();
    },

    applyBrushStroke: function (x1, y1, x2, y2) {
        const ctx = br.maskCanvas.getContext('2d');
        ctx.globalCompositeOperation = (this.brushMode === 'delete') ? 'destination-out' : 'source-over';
        ctx.lineWidth = this.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (this.brushFeather > 0) {
            const blurAmount = (this.brushFeather / 100) * (this.brushSize / 2.5);
            ctx.shadowBlur = Math.max(1, blurAmount);
            ctx.shadowColor = 'rgba(0,0,0,1)';

            // Draw the stroke off-screen, so only its shadow is rendered in the visible area.
            // This effectively lets us draw with a blurred shape.
            const offset = br.maskCanvas.width * 2;
            ctx.shadowOffsetX = offset;

            ctx.beginPath();
            ctx.moveTo(x1 - offset, y1);
            ctx.lineTo(x2 - offset, y2);
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.stroke();

            // Reset shadow properties to avoid affecting other canvas operations.
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
        } else {
            // For a solid brush, just draw a simple line.
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.stroke();
        }
    },

    updateProcessedImage: function () {
        if (!br.originalImage || !br.maskCanvas) return;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = br.originalImage.naturalWidth;
        tempCanvas.height = br.originalImage.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(br.originalImage, 0, 0);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(br.maskCanvas, 0, 0);
        tempCtx.globalCompositeOperation = 'source-over';
        br.processedImage = tempCanvas;
    },

    show: function () {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'block';
            this.setBrushCursorSize();
            if (br.resetBtn) {
                br.resetBtn.style.display = 'inline-flex';
            }
        }
    },

    hide: function () {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'none';
            if (this.isBrushActive) this.toggleBrushActive();
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

    // Panning methods
    handleTouchStart: function (e) {
        if (!this.isBrushActive) return;
        if (e.touches.length >= 2) {
            e.preventDefault();
            this.isDrawing = false;
            this.startPanning(e);
        } else if (e.touches.length === 1) {
            e.preventDefault();
            this.startDrawing(e);
        }
    },

    handleTouchMove: function (e) {
        if (!this.isBrushActive) return;
        e.preventDefault();
        if (e.touches.length >= 2 && this.isPanning) {
            this.pan(e);
        } else if (e.touches.length === 1 && this.isDrawing) {
            this.draw(e);
        }
    },

    handleTouchEnd: function (e) {
        if (this.isPanning && e.touches.length < 2) {
            this.isPanning = false;
            this.lastPanMidpoint = null;
        }
        if (this.isDrawing && e.touches.length < 1) {
            this.stopDrawing();
        }
    },

    startPanning: function (e) {
        this.isPanning = true;
        this.lastPanMidpoint = this.getMidpoint(e.touches);
    },

    pan: function (e) {
        if (!this.lastPanMidpoint) return;
        const currentMidpoint = this.getMidpoint(e.touches);
        const deltaX = currentMidpoint.x - this.lastPanMidpoint.x;
        const deltaY = currentMidpoint.y - this.lastPanMidpoint.y;

        this.viewTransform.x += deltaX;
        this.viewTransform.y += deltaY;

        this.applyTransform();
        this.lastPanMidpoint = currentMidpoint;
    },

    getMidpoint: function (touches) {
        const t1 = touches[0];
        const t2 = touches[1];
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };
    },

    applyTransform: function () {
        const transform = `translate(${this.viewTransform.x}px, ${this.viewTransform.y}px) scale(${this.viewTransform.scale})`;
        br.outputCanvas.style.transform = transform;
    },

    resetTransform: function () {
        this.viewTransform = { x: 0, y: 0, scale: 1 };
        this.applyTransform();
    }
};