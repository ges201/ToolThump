// =================================================================
// SECTION 0: IMMEDIATE THEME INITIALIZATION
// =================================================================
// This IIFE runs instantly to set the theme from localStorage or system preference,
// preventing a flash of the wrong theme on page load.
(function () {
    const THEME_KEY = 'toolthump-theme';
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersLight) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();


// =================================================================
// SECTION 1: DYNAMIC CONTENT LOADING
// =================================================================

/**
 * Finds all elements with a `data-include` attribute and loads the
 * corresponding HTML file from the `_includes` directory into them.
 */
async function loadIncludes() {
    const includeElements = document.querySelectorAll('[data-include]');
    const projectRootFolderName = "ToolThump"; // Your GitHub repo name

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

    const fetchPromises = Array.from(includeElements).map(async (element) => {
        const includeName = element.dataset.include;
        const filePath = `${relativePathPrefix}_includes/${includeName}.html`;

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} fetching from ${filePath}`);
            }
            let contentHTML = await response.text();

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

    await Promise.all(fetchPromises);
}


// =================================================================
// SECTION 2: HEADER & NAVIGATION LOGIC
// =================================================================

/**
 * Sets up all interactive elements within the header.
 */
function setupHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    const categoryButtons = header.querySelectorAll('.category-button');
    categoryButtons.forEach(button => {
        const dropdownId = button.getAttribute('aria-controls');
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;

        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            header.querySelectorAll('.category-button[aria-expanded="true"]').forEach(otherButton => {
                if (otherButton !== button) {
                    otherButton.setAttribute('aria-expanded', 'false');
                    document.getElementById(otherButton.getAttribute('aria-controls')).classList.remove('show');
                }
            });
            button.setAttribute('aria-expanded', String(!isExpanded));
            dropdown.classList.toggle('show', !isExpanded);
        });
    });

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
// SECTION 4: REUSABLE TOOL TEXT SECTION LOGIC (NEW)
// =================================================================

/**
 * Initializes and renders the tool's text sections (How-to, Features, FAQ)
 * based on a JSON data island. This is a global function.
 */
function initializeToolTextSections() {
    const dataElement = document.getElementById('tool-text-data');
    const mainContainer = document.getElementById('tool-text-sections-container');

    // If the page doesn't have the required data or container, do nothing.
    if (!dataElement || !mainContainer) {
        return;
    }

    const sectionTemplate = document.getElementById('template-section');
    const featureItemTemplate = document.getElementById('template-feature-item');
    const faqItemTemplate = document.getElementById('template-faq-item');

    if (!sectionTemplate || !featureItemTemplate || !faqItemTemplate) {
        console.error("TOOL_TEXT_INIT: Missing required templates in tool-text-section.html. Aborting.");
        return;
    }

    try {
        const toolTextData = JSON.parse(dataElement.textContent);
        generateSections(toolTextData);
        setupAccordion();
    } catch (error) {
        console.error("TOOL_TEXT_INIT: Error parsing or rendering tool text data:", error);
    }

    function generateSections(data) {
        data.sections.forEach(sectionData => {
            const sectionClone = sectionTemplate.content.cloneNode(true);
            const h2 = sectionClone.querySelector('h2');
            const sectionContent = sectionClone.querySelector('.section-content');

            h2.querySelector('.section-icon').textContent = sectionData.icon;
            h2.append(sectionData.title);

            if (sectionData.intro) {
                const p = document.createElement('p');
                p.textContent = sectionData.intro;
                sectionContent.appendChild(p);
            }

            const items = sectionData.steps || sectionData.features;
            if (items) {
                const list = document.createElement('ul');
                list.className = 'features-list';
                items.forEach(itemData => {
                    const itemClone = featureItemTemplate.content.cloneNode(true);
                    itemClone.querySelector('.feature-icon').textContent = itemData.icon;
                    itemClone.querySelector('strong').textContent = itemData.title;
                    itemClone.querySelector('p').textContent = itemData.description;
                    list.appendChild(itemClone);
                });
                sectionContent.appendChild(list);
            }

            if (sectionData.content) {
                sectionData.content.forEach(paragraphText => {
                    const p = document.createElement('p');
                    p.innerHTML = paragraphText;
                    sectionContent.appendChild(p);
                });
            }

            if (sectionData.faqs) {
                const accordionContainer = document.createElement('div');
                accordionContainer.className = 'accordion-container';
                sectionData.faqs.forEach(faqData => {
                    const itemClone = faqItemTemplate.content.cloneNode(true);
                    itemClone.querySelector('.accordion-icon').textContent = faqData.icon;
                    itemClone.querySelector('strong').textContent = faqData.question;
                    itemClone.querySelector('.accordion-content p').innerHTML = faqData.answer;
                    accordionContainer.appendChild(itemClone);
                });
                sectionContent.appendChild(accordionContainer);
            }
            mainContainer.appendChild(sectionClone);
        });
    }

    function setupAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isOpening = !header.classList.contains('active');

                // Close all other items for a cleaner accordion experience
                accordionHeaders.forEach(h => {
                    if (h !== header) {
                        h.classList.remove('active');
                        h.nextElementSibling.style.maxHeight = null;
                    }
                });

                // Toggle the clicked item
                header.classList.toggle('active', isOpening);
                content.style.maxHeight = isOpening ? content.scrollHeight + 'px' : null;
            });
        });
    }
}


// =================================================================
// SECTION 5: THEME TOGGLE LOGIC (NEW)
// =================================================================

// Function to fetch and cache SVG content
const svgCache = {};
async function fetchAndCacheSvg(url) {
    if (svgCache[url]) {
        return svgCache[url];
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }
        const svgText = await response.text();
        svgCache[url] = svgText;
        return svgText;
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Function to replace <img> with inline <svg>
async function inlineSvgImages() {
    const images = document.querySelectorAll('img.theme-icon-svg');
    for (const img of images) {
        const svgUrl = img.src;
        const svgContent = await fetchAndCacheSvg(svgUrl);
        if (svgContent) {
            // Create a new element to parse the SVG content
            const div = document.createElement('div');
            div.innerHTML = svgContent;
            const svgElement = div.querySelector('svg');

            if (svgElement) {
                // Copy attributes from <img> to <svg>
                svgElement.setAttribute('class', img.getAttribute('class'));
                svgElement.setAttribute('id', img.getAttribute('id'));
                svgElement.setAttribute('alt', img.getAttribute('alt'));

                // Replace <img> with <svg>
                img.parentNode.replaceChild(svgElement, img);
            }
        }
    }
}

const THEME_KEY = 'toolthump-theme';

/**
 * Applies the selected theme and updates the toggle button's state.
 * @param {string} theme - The theme to apply ('light' or 'dark').
 */
function applyTheme(theme) {
    const root = document.documentElement;
    const toggleButton = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    if (!toggleButton || !sunIcon || !moonIcon) return;

    const isDark = theme === 'dark';

    root.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    moonIcon.classList.toggle('hidden', !isDark);
    sunIcon.classList.toggle('hidden', isDark);

    toggleButton.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
}

/**
 * Sets up the theme toggle button and syncs its UI with the current theme.
 */
function setupThemeToggle() {
    const toggleButton = document.getElementById('theme-toggle');
    if (!toggleButton) return;

    // Sync button UI with the theme set by the FOUC script
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(currentTheme);

    toggleButton.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });
}


// =================================================================
// SECTION 6: INITIALIZATION (was Section 5)
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load all includes (header, footer, etc.)
    await loadIncludes();

    // 2. Setup components that depend on the includes
    await inlineSvgImages();
    setupHeader();
    setupFooter();
    setupThemeToggle(); // Setup the theme toggle after header is loaded
    initializeToolTextSections();

    // 3. Trigger the specific tool's unique rendering logic if it exists
    if (typeof window.initializeTool === 'function') {
        window.initializeTool();
    }
});