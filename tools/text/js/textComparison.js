// tools/text/js/textComparison.js
const tc = {
    text1Input: null,
    text2Input: null,
    compareBtn: null,
    diffOutput: null,
    diffPlaceholder: null,

    fetchElements: function () {
        this.text1Input = document.getElementById('tc-text1');
        this.text2Input = document.getElementById('tc-text2');
        this.compareBtn = document.getElementById('tc-compare-btn');
        this.diffOutput = document.getElementById('tc-diff-output');
        if (this.diffOutput) {
            this.diffPlaceholder = this.diffOutput.querySelector('.tc-results-placeholder');
        }
    },

    escapeHtml: function(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        // Preserve spaces and newlines, only escape HTML metacharacters
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "'");
    },

    compareTexts: function () {
        if (!this.text1Input || !this.text2Input || !this.diffOutput) {
            console.error("TC_COMPARE: Missing some required elements.");
            if (this.diffPlaceholder) this.diffPlaceholder.style.display = 'block';
            this.diffOutput.innerHTML = '<p class="tc-error">Error: Could not initialize tool.</p>';
            return;
        }

        if (typeof Diff === 'undefined') {
            console.error("TC_COMPARE: JSDiff (Diff) library not loaded.");
            if (this.diffPlaceholder) this.diffPlaceholder.style.display = 'block';
            this.diffOutput.innerHTML = '<p class="tc-error">Error: Diff library not loaded. Please check console.</p>';
            return;
        }

        const oldText = this.text1Input.value;
        const newText = this.text2Input.value;

        if (this.diffPlaceholder) this.diffPlaceholder.style.display = 'none';
        this.diffOutput.innerHTML = ''; // Clear previous results

        // Using diffWordsWithSpace to correctly handle spaces between words
        const diff = Diff.diffWordsWithSpace(oldText, newText);
        let fragment = document.createDocumentFragment(); // More efficient for building HTML

        if (diff.length === 1 && !diff[0].added && !diff[0].removed) {
            const p = document.createElement('p');
            p.className = 'tc-no-diff';
            p.textContent = 'The texts are identical.';
            fragment.appendChild(p);
        } else {
            const pre = document.createElement('pre');
            diff.forEach((part) => {
                const span = document.createElement('span');
                if (part.added) {
                    span.className = 'tc-word-added';
                } else if (part.removed) {
                    span.className = 'tc-word-removed';
                } else {
                    // For unchanged parts, no specific class needed unless for default styling
                    // span.className = 'tc-word-same'; // Optional
                }
                // Use innerHTML for escaped text to render newlines correctly within <pre>
                // JSDiff parts preserve newlines as '\n'. <pre> handles them.
                span.innerHTML = this.escapeHtml(part.value).replace(/\n/g, '<br>'); // Replace \n with <br> if not using <pre>
                                                                                // With <pre>, escapeHtml is enough
                // If using <pre> and escapeHtml, newlines are preserved.
                // If not using <pre>, newlines should be converted to <br>.
                // For simplicity with <pre> already in HTML, we'll put content inside it.
                // Let's adjust: the main diffOutput is a div, we'll build a <pre> inside it.
                span.textContent = part.value; // JSDiff values are already text
                pre.appendChild(span);
            });
            fragment.appendChild(pre);
        }

        this.diffOutput.appendChild(fragment);
    },

    init: function () {
        this.fetchElements();

        if (!this.compareBtn || !this.text1Input || !this.text2Input || !this.diffOutput) {
            console.error("TC_INIT: Could not find all required elements. Aborting init.");
            if(this.diffOutput && this.diffPlaceholder) {
                const placeholderParent = this.diffPlaceholder.parentElement;
                placeholderParent.innerHTML = ''; // Clear parent
                placeholderParent.appendChild(this.diffPlaceholder);
                this.diffPlaceholder.style.display = 'block';
                this.diffPlaceholder.textContent = "Error initializing tool. Check console.";
                 if(this.diffPlaceholder.tagName.toLowerCase() !== 'pre'){
                    // If placeholder was not pre, ensure it is for consistency now
                    const newPlaceholder = document.createElement('pre');
                    newPlaceholder.className = 'tc-results-placeholder tc-error';
                    newPlaceholder.textContent = "Error initializing tool. Check console.";
                    placeholderParent.innerHTML = '';
                    placeholderParent.appendChild(newPlaceholder);
                    this.diffPlaceholder = newPlaceholder;
                }
            }
            return;
        }
        
        this.compareBtn.addEventListener('click', () => this.compareTexts());

        if (this.diffPlaceholder && this.diffOutput) {
            // Ensure placeholder is a <pre> element if it's not already
            if (this.diffPlaceholder.tagName.toLowerCase() !== 'pre') {
                const newPlaceholder = document.createElement('pre');
                newPlaceholder.className = 'tc-results-placeholder';
                newPlaceholder.textContent = this.diffPlaceholder.textContent;
                this.diffPlaceholder.parentElement.replaceChild(newPlaceholder, this.diffPlaceholder);
                this.diffPlaceholder = newPlaceholder;
            }
            this.diffOutput.innerHTML = ''; // Clear
            this.diffOutput.appendChild(this.diffPlaceholder);
            this.diffPlaceholder.style.display = 'block';
        }
        console.log("Text Comparison Tool Initialized on its page.");
    }
};

// Self-initialize when the script is loaded on a page containing the text comparison tool
if (document.getElementById('textComparison')) { // Check for the main section ID
    if (typeof Diff !== 'undefined') {
        tc.init();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof Diff !== 'undefined') {
                 tc.init();
            } else {
                console.error("JSDiff library not found after DOMContentLoaded.");
                const tcOutput = document.getElementById('tc-diff-output');
                if (tcOutput) {
                    let placeholder = tcOutput.querySelector('.tc-results-placeholder');
                    if (!placeholder) {
                        placeholder = document.createElement('pre'); // ensure pre for consistency
                        placeholder.className = 'tc-results-placeholder';
                        tcOutput.appendChild(placeholder);
                    }
                    placeholder.classList.add('tc-error');
                    placeholder.textContent = "Error: JSDiff library could not be loaded. Text comparison is unavailable.";
                    tcOutput.innerHTML = ''; // Clear then add
                    tcOutput.appendChild(placeholder);
                }
            }
        });
    }
}