// =================================================================
// SECTION 1: HEADER & NAVIGATION LOGIC
// =================================================================

/**
 * Fetches the shared header, calculates the correct relative paths for assets,
 * injects the HTML into the page, and then initializes header-dependent scripts.
 */
async function loadHeader() {
    const headerPlaceholder = document.querySelector('header[data-include="main-header"]');
    if (!headerPlaceholder) return;

    // This should be your GitHub repository name.
    const projectRootFolderName = "ToolThump";

    // Calculate the relative path from the current page to the project root.
    let currentPathname = window.location.pathname;
    let dirPath = currentPathname.substring(0, currentPathname.lastIndexOf('/') + 1);
    let pathSegments = dirPath.split('/').filter(Boolean);

    let depth = 0;
    const projectRootIndex = pathSegments.indexOf(projectRootFolderName);

    if (projectRootIndex !== -1) {
        // Calculate depth from the project's root folder onwards.
        depth = pathSegments.length - 1 - projectRootIndex;
    } else {
        // Assumes the project is at the web server's root.
        depth = pathSegments.length;
    }

    if (depth < 0) depth = 0; // Safety check.
    const relativePathPrefix = depth > 0 ? '../'.repeat(depth) : './';
    const headerUrl = `${relativePathPrefix}_includes/header.html`;

    try {
        const response = await fetch(headerUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching from ${headerUrl}`);
        }
        let headerHTML = await response.text();

        // Prepend the relative path to all local 'href' and 'src' attributes in the header.
        headerHTML = headerHTML.replace(/(href|src)=["'](?!(?:https?:|\/\/|\/|data:|#))([^"']+)["']/g, (match, attr, url) => {
            return `${attr}="${relativePathPrefix}${url}"`;
        });

        headerPlaceholder.innerHTML = headerHTML;
        setupDropdowns(); // Initialize dropdowns now that the header is in the DOM.

    } catch (error) {
        console.error("Error loading header:", error);
        headerPlaceholder.innerHTML = `<p style='color:red; text-align:center; padding: 1em;'>Error loading header. Check console for details.</p>`;
    }
}

/**
 * Sets up all interactive elements within the header, such as dropdown menus
 * and active link highlighting. This function is called by loadHeader().
 */
function setupDropdowns() {
    const categoryButtons = document.querySelectorAll('header .category-button');
    const topNav = document.querySelector('header #top-navigation');

    if (!topNav) return;

    // --- Dropdown Toggling ---
    categoryButtons.forEach(button => {
        const dropdownId = button.getAttribute('aria-controls');
        const dropdown = document.getElementById(dropdownId);

        if (!dropdown) {
            console.error('Dropdown menu not found for button:', button);
            return;
        }

        button.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from bubbling to the document.
            const isExpanded = button.getAttribute('aria-expanded') === 'true';

            // First, close any other open dropdowns.
            document.querySelectorAll('header .category-button[aria-expanded="true"]').forEach(otherButton => {
                if (otherButton !== button) {
                    otherButton.setAttribute('aria-expanded', 'false');
                    const otherDropdown = document.getElementById(otherButton.getAttribute('aria-controls'));
                    if (otherDropdown) {
                        otherDropdown.classList.remove('show');
                        otherDropdown.setAttribute('aria-hidden', 'true');
                    }
                }
            });

            // Then, toggle the current dropdown.
            button.setAttribute('aria-expanded', String(!isExpanded));
            dropdown.classList.toggle('show', !isExpanded);
            dropdown.setAttribute('aria-hidden', String(isExpanded));
        });
    });

    // --- Event Listeners for Closing Dropdowns ---

    // Close dropdowns when clicking anywhere outside the navigation area.
    document.addEventListener('click', (event) => {
        if (!topNav.contains(event.target)) {
            document.querySelectorAll('header .category-button[aria-expanded="true"]').forEach(button => {
                button.setAttribute('aria-expanded', 'false');
                const dropdownToClose = document.getElementById(button.getAttribute('aria-controls'));
                if (dropdownToClose) {
                    dropdownToClose.classList.remove('show');
                    dropdownToClose.setAttribute('aria-hidden', 'true');
                }
            });
        }
    });

    // Prevent dropdowns from closing when a click occurs inside the menu itself.
    document.querySelectorAll('header .dropdown-menu').forEach(menu => {
        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    });

    // Close dropdowns after a tool link is clicked.
    document.querySelectorAll('header #top-navigation .tool-link').forEach(link => {
        link.addEventListener('click', function () {
            const parentDropdown = this.closest('.dropdown-menu');
            if (parentDropdown) {
                const controllingButton = document.querySelector(`header .category-button[aria-controls="${parentDropdown.id}"]`);
                if (controllingButton) {
                    controllingButton.setAttribute('aria-expanded', 'false');
                }
                parentDropdown.classList.remove('show');
                parentDropdown.setAttribute('aria-hidden', 'true');
            }
        });
    });

    // --- Active Link Highlighting ---

    // <<<<< IMPORTANT: SET YOUR GITHUB REPO NAME or "" for user/org pages
    const repoName = "ToolThump";
    const currentPath = window.location.pathname;

    document.querySelectorAll('header .tool-link').forEach(link => {
        const linkUrl = new URL(link.href, window.location.origin);
        const normalize = (p) => '/' + p.replace(/^\/|\/$/g, '');

        const normalizedCurrentPath = normalize(currentPath);
        const normalizedLinkPath = normalize(linkUrl.pathname);

        // Check for a direct match or an index page match.
        if (normalizedLinkPath === normalizedCurrentPath ||
            (normalizedCurrentPath === normalize(`/${repoName}/index.html`) && normalizedLinkPath === normalize(`/${repoName}`))) {
            link.classList.add('active-link');
        } else {
            link.classList.remove('active-link');
        }
    });
}

// =================================================================
// SECTION 2: UTILITY FUNCTIONS
// =================================================================

/**
 * Updates the copyright year in the footer.
 */
function updateCopyrightYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// =================================================================
// SECTION 3: INITIALIZATION
// =================================================================

/**
 * Main execution entry point after the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    loadHeader();
    updateCopyrightYear();
});