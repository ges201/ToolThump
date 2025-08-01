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
    exportJsonBtn: null,
    exportJsonBtnTop: null,
    exportJsonBtn: null,
    exportJsonBtnTop: null,
    modal: null,
    modalClose: null,
    modalTitle: null,
    modalText: null,

    originalFile: null,
    currentTags: null, // To store the latest metadata
    rawExtensions: ['dng', 'cr2', 'nef', 'arw', 'orf', 'raf', 'rw2', 'pef', 'srw', 'heic', 'heif', 'avif'],
    unrenderableExtensions: ['dng', 'cr2', 'nef', 'arw', 'orf', 'raf', 'rw2', 'pef', 'srw'],

    // New: A map to translate common EXIF tag IDs to names as a fallback.
    tagMap: {
        // Image Data Structure
        '256': 'ImageWidth', '257': 'ImageHeight', '258': 'BitsPerSample', '259': 'Compression', '262': 'PhotometricInterpretation',
        '274': 'Orientation', '277': 'SamplesPerPixel', '284': 'PlanarConfiguration', '531': 'YCbCrPositioning', '282': 'XResolution',
        '283': 'YResolution', '296': 'ResolutionUnit',
        // Image Data Characteristics
        '273': 'StripOffsets', '278': 'RowsPerStrip', '279': 'StripByteCounts', '513': 'JPEGInterchangeFormat', '514': 'JPEGInterchangeFormatLength',
        // Camera & Device Information
        '271': 'Make', '272': 'Model', '305': 'Software', '306': 'DateTime', '315': 'Artist', '33432': 'Copyright',
        // EXIF Main Tags
        '33434': 'ExposureTime', '33437': 'FNumber', '34850': 'ExposureProgram', '34852': 'SpectralSensitivity', '34855': 'ISOSpeedRatings',
        '34864': 'SensitivityType', '36864': 'ExifVersion', '36867': 'DateTimeOriginal', '36868': 'DateTimeDigitized',
        '37121': 'ComponentsConfiguration', '37122': 'CompressedBitsPerPixel', '37377': 'ShutterSpeedValue', '37378': 'ApertureValue',
        '37379': 'BrightnessValue', '37380': 'ExposureBiasValue', '37381': 'MaxApertureValue', '37382': 'SubjectDistance',
        '37383': 'MeteringMode', '37384': 'LightSource', '37385': 'Flash', '37386': 'FocalLength', '37500': 'MakerNote',
        '37510': 'UserComment', '40961': 'ColorSpace', '40962': 'PixelXDimension', '40963': 'PixelYDimension',
        '41486': 'FocalPlaneXResolution', '41487': 'FocalPlaneYResolution', '41488': 'FocalPlaneResolutionUnit',
        '41729': 'SensingMethod', '41985': 'CustomRendered', '41986': 'ExposureMode', '41987': 'WhiteBalance',
        '41988': 'DigitalZoomRatio', '41989': 'FocalLengthIn35mmFilm', '41990': 'SceneCaptureType', '41991': 'GainControl',
        '41992': 'Contrast', '41993': 'Saturation', '41994': 'Sharpness', '42034': 'LensSpecification', '42035': 'LensMake',
        '42036': 'LensModel',
        // GPS Info
        '34853': 'GPSInfoIFDPointer'
    },

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
        this.exportJsonBtn = document.getElementById('edv-export-json-btn');
        this.exportJsonBtnTop = document.getElementById('edv-export-json-btn-top');
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
        this.exportJsonBtn.addEventListener('click', () => this.exportAsJson());
        this.exportJsonBtnTop.addEventListener('click', () => this.exportAsJson());
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
        const extension = file.name.split('.').pop().toLowerCase();
        const isSupportedExtension = this.rawExtensions.includes(extension);

        if (!file.type.match('image.*') && !isSupportedExtension) {
            this.showError('Invalid file type. Please select a supported image or RAW file.');
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
        const extension = file.name.split('.').pop().toLowerCase();
        const isUnrenderable = this.unrenderableExtensions.includes(extension);

        if (isUnrenderable) {
            this.imagePreview.innerHTML = '<div class="edv-no-results">Preview is not available for this RAW file format, but metadata can still be extracted.</div>';
            return;
        }

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
            const options = {
                tiff: true, xmp: true, iptc: true, icc: true, jfif: true,
                exif: true, gps: true, interop: true,
                makerNote: true, merge: true, sanitize: true,
            };
            const tags = await exifr.parse(file, options);
            this.displayExifData(tags);
        } catch (error) {
            console.error('Error parsing EXIF data:', error);
            this.showError('Could not read metadata. The file may be corrupted or contain no metadata.');
            this.resultsContainer.innerHTML = `<div class="edv-no-results">${error.message}</div>`;
        }
    },

    displayExifData: function (tags) {
        this.currentTags = tags; // Store the tags
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
            let displayValue;

            if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
                displayValue = `[Binary Data: ${value.byteLength || value.length} bytes]`;
            } else if (value instanceof Date) {
                displayValue = value.toLocaleString();
            } else if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value, null, 2);
            } else {
                displayValue = value;
            }

            const row = tbody.insertRow();
            // Use the mapped name if available, otherwise fall back to the original tag ID
            const tagName = this.tagMap[tag] || tag;
            const th = document.createElement('th');
            th.textContent = tagName;
            row.appendChild(th);

            const td = row.insertCell();
            const isLongText = typeof displayValue === 'string' && displayValue.length > LONG_TEXT_THRESHOLD;

            if (isLongText) {
                td.textContent = displayValue.substring(0, LONG_TEXT_THRESHOLD) + '...';
                const button = document.createElement('button');
                button.textContent = 'View Full Text';
                button.className = 'edv-show-more-btn';
                button.style.marginLeft = '8px';
                button.onclick = () => this.showModal(tagName, displayValue);
                td.appendChild(button);
            } else if (typeof displayValue === 'string' && (displayValue.startsWith('{') || displayValue.startsWith('['))) {
                const pre = document.createElement('pre');
                pre.style.margin = '0';
                pre.style.whiteSpace = 'pre-wrap';
                pre.textContent = displayValue;
                td.appendChild(pre);
            } else {
                td.textContent = displayValue;
            }
        }
        table.appendChild(tbody);
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(table);
    },

    exportAsJson: function () {
        if (!this.currentTags || Object.keys(this.currentTags).length === 0) {
            this.showError("No metadata available to export.");
            return;
        }

        try {
            // Create a serializable version of the data
            const dataToExport = {};
            for (const key in this.currentTags) {
                const value = this.currentTags[key];
                if (value instanceof Uint8Array) {
                    // Convert Uint8Array to a regular array of numbers
                    dataToExport[key] = Array.from(value);
                } else if (value instanceof Date) {
                    dataToExport[key] = value.toISOString();
                } else if (typeof value !== 'function' && value !== null) {
                    // Exclude functions and nulls
                    dataToExport[key] = value;
                }
            }

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            const originalFileName = this.originalFile ? this.originalFile.name.split('.').slice(0, -1).join('.') : 'metadata';
            a.download = `${originalFileName}_metadata.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error exporting JSON:', error);
            this.showError('An error occurred while preparing the JSON file.');
        }
    },

    clearAll: function () {
        this.fileInput.value = '';
        this.originalFile = null;
        this.currentTags = null; // Clear stored tags
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