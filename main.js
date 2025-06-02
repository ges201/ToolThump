// main.js - Updated for Multi-Page Application (MPA) structure

// --- Copyright Year ---
function updateCopyrightYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// --- Dropdown Menu Logic ---
function setupDropdowns() {
    // Ensure this function is called AFTER the header is loaded
    const categoryButtons = document.querySelectorAll('header .category-button'); // Scoped to header
    const topNav = document.querySelector('header #top-navigation'); // Scoped to header

    if (!topNav) {
        // console.warn("Top navigation not found. Dropdowns might not work.");
        return;
    }

    categoryButtons.forEach(button => {
        // In _includes/header.html, the dropdown menu is a sibling <ul>.
        // The original setupDropdowns assumed .nextElementSibling, which is fine.
        // However, to be more robust if structure changes slightly,
        // we can use aria-controls which is more semantic.
        const dropdownId = button.getAttribute('aria-controls');
        const dropdown = document.getElementById(dropdownId);

        if (!dropdown || !dropdown.classList.contains('dropdown-menu')) {
            console.error('Dropdown menu not found for button:', button, 'with ID:', dropdownId);
            return;
        }

        button.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from bubbling to document
            const isExpanded = button.getAttribute('aria-expanded') === 'true';

            // Close all other open dropdowns first
            document.querySelectorAll('header .category-button[aria-expanded="true"]').forEach(otherButton => {
                if (otherButton !== button) {
                    otherButton.setAttribute('aria-expanded', 'false');
                    const otherDropdownId = otherButton.getAttribute('aria-controls');
                    const otherDropdown = document.getElementById(otherDropdownId);
                    if (otherDropdown && otherDropdown.classList.contains('dropdown-menu')) {
                        otherDropdown.classList.remove('show'); // Using 'show' as per your original
                        otherDropdown.setAttribute('aria-hidden', 'true'); // Good practice
                    }
                }
            });

            // Toggle current dropdown
            button.setAttribute('aria-expanded', String(!isExpanded));
            dropdown.classList.toggle('show', !isExpanded);
            dropdown.setAttribute('aria-hidden', String(isExpanded)); // Good practice
        });
    });

    // Close dropdowns when clicking outside the navigation
    document.addEventListener('click', (event) => {
        if (!topNav.contains(event.target)) {
            document.querySelectorAll('header .category-button[aria-expanded="true"]').forEach(button => {
                button.setAttribute('aria-expanded', 'false');
                const dropdownToCloseId = button.getAttribute('aria-controls');
                const dropdownToClose = document.getElementById(dropdownToCloseId);
                if (dropdownToClose && dropdownToClose.classList.contains('dropdown-menu')) {
                    dropdownToClose.classList.remove('show');
                    dropdownToClose.setAttribute('aria-hidden', 'true');
                }
            });
        }
    });

    // Prevent dropdowns from closing when clicking inside them
    // The '.show' class for visibility is from your original JS.
    // The '.open' class for visibility was from my example, I'll stick to '.show'.
    document.querySelectorAll('header .dropdown-menu').forEach(menu => {
        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    });

    // Close dropdown when a tool link is clicked (navigation will happen via href)
    document.querySelectorAll('header #top-navigation .tool-link').forEach(link => {
        link.addEventListener('click', function () { // Using function() to get `this`
            const parentDropdown = this.closest('.dropdown-menu');
            if (parentDropdown) {
                const controllingButton = document.querySelector(`header .category-button[aria-controls="${parentDropdown.id}"]`);
                if (controllingButton) {
                    controllingButton.setAttribute('aria-expanded', 'false');
                }
                parentDropdown.classList.remove('show');
                parentDropdown.setAttribute('aria-hidden', 'true');
            }
            // The browser will handle navigation to the link's href attribute
        });
    });

    // Add .active-link to the link that matches the current page
    // Adjust repoName if your GitHub repository has a different name.
    // If it's a user/org page (username.github.io), set repoName to an empty string "" or null.
    const repoName = "ToolThump"; // <<<<< IMPORTANT: SET YOUR GITHUB REPO NAME or "" for user/org pages

    let currentPath = window.location.pathname;

    // For GitHub Pages project sites, the path includes the repo name.
    // We want to compare link hrefs relative to the site root.
    // e.g. on username.github.io/ToolThump/tools/page.html, currentPath is /ToolThump/tools/page.html
    // A link href might be "/ToolThump/tools/other.html" or "tools/other.html" (if using relative paths from root in header.html)
    const baseHref = document.querySelector('base') ? document.querySelector('base').getAttribute('href') : '/';

    const navLinks = document.querySelectorAll('header .tool-link');
    navLinks.forEach(link => {
        const linkUrl = new URL(link.href, window.location.origin); // Resolve relative URLs
        let linkPath = linkUrl.pathname;

        // Normalize paths (remove trailing slashes, ensure leading slash)
        const normalize = (p) => '/' + p.replace(/^\/|\/$/g, ''); // remove leading/trailing, ensure one leading

        const normalizedCurrentPath = normalize(currentPath);
        let normalizedLinkPath = normalize(linkPath);

        // If on GitHub project page and linkPath doesn't include repoName but currentPath does, adjust
        // This scenario assumes links in header.html are root-relative but *don't* include the repo name.
        // However, our header loading script *prepends* the relative path, so link.href will be absolute.
        // So, this adjustment might be less critical if header links are already absolute or correctly prefixed.

        if (normalizedLinkPath === normalizedCurrentPath ||
            (normalizedCurrentPath === normalize(`/${repoName}/index.html`) && normalizedLinkPath === normalize(`/${repoName}`))) { // Handle index.html case
            link.classList.add('active-link');
            const parentDropdownMenu = link.closest('.dropdown-menu');
            if (parentDropdownMenu) {
                const controllingButton = document.querySelector(`header .category-button[aria-controls="${parentDropdownMenu.id}"]`);
                if (controllingButton) {
                    // Optional: Automatically expand the category of the active tool
                    // controllingButton.setAttribute('aria-expanded', 'true');
                    // parentDropdownMenu.classList.add('show');
                    // parentDropdownMenu.setAttribute('aria-hidden', 'false');
                }
            }
        } else {
            link.classList.remove('active-link');
        }
    });
}


