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

    escapeHtml: function (unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .replace(/&/g, "&")  // Corrected
            .replace(/</g, "<")   // Corrected
            .replace(/>/g, ">")   // Corrected
            .replace(/"/g, "&quot;") // Corrected
            .replace(/'/g, "'"); // Corrected (or ')
    },

    compareTexts: function () {
        if (!this.text1Input || !this.text2Input || !this.diffOutput) {
            console.error("TC_COMPARE: Missing some required elements.");
            if (this.diffPlaceholder) this.diffPlaceholder.style.display = 'block';
            this.diffOutput.innerHTML = '<p class="tc-error">Error: Could not initialize tool.</p>';
            return;
        }

        // CORRECTED: Check for JsDiff
        if (typeof JsDiff === 'undefined') {
            console.error("TC_COMPARE: JSDiff library not loaded. Global 'JsDiff' is undefined.");
            if (this.diffPlaceholder) {
                this.diffPlaceholder.style.display = 'block';
                // Ensure the error message uses pre if the placeholder is pre
                if (this.diffPlaceholder.tagName.toLowerCase() === 'pre') {
                    this.diffPlaceholder.textContent = 'Error: Diff library (JsDiff) not loaded. Please check console.';
                    this.diffOutput.innerHTML = '';
                    this.diffOutput.appendChild(this.diffPlaceholder);
                } else {
                    this.diffOutput.innerHTML = '<p class="tc-error">Error: Diff library (JsDiff) not loaded. Please check console.</p>';
                }
            }
            return;
        }

        const oldText = this.text1Input.value;
        const newText = this.text2Input.value;

        if (this.diffPlaceholder) this.diffPlaceholder.style.display = 'none';
        this.diffOutput.innerHTML = ''; // Clear previous results

        // CORRECTED: Use JsDiff.diffWordsWithSpace
        const diff = JsDiff.diffWordsWithSpace(oldText, newText);
        let fragment = document.createDocumentFragment();

        if (diff.length === 1 && !diff[0].added && !diff[0].removed) {
            // For "no diff", use a <p> or a <pre> consistently with placeholder
            if (this.diffPlaceholder && this.diffPlaceholder.tagName.toLowerCase() === 'pre') {
                const pre = document.createElement('pre');
                pre.className = 'tc-no-diff';
                pre.textContent = 'The texts are identical.';
                fragment.appendChild(pre);
            } else {
                const p = document.createElement('p');
                p.className = 'tc-no-diff';
                p.textContent = 'The texts are identical.';
                fragment.appendChild(p);
            }
        } else {
            const pre = document.createElement('pre');
            diff.forEach((part) => {
                const span = document.createElement('span');
                if (part.added) {
                    span.className = 'tc-word-added';
                } else if (part.removed) {
                    span.className = 'tc-word-removed';
                }
                span.textContent = part.value;
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
            if (this.diffOutput && this.diffPlaceholder) {
                const placeholderParent = this.diffPlaceholder.parentElement;
                placeholderParent.innerHTML = '';
                if (this.diffPlaceholder.tagName.toLowerCase() !== 'pre') {
                    const newPlaceholder = document.createElement('pre');
                    newPlaceholder.className = 'tc-results-placeholder tc-error';
                    newPlaceholder.textContent = "Error initializing tool. Check console.";
                    placeholderParent.appendChild(newPlaceholder);
                    this.diffPlaceholder = newPlaceholder;
                } else {
                    this.diffPlaceholder.classList.add('tc-error');
                    this.diffPlaceholder.textContent = "Error initializing tool. Check console.";
                    placeholderParent.appendChild(this.diffPlaceholder);
                }
                this.diffPlaceholder.style.display = 'block';
            }
            return;
        }

        this.compareBtn.addEventListener('click', () => this.compareTexts());

        if (this.diffPlaceholder && this.diffOutput) {
            if (this.diffPlaceholder.tagName.toLowerCase() !== 'pre') {
                const newPlaceholder = document.createElement('pre');
                newPlaceholder.className = 'tc-results-placeholder';
                newPlaceholder.textContent = this.diffPlaceholder.textContent; // Preserve original text if any
                this.diffPlaceholder.parentElement.replaceChild(newPlaceholder, this.diffPlaceholder);
                this.diffPlaceholder = newPlaceholder;
            }
            this.diffOutput.innerHTML = '';
            this.diffOutput.appendChild(this.diffPlaceholder);
            this.diffPlaceholder.style.display = 'block';
            this.diffPlaceholder.classList.remove('tc-error');
            this.diffPlaceholder.textContent = "Results will appear here after comparison.";
        }
        console.log("Text Comparison Tool Initialized on its page.");
    }
};

// CORRECTED: Check for JsDiff in the initialization logic
if (document.getElementById('textComparison')) {
    // Try to initialize immediately if JsDiff is already available
    if (typeof JsDiff !== 'undefined') {
        tc.init();
    } else {
        // Fallback to DOMContentLoaded if JsDiff might load later (e.g. script tag is async/defer or placed after this script)
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof JsDiff !== 'undefined') {
                tc.init();
            } else {
                console.error("JSDiff library not found after DOMContentLoaded. Global 'JsDiff' is undefined.");
                const tcOutput = document.getElementById('tc-diff-output');
                if (tcOutput) {
                    let placeholder = tcOutput.querySelector('.tc-results-placeholder');
                    if (!placeholder || placeholder.tagName.toLowerCase() !== 'pre') {
                        placeholder = document.createElement('pre');
                        placeholder.className = 'tc-results-placeholder';
                        tcOutput.innerHTML = '';
                        tcOutput.appendChild(placeholder);
                    }
                    placeholder.classList.add('tc-error');
                    placeholder.textContent = "Error: JSDiff library could not be loaded. Text comparison is unavailable.";
                }
            }
        });
    }
}