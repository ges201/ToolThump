export class UIManager {
    constructor() {
        this.elements = {
            dropZone: document.getElementById('video-drop-zone'),
            fileInput: document.getElementById('video-input'),
            fileInfo: document.getElementById('video-info'),
            videoPreview: document.getElementById('video-preview'),
            uploadedVideoNameContainer: document.getElementById('uploaded-video-name-container'),
            uploadedVideoName: document.getElementById('uploaded-video-name'),
            processingOptions: document.getElementById('processing-options'),
            generateBtn: document.getElementById('vsg-generate-btn'),
            languageSelect: document.getElementById('language-select'),
            modelSelect: document.getElementById('model-select'),
            progressArea: document.getElementById('progress-area'),
            progressTitle: document.getElementById('progress-title'),
            progressMessage: document.getElementById('progress-message'),
            progressBar: document.getElementById('progress-bar'),
            progressStatus: document.getElementById('progress-status'),
            resultsArea: document.getElementById('results-area'),
            subtitlePreview: document.getElementById('subtitle-preview'),
            downloadBtn: document.getElementById('vsg-download-btn'),
            mkvExportBtn: document.getElementById('vsg-mkv-export-btn'),
            renderBtn: document.getElementById('vsg-render-btn'),
            resetBtn: document.getElementById('vsg-reset-btn')
        };
    }

    addEventListeners(handlers) {
        const { dropZone, fileInput, generateBtn, downloadBtn, mkvExportBtn, renderBtn, resetBtn } = this.elements;

        dropZone.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target === fileInput) return;
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handlers.onFileSelect(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handlers.onFileSelect(e.target.files[0]);
            }
        });

        generateBtn.addEventListener('click', () => handlers.onGenerate());
        downloadBtn.addEventListener('click', () => handlers.onDownload());
        mkvExportBtn.addEventListener('click', () => handlers.onMkvExport());
        renderBtn.addEventListener('click', () => handlers.onRender());
        resetBtn.addEventListener('click', () => handlers.onReset());
    }

    handleFileSelect(file) {
        if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
            alert('Please upload a video file.');
            return false;
        }
        return true;
    }

    updateFileInfo(file) {
        const { dropZone, uploadedVideoNameContainer, uploadedVideoName } = this.elements;
        if (file) {
            uploadedVideoName.textContent = file.name;
            uploadedVideoNameContainer.style.display = 'block';
            dropZone.classList.add('file-loaded');
        } else {
            uploadedVideoNameContainer.style.display = 'none';
            dropZone.classList.remove('file-loaded');
        }
    }

    updateVideoPreview(file) {
        const { videoPreview } = this.elements;
        if (file && file.type.startsWith('video/')) {
            videoPreview.src = URL.createObjectURL(file);
            videoPreview.style.display = 'block';
        } else {
            videoPreview.style.display = 'none';
        }
    }

    showProcessingOptions(show = true) {
        this.elements.processingOptions.style.display = show ? 'block' : 'none';
    }

    setGenerateButtonDisabled(disabled) {
        this.elements.generateBtn.disabled = disabled;
    }

    showProgressArea() {
        this.elements.progressArea.style.display = 'block';
        this.elements.resultsArea.style.display = 'none';
        this.elements.generateBtn.disabled = true;
    }

    showResults(srtContent) {
        this.elements.subtitlePreview.textContent = srtContent;
        this.elements.progressArea.style.display = 'none';
        this.elements.resultsArea.style.display = 'block';
        this.elements.generateBtn.disabled = false;
    }

    showError(message) {
        this.elements.progressTitle.textContent = 'Error';
        this.elements.progressMessage.textContent = message;
        this.elements.progressBar.style.width = '0%';
        this.elements.progressBar.classList.remove('indeterminate');
        this.elements.generateBtn.disabled = false;
    }

    setProgressTitle(text) {
        this.elements.progressTitle.textContent = text;
    }

    setProgressMessage(text) {
        this.elements.progressMessage.textContent = text;
    }

    setProgressBarWidth(width) {
        this.elements.progressBar.style.width = width;
    }

    setProgressBarIndeterminate(indeterminate) {
        if (indeterminate) {
            this.elements.progressBar.classList.add('indeterminate');
        } else {
            this.elements.progressBar.classList.remove('indeterminate');
        }
    }

    updateProgressStatus(text) {
        this.elements.progressStatus.textContent = text;
    }

    downloadSubtitles(srtContent, videoFile) {
        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const baseName = videoFile?.name.split('.').slice(0, -1).join('.') || 'subtitles';
        a.download = `${baseName}.srt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    reset() {
        this.elements.fileInput.value = '';
        this.updateFileInfo(null);
        this.updateVideoPreview(null);
        this.showProcessingOptions(false);
        this.setGenerateButtonDisabled(true);
        this.elements.progressArea.style.display = 'none';
        this.elements.resultsArea.style.display = 'none';
    }
}
