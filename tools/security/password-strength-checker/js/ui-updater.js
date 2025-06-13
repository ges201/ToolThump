import { strengthText, strengthBar, feedbackList, hibpCheckBtn, hibpResultContainer } from './dom-elements.js';
import { checkPasswordStrength } from './password-scorer.js';

export function updateUI(password) {
    if (!strengthText || !strengthBar || !feedbackList) return;

    const strength = checkPasswordStrength(password);
    strengthText.textContent = `Strength: ${strength.text} (${strength.entropy.toFixed(1)} bits)`;
    strengthBar.className = 'psc-strength-bar';
    if (strength.barClass) {
        strengthBar.classList.add(strength.barClass);
    }
    strengthBar.style.width = `${strength.barWidth}%`;
    feedbackList.innerHTML = '';
    strength.feedback.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.text;
        li.classList.add(item.valid ? 'valid' : 'invalid');
        feedbackList.appendChild(li);
    });

    // Handle HIBP UI state
    if (hibpCheckBtn && hibpResultContainer) {
        const hasPassword = password && password.length > 0;
        hibpCheckBtn.disabled = !hasPassword;

        // Hide result area on password change
        if (hibpResultContainer.classList.contains('show')) {
            hibpResultContainer.className = 'psc-hibp-result';
        }
    }
}