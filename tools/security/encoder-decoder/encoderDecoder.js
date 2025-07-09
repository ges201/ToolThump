const ed = {
    // Elements
    formatSelect: null,
    encodeBtn: null,
    decodeBtn: null,
    swapBtn: null,
    clearBtn: null, // New
    inputArea: null,
    outputArea: null,
    copyInputBtn: null,
    pasteInputBtn: null, // New
    copyOutputBtn: null,
    copyInputFeedback: null,
    copyOutputFeedback: null,
    errorMessage: null,
    formatWarning: null,

    copyFeedbackTimeout: {},

    fetchElements: function () {
        this.formatSelect = document.getElementById('ed-format-select');
        this.encodeBtn = document.getElementById('ed-encode-btn');
        this.decodeBtn = document.getElementById('ed-decode-btn');
        this.swapBtn = document.getElementById('ed-swap-btn');
        this.clearBtn = document.getElementById('ed-clear-btn');
        this.inputArea = document.getElementById('ed-input');
        this.outputArea = document.getElementById('ed-output');
        this.errorMessage = document.getElementById('ed-error-message');
        this.formatWarning = document.getElementById('ed-format-warning');
        this.copyInputBtn = document.getElementById('ed-copy-input-btn');
        this.pasteInputBtn = document.getElementById('ed-paste-input-btn');
        this.copyOutputBtn = document.getElementById('ed-copy-output-btn');
        this.copyInputFeedback = document.getElementById('ed-copy-input-feedback');
        this.copyOutputFeedback = document.getElementById('ed-copy-output-feedback');
    },

    clearAll: function () {
        this.inputArea.value = '';
        this.outputArea.value = '';
        this.clearFeedback();
    },

    clearFeedback: function () {
        this.errorMessage.textContent = '';
        this.outputArea.classList.remove('warning');
        [this.copyInputFeedback, this.copyOutputFeedback].forEach(fb => {
            if (fb.classList.contains('show')) {
                fb.classList.remove('show');
                clearTimeout(this.copyFeedbackTimeout[fb.id]);
            }
        });
    },

    process: async function (mode) {
        this.clearFeedback();
        const format = this.formatSelect.value;
        const input = this.inputArea.value;
        let output = '';

        if (!input) {
            this.outputArea.value = '';
            return;
        }

        if (format === 'sha256' && mode === 'decode') {
            const warningMessage = 'SHA-256 is a one-way cryptographic hash function. It is designed to be irreversible and cannot be \'decoded\'. The original input cannot be recovered from the hash.';
            this.outputArea.value = warningMessage;
            this.outputArea.classList.add('warning');
            return;
        }

        try {
            switch (format) {
                case 'base64':
                    output = mode === 'encode' ? base64Encode(input) : base64Decode(input);
                    break;
                case 'url':
                    output = mode === 'encode' ? urlEncode(input) : urlDecode(input);
                    break;
                case 'html':
                    output = mode === 'encode' ? htmlEncode(input) : htmlDecode(input);
                    break;
                case 'hex':
                    output = mode === 'encode' ? hexEncode(input) : hexDecode(input);
                    break;
                case 'sha256':
                    output = await sha256Hash(input);
                    break;
            }
            this.outputArea.value = output;
        } catch (error) {
            console.error('ED_PROCESS_ERROR:', error);
            this.errorMessage.textContent = `Failed to ${mode}. The input may not be valid for this format.`;
            this.outputArea.value = '';
        }
    },

    swapContent: function () {
        this.clearFeedback();
        const inputVal = this.inputArea.value;
        const outputVal = this.outputArea.value;

        if (this.outputArea.classList.contains('warning')) {
            this.inputArea.value = '';
        } else {
            this.inputArea.value = outputVal;
        }

        this.outputArea.value = inputVal;
        this.outputArea.classList.remove('warning');
    },

    pasteFromClipboard: async function () {
        try {
            const text = await navigator.clipboard.readText();
            this.inputArea.value = text;
        } catch (err) {
            console.error('Paste Error:', err);
            this.errorMessage.textContent = 'Failed to paste from clipboard. Permission may have been denied.';
        }
    },

    copyToClipboard: function (text, feedbackEl) {
        navigator.clipboard.writeText(text)
            .then(() => {
                feedbackEl.textContent = 'Copied!';
                feedbackEl.classList.add('show');

                if (this.copyFeedbackTimeout[feedbackEl.id]) {
                    clearTimeout(this.copyFeedbackTimeout[feedbackEl.id]);
                }

                this.copyFeedbackTimeout[feedbackEl.id] = setTimeout(() => {
                    feedbackEl.classList.remove('show');
                }, 2000);
            })
            .catch(err => {
                console.error('ED_COPY_ERROR:', err);
                this.errorMessage.textContent = 'Failed to copy to clipboard.';
            });
    },

    handleFormatChange: function () {
        const selectedFormat = this.formatSelect.value;
        this.clearFeedback();
        this.outputArea.value = '';

        if (selectedFormat === 'sha256') {
            this.encodeBtn.textContent = 'Hash';
            this.formatWarning.textContent = 'SHA-256 is a one-way hash.';
            this.formatWarning.classList.add('show');
        } else {
            this.encodeBtn.textContent = 'Encode';
            this.formatWarning.textContent = ''; // Keep text for screen readers, but it will be hidden
            this.formatWarning.classList.remove('show');
        }
    },

    init: function () {
        this.fetchElements();

        if (!this.formatSelect) {
            console.error("ED_INIT: Could not find all required elements. Aborting init.");
            return;
        }

        this.encodeBtn.addEventListener('click', () => this.process('encode'));
        this.decodeBtn.addEventListener('click', () => this.process('decode'));
        this.swapBtn.addEventListener('click', () => this.swapContent());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.pasteInputBtn.addEventListener('click', () => this.pasteFromClipboard());
        this.formatSelect.addEventListener('change', () => this.handleFormatChange());

        this.copyInputBtn.addEventListener('click', () => this.copyToClipboard(this.inputArea.value, this.copyInputFeedback));
        this.copyOutputBtn.addEventListener('click', () => this.copyToClipboard(this.outputArea.value, this.copyOutputFeedback));

        this.inputArea.addEventListener('input', () => {
            if (this.inputArea.value === '') {
                this.clearFeedback();
                this.outputArea.value = '';
            }
        });

        this.handleFormatChange();

        console.log("Encoder/Decoder Initialized on its page.");
    }
};

function initializeTool() {
    if (document.getElementById('encoderDecoder')) {
        ed.init();
    }
}

// Make the function available to the global scope (e.g., for main.js to call)
window.initializeTool = initializeTool;

// The self-initialization block that caused the double-execution has been removed.
// The global 'main.js' script is now solely responsible for calling 'initializeTool()'.