// --- Header Loading Logic ---
async function loadHeader() {
    const headerPlaceholder = document.querySelector('header[data-include="main-header"]');
    if (!headerPlaceholder) {
        // console.warn("Header placeholder 'header[data-include=\"main-header\"]' not found.");
        return; // No placeholder, no action
    }

    // IMPORTANT: This should be the name of your project's root folder,
    // which is "ToolThump" based on your structure.
    const projectRootFolderName = "ToolThump";

    let currentPathname = window.location.pathname; // e.g., /ToolThump/tools/security/html/page.html or /tools/security/html/page.html

    // Get the directory path from the full pathname
    // e.g., /ToolThump/tools/security/html/page.html -> /ToolThump/tools/security/html/
    let dirPath = currentPathname.substring(0, currentPathname.lastIndexOf('/') + 1);

    // Split the directory path into segments, removing empty strings from leading/trailing slashes
    let pathSegments = dirPath.split('/').filter(Boolean);
    // e.g., /MyHost/ToolThump/tools/html/ -> ["MyHost", "ToolThump", "tools", "html"]
    // e.g., /tools/html/ (if ToolThump is web root) -> ["tools", "html"]

    let depth = 0;

    // Find the index of our project's root folder name in the path segments
    const projectRootIndex = pathSegments.indexOf(projectRootFolderName);

    if (projectRootIndex !== -1) {
        // If the project root folder name ("ToolThump") is found in the path,
        // calculate depth from that point onwards.
        // e.g., pathSegments = ["MyHost", "ToolThump", "tools", "html"], projectRootIndex = 1
        // Number of segments *after* "ToolThump" is pathSegments.length - 1 - projectRootIndex
        // For ["MyHost", "ToolThump", "tools", "html"], depth for "tools/html/" is 2.
        depth = pathSegments.length - 1 - projectRootIndex;
    } else {
        // If "ToolThump" is NOT in the path segments, it implies:
        // 1. The "ToolThump" directory itself is the web server's root.
        //    e.g., currentPathname = /tools/html/page.html -> pathSegments = ["tools", "html"]
        // 2. Or, it's a GitHub User/Org page (username.github.io/) where repo name isn't in path.
        // In this case, depth is simply the number of segments.
        depth = pathSegments.length;
    }

    // Handle cases like being at the project root itself:
    // e.g., /ToolThump/ -> pathSegments = ["ToolThump"] -> projectRootIndex = 0. depth = 1 - 1 - 0 = 0.
    // e.g., / (if ToolThump is web root) -> pathSegments = [] -> projectRootIndex = -1. depth = 0.
    if (depth < 0) depth = 0; // Safety check

    let relativePathPrefix = depth > 0 ? '../'.repeat(depth) : './';

    const headerUrl = `${relativePathPrefix}_includes/header.html`;
    // For debugging, you can log this:
    // console.log(`Current page: ${currentPathname}, Calculated prefix: ${relativePathPrefix}, Fetching: ${headerUrl}`);

    try {
        const response = await fetch(headerUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch header: ${response.status} from ${headerUrl}. Check path and server setup.`);
        }
        let headerHTML = await response.text();

        // Adjust 'href' and 'src' attributes in the fetched HTML.
        headerHTML = headerHTML.replace(/(href|src)=["'](?!(?:https?:|\/\/|\/|data:|#))([^"']+)["']/g, (match, attr, url) => {
            return `${attr}="${relativePathPrefix}${url}"`;
        });

        headerPlaceholder.innerHTML = headerHTML;
        // NOW that the header HTML is in the DOM, initialize dropdowns and other header-dependent JS
        if (typeof setupDropdowns === 'function') {
            setupDropdowns();
        } else {
            // console.warn('setupDropdowns function not found after loading header.');
        }
    } catch (error) {
        console.error("Error loading header:", error);
        if (headerPlaceholder) {
            headerPlaceholder.innerHTML = `<p style='color:red; text-align:center; padding: 1em;'>Error loading header. Details: ${error.message}<br>Calculated prefix: <code>${relativePathPrefix}</code><br>Attempted URL: <code>${headerUrl}</code></p>`;
        }
        // Fallback or ensure critical functionalities if header fails
        if (typeof setupDropdowns === 'function') {
            // console.log("Attempting to run setupDropdowns even though header load failed, in case of static content.");
            setupDropdowns();
        }
    }
}

// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    loadHeader(); // Load header first
    updateCopyrightYear();

    // Tool-specific initializations (like pg.init() or psc.init())
    // should now be handled on their respective tool pages or within
    // their dedicated JS files (e.g., passwordGenerator.js might call pg.init() itself).
});