// --- Password Strength Checker Logic ---
const psc = {
    passwordInput: document.getElementById('psc-password-input'),
    strengthBar: document.getElementById('psc-strength-bar'),
    strengthText: document.getElementById('psc-strength-text'),
    feedbackList: document.getElementById('psc-feedback-list'),

    checkPasswordStrength: function (password) {
        let score = 0;
        const feedback = [];

        if (!password || password.length === 0) {
            return { score: 0, text: 'N/A', barClass: '', feedback: [{ text: 'Enter a password to check its strength.', valid: false }] };
        }

        // Criteria
        const lengthCriteria = { min: 8, ideal: 12 };
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSymbols = /[^A-Za-z0-9]/.test(password);

        // --- Scoring & Feedback ---

        // 1. Length
        if (password.length >= lengthCriteria.ideal) {
            score += 2;
            feedback.push({ text: `At least ${lengthCriteria.ideal} characters long.`, valid: true });
        } else if (password.length >= lengthCriteria.min) {
            score += 1;
            feedback.push({ text: `At least ${lengthCriteria.min} characters long.`, valid: true });
        } else {
            feedback.push({ text: `Too short (less than ${lengthCriteria.min} characters).`, valid: false });
        }

        // 2. Uppercase
        if (hasUppercase) {
            score += 1;
            feedback.push({ text: 'Contains uppercase letters (A-Z).', valid: true });
        } else {
            feedback.push({ text: 'Missing uppercase letters.', valid: false });
        }

        // 3. Lowercase
        if (hasLowercase) {
            score += 1;
            feedback.push({ text: 'Contains lowercase letters (a-z).', valid: true });
        } else {
            feedback.push({ text: 'Missing lowercase letters.', valid: false });
        }

        // 4. Numbers
        if (hasNumbers) {
            score += 1;
            feedback.push({ text: 'Contains numbers (0-9).', valid: true });
        } else {
            feedback.push({ text: 'Missing numbers.', valid: false });
        }

        // 5. Symbols
        if (hasSymbols) {
            score += 1;
            feedback.push({ text: 'Contains symbols (e.g., !@#$%).', valid: true });
        } else {
            feedback.push({ text: 'Missing symbols.', valid: false });
        }

        // --- Determine Strength Text and Bar Class ---
        let strengthDescription = '';
        let barClass = '';
        let barWidthPercentage = 0;

        if (password.length === 0) { // Handled at the start
            strengthDescription = "N/A";
            barClass = "";
            barWidthPercentage = 0;
        } else if (score <= 1 || password.length < lengthCriteria.min / 2) {
            strengthDescription = 'Very Weak';
            barClass = 'very-weak';
            barWidthPercentage = 20;
        } else if (score <= 2 || password.length < lengthCriteria.min) {
            strengthDescription = 'Weak';
            barClass = 'weak';
            barWidthPercentage = 40;
        } else if (score <= 3) {
            strengthDescription = 'Moderate';
            barClass = 'moderate';
            barWidthPercentage = 60;
        } else if (score <= 4) {
            strengthDescription = 'Strong';
            barClass = 'strong';
            barWidthPercentage = 80;
        } else { // score >= 5
            strengthDescription = 'Very Strong';
            barClass = 'very-strong';
            barWidthPercentage = 100;
        }

        // Ensure minimum criteria for strong passwords (e.g. length)
        if (password.length < lengthCriteria.min && score > 2) {
            strengthDescription = 'Moderate'; // Downgrade if too short despite other chars
            barClass = 'moderate';
            barWidthPercentage = Math.min(barWidthPercentage, 60);
        }


        return { score, text: strengthDescription, barClass: barClass, barWidth: barWidthPercentage, feedback };
    },

    updateUI: function (password) {
        const strength = this.checkPasswordStrength(password);

        if (this.strengthText) {
            this.strengthText.textContent = `Strength: ${strength.text}`;
        }

        if (this.strengthBar) {
            this.strengthBar.className = 'psc-strength-bar'; // Reset classes
            if (strength.barClass) {
                this.strengthBar.classList.add(strength.barClass);
            }
            // For a filled bar effect, you might have an inner div.
            // For simplicity, we're coloring the whole bar and will use its width property if needed.
            // Or, if using a single bar that "fills":
            this.strengthBar.style.width = `${strength.barWidth}%`;
            // If just changing color, the class is enough.
            // Let's make the bar itself change width and color based on class.
            // The CSS is set up to color the whole bar. If we want a "filling" effect:
            // We need an inner bar. For now, the CSS just colors the whole bar.
            // Let's assume the CSS class handles the color, and JS handles the text.
            // To make the bar *fill*, we'd need something like:
            // <div id="psc-strength-bar-container"><div id="psc-strength-bar-fill"></div></div>
            // For now, the existing CSS uses the background-color of the bar itself.
            // Let's make the bar itself change its width to represent filling.
            this.strengthBar.style.setProperty('background-color', ''); // Clear direct style if any
            this.strengthBar.style.width = strength.barWidth + '%';
            // The class added (.very-weak, .weak etc) will set the background-color
        }

        if (this.feedbackList) {
            this.feedbackList.innerHTML = ''; // Clear old feedback
            strength.feedback.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item.text;
                li.classList.add(item.valid ? 'valid' : 'invalid');
                this.feedbackList.appendChild(li);
            });
        }
    },

    init: function () {
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', (e) => {
                this.updateUI(e.target.value);
            });
            // Initial check in case of pre-filled field (though unlikely here)
            this.updateUI(this.passwordInput.value);
        } else {
            console.error("Password Strength Checker: Input field not found.");
        }
    }
};