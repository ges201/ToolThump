// tools/images/bg-remover/bgRemover.js

import removeBackground from "https://cdn.jsdelivr.net/npm/@imgly/background-removal/dist/browser.mjs";

const br = {
    // DOM Elements
    imageInput: null, workspace: null, uploadLabel: null, statusOverlay: null,
    previewImg: null, outputCanvas: null, actionsContainer: null, processBtn: null,
    downloadBtn: null, qualityFastBtn: null, qualityQualityBtn: null, clearBtn: null,
    qualitySelector: null, imageContainer: null, cropBox: null, resetCropBtn: null,

    // State
    isProcessing: false, currentFile: null, selectedQuality: 'medium',
    originalImage: null, originalImageSize: { w: 0, h: 0 },
    cropState: {
        x: 0, y: 0, w: 0, h: 0,
        isResizing: false, isDragging: false, handle: null,
        startX: 0, startY: 0, startBoxX: 0, startBoxY: 0
    },
    // Bound event handlers for proper removal
    boundDoResize: null, boundStopResize: null,
    boundDoDrag: null, boundStopDrag: null,

    updateQualitySelection: function (quality) {
        this.selectedQuality = quality;
        this.qualityFastBtn.classList.remove('active');
        this.qualityQualityBtn.classList.remove('active');
        if (quality === 'small') this.qualityFastBtn.classList.add('active');
        else if (quality === 'medium') this.qualityQualityBtn.classList.add('active');
    },

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
        this.qualityFastBtn = document.getElementById('br-quality-fast');
        this.qualityQualityBtn = document.getElementById('br-quality-quality');
        this.clearBtn = document.getElementById('br-clear-btn');
        this.resetCropBtn = document.getElementById('br-reset-crop-btn');
        this.qualitySelector = document.getElementById('br-quality-selector');
        this.imageContainer = document.getElementById('br-image-container');
    },

    setStatus: function (type, message = '') {
        this.statusOverlay.innerHTML = '';
        this.statusOverlay.style.display = 'flex';
        let content = '';

        switch (type) {
            case 'loading':
                const funnyMessages = [
                    "Carefully extracting your subject from its humble surroundings...",
                    "Persuading each pixel to reveal its true allegiance...",
                    "Applying advanced digital sorcery to make your background... disappear.",
                    "Our highly trained algorithms are meticulously deciding what stays and what goes.",
                    "Just a moment while we convince your image that it never really needed that background anyway.",
                    "The AI is currently in a deep philosophical discussion about the nature of 'belonging' in an image.",
                    "We're not saying it's magic, but we're not *not* saying it's magic.",
                    "The pixels are being rearranged for optimal aesthetic pleasure. Please stand by.",
                    "Almost there! The digital scissors are getting a workout.",
                    "Your image is undergoing a dramatic transformation. Soon, it will be free of its past."
                ];
                let messageIndex = 0;
                content = `<div class="br-loader"></div><span id="br-loading-message">${funnyMessages[messageIndex]}</span>`;
                this.statusOverlay.innerHTML = content;

                if (this.messageInterval) clearInterval(this.messageInterval);
                this.messageInterval = setInterval(() => {
                    messageIndex = (messageIndex + 1) % funnyMessages.length;
                    document.getElementById('br-loading-message').innerText = funnyMessages[messageIndex];
                }, 4000);
                break;
            case 'error':
                content = `<span class="br-error-message">${message}</span>`;
                setTimeout(() => this.statusOverlay.style.display = 'none', 3000);
                if (this.messageInterval) clearInterval(this.messageInterval);
                break;
            case 'clear':
                this.statusOverlay.style.display = 'none';
                if (this.messageInterval) clearInterval(this.messageInterval);
                break;
        }
        if (type !== 'loading') this.statusOverlay.innerHTML = content;
    },

    handleFileSelect: function (event) {
        if (this.isProcessing) return;
        const file = event.target.files[0];
        if (!file) return;

        this.currentFile = file;
        const reader = new FileReader();

        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.originalImageSize = { w: this.originalImage.naturalWidth, h: this.originalImage.naturalHeight };
                this.previewImg.src = e.target.result;

                this.previewImg.onload = () => {
                    this.workspace.classList.add('has-image');
                    this.imageContainer.style.display = 'inline-block';
                    this.outputCanvas.style.display = 'none';
                    this.initCropBox();
                    this.actionsContainer.style.display = 'flex';
                    this.actionsContainer.style.justifyContent = '';
                    this.downloadBtn.style.display = 'none';
                    this.processBtn.style.display = 'inline-flex';
                    this.clearBtn.style.display = 'inline-flex';
                    this.resetCropBtn.style.display = 'inline-flex';
                    this.qualitySelector.style.display = 'flex';
                    this.processBtn.disabled = false;
                    this.updateQualitySelection('medium');
                    this.setStatus('clear');
                };
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    clearImage: function () {
        if (this.cropBox) this.cropBox.remove();
        this.currentFile = null;
        this.originalImage = null;
        this.imageInput.value = '';
        this.workspace.classList.remove('has-image');
        this.imageContainer.style.display = 'none';
        this.outputCanvas.style.display = 'none';
        this.actionsContainer.style.display = 'none';
        this.clearBtn.style.display = 'none';
        this.resetCropBtn.style.display = 'none';
        this.setStatus('clear');
    },

    initCropBox: function () {
        if (this.cropBox) this.cropBox.remove();

        const box = document.createElement('div');
        box.id = 'br-crop-box';
        this.imageContainer.appendChild(box);
        this.cropBox = box;

        ['tl', 'tr', 'bl', 'br'].forEach(handleClass => {
            const handle = document.createElement('div');
            handle.className = `br-resize-handle ${handleClass}`;
            box.appendChild(handle);
            handle.addEventListener('mousedown', this.startResize.bind(this));
        });

        box.addEventListener('mousedown', this.startDrag.bind(this));

        this.resetCropBox(); // Set initial size
    },

    resetCropBox: function () {
        if (!this.previewImg || !this.cropBox) return;
        this.cropState.x = 0;
        this.cropState.y = 0;
        this.cropState.w = this.previewImg.offsetWidth;
        this.cropState.h = this.previewImg.offsetHeight;
        this.updateCropBoxStyle();
    },

    updateCropBoxStyle: function () {
        this.cropBox.style.left = `${this.cropState.x}px`;
        this.cropBox.style.top = `${this.cropState.y}px`;
        this.cropBox.style.width = `${this.cropState.w}px`;
        this.cropBox.style.height = `${this.cropState.h}px`;
    },

    startResize: function (e) {
        e.stopPropagation();
        this.cropState.isResizing = true;
        this.cropState.handle = e.target.className.split(' ')[1];
        this.cropState.startX = e.clientX;
        this.cropState.startY = e.clientY;

        this.boundDoResize = this.doResize.bind(this);
        this.boundStopResize = this.stopResize.bind(this);
        document.addEventListener('mousemove', this.boundDoResize);
        document.addEventListener('mouseup', this.boundStopResize);
    },

    doResize: function (e) {
        if (!this.cropState.isResizing) return;

        const dx = e.clientX - this.cropState.startX;
        const dy = e.clientY - this.cropState.startY;
        let { x, y, w, h } = this.cropState;

        if (this.cropState.handle.includes('l')) { x += dx; w -= dx; }
        if (this.cropState.handle.includes('r')) { w += dx; }
        if (this.cropState.handle.includes('t')) { y += dy; h -= dy; }
        if (this.cropState.handle.includes('b')) { h += dy; }

        const maxW = this.previewImg.offsetWidth;
        const maxH = this.previewImg.offsetHeight;
        if (x < 0) { w += x; x = 0; }
        if (y < 0) { h += y; y = 0; }
        if (x + w > maxW) { w = maxW - x; }
        if (y + h > maxH) { h = maxH - y; }

        this.cropState.x = x; this.cropState.y = y;
        this.cropState.w = w; this.cropState.h = h;
        this.updateCropBoxStyle();
        this.cropState.startX = e.clientX;
        this.cropState.startY = e.clientY;
    },

    stopResize: function () {
        this.cropState.isResizing = false;
        document.removeEventListener('mousemove', this.boundDoResize);
        document.removeEventListener('mouseup', this.boundStopResize);
    },

    startDrag: function (e) {
        if (e.target.classList.contains('br-resize-handle')) return;
        e.preventDefault();
        this.cropState.isDragging = true;
        this.cropState.startX = e.clientX;
        this.cropState.startY = e.clientY;
        this.cropState.startBoxX = this.cropState.x;
        this.cropState.startBoxY = this.cropState.y;

        this.boundDoDrag = this.doDrag.bind(this);
        this.boundStopDrag = this.stopDrag.bind(this);
        document.addEventListener('mousemove', this.boundDoDrag);
        document.addEventListener('mouseup', this.boundStopDrag);
    },

    doDrag: function (e) {
        if (!this.cropState.isDragging) return;
        e.preventDefault();
        const dx = e.clientX - this.cropState.startX;
        const dy = e.clientY - this.cropState.startY;
        let newX = this.cropState.startBoxX + dx;
        let newY = this.cropState.startBoxY + dy;

        const maxW = this.previewImg.offsetWidth;
        const maxH = this.previewImg.offsetHeight;
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + this.cropState.w > maxW) newX = maxW - this.cropState.w;
        if (newY + this.cropState.h > maxH) newY = maxH - this.cropState.h;

        this.cropState.x = newX;
        this.cropState.y = newY;
        this.updateCropBoxStyle();
    },

    stopDrag: function () {
        this.cropState.isDragging = false;
        document.removeEventListener('mousemove', this.boundDoDrag);
        document.removeEventListener('mouseup', this.boundStopDrag);
    },

    getCroppedBlob: async function () {
        const scaleX = this.originalImageSize.w / this.previewImg.offsetWidth;
        const scaleY = this.originalImageSize.h / this.previewImg.offsetHeight;
        const crop = {
            x: this.cropState.x * scaleX, y: this.cropState.y * scaleY,
            width: this.cropState.w * scaleX, height: this.cropState.h * scaleY
        };
        const canvas = document.createElement('canvas');
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.originalImage, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    },

    processImage: async function () {
        if (!this.currentFile || this.isProcessing) return;

        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.setStatus('loading', 'Preparing image...');
        if (this.cropBox) this.cropBox.style.display = 'none';
        this.resetCropBtn.style.display = 'none';

        try {
            const imageBlob = await this.getCroppedBlob();
            const config = {
                model: this.selectedQuality,
                onProgress: (key, current, total) => {
                    const progress = (current / total) * 100;
                    let message = `Processing... ${parseInt(progress, 10)}%`;
                    if (key.startsWith('download')) {
                        const modelName = this.selectedQuality === 'small' ? 'Fast' : 'Quality';
                        message = `Downloading ${modelName} model... ${parseInt(progress, 10)}%`;
                    }
                    this.setStatus('loading', message);
                },
            };

            const resultBlob = await removeBackground(imageBlob, config);
            const url = URL.createObjectURL(resultBlob);

            this.displayResult(url);

            this.downloadBtn.href = url;
            this.processBtn.style.display = 'none';
            this.qualitySelector.style.display = 'none';
            this.downloadBtn.style.display = 'inline-flex';
            this.actionsContainer.style.justifyContent = 'center';
            this.clearBtn.style.display = 'inline-flex';
            this.setStatus('clear');

        } catch (error) {
            console.error('Background removal failed:', error);
            this.setStatus('error', `Oof, that didn't work. Try another image?`);
            if (this.cropBox) this.cropBox.style.display = 'block';
            this.resetCropBtn.style.display = 'inline-flex';
        } finally {
            this.isProcessing = false;
            this.processBtn.disabled = false;
            this.imageInput.value = '';
        }
    },

    displayResult: function (imageUrl) {
        const img = new Image();
        img.onload = () => {
            this.outputCanvas.width = img.naturalWidth;
            this.outputCanvas.height = img.naturalHeight;
            const ctx = this.outputCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            this.imageContainer.style.display = 'none';
            this.outputCanvas.style.display = 'block';
        };
        img.src = imageUrl;
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
        this.fetchElements();
        if (!this.imageInput || !this.processBtn) return;

        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.processBtn.addEventListener('click', () => this.processImage());
        this.clearBtn.addEventListener('click', () => this.clearImage());
        this.resetCropBtn.addEventListener('click', () => this.resetCropBox());
        this.qualityFastBtn.addEventListener('click', () => this.updateQualitySelection('small'));
        this.qualityQualityBtn.addEventListener('click', () => this.updateQualitySelection('medium'));
        this.initDragAndDrop();
        console.log("Background Remover Initialized.");
    }
};

function initializeTool() {
    if (document.getElementById('backgroundRemover')) {
        br.init();
    }
}

window.initializeTool = initializeTool;