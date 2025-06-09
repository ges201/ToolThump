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

        if (typeof JsDiff === 'undefined') {
            console.error("TC_COMPARE: JSDiff library not loaded. Global 'JsDiff' is undefined.");
            if (this.diffPlaceholder) {
                this.diffPlaceholder.style.display = 'block';
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

        const rawDiff = JsDiff.diffWordsWithSpace(oldText, newText);
        let processedDiff = [];
        let i = 0;
        while (i < rawDiff.length) {
            const currentPart = rawDiff[i];
            const nextPart = (i + 1 < rawDiff.length) ? rawDiff[i + 1] : null;

            // Check for adjacent removed and added parts that are purely whitespace
            if (currentPart.removed && nextPart && nextPart.added &&
                /^\s+$/.test(currentPart.value) && /^\s+$/.test(nextPart.value)) {

                const s1 = currentPart.value; // removed spaces block
                const s2 = nextPart.value;   // added spaces block

                let commonPrefixLength = 0;
                while (commonPrefixLength < s1.length && commonPrefixLength < s2.length && s1[commonPrefixLength] === s2[commonPrefixLength]) {
                    commonPrefixLength++;
                }

                if (commonPrefixLength > 0) {
                    processedDiff.push({ value: s1.substring(0, commonPrefixLength) }); // Common part
                }

                const s1_remainder = s1.substring(commonPrefixLength);
                const s2_remainder = s2.substring(commonPrefixLength);

                if (s1_remainder.length > 0) {
                    processedDiff.push({ value: s1_remainder, removed: true });
                }
                if (s2_remainder.length > 0) {
                    processedDiff.push({ value: s2_remainder, added: true });
                }

                i += 2; // Consumed two parts (currentPart and nextPart)
            } else {
                processedDiff.push(currentPart);
                i += 1;
            }
        }

        const diff = processedDiff; // Use the post-processed diff parts
        let fragment = document.createDocumentFragment();

        if (diff.length === 1 && !diff[0].added && !diff[0].removed) {
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
                // Using textContent is safe and handles HTML entities correctly for display
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
                newPlaceholder.textContent = this.diffPlaceholder.textContent;
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

if (document.getElementById('textComparison')) {
    if (typeof JsDiff !== 'undefined') {
        tc.init();
    } else {
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