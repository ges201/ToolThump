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
    lastPinchDistance: null,
    brushCursor: null,
    zoomLabel: null,
    minZoom: 1,
    maxZoom: 8,

    init: function() {
        this.zoomLabel = document.getElementById('br-zoom-level');
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

        // Mouse events for drawing, panning and zooming
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mouseup', () => this.stopMouseAction());
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseleave', () => this.stopMouseAction());
        canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

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
            br.outputCanvas.style.cursor = 'grab';
            if (this.brushCursor) this.brushCursor.style.display = 'none';
            br.outputCanvas.classList.remove('brush-active');
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

    // Untransformed element box in screen coordinates; getBoundingClientRect()
    // returns the zoomed box, so undo the translate/scale (origin is the center).
    getBaseRect: function () {
        const canvas = br.outputCanvas;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const scale = this.viewTransform.scale;
        const width = rect.width / scale;
        const height = rect.height / scale;
        return {
            left: rect.left + rect.width / 2 - this.viewTransform.x - width / 2,
            top: rect.top + rect.height / 2 - this.viewTransform.y - height / 2,
            width: width,
            height: height
        };
    },

    getCanvasCoordinates: function (e) {
        const canvas = br.outputCanvas;
        const base = this.getBaseRect();
        if (!base || base.width === 0 || base.height === 0) return { x: 0, y: 0 };
        const point = e.touches ? e.touches[0] : e;

        const originX = base.left + base.width / 2;
        const originY = base.top + base.height / 2;
        const localX = originX + (point.clientX - originX - this.viewTransform.x) / this.viewTransform.scale;
        const localY = originY + (point.clientY - originY - this.viewTransform.y) / this.viewTransform.scale;

        const viewX = localX - base.left;
        const viewY = localY - base.top;

        const scale = (canvas.width / canvas.height > base.width / base.height)
            ? base.width / canvas.width
            : base.height / canvas.height;
        const offsetX = (base.width - canvas.width * scale) / 2;
        const offsetY = (base.height - canvas.height * scale) / 2;

        const x = (viewX - offsetX) / scale;
        const y = (viewY - offsetY) / scale;
        return { x, y };
    },

    zoomAt: function (clientX, clientY, factor) {
        const base = this.getBaseRect();
        if (!base || base.width === 0) return;
        const originX = base.left + base.width / 2;
        const originY = base.top + base.height / 2;
        const oldScale = this.viewTransform.scale;
        const newScale = Math.min(this.maxZoom, Math.max(this.minZoom, oldScale * factor));
        if (newScale === oldScale) return;

        // Keep the point under the cursor/pinch midpoint fixed
        const localX = originX + (clientX - originX - this.viewTransform.x) / oldScale;
        const localY = originY + (clientY - originY - this.viewTransform.y) / oldScale;

        this.viewTransform.scale = newScale;
        this.viewTransform.x = clientX - originX - newScale * (localX - originX);
        this.viewTransform.y = clientY - originY - newScale * (localY - originY);

        this.applyTransform();
        this.setBrushCursorSize();
    },

    zoomBy: function (factor) {
        const base = this.getBaseRect();
        if (!base) return;
        this.zoomAt(base.left + base.width / 2, base.top + base.height / 2, factor);
    },

    handleWheel: function (e) {
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 100 : 1;
        this.zoomAt(e.clientX, e.clientY, Math.pow(1.0015, -e.deltaY * unit));
    },

    handleMouseDown: function (e) {
        if (e.button !== 0 && e.button !== 1) return;
        if (e.button === 1 || !this.isBrushActive) {
            e.preventDefault();
            this.startPanning(e);
        } else {
            this.startDrawing(e);
        }
    },

    handleMouseMove: function (e) {
        if (this.isPanning) {
            this.pan(e);
        } else {
            this.draw(e);
        }
    },

    stopMouseAction: function () {
        this.stopDrawing();
        this.isPanning = false;
        this.lastPanMidpoint = null;
        this.lastPinchDistance = null;
    },

    startDrawing: function (e) {
        if (!this.isBrushActive) return;
        this.isDrawing = true;
        const { x, y } = this.getCanvasCoordinates(e);
        this.lastX = x;
        this.lastY = y;
        this.applyBrushStroke(this.lastX, this.lastY, x, y);
        brFeatures.scheduleRedraw();
        brFeatures.setDirty();
    },

    stopDrawing: function () {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        brFeatures.scheduleUpdate();
    },

    draw: function (e) {
        if (!this.isDrawing || !this.isBrushActive) return;
        const { x, y } = this.getCanvasCoordinates(e);
        this.applyBrushStroke(this.lastX, this.lastY, x, y);
        [this.lastX, this.lastY] = [x, y];
        brFeatures.scheduleRedraw();
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
            this.lastPinchDistance = null;
        }
        if (this.isDrawing && e.touches.length < 1) {
            this.stopDrawing();
        }
    },

    startPanning: function (e) {
        this.isPanning = true;
        this.lastPanMidpoint = this.getGesturePoint(e);
        this.lastPinchDistance = e.touches && e.touches.length >= 2 ? this.getDistance(e.touches) : null;
    },

    pan: function (e) {
        if (!this.lastPanMidpoint) return;
        const point = this.getGesturePoint(e);

        if (e.touches && e.touches.length >= 2 && this.lastPinchDistance) {
            const distance = this.getDistance(e.touches);
            if (distance > 0) this.zoomAt(point.x, point.y, distance / this.lastPinchDistance);
            this.lastPinchDistance = distance;
        }

        this.viewTransform.x += point.x - this.lastPanMidpoint.x;
        this.viewTransform.y += point.y - this.lastPanMidpoint.y;

        this.applyTransform();
        this.lastPanMidpoint = point;
    },

    getGesturePoint: function (e) {
        return e.touches ? this.getMidpoint(e.touches) : { x: e.clientX, y: e.clientY };
    },

    getMidpoint: function (touches) {
        const t1 = touches[0];
        const t2 = touches[1];
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };
    },

    getDistance: function (touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    },

    applyTransform: function () {
        const transform = `translate(${this.viewTransform.x}px, ${this.viewTransform.y}px) scale(${this.viewTransform.scale})`;
        br.outputCanvas.style.transform = transform;
        if (this.zoomLabel) {
            this.zoomLabel.textContent = `${Math.round(this.viewTransform.scale * 100)}%`;
        }
    },

    resetTransform: function () {
        this.viewTransform = { x: 0, y: 0, scale: 1 };
        this.applyTransform();
        this.setBrushCursorSize();
    }
};