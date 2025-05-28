// Function to show the selected tool and hide others
function showTool(toolId) {
    const toolContents = document.querySelectorAll('.tool-content');
    const toolLinks = document.querySelectorAll('#top-navigation .tool-link'); // Updated selector

    toolContents.forEach(content => {
        content.classList.remove('active');
    });
    toolLinks.forEach(link => {
        link.classList.remove('active-link');
    });

    const activeToolId = toolId || 'home';

    const selectedTool = document.getElementById(activeToolId);
    if (selectedTool) {
        selectedTool.classList.add('active');
    }

    const activeLink = document.querySelector(`#top-navigation .tool-link[href="#${activeToolId}"]`); // Updated selector
    if (activeLink) {
        activeLink.classList.add('active-link');
    }
}

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
            event.stopPropagation(); // VERY IMPORTANT: Prevent click from bubbling to document
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
            button.setAttribute('aria-expanded', String(!isExpanded)); // Explicitly use String()
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
            event.stopPropagation(); // VERY IMPORTANT
        });
    });

    // Close dropdown when a tool link is clicked and navigate
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
            // Hash change will be handled by the global listener to show the tool
        });
    });
}


// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    updateCopyrightYear();
    setupDropdowns(); // Initialize dropdown functionality

    // Initialize Password Generator
    if (typeof pg !== 'undefined' && document.getElementById('passwordGenerator')) {
        pg.init();
    }

    // Initialize Password Strength Checker
    if (typeof psc !== 'undefined' && document.getElementById('passwordStrengthChecker')) {
        psc.init();
    }

    function handleHashChange() {
        const currentHash = window.location.hash.substring(1);
        showTool(currentHash || 'home');
    }

    window.addEventListener('hashchange', handleHashChange, false);
    handleHashChange(); // Initial tool display
});