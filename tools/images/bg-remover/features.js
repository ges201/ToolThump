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
        const maskCtx = br.maskCanvas.getContext('2d');
        this.drawFeatheredCircle(maskCtx, x, y, this.brushSize, this.brushFeather, this.brushMode);
        this.updateProcessedImage();
        this.applyBackgroundColor();
    },

    stopDrawing: function () {
        if (!this.isDrawing) return;
        this.isDrawing = false;
    },

    draw: function (e) {
        if (!this.isDrawing || !this.isBrushActive) return;
        const { x, y } = this.getCanvasCoordinates(e);
        const maskCtx = br.maskCanvas.getContext('2d');
        const dist = Math.hypot(x - this.lastX, y - this.lastY);
        const angle = Math.atan2(y - this.lastY, x - this.lastX);
        if (dist > 0) {
            for (let i = 0; i < dist; i += 1) {
                const currentX = this.lastX + Math.cos(angle) * i;
                const currentY = this.lastY + Math.sin(angle) * i;
                this.drawFeatheredCircle(maskCtx, currentX, currentY, this.brushSize, this.brushFeather, this.brushMode);
            }
        }
        [this.lastX, this.lastY] = [x, y];
        this.updateProcessedImage();
        this.applyBackgroundColor();
    },

    drawFeatheredCircle: function (ctx, x, y, size, feather, mode) {
        const radius = size / 2;
        if (radius <= 0) return;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const innerStop = Math.max(0, 1 - (feather / 100));
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(innerStop, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = (mode === 'delete') ? 'destination-out' : 'source-over';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
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
        }
    },

    hide: function () {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'none';
            if (this.isBrushActive) this.toggleBrushActive();
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
    handleTouchStart: function(e) {
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

    handleTouchMove: function(e) {
        if (!this.isBrushActive) return;
        e.preventDefault();
        if (e.touches.length >= 2 && this.isPanning) {
            this.pan(e);
        } else if (e.touches.length === 1 && this.isDrawing) {
            this.draw(e);
        }
    },

    handleTouchEnd: function(e) {
        if (this.isPanning && e.touches.length < 2) {
            this.isPanning = false;
            this.lastPanMidpoint = null;
        }
        if (this.isDrawing && e.touches.length < 1) {
            this.stopDrawing();
        }
    },

    startPanning: function(e) {
        this.isPanning = true;
        this.lastPanMidpoint = this.getMidpoint(e.touches);
    },

    pan: function(e) {
        if (!this.lastPanMidpoint) return;
        const currentMidpoint = this.getMidpoint(e.touches);
        const deltaX = currentMidpoint.x - this.lastPanMidpoint.x;
        const deltaY = currentMidpoint.y - this.lastPanMidpoint.y;

        this.viewTransform.x += deltaX;
        this.viewTransform.y += deltaY;

        this.applyTransform();
        this.lastPanMidpoint = currentMidpoint;
    },

    getMidpoint: function(touches) {
        const t1 = touches[0];
        const t2 = touches[1];
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };
    },

    applyTransform: function() {
        const transform = `translate(${this.viewTransform.x}px, ${this.viewTransform.y}px) scale(${this.viewTransform.scale})`;
        br.outputCanvas.style.transform = transform;
    },

    resetTransform: function() {
        this.viewTransform = { x: 0, y: 0, scale: 1 };
        this.applyTransform();
    }
};