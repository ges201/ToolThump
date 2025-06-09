import { passwordInput } from './dom-elements.js';
import { updateUI } from './ui-updater.js';

function init() {
    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
                e.preventDefault();
            }
        });

        passwordInput.addEventListener('input', (e) => {
            const inputElement = e.target;
            let currentValue = inputElement.value;

            if (currentValue.includes(' ')) {
                const originalSelectionStart = inputElement.selectionStart;
                const textBeforeSelection = currentValue.substring(0, originalSelectionStart);
                const spacesRemovedBeforeCursor = (textBeforeSelection.match(/ /g) || []).length;
                const newValue = currentValue.replace(/ /g, '');
                inputElement.value = newValue;
                const newCursorPosition = originalSelectionStart - spacesRemovedBeforeCursor;
                inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
                updateUI(newValue);
            } else {
                updateUI(currentValue);
            }
        });

        let initialValue = passwordInput.value;
        if (initialValue.includes(' ')) {
            const newValue = initialValue.replace(/ /g, '');
            passwordInput.value = newValue;
            updateUI(newValue);
        } else {
            updateUI(initialValue);
        }

        console.log("Enhanced Password Strength Checker with Entropy Initialized.");
    } else {
        console.error("PSC_INIT: Password Strength Checker: Input field not found. Aborting init.");
    }
}

if (document.getElementById('passwordStrengthChecker')) {
    init();
}