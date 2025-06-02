// main.js - Updated for Multi-Page Application (MPA) structure

// Update the current year in the footer
function updateCopyrightYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// --- Dropdown Menu Logic ---
function setupDropdowns() {
    const categoryButtons = document.querySelectorAll('.category-button');

    categoryButtons.forEach(button => {
        const dropdown = button.nextElementSibling; // Assumes dropdown is immediately after button
        // Ensure the next element is indeed the dropdown menu
        if (!dropdown || !dropdown.classList.contains('dropdown-menu')) {
            console.error('Dropdown menu not found for button:', button);
            return;
        }

        button.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from bubbling to document
            const isExpanded = button.getAttribute('aria-expanded') === 'true';

            // Close all other open dropdowns first
            document.querySelectorAll('.category-button[aria-expanded="true"]').forEach(otherButton => {
                if (otherButton !== button) {
                    otherButton.setAttribute('aria-expanded', 'false');
                    const otherDropdown = otherButton.nextElementSibling;
                    if (otherDropdown && otherDropdown.classList.contains('dropdown-menu')) {
                        otherDropdown.classList.remove('show');
                    }
                }
            });

            // Toggle current dropdown
            button.setAttribute('aria-expanded', String(!isExpanded));
            dropdown.classList.toggle('show', !isExpanded);
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.category-button[aria-expanded="true"]').forEach(button => {
            button.setAttribute('aria-expanded', 'false');
            const dropdownToClose = button.nextElementSibling;
            if (dropdownToClose && dropdownToClose.classList.contains('dropdown-menu')) {
                dropdownToClose.classList.remove('show');
            }
        });
    });

    // Prevent dropdowns from closing when clicking inside them
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    });

    // Close dropdown when a tool link is clicked (navigation will happen via href)
    document.querySelectorAll('#top-navigation .tool-link').forEach(link => {
        link.addEventListener('click', function () { // Using function() to get `this`
            const parentDropdown = this.closest('.dropdown-menu');
            if (parentDropdown) {
                const parentCategoryButton = parentDropdown.previousElementSibling;
                if (parentCategoryButton && parentCategoryButton.classList.contains('category-button')) {
                    parentCategoryButton.setAttribute('aria-expanded', 'false');
                }
                parentDropdown.classList.remove('show');
            }
            // The browser will handle navigation to the link's href attribute
        });
    });
}


// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    updateCopyrightYear();
    setupDropdowns(); // Initialize dropdown functionality

    // Tool-specific initializations (like pg.init() or psc.init())
    // should now be handled on their respective tool pages or within
    // their dedicated JS files (e.g., passwordGenerator.js might call pg.init() itself).

    // For example, on tools/security/html/password-generator.html,
    // you might have a script tag that calls:
    // if (typeof pg !== 'undefined') {
    //     pg.init();
    // }
    // Or, more simply, passwordGenerator.js itself could just run the init code
    // when it's loaded on the correct page.
});I