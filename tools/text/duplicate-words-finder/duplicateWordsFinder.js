// tools/text/duplicate-words-finder/duplicateWordsFinder.js
const dwf = {
    textInput: null,
    findBtn: null,
    outputBox: null,
    caseSensitiveCheckbox: null,
    currentHighlightWord: null, // Track the currently highlighted word

    fetchElements: function () {
        this.textInput = document.getElementById('dwf-text-input');
        this.findBtn = document.getElementById('dwf-find-btn');
        this.outputBox = document.getElementById('dwf-output');
        this.caseSensitiveCheckbox = document.getElementById('dwf-case-sensitive');
    },

    findDuplicates: function () {
        if (!this.textInput || !this.outputBox) {
            console.error("DWF_FIND: Missing required elements.");
            this.outputBox.innerHTML = '<p class="dwf-error-message">Error: Could not initialize tool components.</p>';
            return;
        }

        let text = this.textInput.textContent.trim();
        const isCaseSensitive = this.caseSensitiveCheckbox.checked;

        this.outputBox.innerHTML = ''; // Clear previous results
        this.removeHighlights(); // Clear highlights when finding new duplicates

        if (text.length === 0) {
            this.outputBox.innerHTML = '<p class="dwf-results-placeholder">Please enter some text to analyze.</p>';
            return;
        }

        // Pre-process text based on options
        let processedText = text;
        if (!isCaseSensitive) {
            processedText = processedText.toLowerCase();
        }
        // Always ignore punctuation
        processedText = processedText.replace(/[.,\/#!$%\^&*\*;:{}=\-_`~()\[\]?]/g, ' ');
        processedText = processedText.replace(/\s{2,}/g, ' '); // Replace multiple spaces with a single one


        const words = processedText.split(/\s+/).filter(word => word.length > 0);
        const wordCounts = {};

        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });

        const duplicates = Object.entries(wordCounts)
            .filter(([_, count]) => count > 1)
            .sort(([, countA], [, countB]) => countB - countA);

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
            row.className = 'dwf-result-row'; // Add a class for styling and selection
            row.dataset.word = word; // Store the word in a data attribute
            row.setAttribute('role', 'button');
            row.setAttribute('tabindex', '0');


            const cellWord = row.insertCell();
            cellWord.className = 'dwf-word-col';
            cellWord.textContent = word;

            const cellCount = row.insertCell();
            cellCount.className = 'dwf-count-col';
            cellCount.textContent = count;
        });

        this.outputBox.appendChild(table);

        // Add event listener to the table body for delegation
        tbody.addEventListener('click', (event) => {
            const row = event.target.closest('.dwf-result-row');
            if (row) {
                this.highlightWord(row.dataset.word);
            }
        });
        tbody.addEventListener('keydown', (event) => {
            const row = event.target.closest('.dwf-result-row');
            if (row && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                this.highlightWord(row.dataset.word);
            }
        });
    },

    highlightWord: function (wordToHighlight) {
        this.removeHighlights(); // Remove previous highlights first

        if (!wordToHighlight || wordToHighlight.length === 0) return;

        this.currentHighlightWord = wordToHighlight;
        const isCaseSensitive = this.caseSensitiveCheckbox.checked;
        const flags = isCaseSensitive ? 'g' : 'gi';
        const regex = new RegExp(`\\b(${wordToHighlight})\\b`, flags);

        const originalContent = this.textInput.innerHTML;
        const highlightedContent = originalContent.replace(regex, '<span class="dwf-highlight">$1</span>');

        this.textInput.innerHTML = highlightedContent;
    },

    removeHighlights: function () {
        this.currentHighlightWord = null;
        const highlights = this.textInput.querySelectorAll('span.dwf-highlight');
        highlights.forEach(span => {
            // Replace the span with its own text content
            span.outerHTML = span.textContent;
        });

        // Normalize the text nodes to merge adjacent ones
        this.textInput.normalize();
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

        // Listen for input events on the contenteditable div
        this.textInput.addEventListener('input', () => {
            // If there's a highlighted word, re-apply highlights as user types
            if (this.currentHighlightWord) {
                // A simplified re-highlight. A more robust solution might be needed
                // for complex edits, but this handles simple typing well.
                const word = this.currentHighlightWord;
                this.removeHighlights(); // Temporarily remove to avoid nested spans
                this.highlightWord(word);
            }
        });


        this.caseSensitiveCheckbox.addEventListener('change', () => {
            if (this.textInput.textContent.trim().length > 0) this.findDuplicates();
        });

        console.log("Duplicate Word Finder Initialized.");
    }
};

if (document.getElementById('duplicateWordsFinder')) {
    document.addEventListener('DOMContentLoaded', () => dwf.init());
}