// --- Password Strength Checker Logic ---
const psc = {
    passwordInput: document.getElementById('psc-password-input'),
    strengthBar: document.getElementById('psc-strength-bar'),
    strengthText: document.getElementById('psc-strength-text'),
    feedbackList: document.getElementById('psc-feedback-list'),

    checkPasswordStrength: function (password) {
        let positiveScore = 0;
        let totalDeductionScore = 0; // Renamed for clarity
        const feedback = [];
        const MIN_LENGTH = 8;
        const IDEAL_LENGTH = 12;
        const VERY_GOOD_LENGTH = 16;
        const SUPER_STRONG_POSITIVE_THRESHOLD = 9; // Max positive score
        const STRONG_POSITIVE_THRESHOLD = 7;


        if (!password || password.length === 0) {
            return { score: 0, text: 'N/A', barClass: '', barWidth: 0, feedback: [{ text: 'Enter a password to check its strength.', valid: false }] };
        }

        const length = password.length;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSymbols = /[^A-Za-z0-9]/.test(password);
        const typesCount = (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasSymbols ? 1 : 0);

        // --- 1. Length Scoring (Positive) ---
        if (length >= MIN_LENGTH) positiveScore += 1;
        if (length >= IDEAL_LENGTH) positiveScore += 1;
        if (length >= VERY_GOOD_LENGTH) positiveScore += 1;

        if (length < MIN_LENGTH) feedback.push({ text: `Too short (minimum ${MIN_LENGTH} characters).`, valid: false });
        else if (length >= VERY_GOOD_LENGTH) feedback.push({ text: `Excellent length (${length} characters).`, valid: true });
        else if (length >= IDEAL_LENGTH) feedback.push({ text: `Good length (${length} characters).`, valid: true });
        else feedback.push({ text: `Meets minimum length (${length} characters).`, valid: true });

        // --- 2. Character Type Presence Scoring (Positive) & Feedback ---
        if (hasUpper) { positiveScore += 1; feedback.push({ text: 'Contains uppercase letters (A-Z).', valid: true }); }
        else feedback.push({ text: 'Missing uppercase letters.', valid: false });
        if (hasLower) { positiveScore += 1; feedback.push({ text: 'Contains lowercase letters (a-z).', valid: true }); }
        else feedback.push({ text: 'Missing lowercase letters.', valid: false });
        if (hasNumbers) { positiveScore += 1; feedback.push({ text: 'Contains numbers (0-9).', valid: true }); }
        else feedback.push({ text: 'Missing numbers.', valid: false });
        if (hasSymbols) { positiveScore += 1; feedback.push({ text: 'Contains symbols (e.g., !@#$%).', valid: true }); }
        else feedback.push({ text: 'Missing symbols.', valid: false });

        // --- 3. Complexity/Variety Bonus (Positive) ---
        if (typesCount >= 3) positiveScore += 1;
        if (typesCount === 4) positiveScore += 1; // Total +2 for all 4 types
        if (typesCount === 4) feedback.push({ text: 'Excellent mix: All 4 character types used.', valid: true });
        else if (typesCount === 3) feedback.push({ text: 'Good mix: 3 character types used.', valid: true });


        // --- 4. Deductions for Weaknesses ---
        let repetitionDeduction = 0;
        let sequenceDeduction = 0;
        let singleTypeDeduction = 0;

        // Deduction: Only one type of character (if long enough)
        if (length >= MIN_LENGTH && typesCount === 1) {
            singleTypeDeduction = 2; // This is a significant flaw
            feedback.push({ text: 'Weakness: Uses only one type of character.', valid: false });
        }

        // Deduction: Repetitive characters (e.g., "aaa", "1111")
        let consecutiveIdenticalCharsCount = 0;
        if (length > 2) {
            for (let i = 0; i < length - 2; i++) {
                if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
                    consecutiveIdenticalCharsCount++;
                }
            }
        }
        if (consecutiveIdenticalCharsCount > 0) {
            if (positiveScore >= SUPER_STRONG_POSITIVE_THRESHOLD) { // Base is superb
                repetitionDeduction = Math.min(consecutiveIdenticalCharsCount, 1); // Max -1 deduction
            } else if (positiveScore >= STRONG_POSITIVE_THRESHOLD) { // Base is strong
                repetitionDeduction = Math.min(consecutiveIdenticalCharsCount, 2); // Max -2 deduction
            } else { // Base is not that strong, penalize more
                repetitionDeduction = Math.min(consecutiveIdenticalCharsCount, 3); // Max -3, or 1 per instance up to 3
            }
            if (repetitionDeduction > 0) feedback.push({ text: `Repetitive sequences found (e.g., "aaa"). Weakens password.`, valid: false });
        }

        // Deduction: Sequential characters (e.g., "abc", "123", "CBA" - basic cases)
        let sequentialCharsCount = 0;
        const sequences = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl"];
        const lowerPassword = password.toLowerCase();
        if (length > 2) {
            for (let i = 0; i < length - 2; i++) {
                let sub3 = lowerPassword.substring(i, i + 3);
                for (const seq of sequences) {
                    if (seq.includes(sub3) || seq.split("").reverse().join("").includes(sub3)) {
                        sequentialCharsCount++;
                        break;
                    }
                }
            }
        }
        if (sequentialCharsCount > 0) {
            if (positiveScore >= SUPER_STRONG_POSITIVE_THRESHOLD) {
                sequenceDeduction = Math.min(sequentialCharsCount, 1);
            } else if (positiveScore >= STRONG_POSITIVE_THRESHOLD) {
                sequenceDeduction = Math.min(sequentialCharsCount, 2);
            } else {
                sequenceDeduction = Math.min(sequentialCharsCount, 3);
            }
            if (sequenceDeduction > 0) feedback.push({ text: `Common keyboard sequences found (e.g., "abc"). Weakens password.`, valid: false });
        }

        totalDeductionScore = singleTypeDeduction + repetitionDeduction + sequenceDeduction;

        // --- Calculate Final Score ---
        let finalScore = positiveScore - totalDeductionScore;
        finalScore = Math.max(0, finalScore); // Ensure score doesn't go below 0

        // --- 5. Determine Strength Text, Bar Class, and Bar Width based on finalScore ---
        let strengthDescription = '';
        let barClass = '';
        let barWidthPercentage = 0;

        // Max Positive Score is 9 (3 length + 4 types + 2 variety)
        // Tiers based on a potential score of 0-9
        if (length === 0) {
            strengthDescription = 'N/A'; barClass = ''; barWidthPercentage = 0;
        } else if (length < MIN_LENGTH) {
            strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 10;
        } else if (finalScore <= 2) { // 0, 1, 2
            strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 25;
        } else if (finalScore <= 4) { // 3, 4
            strengthDescription = 'Weak'; barClass = 'weak'; barWidthPercentage = 45;
        } else if (finalScore <= 6) { // 5, 6
            strengthDescription = 'Moderate'; barClass = 'moderate'; barWidthPercentage = 65;
        } else if (finalScore <= 8) { // 7, 8
            strengthDescription = 'Strong'; barClass = 'strong'; barWidthPercentage = 85;
        } else { // finalScore >= 9
            strengthDescription = 'Very Strong'; barClass = 'very-strong'; barWidthPercentage = 100;
        }

        // If "Too short" is in feedback, ensure description matches, overriding other scores.
        if (feedback.some(f => f.text.startsWith("Too short"))) {
            strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 10;
            // No need to add "Too short" again if it's already there due to initial length check.
        }

        // Sort feedback: invalid items first for prominence
        feedback.sort((a, b) => a.valid === b.valid ? 0 : a.valid ? 1 : -1);

        return { score: finalScore, text: strengthDescription, barClass: barClass, barWidth: barWidthPercentage, feedback };
    },

    // updateUI and init methods remain the same
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
            this.strengthBar.style.width = `${strength.barWidth}%`;
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
            this.updateUI(this.passwordInput.value); // Initial check
        } else {
            console.error("Password Strength Checker: Input field not found.");
        }
    }
};