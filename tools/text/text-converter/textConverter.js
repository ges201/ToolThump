// ToolThump/tools/text/text-converter/textConverter.js
document.addEventListener('DOMContentLoaded', () => {
    const inputTextarea = document.getElementById('inputText');
    const outputTextarea = document.getElementById('outputText');
    const btnUppercase = document.getElementById('btnUppercase');
    const btnLowercase = document.getElementById('btnLowercase');
    const btnTitleCase = document.getElementById('btnTitleCase');
    const btnCopy = document.getElementById('btnCopy');
    const btnClear = document.getElementById('btnClear');
    const copyFeedback = document.getElementById('copyFeedback');

    if (!inputTextarea || !outputTextarea || !btnUppercase || !btnLowercase || !btnTitleCase || !btnCopy || !btnClear || !copyFeedback) {
        console.error('One or more elements for the Text Converter tool are missing!');
        return;
    }

    // --- Conversion Functions ---
    function toUppercase() {
        outputTextarea.value = inputTextarea.value.toUpperCase();
    }

    function toLowercase() {
        outputTextarea.value = inputTextarea.value.toLowerCase();
    }

    function toTitleCase() {
        const text = inputTextarea.value;
        outputTextarea.value = text.toLowerCase().split(' ').map(word => {
            // Handle empty strings that can result from multiple spaces
            if (word.length === 0) return "";
            // Capitalize the first letter, leave the rest as is (which is already lowercased)
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }

    // --- Event Listeners ---
    btnUppercase.addEventListener('click', toUppercase);
    btnLowercase.addEventListener('click', toLowercase);
    btnTitleCase.addEventListener('click', toTitleCase);

    btnClear.addEventListener('click', () => {
        inputTextarea.value = '';
        outputTextarea.value = '';
        inputTextarea.focus();
        hideCopyFeedback();
    });

    btnCopy.addEventListener('click', () => {
        if (outputTextarea.value) {
            navigator.clipboard.writeText(outputTextarea.value)
                .then(() => {
                    showCopyFeedback('Copied!');
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    showCopyFeedback('Copy failed!');
                });
        } else {
            showCopyFeedback('Nothing to copy!');
        }
    });

    // --- Helper Functions for Feedback ---
    let feedbackTimeout;
    function showCopyFeedback(message) {
        copyFeedback.textContent = message;
        copyFeedback.classList.add('visible');
        clearTimeout(feedbackTimeout); // Clear previous timeout if any
        feedbackTimeout = setTimeout(hideCopyFeedback, 2000); // Hide after 2 seconds
    }

    function hideCopyFeedback() {
        copyFeedback.classList.remove('visible');
    }

    // Optional: Auto-convert on input change (can be too aggressive for some users)
    // inputTextarea.addEventListener('input', () => {
    //     // Example: if you want a default conversion or to update dynamically
    //     // For now, we require explicit button clicks.
    // });
});