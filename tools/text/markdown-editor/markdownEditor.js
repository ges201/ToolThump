/**
 * Initializes the Markdown Editor tool.
 * This function is called by main.js after the DOM is fully loaded.
 */
window.initializeTool = () => {
    const markdownInput = document.getElementById('markdown-input');
    const htmlPreview = document.getElementById('html-preview');
    const exportButton = document.getElementById('export-md-button');
    const clearButton = document.getElementById('clear-button');
    const statusMessage = document.getElementById('export-status-message');
    let messageTimer; // Holds the timer for hiding messages
    let isSyncing = false; // Flag to prevent scroll event loops

    // Check if essential elements and libraries exist
    if (!markdownInput || !htmlPreview || !exportButton || !clearButton || !statusMessage) {
        console.error("MARKDOWN_EDITOR_INIT: Missing a required element. Aborting.");
        return;
    }
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
        console.error("MARKDOWN_EDITOR_INIT: 'marked' or 'DOMPurify' library not found. Aborting.");
        htmlPreview.innerHTML = `<p style="color: var(--error-color);">Error: A required library failed to load. Please check your connection and try again.</p>`;
        return;
    }

    /**
     * Displays a status message to the user and hides it after a delay.
     * @param {string} message The text to display.
     * @param {string} type The type of message ('warning', 'error').
     * @param {number} duration How long to display the message in ms.
     */
    const showStatusMessage = (message, type = 'warning', duration = 3500) => {
        clearTimeout(messageTimer); // Clear any previous message timer
        statusMessage.textContent = message;
        statusMessage.className = 'status-message'; // Reset classes
        statusMessage.classList.add(type, 'visible');

        messageTimer = setTimeout(() => {
            statusMessage.classList.remove('visible');
        }, duration);
    };

    /**
     * Renders the Markdown from the input textarea into the preview pane.
     */
    const updatePreview = () => {
        const rawMarkdown = markdownInput.value;
        const dirtyHtml = marked.parse(rawMarkdown);
        const cleanHtml = DOMPurify.sanitize(dirtyHtml);
        htmlPreview.innerHTML = cleanHtml;
    };

    /**
     * Handles the click event for the export button.
     */
    const handleExport = () => {
        const markdownContent = markdownInput.value;

        if (markdownContent.trim() === '') {
            showStatusMessage('The editor is empty. There is nothing to export.', 'warning');
            return;
        }

        try {
            const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'export.md';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("MARKDOWN_EDITOR_EXPORT: Failed to export file.", error);
            showStatusMessage('Sorry, the file could not be exported.', 'error');
        }
    };

    /**
     * Handles the click event for the clear button.
     */
    const handleClear = () => {
        markdownInput.value = '';
        updatePreview();
        markdownInput.focus(); // For better UX
    };

    /**
     * Synchronizes scroll position from a source element to a target element.
     * @param {HTMLElement} source - The element that triggered the scroll.
     * @param {HTMLElement} target - The element to be scrolled.
     */
    const syncScroll = (source, target) => {
        // If the scroll event was triggered by our own code, reset the flag and exit.
        if (isSyncing) {
            isSyncing = false;
            return;
        }

        const sourceMaxScroll = source.scrollHeight - source.clientHeight;
        // Avoid division by zero if the content isn't scrollable.
        if (sourceMaxScroll <= 0) {
            return;
        }

        const scrollPercentage = source.scrollTop / sourceMaxScroll;
        const targetScrollTop = scrollPercentage * (target.scrollHeight - target.clientHeight);

        // Set the flag before programmatically scrolling the target to prevent a loop.
        isSyncing = true;
        target.scrollTop = targetScrollTop;
    };

    // Add event listeners
    markdownInput.addEventListener('input', updatePreview);
    exportButton.addEventListener('click', handleExport);
    clearButton.addEventListener('click', handleClear);

    // Add scroll listeners for synchronization
    markdownInput.addEventListener('scroll', () => syncScroll(markdownInput, htmlPreview));
    htmlPreview.addEventListener('scroll', () => syncScroll(htmlPreview, markdownInput));

    // Perform an initial render
    updatePreview();
};