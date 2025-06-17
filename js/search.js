document.addEventListener('DOMContentLoaded', () => {
    // Only execute on the homepage
    const searchInput = document.getElementById('home-search-input');
    if (!searchInput) return;

    const resultsContainer = document.getElementById('search-results-container');
    const searchWrapper = document.querySelector('.search-wrapper');

    if (!resultsContainer || !searchWrapper) {
        console.error("Search containers not found. Please check your index.html structure.");
        return;
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (query.length > 0) {
            const results = performSearch(query);
            renderResults(results, query);
            resultsContainer.style.display = 'block'; // Show dropdown
        } else {
            resultsContainer.style.display = 'none'; // Hide dropdown
            resultsContainer.innerHTML = '';
        }
    });

    /**
     * Performs a case-insensitive search for full words within the tools data.
     * Matches if all query words are found in either the tool's name or its keywords.
     * @param {string} query The user's search term.
     * @returns {Array} An array of matching tool objects.
     */
    function performSearch(query) {
        const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 0);

        return toolsData.filter(tool => {
            const toolName = tool.name.toLowerCase();
            const toolKeywordsString = tool.keywords.join(' ').toLowerCase(); // Create a single string of all keywords

            // Check if every word in the query is present in the tool's name OR its keywords
            return queryWords.every(word => {
                // We use a regular expression with a word boundary (\b) to ensure
                // we are matching full words (or words starting with the query word).
                // e.g., 'pass' will match 'password' but not 'bypass' if word is at the start.
                // If you want to match anywhere in a word, remove the first \b: new RegExp(`${word}`, 'i');
                const regex = new RegExp(`\\b${word}`, 'i');
                return regex.test(toolName) || regex.test(toolKeywordsString);
            });
        });
    }

    // Show results on focus if there's already a query
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length > 0) {
            resultsContainer.style.display = 'block';
        }
    });

    // Hide results when clicking outside the search wrapper
    document.addEventListener('click', (event) => {
        if (!searchWrapper.contains(event.target)) {
            resultsContainer.style.display = 'none';
        }
    });

    function renderResults(results, query) {
        resultsContainer.innerHTML = ''; // Clear previous results

        if (results.length === 0) {
            resultsContainer.innerHTML = `<p class="no-results">No tools found for "<strong>${escapeHTML(query)}</strong>".</p>`;
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'search-results-list';

        results.forEach((item) => { // item is the tool object directly
            const li = document.createElement('li');
            li.className = 'search-result-item';

            li.innerHTML = `
                <a href="${item.htmlPath}" class="result-link">
                    <img src="${item.icon}" alt="" class="result-icon">
                    <div class="result-details">
                        <span class="result-name">${item.name}</span>
                        <span class="result-category">${item.category}</span>
                    </div>
                </a>
            `;
            ul.appendChild(li);
        });

        resultsContainer.appendChild(ul);
    }

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }
});