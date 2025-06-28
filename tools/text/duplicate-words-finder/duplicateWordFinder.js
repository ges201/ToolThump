// tools/text/duplicate-word-finder/duplicateWordFinder.js
const dwf = {
    textInput: null,
    findBtn: null,
    outputBox: null,
    caseSensitiveCheckbox: null,
    ignorePunctuationCheckbox: null,

    fetchElements: function () {
        this.textInput = document.getElementById('dwf-text-input');
        this.findBtn = document.getElementById('dwf-find-btn');
        this.outputBox = document.getElementById('dwf-output');
        this.caseSensitiveCheckbox = document.getElementById('dwf-case-sensitive');
        this.ignorePunctuationCheckbox = document.getElementById('dwf-ignore-punctuation');
    },

    findDuplicates: function () {
        if (!this.textInput || !this.outputBox) {
            console.error("DWF_FIND: Missing required elements.");
            this.outputBox.innerHTML = '<p class="dwf-error-message">Error: Could not initialize tool components.</p>';
            return;
        }

        let text = this.textInput.value.trim();
        const isCaseSensitive = this.caseSensitiveCheckbox.checked;
        const shouldIgnorePunctuation = this.ignorePunctuationCheckbox.checked;

        this.outputBox.innerHTML = ''; // Clear previous results

        if (text.length === 0) {
            this.outputBox.innerHTML = '<p class="dwf-results-placeholder">Please enter some text to analyze.</p>';
            return;
        }

        // Pre-process text based on options
        if (!isCaseSensitive) {
            text = text.toLowerCase();
        }
        if (shouldIgnorePunctuation) {
            // Removes punctuation but keeps apostrophes within words (e.g., "don't")
            text = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]?]/g, ' ');
            text = text.replace(/\s{2,}/g, ' '); // Replace multiple spaces with a single one
        }

        const words = text.split(/\s+/).filter(word => word.length > 0);
        const wordCounts = {};

        // Count word occurrences
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });

        // Filter for duplicates
        const duplicates = Object.entries(wordCounts)
            .filter(([word, count]) => count > 1)
            .sort(([, countA], [, countB]) => countB - countA); // Sort by count descending

        if (duplicates.length === 0) {
            this.outputBox.innerHTML = '<p class="dwf-no-duplicates">No duplicate words found.</p>';
            return;
        }

        this.renderResultsTable(duplicates);
    },

    renderResultsTable: function (duplicates) {
        const table = document.createElement('table');
        table.className = 'dwf-results-table';

        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const thWord = document.createElement('th');
        thWord.textContent = 'Duplicate Word';
        const thCount = document.createElement('th');
        thCount.textContent = 'Count';
        headerRow.appendChild(thWord);
        headerRow.appendChild(thCount);

        const tbody = table.createTBody();
        duplicates.forEach(([word, count]) => {
            const row = tbody.insertRow();
            const cellWord = row.insertCell();
            cellWord.className = 'dwf-word-col';
            cellWord.textContent = word;

            const cellCount = row.insertCell();
            cellCount.className = 'dwf-count-col';
            cellCount.textContent = count;
        });

        this.outputBox.appendChild(table);
    },

    init: function () {
        this.fetchElements();

        if (!this.findBtn || !this.textInput) {
            console.error("DWF_INIT: Could not find all required elements. Aborting init.");
            if (this.outputBox) {
                this.outputBox.innerHTML = '<p class="dwf-error-message">Error initializing the tool. A button or input is missing.</p>';
            }
            return;
        }

        this.findBtn.addEventListener('click', () => this.findDuplicates());

        // Also trigger find when options change, if text is present
        this.caseSensitiveCheckbox.addEventListener('change', () => {
            if (this.textInput.value.trim().length > 0) this.findDuplicates();
        });
        this.ignorePunctuationCheckbox.addEventListener('change', () => {
            if (this.textInput.value.trim().length > 0) this.findDuplicates();
        });

        console.log("Duplicate Word Finder Initialized.");
    }
};

if (document.getElementById('duplicateWordFinder')) {
    document.addEventListener('DOMContentLoaded', () => dwf.init());
}