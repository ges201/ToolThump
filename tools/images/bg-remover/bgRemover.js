// tools/images/bg-remover/bgRemover.js

import removeBackground from "https://cdn.jsdelivr.net/npm/@imgly/background-removal/dist/browser.mjs";

const br = {
    // DOM Elements
    imageInput: null, workspace: null, uploadLabel: null, statusOverlay: null,
    previewImg: null, outputCanvas: null, actionsContainer: null, processBtn: null,
    downloadBtn: null, qualityFastBtn: null, qualityQualityBtn: null, qualityUltraBtn: null,
    clearBtn: null, qualitySelector: null, imageContainer: null,

    // State
    isProcessing: false, currentFile: null, selectedQuality: 'isnet_fp16', // Default to 'Quality'

    updateQualitySelection: function (quality) {
        this.selectedQuality = quality;
        // Reset all buttons
        this.qualityFastBtn.classList.remove('active');
        this.qualityQualityBtn.classList.remove('active');
        this.qualityUltraBtn.classList.remove('active');
        // Activate the correct one
        if (quality === 'isnet_quint8') this.qualityFastBtn.classList.add('active');
        else if (quality === 'isnet_fp16') this.qualityQualityBtn.classList.add('active');
        else if (quality === 'isnet') this.qualityUltraBtn.classList.add('active');
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
        this.qualityUltraBtn = document.getElementById('br-quality-ultra');
        this.clearBtn = document.getElementById('br-clear-btn');
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
                const initialMessage = message || funnyMessages[messageIndex];
                content = `<div class="br-loader"></div><span id="br-loading-message">${initialMessage}</span>`;
                this.statusOverlay.innerHTML = content;

                if (this.messageInterval) clearInterval(this.messageInterval);
                if (!message) {
                    this.messageInterval = setInterval(() => {
                        messageIndex = (messageIndex + 1) % funnyMessages.length;
                        document.getElementById('br-loading-message').innerText = funnyMessages[messageIndex];
                    }, 4000);
                }
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

    updateProgressMessage: function (message) {
        const messageEl = document.getElementById('br-loading-message');
        if (messageEl) {
            messageEl.innerText = message;
        }
    },

    handleFileSelect: function (event) {
        if (this.isProcessing) return;
        const file = event.target.files[0];
        if (!file) return;

        this.currentFile = file;
        const reader = new FileReader();

        reader.onload = (e) => {
            this.previewImg.src = e.target.result;
            this.previewImg.onload = () => {
                this.workspace.classList.add('has-image');
                this.imageContainer.style.display = 'block';
                this.outputCanvas.style.display = 'none';
                this.actionsContainer.style.display = 'flex';
                this.actionsContainer.style.justifyContent = '';
                this.downloadBtn.style.display = 'none';
                this.processBtn.style.display = 'inline-flex';
                this.clearBtn.style.display = 'inline-flex';
                this.qualitySelector.style.display = 'flex';
                this.processBtn.disabled = false;
                this.updateQualitySelection('isnet_fp16'); // Set default to 'Quality'
                this.setStatus('clear');
            };
        };
        reader.readAsDataURL(file);
    },

    clearImage: function () {
        this.currentFile = null;
        this.imageInput.value = '';
        this.workspace.classList.remove('has-image');
        this.imageContainer.style.display = 'none';
        this.outputCanvas.style.display = 'none';
        this.actionsContainer.style.display = 'none';
        this.clearBtn.style.display = 'none';
        this.setStatus('clear');
    },

    processImage: async function () {
        if (!this.currentFile || this.isProcessing) return;

        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.setStatus('loading', 'Warming up the AI...');

        let computingStarted = false; // Flag to start funny messages only once

        try {
            let modelName;
            switch (this.selectedQuality) {
                case 'isnet_quint8': modelName = 'Fast'; break;
                case 'isnet_fp16': modelName = 'Quality'; break;
                case 'isnet': modelName = 'Ultra'; break;
                default: modelName = 'Model';
            }

            const config = {
                publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal/dist/',
                debug: true,
                model: this.selectedQuality,
                output: {
                    format: 'image/png',
                    quality: 1,
                    type: 'foreground',
                },
                progress: (key, current, total) => {
                    if (key.startsWith('download')) {
                        const percent = Math.round((current / total) * 100);
                        this.updateProgressMessage(`Downloading ${modelName} model... ${percent}%`);
                    } else if (key.startsWith('compute') && !computingStarted) {
                        computingStarted = true;
                        // Now that the model is ready, start the funny messages
                        this.setStatus('loading');
                    }
                }
            };

            const finalBlob = await removeBackground(this.currentFile, config);

            const url = URL.createObjectURL(finalBlob);
            this.displayResult(url);

            this.downloadBtn.href = url;
            // Set a more descriptive download filename
            const originalFilename = this.currentFile.name.replace(/\.[^/.]+$/, "");
            this.downloadBtn.download = `${originalFilename}-bg-removed.png`;

            this.processBtn.style.display = 'none';
            this.qualitySelector.style.display = 'none';
            this.downloadBtn.style.display = 'inline-flex';
            this.actionsContainer.style.justifyContent = 'center';
            this.clearBtn.style.display = 'inline-flex';
            this.setStatus('clear');

        } catch (error) {
            console.error('Background removal failed:', error);
            this.setStatus('error', `Oof, that didn't work. Try another image?`);
        } finally {
            this.isProcessing = false;
            this.processBtn.disabled = false;
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
        this.qualityFastBtn.addEventListener('click', () => this.updateQualitySelection('isnet_quint8'));
        this.qualityQualityBtn.addEventListener('click', () => this.updateQualitySelection('isnet_fp16'));
        this.qualityUltraBtn.addEventListener('click', () => this.updateQualitySelection('isnet'));
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