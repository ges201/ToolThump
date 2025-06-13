import { passwordInput, hibpCheckBtn, hibpResultContainer } from './dom-elements.js';
import { updateUI } from './ui-updater.js';
import { checkPasswordPwned } from './hibp-checker.js';

// === SVG Icons for HIBP UI ===
const ICONS = {
    shield: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"></path></svg>`,
    loader: `<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"></path></svg>`,
    pwned: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 16l-4-4 1.41-1.41L11 14.17l4.59-4.58L17 11l-6 6z" transform="scale(0.8) translate(3, 3)"></path><path fill="red" d="M19.14,12.5l1.76-1.76-1.41-1.41-1.76,1.76-1.76-1.76-1.41,1.41,1.76,1.76-1.76,1.76,1.41,1.41,1.76-1.76,1.76,1.76,1.41-1.41Z"/></svg>`,
    notPwned: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 16l-4-4 1.41-1.41L11 14.17l4.59-4.58L17 11l-6 6z"></path></svg>`,
    error: `<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path></svg>`,
};

/**
 * Updates the HIBP button's UI state.
 * @param { 'idle' | 'loading' } state The new state for the button.
 */
function setButtonState(state) {
    const btnIcon = hibpCheckBtn.querySelector('.btn-icon');
    const btnText = hibpCheckBtn.querySelector('.btn-text');

    hibpCheckBtn.classList.remove('loading');

    if (state === 'loading') {
        hibpCheckBtn.disabled = true;
        hibpCheckBtn.classList.add('loading');
        btnIcon.innerHTML = ICONS.loader;
        btnText.textContent = 'Checking...';
    } else { // idle
        hibpCheckBtn.disabled = passwordInput.value.length === 0;
        btnIcon.innerHTML = ICONS.shield;
        btnText.textContent = 'Check for Breaches';
    }
}

/**
 * Shows the HIBP result with appropriate icon and text.
 * @param { 'pwned' | 'not-pwned' | 'error' | 'hidden' } type The type of result to show.
 * @param {string} [message=''] The message to display.
 */
function showResult(type, message = '') {
    const resultIcon = hibpResultContainer.querySelector('.result-icon');
    const resultText = hibpResultContainer.querySelector('.result-text');

    hibpResultContainer.className = 'psc-hibp-result'; // Reset classes

    if (type === 'hidden') {
        return;
    }

    hibpResultContainer.classList.add(type, 'show');
    resultIcon.innerHTML = type === 'pwned' ? ICONS.pwned : type === 'not-pwned' ? ICONS.notPwned : ICONS.error;
    resultText.textContent = message;
}

async function handleHibpCheck() {
    if (!hibpCheckBtn || !hibpResultContainer || !passwordInput) return;

    const password = passwordInput.value;
    if (!password) return;

    setButtonState('loading');
    showResult('hidden'); // Hide previous result

    try {
        const result = await checkPasswordPwned(password);
        if (result.pwned) {
            showResult('pwned', `Pwned! Found in ${result.count.toLocaleString()} breaches.`);
        } else {
            showResult('not-pwned', 'Good news — not found in any breaches.');
        }
    } catch (error) {
        showResult('error', 'Could not check. API error.');
    } finally {
        setButtonState('idle');
    }
}

function init() {
    if (passwordInput) {
        // --- Event Listeners ---
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
                e.preventDefault();
            }
        });

        passwordInput.addEventListener('input', (e) => {
            const inputElement = e.target;
            let currentValue = inputElement.value.replace(/ /g, '');
            if (inputElement.value !== currentValue) {
                inputElement.value = currentValue;
            }
            updateUI(currentValue);
        });

        if (hibpCheckBtn) {
            hibpCheckBtn.addEventListener('click', handleHibpCheck);
        }

        // --- Initial State Setup ---
        const initialValue = passwordInput.value.replace(/ /g, '');
        passwordInput.value = initialValue;
        updateUI(initialValue);
        setButtonState('idle'); // Set initial button icon and state

        console.log("Enhanced Password Strength Checker with HIBP UI Initialized.");
    } else {
        console.error("PSC_INIT: Password Strength Checker: Input field not found. Aborting init.");
    }
}

if (document.getElementById('passwordStrengthChecker')) {
    init();
}