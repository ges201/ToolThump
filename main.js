// =================================================================
// SECTION 1: DYNAMIC CONTENT LOADING
// =================================================================

/**
 * Finds all elements with a `data-include` attribute and loads the
 * corresponding HTML file from the `_includes` directory into them.
 * This is used for header, footer, and reusable tool sections.
 */
async function loadIncludes() {
    const includeElements = document.querySelectorAll('[data-include]');
    const projectRootFolderName = "ToolThump"; // Your GitHub repo name

    // Function to calculate the relative path to the project root
    const calculateRelativePath = () => {
        let currentPathname = window.location.pathname;
        let dirPath = currentPathname.substring(0, currentPathname.lastIndexOf('/') + 1);
        let pathSegments = dirPath.split('/').filter(Boolean);
        let depth = 0;
        const projectRootIndex = pathSegments.indexOf(projectRootFolderName);

        if (projectRootIndex !== -1) {
            depth = pathSegments.length - 1 - projectRootIndex;
        } else {
            depth = pathSegments.length;
        }
        if (depth < 0) depth = 0;
        return depth > 0 ? '../'.repeat(depth) : './';
    };

    const relativePathPrefix = calculateRelativePath();

    // Create a fetch promise for each include element
    const fetchPromises = Array.from(includeElements).map(async (element) => {
        const includeName = element.dataset.include;
        const filePath = `${relativePathPrefix}_includes/${includeName}.html`;

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} fetching from ${filePath}`);
            }
            let contentHTML = await response.text();

            // Prepend the relative path to all local 'href' and 'src' attributes
            // This is mainly for the header's logo and links
            if (includeName === 'header') {
                contentHTML = contentHTML.replace(/(href|src)=["'](?!(?:https?:|\/\/|\/|data:|#))([^"']+)["']/g, (match, attr, url) => {
                    return `${attr}="${relativePathPrefix}${url}"`;
                });
            }

            element.innerHTML = contentHTML;
        } catch (error) {
            console.error(`Error loading include '${includeName}':`, error);
            element.innerHTML = `<p style='color:red; text-align:center; padding: 1em;'>Error loading content for '${includeName}'.</p>`;
        }
    });

    // Wait for all includes to be fetched and inserted
    await Promise.all(fetchPromises);
}


// =================================================================
// SECTION 2: HEADER & NAVIGATION LOGIC
// =================================================================

/**
 * Sets up all interactive elements within the header, such as dropdown menus
 * and active link highlighting. This function is called after the header is loaded.
 */
function setupHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    // --- Dropdown Toggling ---
    const categoryButtons = header.querySelectorAll('.category-button');
    categoryButtons.forEach(button => {
        const dropdownId = button.getAttribute('aria-controls');
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;

        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const isExpanded = button.getAttribute('aria-expanded') === 'true';

            // Close other open dropdowns
            header.querySelectorAll('.category-button[aria-expanded="true"]').forEach(otherButton => {
                if (otherButton !== button) {
                    otherButton.setAttribute('aria-expanded', 'false');
                    document.getElementById(otherButton.getAttribute('aria-controls')).classList.remove('show');
                }
            });

            // Toggle the current dropdown
            button.setAttribute('aria-expanded', String(!isExpanded));
            dropdown.classList.toggle('show', !isExpanded);
        });
    });

    // --- Event Listeners for Closing Dropdowns ---
    document.addEventListener('click', (event) => {
        if (!header.contains(event.target)) {
            header.querySelectorAll('.category-button[aria-expanded="true"]').forEach(button => {
                button.setAttribute('aria-expanded', 'false');
                document.getElementById(button.getAttribute('aria-controls')).classList.remove('show');
            });
        }
    });

    header.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.addEventListener('click', (event) => event.stopPropagation());
    });

    // --- Active Link Highlighting ---
    const repoName = "ToolThump";
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
    header.querySelectorAll('.tool-link').forEach(link => {
        const linkPath = new URL(link.href).pathname.replace(/\/index\.html$/, '/');
        if (linkPath === currentPath) {
            link.classList.add('active-link');
        }
    });
}

// =================================================================
// SECTION 3: FOOTER LOGIC
// =================================================================

/**
 * Updates the copyright year in the footer.
 */
function setupFooter() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}


// =================================================================
// SECTION 4: INITIALIZATION
// =================================================================

/**
 * Main execution entry point after the DOM is fully loaded.
 * Orchestrates the loading of includes and setup of components.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load all includes (header, footer, tool-text-section, etc.)
    await loadIncludes();

    // 2. Setup components that depend on the includes
    setupHeader();
    setupFooter();

    // 3. Trigger the specific tool's rendering logic if it exists
    if (typeof window.initializeTool === 'function') {
        window.initializeTool();
    }
});