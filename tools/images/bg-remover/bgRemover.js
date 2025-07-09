// tools/images/bg-remover/bgRemover.js

import removeBackground from "https://cdn.jsdelivr.net/npm/@imgly/background-removal/dist/browser.mjs";

const br = {
    // DOM Elements
    imageInput: null,
    workspace: null,
    uploadLabel: null,
    statusOverlay: null,
    previewImg: null,
    outputCanvas: null,
    actionsContainer: null,
    processBtn: null,
    downloadBtn: null,
    qualityFastBtn: null,
    qualityQualityBtn: null,

    // State
    isProcessing: false,
    currentFile: null,
    selectedQuality: 'medium', // Default to 'Quality'

    updateQualitySelection: function (quality) {
        this.selectedQuality = quality;
        // Remove active class from both buttons
        this.qualityFastBtn.classList.remove('active');
        this.qualityQualityBtn.classList.remove('active');

        // Add active class to the selected button
        if (quality === 'small') {
            this.qualityFastBtn.classList.add('active');
        } else if (quality === 'medium') {
            this.qualityQualityBtn.classList.add('active');
        }
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
    },

    setStatus: function (type, message = '') {
        this.statusOverlay.innerHTML = '';
        this.statusOverlay.style.display = 'flex';
        let content = '';

        switch (type) {
            case 'loading':
                content = `<div class="br-loader"></div><span>${message}</span>`;
                break;
            case 'error':
                content = `<span class="br-error-message">${message}</span>`;
                setTimeout(() => this.statusOverlay.style.display = 'none', 3000);
                break;
            case 'clear':
                this.statusOverlay.style.display = 'none';
                break;
        }
        this.statusOverlay.innerHTML = content;
    },

    handleFileSelect: function (event) {
        if (this.isProcessing) return;

        const file = event.target.files[0];
        if (!file) return;

        this.currentFile = file;
        const reader = new FileReader();

        reader.onload = (e) => {
            this.workspace.classList.add('has-image');
            this.previewImg.src = e.target.result;
            this.previewImg.style.display = 'block';
            this.outputCanvas.style.display = 'none';

            this.actionsContainer.style.display = 'flex';
            this.downloadBtn.style.display = 'none';
            this.processBtn.style.display = 'inline-flex';
            // this.qualitySelector.style.display = 'flex'; // No longer needed
            this.qualityFastBtn.style.display = 'inline-flex';
            this.qualityQualityBtn.style.display = 'inline-flex';
            this.processBtn.disabled = false;

            // Set initial quality selection and update UI
            this.updateQualitySelection('medium'); // Default to Quality

            this.setStatus('clear');
        };

        reader.readAsDataURL(file);
    },

    processImage: async function () {
        if (!this.currentFile || this.isProcessing) return;

        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.setStatus('loading', 'Warming up the AI model...');

        try {
            const selectedQuality = this.qualitySelector.querySelector('input[name="quality"]:checked').value || 'medium';

            const config = {
                model: selectedQuality,
                onProgress: (key, current, total) => {
                    const progress = (current / total) * 100;
                    let message = `Processing... ${parseInt(progress, 10)}%`;
                    if (key.startsWith('download')) {
                        const modelName = selectedQuality === 'small' ? 'Fast' : 'Quality';
                        message = `Downloading ${modelName} model... ${parseInt(progress, 10)}%`;
                    }
                    this.setStatus('loading', message);
                },
            };

            const blob = await removeBackground(this.currentFile, config);
            const url = URL.createObjectURL(blob);

            this.displayResult(url);

            this.downloadBtn.href = url;
            this.processBtn.style.display = 'none';
            this.qualityFastBtn.style.display = 'none';
            this.qualityQualityBtn.style.display = 'none';
            this.downloadBtn.style.display = 'inline-flex';
            this.setStatus('clear');

        } catch (error) {
            console.error('Background removal failed:', error);
            this.setStatus('error', `Oof, that didn't work. Try another image?`);
        } finally {
            this.isProcessing = false;
            this.processBtn.disabled = false;
            this.imageInput.value = '';
        }
    },

    displayResult: function (imageUrl) {
        const ctx = this.outputCanvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            this.outputCanvas.width = img.naturalWidth;
            this.outputCanvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            this.previewImg.style.display = 'none';
            this.outputCanvas.style.display = 'block';

            URL.revokeObjectURL(imageUrl);
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

        if (!this.imageInput || !this.processBtn) {
            console.error("BR_INIT: Could not find all required elements. Aborting.");
            return;
        }

        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.processBtn.addEventListener('click', () => this.processImage());
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