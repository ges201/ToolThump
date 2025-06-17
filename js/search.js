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
            // Use our new custom search function instead of Fuse.js
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
     * @param {string} query The user's search term.
     * @returns {Array} An array of matching tool objects.
     */
    function performSearch(query) {
        const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 0);

        return toolsData.filter(tool => {
            const toolName = tool.name.toLowerCase();
            // Check if every word in the query is present in the tool's name
            return queryWords.every(word => {
                // We use a regular expression with a word boundary (\b) to ensure
                // we are matching full words only.
                // e.g., 'pass' will not match 'password'.
                const regex = new RegExp(`\\b${word}`, 'i');
                return regex.test(toolName);
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

        // The result is the tool object directly now, no need for .item
        results.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'search-result-item';

            li.innerHTML = `
                <a href="${item.htmlPath}" class="result-link">  <!-- CORRECTED HERE -->
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