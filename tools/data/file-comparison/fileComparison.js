const fc = {
    // Element properties
    fileInputs: [],
    dropZones: [],
    fileInfos: [],
    compareButton: null,
    resetButton: null,
    resultContainer: null,

    // State
    files: [null, null],
    CHUNK_SIZE: 1024 * 1024 * 5, // 5 MB chunks

    fetchElements: function () {
        this.fileInputs = [document.getElementById('file-input-1'), document.getElementById('file-input-2')];
        this.dropZones = [document.getElementById('file-drop-zone-1'), document.getElementById('file-drop-zone-2')];
        this.fileInfos = [document.getElementById('file-info-1'), document.getElementById('file-info-2')];
        this.compareButton = document.getElementById('compare-button');
        this.resetButton = document.getElementById('reset-button');
        this.resultContainer = document.getElementById('result-container');
    },

    init: function () {
        this.fetchElements();
        if (!this.compareButton) {
            console.error("FC_INIT: Could not find essential elements. Aborting.");
            return;
        }

        this.setupDropZone(0);
        this.setupDropZone(1);
        this.compareButton.addEventListener('click', () => this.compareFiles());
        this.resetButton.addEventListener('click', () => this.resetUI());
    },

    setupDropZone: function (index) {
        const dropZone = this.dropZones[index];
        const fileInput = this.fileInputs[index];

        dropZone.addEventListener('click', (e) => {
            // If the remove button or its icon is clicked, handle removal.
            if (e.target.closest('.remove-file-button')) {
                e.stopPropagation();
                this.removeFile(index);
            } else if (e.target !== fileInput) {
                // Trigger the file input if the click didn't come from the input itself.
                // This prevents the file dialog from opening twice.
                fileInput.click();
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this.handleFileSelect(e.dataTransfer.files[0], index);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFileSelect(e.target.files[0], index);
            }
        });
    },

    handleFileSelect: function (file, index) {
        this.files[index] = file;
        this.updateFileInfo(index);
        this.validateInputs();
    },

    updateFileInfo: function (index) {
        const infoEl = this.fileInfos[index];
        const dropZone = this.dropZones[index];
        const file = this.files[index];

        if (file) {
            infoEl.innerHTML = `
                <div class="file-details-wrapper">
                    <div class="file-details">
                        <span class="file-icon">📄</span>
                        <div class="file-name-size">
                            <span class="file-name" title="${file.name}">${file.name}</span>
                            <span class="file-size">${this.formatBytes(file.size)}</span>
                        </div>
                    </div>
                    <button class="remove-file-button btn-secondary" aria-label="Remove file">&times;</button>
                </div>`;
            dropZone.classList.add('file-loaded');
        } else {
            infoEl.innerHTML = `
                <span class="file-placeholder-icon">📂</span>
                <p class="placeholder-text">Drop File ${index + 1} or Click to Select</p>
                <p class="file-details"></p>`;
            dropZone.classList.remove('file-loaded');
        }
    },

    validateInputs: function () {
        this.compareButton.disabled = !(this.files[0] && this.files[1]);
    },

    removeFile: function(index) {
        this.files[index] = null;
        this.fileInputs[index].value = ''; // Reset file input
        this.updateFileInfo(index);
        this.validateInputs();
    },

    formatBytes: function (bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    resetUI: function () {
        this.files = [null, null];
        this.fileInputs.forEach(input => {
            input.value = '';
            input.disabled = false;
        });
        this.dropZones.forEach(zone => zone.classList.remove('disabled'));
        this.updateFileInfo(0);
        this.updateFileInfo(1);
        this.validateInputs();
        this.resultContainer.classList.remove('show', 'success', 'error', 'info');
        this.resultContainer.style.display = 'none';
        this.compareButton.style.display = 'inline-block';
        this.resetButton.style.display = 'none';
        this.compareButton.disabled = true;
    },

    showResult: function (state, icon, title, message, showProgress = false) {
        this.resultContainer.className = `result-container ${state}`;
        let progressHTML = showProgress ? `
            <div class="result-progress-bar">
                <div class="result-progress-bar-inner" id="progress-bar-inner"></div>
            </div>` : '';

        this.resultContainer.innerHTML = `
            <div class="result-icon">${icon}</div>
            <h3 class="result-title">${title}</h3>
            <p class="result-message">${message}</p>
            ${progressHTML}`;

        this.resultContainer.style.display = 'block';
        this.resultContainer.classList.add('show');
        this.compareButton.style.display = 'none';
        this.resetButton.style.display = 'inline-block';
        this.dropZones.forEach(zone => zone.classList.add('disabled'));
        this.fileInputs.forEach(input => input.disabled = true);
    },

    updateProgress: function (percentage) {
        const progressBar = document.getElementById('progress-bar-inner');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    },

    compareFiles: async function () {
        const [file1, file2] = this.files;

        if (file1.size !== file2.size) {
            this.showResult('error', '≠', 'Files are Different', `The file sizes do not match (${this.formatBytes(file1.size)} vs ${this.formatBytes(file2.size)}).`);
            return;
        }

        if (file1.size === 0) {
            this.showResult('success', '✓', 'Files are Identical', 'Both files are empty (0 bytes) and therefore identical.');
            return;
        }

        this.showResult('info', '⏳', 'Comparing...', 'Please wait. For large files, this may take a moment.', true);

        try {
            const reader1 = file1.stream().getReader();
            const reader2 = file2.stream().getReader();
            let position = 0;

            while (true) {
                const [result1, result2] = await Promise.all([reader1.read(), reader2.read()]);

                if (result1.done && result2.done) {
                    this.updateProgress(100);
                    this.showResult('success', '✓', 'Files are Identical', 'The files have the same size and content.');
                    break;
                }

                if (result1.done || result2.done || result1.value.length !== result2.value.length) {
                    this.showResult('error', '≠', 'Files are Different', 'A mismatch was found during comparison.');
                    break;
                }

                const chunk1 = result1.value;
                const chunk2 = result2.value;

                for (let i = 0; i < chunk1.length; i++) {
                    if (chunk1[i] !== chunk2[i]) {
                        this.showResult('error', '≠', 'Files are Different', `A byte mismatch was found at position ${position + i}.`);
                        return;
                    }
                }

                position += chunk1.length;
                this.updateProgress((position / file1.size) * 100);
            }
        } catch (error) {
            console.error('File comparison error:', error);
            this.showResult('error', '❌', 'Error', 'Could not read the files. They might be in use or you may not have permission to access them.');
        }
    }
};

// This function will be called by main.js after includes are loaded
function initializeTool() {
    if (document.getElementById('fileComparator')) {
        fc.init();
    }
}

window.initializeTool = initializeTool;