const ed = {
    // Elements
    formatSelect: null,
    encodeBtn: null,
    decodeBtn: null,
    swapBtn: null,
    inputArea: null,
    outputArea: null,
    copyInputBtn: null,
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
        this.inputArea = document.getElementById('ed-input');
        this.outputArea = document.getElementById('ed-output');
        this.errorMessage = document.getElementById('ed-error-message');
        this.formatWarning = document.getElementById('ed-format-warning');
        this.copyInputBtn = document.getElementById('ed-copy-input-btn');
        this.copyOutputBtn = document.getElementById('ed-copy-output-btn');
        this.copyInputFeedback = document.getElementById('ed-copy-input-feedback');
        this.copyOutputFeedback = document.getElementById('ed-copy-output-feedback');
    },

    clearFeedback: function () {
        this.errorMessage.textContent = '';
        this.formatWarning.textContent = '';
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
            this.copyOutputBtn.disabled = true;
            return;
        }

        try {
            if (format === 'sha256' && mode === 'decode') {
                throw new Error('SHA-256 is a one-way hash and cannot be decoded.');
            }

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
            this.copyOutputBtn.disabled = false;
        } catch (error) {
            console.error('ED_PROCESS_ERROR:', error);
            this.errorMessage.textContent = `Failed to ${mode}. The input may not be valid for this format.`;
            this.outputArea.value = '';
            this.copyOutputBtn.disabled = true;
        }
    },

    swapContent: function () {
        this.clearFeedback();
        const inputVal = this.inputArea.value;
        const outputVal = this.outputArea.value;
        this.inputArea.value = outputVal;
        this.outputArea.value = inputVal;

        this.copyInputBtn.disabled = !outputVal;
        this.copyOutputBtn.disabled = !inputVal;
    },

    copyToClipboard: function (text, feedbackEl, buttonEl) {
        if (!text || buttonEl.disabled) return;

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

    handleFormatChange: function() {
        const selectedFormat = this.formatSelect.value;
        if (selectedFormat === 'sha256') {
            this.decodeBtn.disabled = true;
            this.encodeBtn.textContent = 'Hash';
            this.formatWarning.textContent = 'SHA-256 is a one-way hash.';
        } else {
            this.decodeBtn.disabled = false;
            this.encodeBtn.textContent = 'Encode';
            this.formatWarning.textContent = '';
        }
    },

    init: function () {
        this.fetchElements();

        if (!this.formatSelect || !this.inputArea || !this.outputArea) {
            console.error("ED_INIT: Could not find all required elements. Aborting init.");
            return;
        }

        this.encodeBtn.addEventListener('click', () => this.process('encode'));
        this.decodeBtn.addEventListener('click', () => this.process('decode'));
        this.swapBtn.addEventListener('click', () => this.swapContent());
        this.formatSelect.addEventListener('change', () => this.handleFormatChange());

        this.copyInputBtn.addEventListener('click', () => this.copyToClipboard(this.inputArea.value, this.copyInputFeedback, this.copyInputBtn));
        this.copyOutputBtn.addEventListener('click', () => this.copyToClipboard(this.outputArea.value, this.copyOutputFeedback, this.copyOutputBtn));

        this.inputArea.addEventListener('input', () => {
            this.copyInputBtn.disabled = this.inputArea.value === '';
            if (this.inputArea.value === '') {
                this.clearFeedback();
                this.outputArea.value = '';
                this.copyOutputBtn.disabled = true;
            }
        });
        
        this.handleFormatChange(); // Initial check

        console.log("Encoder/Decoder Initialized on its page.");
    }
};

function initializeTool() {
    if (document.getElementById('encoderDecoder')) {
        ed.init();
    }
}

window.initializeTool = initializeTool;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTool);
} else {
    initializeTool();
}