// tools/data/image-metadata-viewer/imageMetadataViewer.js
const edv = {
    // DOM Elements
    workspace: null,
    uploadLabel: null,
    fileInput: null,
    errorMessage: null,
    statusOverlay: null,
    resultsView: null,
    imagePreview: null,
    resultsContainer: null,
    actionsContainer: null,
    actionsContainerTop: null,
    clearBtn: null,
    clearBtnTop: null,
    modal: null,
    modalClose: null,
    modalTitle: null,
    modalText: null,

    originalFile: null,

    fetchElements: function () {
        this.workspace = document.getElementById('edv-workspace');
        this.uploadLabel = document.getElementById('edv-upload-label');
        this.fileInput = document.getElementById('edv-file-input');
        this.errorMessage = document.getElementById('edv-error-message');
        this.statusOverlay = document.getElementById('edv-status-overlay');
        this.resultsView = document.getElementById('edv-results-view');
        this.imagePreview = document.getElementById('edv-image-preview');
        this.resultsContainer = document.getElementById('edv-results-container');
        this.actionsContainer = document.getElementById('edv-actions-container');
        this.actionsContainerTop = document.getElementById('edv-actions-container-top');
        this.clearBtn = document.getElementById('edv-clear-btn');
        this.clearBtnTop = document.getElementById('edv-clear-btn-top');
        this.modal = document.getElementById('edv-modal');
        this.modalClose = document.getElementById('edv-modal-close');
        this.modalTitle = document.getElementById('edv-modal-title');
        this.modalText = document.getElementById('edv-modal-text');
    },

    init: function () {
        this.fetchElements();

        if (!this.workspace || !this.fileInput) {
            console.error("EDV_INIT: Could not find critical elements. Aborting.");
            return;
        }

        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

        this.initDragAndDrop();

        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.clearBtnTop.addEventListener('click', () => this.clearAll());
        this.modalClose.addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (event) => {
            if (event.target == this.modal) {
                this.closeModal();
            }
        });

        console.log("EXIF Data Viewer Initialized.");
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
            this.handleFileSelect(e.dataTransfer.files);
        }, false);
    },

    handleFileSelect: function (files) {
        if (files.length === 0) return;
        const file = files[0];

        if (!file.type.match('image.*')) {
            this.showError('Invalid file type. Please select an image file.');
            return;
        }

        this.originalFile = file;
        this.hideError();

        this.workspace.classList.add('has-image');
        this.resultsView.style.display = 'flex';
        this.actionsContainer.style.display = 'flex';
        this.actionsContainerTop.style.display = 'flex';
        this.resultsContainer.innerHTML = '<div class="edv-loading">Analyzing...</div>';

        this.displayImagePreview(file);
        this.readExifData(file);
    },

    displayImagePreview: function (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.onload = () => {
                this.imagePreview.innerHTML = '';
                this.imagePreview.appendChild(img);
            };
            img.onerror = () => {
                this.imagePreview.innerHTML = '<div class="edv-no-results">Cannot display image preview. The file might be corrupt or in an unsupported format.</div>';
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            this.showError('Error reading the specified file.');
            this.imagePreview.innerHTML = '<div class="edv-no-results">Preview unavailable.</div>';
        };
        reader.readAsDataURL(file);
    },

    readExifData: async function (file) {
        try {
            const tags = await exifr.parse(file, true);
            this.displayExifData(tags);
        } catch (error) {
            console.error('Error parsing EXIF data:', error);
            this.showError('Could not read metadata. The file may be corrupted or contain no metadata.');
            this.resultsContainer.innerHTML = `<div class="edv-no-results">${error.message}</div>`;
        }
    },

    displayExifData: function (tags) {
        if (!tags || Object.keys(tags).length === 0) {
            this.resultsContainer.innerHTML = '<div class="edv-no-results">No EXIF metadata found in this image.</div>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'edv-results-table';
        const tbody = document.createElement('tbody');

        const sortedKeys = Object.keys(tags).sort();
        const LONG_TEXT_THRESHOLD = 200;

        for (const tag of sortedKeys) {
            let value = tags[tag];

            if (value === null || value === '' || (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && Object.keys(value).length === 0)) {
                continue;
            }

            if (typeof value === 'object') {
                value = value instanceof Date ? value.toLocaleString() : JSON.stringify(value, null, 2);
            }

            const row = tbody.insertRow();
            row.insertCell().textContent = tag;
            row.cells[0].tagName = 'th';

            const td = row.insertCell();
            const isLongText = typeof value === 'string' && value.length > LONG_TEXT_THRESHOLD;

            if (isLongText) {
                const truncatedValue = value.substring(0, LONG_TEXT_THRESHOLD) + '...';
                const textNode = document.createTextNode(truncatedValue);
                td.appendChild(textNode);

                const button = document.createElement('button');
                button.textContent = 'View Full Text';
                button.className = 'edv-show-more-btn';
                button.style.marginLeft = '8px';
                button.onclick = () => {
                    this.showModal(tag, value);
                };
                td.appendChild(button);
            } else if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                const pre = document.createElement('pre');
                pre.style.margin = '0';
                pre.style.whiteSpace = 'pre-wrap';
                pre.textContent = value;
                td.appendChild(pre);
            } else {
                td.textContent = value;
            }
        }
        table.appendChild(tbody);
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(table);
    },

    clearAll: function () {
        this.fileInput.value = '';
        this.originalFile = null;
        this.workspace.classList.remove('has-image');
        this.resultsView.style.display = 'none';
        this.actionsContainer.style.display = 'none';
        this.actionsContainerTop.style.display = 'none';
        this.imagePreview.innerHTML = '';
        this.resultsContainer.innerHTML = '';
        this.hideError();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showError: function (message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    },

    hideError: function () {
        this.errorMessage.textContent = '';
        this.errorMessage.style.display = 'none';
    },

    showModal: function (title, text) {
        this.modalTitle.textContent = title;
        this.modalText.textContent = text;
        this.modal.style.display = 'block';
    },

    closeModal: function () {
        this.modal.style.display = 'none';
    }
};

function initializeTool() {
    if (document.getElementById('imageMetadataViewer')) {
        if (typeof exifr === 'undefined') {
            console.error("EDV_INIT_ERROR: A required library (exifr.js) not found.");
            const container = document.getElementById('imageMetadataViewer');
            if (container) {
                container.innerHTML = `<p style='color:red; text-align:center; padding: 1em;'>Error: A required library failed to load. The tool is disabled.</p>`;
            }
            return;
        }
        edv.init();
    }
}

window.initializeTool = initializeTool;