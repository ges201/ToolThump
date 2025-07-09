const ed = {
    // Elements
    formatSelect: null,
    encodeBtn: null,
    decodeBtn: null,
    swapBtn: null,
    copyBtn: null,
    inputArea: null,
    outputArea: null,
    errorMessage: null,
    copyFeedback: null,

    copyFeedbackTimeout: null,

    fetchElements: function () {
        this.formatSelect = document.getElementById('ed-format-select');
        this.encodeBtn = document.getElementById('ed-encode-btn');
        this.decodeBtn = document.getElementById('ed-decode-btn');
        this.swapBtn = document.getElementById('ed-swap-btn');
        this.copyBtn = document.getElementById('ed-copy-btn');
        this.inputArea = document.getElementById('ed-input');
        this.outputArea = document.getElementById('ed-output');
        this.errorMessage = document.getElementById('ed-error-message');
        this.copyFeedback = document.getElementById('ed-copy-feedback');
    },

    clearFeedback: function () {
        this.errorMessage.textContent = '';
        if (this.copyFeedback.classList.contains('show')) {
            this.copyFeedback.classList.remove('show');
            clearTimeout(this.copyFeedbackTimeout);
        }
    },

    process: function (mode) {
        this.clearFeedback();
        const format = this.formatSelect.value;
        const input = this.inputArea.value;
        let output = '';

        if (!input) {
            this.outputArea.value = '';
            this.copyBtn.disabled = true;
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
            }
            this.outputArea.value = output;
            this.copyBtn.disabled = false;
        } catch (error) {
            console.error('ED_PROCESS_ERROR:', error);
            this.errorMessage.textContent = `Failed to ${mode}. The input may not be valid for this format.`;
            this.outputArea.value = '';
            this.copyBtn.disabled = true;
        }
    },

    swapContent: function () {
        this.clearFeedback();
        const inputVal = this.inputArea.value;
        const outputVal = this.outputArea.value;
        this.inputArea.value = outputVal;
        this.outputArea.value = inputVal;
        this.copyBtn.disabled = !inputVal;
    },

    copyOutput: function () {
        if (!this.outputArea.value || this.copyBtn.disabled) return;

        navigator.clipboard.writeText(this.outputArea.value)
            .then(() => {
                this.copyFeedback.textContent = 'Copied!';
                this.copyFeedback.classList.add('show');
                if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);
                this.copyFeedbackTimeout = setTimeout(() => {
                    this.copyFeedback.classList.remove('show');
                }, 2000);
            })
            .catch(err => {
                console.error('ED_COPY_ERROR:', err);
                this.errorMessage.textContent = 'Failed to copy to clipboard.';
            });
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
        this.copyBtn.addEventListener('click', () => this.copyOutput());

        this.inputArea.addEventListener('input', () => {
            if (this.inputArea.value === '') {
                this.clearFeedback();
                this.outputArea.value = '';
                this.copyBtn.disabled = true;
            }
        });

        console.log("Encoder/Decoder Initialized on its page.");
    }
};

function initializeTool() {
    if (document.getElementById('encoderDecoder')) {
        ed.init();
    }
}

window.initializeTool = initializeTool;