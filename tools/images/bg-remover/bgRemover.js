//https://github.com/jerrychan7/U2netInBrowser

const br = {
    // DOM Elements
    imageInput: null, workspace: null, uploadLabel: null, statusOverlay: null,
    previewImg: null, outputCanvas: null, actionsContainer: null, processBtn: null,
    downloadBtn: null, clearBtn: null, imageContainer: null, progressBar: null,
    progressBarContainer: null, statusText: null,

    // ONNX & Model State
    ortSession: null,
    modelPath: '/tools/images/bg-remover/u2net.quant.onnx', // Use root-relative path
    modelInputSize: 320,

    // App State
    isProcessing: false,
    currentImageFile: null,
    originalImage: null,
    processedImage: null, // Will hold the image with transparent background
    maskCanvas: null, // Holds the alpha mask for editing
    isDrawing: false, // For brush editing
    lastX: 0,
    lastY: 0,

    fetchElements: function () {
        this.imageInput = document.getElementById('br-image-input');
        this.workspace = document.getElementById('br-workspace');
        this.uploadLabel = document.getElementById('br-upload-label');
        this.statusOverlay = document.getElementById('br-status-overlay');
        this.previewImg = document.getElementById('br-preview-img');
        this.outputCanvas = document.getElementById('br-output-canvas');
        this.actionsContainer = document.getElementById('br-actions-container');
        this.processBtn = document.getElementById('br-process-btn');
        this.downloadBtn = document.getElementById('br-download-btn');
        this.clearBtn = document.getElementById('br-clear-btn');
        this.imageContainer = document.getElementById('br-image-container');
        this.progressBar = document.getElementById('br-progress-bar');
        this.progressBarContainer = document.querySelector('.br-progress-bar-container');
        this.statusText = document.getElementById('br-status-text');
    },

    updateProgress: function (percentage) {
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
        }
    },

    setStatus: function (type, message = '', showProgressBar = false) {
        if (!this.statusOverlay || !this.statusText) return;

        this.statusOverlay.style.display = 'flex';
        this.statusText.innerHTML = '';

        if (this.progressBarContainer) {
            this.progressBarContainer.style.display = 'none';
        }

        switch (type) {
            case 'loading':
                this.statusText.innerHTML = `<div class="br-loader"></div><span>${message}</span>`;
                if (this.progressBarContainer && showProgressBar) {
                    this.progressBarContainer.style.display = 'block';
                    this.updateProgress(0);
                }
                break;
            case 'error':
                this.statusText.innerHTML = `<span class="br-error-message">${message}</span>`;
                setTimeout(() => {
                    this.statusOverlay.style.display = 'none';
                }, 4000);
                break;
            case 'clear':
                this.statusOverlay.style.display = 'none';
                break;
        }
    },

    initOrtSession: async function () {
        this.setStatus('loading', 'Downloading AI model (42 MB)...', true);
        try {
            ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

            const response = await fetch(this.modelPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`);
            }

            const contentLength = response.headers.get('content-length');
            const totalSize = parseInt(contentLength, 10);
            let loadedSize = 0;

            const reader = response.body.getReader();
            const chunks = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                loadedSize += value.length;
                if (totalSize) {
                    const percentage = Math.round((loadedSize / totalSize) * 100);
                    this.updateProgress(percentage);
                }
            }

            const modelBuffer = new Uint8Array(loadedSize);
            let offset = 0;
            for (const chunk of chunks) {
                modelBuffer.set(chunk, offset);
                offset += chunk.length;
            }

            this.setStatus('loading', 'Initializing AI model...');
            this.updateProgress(100);

            this.ortSession = await ort.InferenceSession.create(modelBuffer);
            this.setStatus('clear');
            const warningDiv = document.getElementById('tool-warning');
            if (warningDiv) { warningDiv.style.display = 'none'; }
            console.log("ONNX session initialized successfully.");

        } catch (error) {
            console.error("Failed to initialize ONNX session:", error);
            this.setStatus('error', 'Failed to load the AI model. Please refresh and try again.');
        }
    },

    processImage: async function () {
        if (!this.originalImage || this.isProcessing) {
            return;
        }

        if (!this.ortSession) {
            await this.initOrtSession();
            if (!this.ortSession) {
                this.setStatus('error', 'Model could not be loaded. Please try again.');
                return;
            }
        }

        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.setStatus('loading', 'Processing image...');

        setTimeout(async () => {
            try {
                const inputTensor = this.preprocess(this.originalImage);
                const feeds = { 'input.1': inputTensor };
                const results = await this.ortSession.run(feeds);
                const outputTensor = results['1959'];

                this.processedImage = this.postprocess(outputTensor, this.originalImage.naturalWidth, this.originalImage.naturalHeight);

                // Set the output canvas dimensions to match the original image
                this.outputCanvas.width = this.originalImage.naturalWidth;
                this.outputCanvas.height = this.originalImage.naturalHeight;

                const ctx = this.outputCanvas.getContext('2d');
                ctx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
                ctx.drawImage(this.processedImage, 0, 0);

                this.imageContainer.style.display = 'none';
                this.outputCanvas.style.display = 'block';
                this.processBtn.style.display = 'none';
                this.downloadBtn.style.display = 'inline-flex';
                this.setStatus('clear');

                // Show features and apply default background
                if (typeof brFeatures !== 'undefined' && brFeatures.show) {
                    brFeatures.show();
                    brFeatures.applyBackgroundColor();
                }

            } catch (error) {
                console.error('Background removal failed:', error);
                this.setStatus('error', `Processing failed. The model may not be suitable for this image.`);
            } finally {
                this.isProcessing = false;
                this.processBtn.disabled = false;
            }
        }, 50);
    },

    handleFileSelect: function (event) {
        if (this.isProcessing) return;
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            if (file) this.setStatus('error', 'Please select a valid image file.');
            return;
        }

        this.currentImageFile = file;
        const reader = new FileReader();

        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.previewImg.src = e.target.result;
                this.workspace.classList.add('has-image');
                this.imageContainer.style.display = 'block';
                this.outputCanvas.style.display = 'none';
                this.actionsContainer.style.display = 'flex';
                this.downloadBtn.style.display = 'none';
                this.processBtn.style.display = 'inline-flex';
                this.clearBtn.style.display = 'inline-flex';
                this.processBtn.disabled = false;
                this.setStatus('clear');
            };
            this.originalImage.onerror = () => {
                this.setStatus('error', 'Could not load the selected image.');
            };
            this.originalImage.src = e.target.result;
        };
        reader.onerror = () => {
            this.setStatus('error', 'Failed to read the selected file.');
        };
        reader.readAsDataURL(file);
    },

    clearImage: function () {
        this.currentImageFile = null;
        this.originalImage = null;
        this.processedImage = null;
        this.imageInput.value = '';
        this.workspace.classList.remove('has-image');
        this.imageContainer.style.display = 'none';
        this.outputCanvas.style.display = 'none';
        this.actionsContainer.style.display = 'none';
        this.clearBtn.style.display = 'none';
        this.setStatus('clear');

        if (typeof brFeatures !== 'undefined' && brFeatures.hide) {
            brFeatures.hide();
        }
    },

    preprocess: function (image) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.modelInputSize;
        canvas.height = this.modelInputSize;
        ctx.drawImage(image, 0, 0, this.modelInputSize, this.modelInputSize);
        const imageData = ctx.getImageData(0, 0, this.modelInputSize, this.modelInputSize);
        const { data } = imageData;

        const float32Data = new Float32Array(3 * this.modelInputSize * this.modelInputSize);
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];

        for (let i = 0; i < this.modelInputSize * this.modelInputSize; i++) {
            float32Data[i] = (data[i * 4] / 255 - mean[0]) / std[0];
            float32Data[i + this.modelInputSize * this.modelInputSize] = (data[i * 4 + 1] / 255 - mean[1]) / std[1];
            float32Data[i + 2 * this.modelInputSize * this.modelInputSize] = (data[i * 4 + 2] / 255 - mean[2]) / std[2];
        }

        return new ort.Tensor('float32', float32Data, [1, 3, this.modelInputSize, this.modelInputSize]);
    },

    normPRED: function (d) {
        let ma = -Infinity, mi = Infinity;
        for (let i = 0; i < d.length; i++) {
            if (ma < d[i]) ma = d[i];
            if (mi > d[i]) mi = d[i];
        }
        const range = ma - mi;
        if (range === 0) return d.map(() => 0);
        return d.map(i => (i - mi) / range);
    },

    postprocess: function (tensor, originalWidth, originalHeight) {
        const pred = this.normPRED(tensor.data);
        const size = this.modelInputSize * this.modelInputSize;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = this.modelInputSize;
        maskCanvas.height = this.modelInputSize;
        const maskCtx = maskCanvas.getContext('2d');
        const maskImageData = maskCtx.createImageData(this.modelInputSize, this.modelInputSize);

        for (let i = 0; i < size; i++) {
            maskImageData.data[i * 4 + 3] = pred[i] * 255;
        }
        maskCtx.putImageData(maskImageData, 0, 0);

        // Create a full-resolution canvas for the mask to allow editing
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = originalWidth;
        this.maskCanvas.height = originalHeight;
        const storedMaskCtx = this.maskCanvas.getContext('2d');
        storedMaskCtx.imageSmoothingEnabled = true;
        storedMaskCtx.imageSmoothingQuality = 'high';
        storedMaskCtx.drawImage(maskCanvas, 0, 0, originalWidth, originalHeight);

        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = originalWidth;
        resultCanvas.height = originalHeight;
        const ctx = resultCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(this.originalImage, 0, 0, originalWidth, originalHeight);

        ctx.globalCompositeOperation = 'destination-in';
        // Use the full-resolution mask for the initial composition
        ctx.drawImage(this.maskCanvas, 0, 0, originalWidth, originalHeight);

        ctx.globalCompositeOperation = 'source-over';
        return resultCanvas;
    },

    getCanvasCoordinates: function (e) {
        const canvas = this.outputCanvas;
        const rect = canvas.getBoundingClientRect();

        const canvasRatio = canvas.width / canvas.height;
        const containerRatio = rect.width / rect.height;

        let scale, offsetX, offsetY;

        if (canvasRatio > containerRatio) {
            // Image is wider than the container, letterboxed top/bottom
            scale = rect.width / canvas.width;
            offsetX = 0;
            offsetY = (rect.height - (canvas.height * scale)) / 2;
        } else {
            // Image is taller than the container, letterboxed left/right
            scale = rect.height / canvas.height;
            offsetX = (rect.width - (canvas.width * scale)) / 2;
            offsetY = 0;
        }

        // Calculate coordinates relative to the scaled image, then scale up to canvas resolution
        const x = (e.offsetX - offsetX) / scale;
        const y = (e.offsetY - offsetY) / scale;

        return { x, y };
    },

    startDrawing: function (e) {
        if (!brFeatures.isBrushActive) return;
        this.isDrawing = true;
        const { x, y } = this.getCanvasCoordinates(e);
        this.lastX = x;
        this.lastY = y;

        // Draw a single point on mousedown for click actions
        const maskCtx = this.maskCanvas.getContext('2d');
        this.drawFeatheredCircle(
            maskCtx, x, y,
            brFeatures.brushSize,
            brFeatures.brushFeather,
            brFeatures.brushMode
        );

        this.updateProcessedImage();
        brFeatures.applyBackgroundColor();
    },

    stopDrawing: function () {
        if (!this.isDrawing) return;
        this.isDrawing = false;
    },

    draw: function (e) {
        if (!this.isDrawing || !brFeatures.isBrushActive) return;

        const { x, y } = this.getCanvasCoordinates(e);
        const maskCtx = this.maskCanvas.getContext('2d');

        const brushSize = brFeatures.brushSize;
        const feather = brFeatures.brushFeather;
        const mode = brFeatures.brushMode;

        const dist = Math.hypot(x - this.lastX, y - this.lastY);
        const angle = Math.atan2(y - this.lastY, x - this.lastX);

        if (dist > 0) {
            // Step by 1 pixel for a smooth line
            for (let i = 0; i < dist; i += 1) {
                const currentX = this.lastX + Math.cos(angle) * i;
                const currentY = this.lastY + Math.sin(angle) * i;
                this.drawFeatheredCircle(maskCtx, currentX, currentY, brushSize, feather, mode);
            }
        }

        [this.lastX, this.lastY] = [x, y];

        this.updateProcessedImage();
        brFeatures.applyBackgroundColor();
    },

    drawFeatheredCircle: function(ctx, x, y, size, feather, mode) {
        const radius = size / 2;
        if (radius <= 0) return;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        
        const innerStop = Math.max(0, 1 - (feather / 100));

        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(innerStop, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        if (mode === 'delete') {
            ctx.globalCompositeOperation = 'destination-out';
        } else { // restore
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    },

    updateProcessedImage: function () {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.originalImage.naturalWidth;
        tempCanvas.height = this.originalImage.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(this.originalImage, 0, 0);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(this.maskCanvas, 0, 0);
        tempCtx.globalCompositeOperation = 'source-over';

        this.processedImage = tempCanvas;
    },

    initDragAndDrop: function () {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.workspace.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            this.workspace.addEventListener(eventName, () => this.workspace.classList.add('dragover'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            this.workspace.addEventListener(eventName, () => this.workspace.classList.remove('dragover'), false);
        });
        this.workspace.addEventListener('drop', (e) => {
            this.imageInput.files = e.dataTransfer.files;
            const changeEvent = new Event('change', { bubbles: true });
            this.imageInput.dispatchEvent(changeEvent);
        }, false);
    },

    init: function () {
        try {
            this.fetchElements();
            if (!this.imageInput || !this.processBtn) {
                console.error('Required DOM elements not found.');
                return;
            }
            this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e));
            this.processBtn.addEventListener('click', () => this.processImage());
            this.clearBtn.addEventListener('click', () => this.clearImage());
            this.downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.updateProcessedImage();
                brFeatures.applyBackgroundColor();
                this.outputCanvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const originalFilename = this.currentImageFile.name.replace(/\.[^/.]+$/, "");
                    a.download = `${originalFilename}-bg-removed.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 'image/png', 1);
            });
            this.initDragAndDrop();

            // Brush event listeners
            this.outputCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
            this.outputCanvas.addEventListener('mouseup', () => this.stopDrawing());
            this.outputCanvas.addEventListener('mousemove', (e) => this.draw(e));
            this.outputCanvas.addEventListener('mouseleave', () => this.stopDrawing());

            if (typeof brFeatures !== 'undefined' && brFeatures.init) {
                brFeatures.init();
            }
            console.log("Background Remover Initialized.");
        } catch (error) {
            console.error("Initialization failed:", error);
            const warningDiv = document.getElementById('tool-warning');
            if (warningDiv) {
                warningDiv.innerHTML = 'Error: Tool initialization failed. Check the console for details.';
            }
        }
    }
};

function initializeTool() {
    if (document.getElementById('backgroundRemover')) {
        br.init();
    }
}

// Expose the initialization function to the global scope
// so it can be called by other scripts like main.js
window.initializeTool = initializeTool;