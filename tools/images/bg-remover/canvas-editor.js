const canvasEditor = {
    // State
    isBrushActive: false,
    brushMode: 'delete',
    brushSize: 30,
    brushFeather: 0,
    isDrawing: false,
    lastX: 0,
    lastY: 0,

    // Panning and zooming state
    isPanning: false,
    viewTransform: { x: 0, y: 0, scale: 1 },
    lastPanMidpoint: null,
    brushCursor: null,

    init: function() {
        this.createBrushCursor();
        this.addCanvasListeners();
    },

    createBrushCursor: function () {
        if (!br.workspace) return;
        this.brushCursor = document.createElement('div');
        this.brushCursor.className = 'br-brush-cursor';
        br.workspace.appendChild(this.brushCursor);
        this.setBrushCursorSize();
    },

    addCanvasListeners: function () {
        const canvas = br.outputCanvas;
        if (!canvas || !this.brushCursor) return;

        const updateCursorPosition = (e) => {
            if (!this.isBrushActive || !br.workspace) return;
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
            if (this.isBrushActive && this.brushCursor) this.brushCursor.style.display = 'block';
        });
        canvas.addEventListener('mouseleave', () => {
            if (this.brushCursor) this.brushCursor.style.display = 'none';
        });

        canvas.addEventListener('touchstart', () => {
            if (this.isBrushActive && this.brushCursor) this.brushCursor.style.display = 'block';
        });
        canvas.addEventListener('touchend', () => {
            if (this.brushCursor) this.brushCursor.style.display = 'none';
        });
        canvas.addEventListener('touchcancel', () => {
            if (this.brushCursor) this.brushCursor.style.display = 'none';
        });

        // Mouse events for drawing
        canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        canvas.addEventListener('mouseup', () => this.stopDrawing());
        canvas.addEventListener('mousemove', (e) => this.draw(e));
        canvas.addEventListener('mouseleave', () => this.stopDrawing());

        // Touch events for drawing and panning
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
    },

    toggleBrushActive: function (isActive) {
        this.isBrushActive = isActive;
        if (this.isBrushActive) {
            br.outputCanvas.style.cursor = 'none';
            br.outputCanvas.classList.add('brush-active');
        } else {
            br.outputCanvas.style.cursor = 'default';
            if (this.brushCursor) this.brushCursor.style.display = 'none';
            br.outputCanvas.classList.remove('brush-active');
            this.resetTransform();
        }
    },

    setBrushMode: function (mode) {
        this.brushMode = mode;
    },

    setBrushSize: function (size) {
        this.brushSize = parseInt(size, 10);
        this.setBrushCursorSize();
    },

    setBrushFeather: function (value) {
        this.brushFeather = parseInt(value, 10);
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
        this.applyBrushStroke(this.lastX, this.lastY, x, y);
        brFeatures.updateProcessedImage();
        brFeatures.applyBackgroundColor();
        brFeatures.setDirty();
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
        brFeatures.updateProcessedImage();
        brFeatures.applyBackgroundColor();
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

            const offset = br.maskCanvas.width * 2;
            ctx.shadowOffsetX = offset;

            ctx.beginPath();
            ctx.moveTo(x1 - offset, y1);
            ctx.lineTo(x2 - offset, y2);
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
        } else {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.stroke();
        }
    },

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