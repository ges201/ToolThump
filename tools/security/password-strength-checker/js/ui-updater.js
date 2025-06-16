import { strengthText, strengthBar, feedbackList, hibpCheckBtn, hibpResultContainer } from './dom-elements.js';
import { checkPasswordStrength } from './password-scorer.js';

export function updateUI(password) {
    if (!strengthText || !strengthBar || !feedbackList) {
        console.error("UI elements not found for password strength checker.");
        return;
    }

    const strength = checkPasswordStrength(password);

    strengthText.textContent = `Strength: ${strength.text} (${strength.entropy.toFixed(1)} bits)`;
    strengthBar.className = 'psc-strength-bar'; // Reset classes
    if (strength.barClass) {
        strengthBar.classList.add(strength.barClass);
    }
    strengthBar.style.width = `${strength.barWidth}%`;
    strengthBar.setAttribute('aria-valuenow', strength.barWidth);
    strengthBar.setAttribute('aria-valuetext', `Strength: ${strength.text}, ${strength.entropy.toFixed(1)} bits`);


    feedbackList.innerHTML = '';
    if (strength.feedback && strength.feedback.length > 0) {
        strength.feedback.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.text;
            // Map feedback type to CSS classes (valid/invalid from original CSS)
            // zxcvbn warnings are 'invalid', suggestions are 'valid' (as they guide to better passwords)
            // 'info' can be neutral or styled as 'valid' if it's generally good info like crack time.
            if (item.type === 'warning') {
                li.classList.add('invalid');
            } else if (item.type === 'suggestion') {
                li.classList.add('valid'); // Or a new class like 'suggestion-item' if you want different styling
            } else { // 'info'
                li.classList.add('valid'); // Defaulting info to 'valid' style, can be adjusted
            }
            feedbackList.appendChild(li);
        });
    }


    // Handle HIBP UI state
    if (hibpCheckBtn && hibpResultContainer) {
        const hasPassword = password && password.length > 0;
        hibpCheckBtn.disabled = !hasPassword;

        // Hide result area on password change
        if (hibpResultContainer.classList.contains('show')) {
            hibpResultContainer.className = 'psc-hibp-result'; // Reset and hide
            const resultText = hibpResultContainer.querySelector('.result-text');
            if (resultText) resultText.textContent = '';
        }
    }
}