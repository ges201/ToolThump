// https://github.com/jerrychan7/U2netInBrowser

const br = {
    // DOM Elements
    elements: ['imageInput', 'workspace', 'uploadLabel', 'statusOverlay', 'previewImg', 'outputCanvas', 'actionsContainer', 'processBtn', 'downloadBtn', 'clearBtn', 'resetBtn', 'imageContainer', 'progressBar', 'progressBarContainer', 'statusText', 'downloadGroup', 'cropCheckbox'],

    // ONNX & Model State
    ortSession: null,
    modelPath: '/tools/images/bg-remover/u2net.quant.onnx',
    modelInputSize: 320,

    // App State
    isProcessing: false,
    currentImageFile: null,
    originalImage: null,
    maskCanvas: null,
    processedImage: null,

    fetchElements: function () {
        this.elements.forEach(el => {
            const id = 'br-' + el.replace(/([A-Z])/g, '-$1').toLowerCase();
            this[el] = document.getElementById(id);
        });
        this.progressBarContainer = this.workspace.querySelector('.br-progress-bar-container');
    },

    updateProgress: function (percentage) {
        if (this.progressBar) this.progressBar.style.width = `${percentage}%`;
    },

    setStatus: function (type, message = '', showProgressBar = false) {
        if (!this.statusOverlay || !this.statusText) return;

        if (type === 'clear') {
            this.statusOverlay.style.display = 'none';
            return;
        }

        this.statusOverlay.style.display = 'flex';
        this.progressBarContainer.style.display = showProgressBar ? 'block' : 'none';

        if (type === 'loading') {
            this.statusText.innerHTML = `<div class="br-loader"></div><span>${message}</span>`;
            if (showProgressBar) this.updateProgress(0);
        } else if (type === 'error') {
            this.statusText.innerHTML = `<span class="br-error-message">${message}</span>`;
            setTimeout(() => this.statusOverlay.style.display = 'none', 4000);
        }
    },

    initOrtSession: async function () {
        this.setStatus('loading', 'Downloading AI model (42 MB)...', true);
        try {
            ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
            const response = await fetch(this.modelPath);
            if (!response.ok) throw new Error(`Failed to fetch model: ${response.statusText}`);

            const reader = response.body.getReader();
            const contentLength = +response.headers.get('content-length');
            const chunks = [];
            let loadedSize = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                loadedSize += value.length;
                if (contentLength) this.updateProgress(Math.round((loadedSize / contentLength) * 100));
            }

            const modelBuffer = new Blob(chunks).arrayBuffer();
            this.setStatus('loading', 'Initializing AI model...');
            this.ortSession = await ort.InferenceSession.create(await modelBuffer);
            this.setStatus('clear');
            document.getElementById('tool-warning')?.remove();
            console.log("ONNX session initialized successfully.");
        } catch (error) {
            console.error("Failed to initialize ONNX session:", error);
            this.setStatus('error', 'Failed to load the AI model. Please refresh and try again.');
        }
    },

    processImage: async function () {
        if (!this.originalImage || this.isProcessing) return;
        if (!this.ortSession) await this.initOrtSession();
        if (!this.ortSession) return this.setStatus('error', 'Model not loaded. Cannot process.');

        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.setStatus('loading', 'Processing image...');

        setTimeout(async () => {
            try {
                const inputTensor = this.preprocess(this.originalImage);
                const results = await this.ortSession.run({ 'input.1': inputTensor });
                const outputTensor = results['1959'];
                this.processedImage = this.postprocess(outputTensor, this.originalImage.naturalWidth, this.originalImage.naturalHeight);

                this.outputCanvas.width = this.originalImage.naturalWidth;
                this.outputCanvas.height = this.originalImage.naturalHeight;
                this.outputCanvas.getContext('2d').drawImage(this.processedImage, 0, 0);

                this.imageContainer.style.display = 'none';
                this.outputCanvas.style.display = 'block';
                this.processBtn.style.display = 'none';
                this.downloadGroup.style.display = 'flex';
                this.setStatus('clear');

                if (typeof brFeatures?.show === 'function') {
                    brFeatures.storeOriginalMask(this.maskCanvas);
                    brFeatures.show();
                    brFeatures.applyBackgroundColor();
                }
            } catch (error) {
                console.error('Background removal failed:', error);
                this.setStatus('error', 'Processing failed. The model may not be suitable for this image.');
            } finally {
                this.isProcessing = false;
                this.processBtn.disabled = false;
            }
        }, 50);
    },

    handleFileSelect: function (event) {
        if (this.isProcessing) return;
        const file = event.target.files[0];
        if (!file?.type.startsWith('image/')) {
            if (file) this.setStatus('error', 'Please select a valid image file.');
            return;
        }

        this.currentImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            Object.assign(this.originalImage, {
                onload: () => {
                    this.previewImg.src = e.target.result;
                    this.workspace.classList.add('has-image');
                    this.imageContainer.style.display = 'block';
                    this.outputCanvas.style.display = 'none';
                    this.actionsContainer.style.display = 'flex';
                    this.downloadGroup.style.display = 'none';
                    this.processBtn.style.display = 'inline-flex';
                    this.clearBtn.style.display = 'inline-flex';
                    this.processBtn.disabled = false;
                    this.setStatus('clear');
                },
                onerror: () => this.setStatus('error', 'Could not load the selected image.'),
                src: e.target.result
            });
        };
        reader.onerror = () => this.setStatus('error', 'Failed to read the selected file.');
        reader.readAsDataURL(file);
    },

    clearImage: function () {
        Object.assign(this, { currentImageFile: null, originalImage: null, maskCanvas: null, processedImage: null });
        this.imageInput.value = '';
        this.workspace.classList.remove('has-image');
        [this.imageContainer, this.outputCanvas, this.actionsContainer, this.clearBtn, this.downloadGroup].forEach(el => {
            if (el) el.style.display = 'none';
        });
        this.setStatus('clear');

        if (typeof brFeatures?.hide === 'function') {
            brFeatures.hide();
            brFeatures.resetTransform();
        }
    },

    preprocess: function (image) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = this.modelInputSize;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(image, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const float32Data = new Float32Array(3 * size * size);
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];

        for (let i = 0; i < size * size; i++) {
            for (let j = 0; j < 3; j++) {
                float32Data[i + j * size * size] = (data[i * 4 + j] / 255 - mean[j]) / std[j];
            }
        }
        return new ort.Tensor('float32', float32Data, [1, 3, size, size]);
    },

    normPRED: function (d) {
        const mi = Math.min(...d);
        const ma = Math.max(...d);
        const range = ma - mi;
        return range === 0 ? d.map(() => 0) : d.map(i => (i - mi) / range);
    },

    postprocess: function (tensor, originalWidth, originalHeight) {
        const pred = this.normPRED(tensor.data);
        const size = this.modelInputSize;

        const tempMaskCanvas = document.createElement('canvas');
        tempMaskCanvas.width = size;
        tempMaskCanvas.height = size;
        const tempMaskCtx = tempMaskCanvas.getContext('2d');
        const maskImageData = tempMaskCtx.createImageData(size, size);

        for (let i = 0; i < size * size; i++) {
            maskImageData.data[i * 4 + 3] = pred[i] * 255;
        }
        tempMaskCtx.putImageData(maskImageData, 0, 0);

        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = originalWidth;
        this.maskCanvas.height = originalHeight;
        const storedMaskCtx = this.maskCanvas.getContext('2d');
        storedMaskCtx.imageSmoothingEnabled = true;
        storedMaskCtx.imageSmoothingQuality = 'high';
        storedMaskCtx.drawImage(tempMaskCanvas, 0, 0, originalWidth, originalHeight);

        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = originalWidth;
        resultCanvas.height = originalHeight;
        const ctx = resultCanvas.getContext('2d');
        ctx.drawImage(this.originalImage, 0, 0, originalWidth, originalHeight);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(this.maskCanvas, 0, 0, originalWidth, originalHeight);

        return resultCanvas;
    },

    initDragAndDrop: function () {
        const preventDefaults = e => { e.preventDefault(); e.stopPropagation(); };
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => this.workspace.addEventListener(name, preventDefaults));
        ['dragenter', 'dragover'].forEach(name => this.workspace.addEventListener(name, () => this.workspace.classList.add('dragover')));
        ['dragleave', 'drop'].forEach(name => this.workspace.addEventListener(name, () => this.workspace.classList.remove('dragover')));

        this.workspace.addEventListener('drop', e => {
            this.imageInput.files = e.dataTransfer.files;
            this.imageInput.dispatchEvent(new Event('change', { bubbles: true }));
        });
    },

    cropCanvas: function (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let minX = width, minY = height, maxX = -1, maxY = -1;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (data[(y * width + x) * 4 + 3] > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX === -1) return null;

        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        const newCanvas = document.createElement('canvas');
        newCanvas.width = cropWidth;
        newCanvas.height = cropHeight;
        newCanvas.getContext('2d').drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        return newCanvas;
    },

    downloadImage: function (e) {
        e.preventDefault();
        if (typeof brFeatures?.updateProcessedImage === 'function') {
            brFeatures.updateProcessedImage();
            brFeatures.applyBackgroundColor();
        }

        let sourceCanvas = this.outputCanvas;
        if (this.cropCheckbox.checked) {
            const cropped = this.cropCanvas(this.outputCanvas);
            if (cropped) sourceCanvas = cropped;
        }

        sourceCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const originalFilename = this.currentImageFile.name.replace(/\.[^/.]+$/, "");
            Object.assign(a, { href: url, download: `${originalFilename}-bg-removed.png` });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png', 1);
    },

    init: function () {
        try {
            this.fetchElements();
            if (!this.imageInput || !this.processBtn) throw new Error('Required DOM elements not found.');

            this.imageInput.addEventListener('change', this.handleFileSelect.bind(this));
            this.processBtn.addEventListener('click', this.processImage.bind(this));
            this.clearBtn.addEventListener('click', this.clearImage.bind(this));
            this.downloadBtn.addEventListener('click', this.downloadImage.bind(this));
            this.initDragAndDrop();

            if (typeof brFeatures?.init === 'function') brFeatures.init();
            console.log("Background Remover Initialized.");
        } catch (error) {
            console.error("Initialization failed:", error);
            const warningDiv = document.getElementById('tool-warning');
            if (warningDiv) warningDiv.innerHTML = 'Error: Tool initialization failed. Check the console for details.';
        }
    }
};

function initializeTool() {
    if (document.getElementById('backgroundRemover')) {
        br.init();
    }
}

window.initializeTool = initializeTool;