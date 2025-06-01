// --- Password Strength Checker Logic ---
const psc = {
    passwordInput: document.getElementById('psc-password-input'),
    strengthBar: document.getElementById('psc-strength-bar'),
    strengthText: document.getElementById('psc-strength-text'),
    feedbackList: document.getElementById('psc-feedback-list'),

    // --- Configuration Constants ---
    MIN_LENGTH: 8,
    IDEAL_LENGTH: 12,
    VERY_GOOD_LENGTH: 16,
    SUPER_STRONG_POSITIVE_THRESHOLD: 9, // Max positive score before deductions
    STRONG_POSITIVE_THRESHOLD: 7,       // Strong positive score before deductions

    /**
     * Gets basic properties of the password.
     * @param {string} password - The password string.
     * @returns {object} An object containing length, hasUpper, hasLower, hasNumbers, hasSymbols, typesCount.
     */
    _getPasswordProperties: function (password) {
        const length = password.length;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSymbols = /[^A-Za-z0-9]/.test(password);
        const typesCount = (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasSymbols ? 1 : 0);
        return { length, hasUpper, hasLower, hasNumbers, hasSymbols, typesCount };
    },

    /**
     * Calculates score and feedback based on password length.
     * @param {number} length - The length of the password.
     * @param {Array<object>} feedback - The feedback array to push messages to.
     * @returns {number} The score based on length.
     */
    _scoreLength: function (length, feedback) {
        let score = 0;
        if (length >= this.MIN_LENGTH) score += 1;
        if (length >= this.IDEAL_LENGTH) score += 1;
        if (length >= this.VERY_GOOD_LENGTH) score += 1;

        if (length < this.MIN_LENGTH) {
            feedback.push({ text: `Too short (minimum ${this.MIN_LENGTH} characters).`, valid: false });
        } else if (length >= this.VERY_GOOD_LENGTH) {
            feedback.push({ text: `Excellent length (${length} characters).`, valid: true });
        } else if (length >= this.IDEAL_LENGTH) {
            feedback.push({ text: `Good length (${length} characters).`, valid: true });
        } else {
            feedback.push({ text: `Meets minimum length (${length} characters).`, valid: true });
        }
        return score;
    },

    /**
     * Calculates score and feedback based on character types present.
     * @param {object} properties - Password properties from _getPasswordProperties.
     * @param {Array<object>} feedback - The feedback array.
     * @returns {number} The score based on character types.
     */
    _scoreCharacterTypes: function (properties, feedback) {
        let score = 0;
        if (properties.hasUpper) {
            score += 1;
            feedback.push({ text: 'Contains uppercase letters (A-Z).', valid: true });
        } else {
            feedback.push({ text: 'Missing uppercase letters.', valid: false });
        }
        if (properties.hasLower) {
            score += 1;
            feedback.push({ text: 'Contains lowercase letters (a-z).', valid: true });
        } else {
            feedback.push({ text: 'Missing lowercase letters.', valid: false });
        }
        if (properties.hasNumbers) {
            score += 1;
            feedback.push({ text: 'Contains numbers (0-9).', valid: true });
        } else {
            feedback.push({ text: 'Missing numbers.', valid: false });
        }
        if (properties.hasSymbols) {
            score += 1;
            feedback.push({ text: 'Contains symbols (e.g., !@#$%).', valid: true });
        } else {
            feedback.push({ text: 'Missing symbols.', valid: false });
        }
        return score;
    },

    /**
     * Calculates score and feedback based on character type variety.
     * @param {object} properties - Password properties.
     * @param {Array<object>} feedback - The feedback array.
     * @returns {number} The score based on variety.
     */
    _scoreVariety: function (properties, feedback) {
        let score = 0;
        if (properties.typesCount >= 3) score += 1;
        if (properties.typesCount === 4) score += 1; // Total +2 for all 4 types

        if (properties.typesCount === 4) {
            feedback.push({ text: 'Excellent mix: All 4 character types used.', valid: true });
        } else if (properties.typesCount === 3) {
            feedback.push({ text: 'Good mix: 3 character types used.', valid: true });
        }
        return score;
    },

    /**
     * Calculates deduction for using only one character type.
     * @param {object} properties - Password properties.
     * @param {Array<object>} feedback - The feedback array.
     * @returns {number} The deduction score.
     */
    _deductForSingleType: function (properties, feedback) {
        if (properties.length >= this.MIN_LENGTH && properties.typesCount === 1) {
            feedback.push({ text: 'Weakness: Uses only one type of character.', valid: false });
            return 2; // Significant flaw
        }
        return 0;
    },

    /**
     * Calculates deduction for repetitive characters.
     * @param {string} password - The password string.
     * @param {number} positiveScore - The current positive score before deductions.
     * @param {Array<object>} feedback - The feedback array.
     * @returns {number} The deduction score for repetitions.
     */
    _deductForRepetitions: function (password, positiveScore, feedback) {
        let deduction = 0;
        let consecutiveIdenticalCharsCount = 0;
        if (password.length > 2) {
            for (let i = 0; i < password.length - 2; i++) {
                if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
                    consecutiveIdenticalCharsCount++;
                }
            }
        }

        if (consecutiveIdenticalCharsCount > 0) {
            if (positiveScore >= this.SUPER_STRONG_POSITIVE_THRESHOLD) {
                deduction = Math.min(consecutiveIdenticalCharsCount, 1);
            } else if (positiveScore >= this.STRONG_POSITIVE_THRESHOLD) {
                deduction = Math.min(consecutiveIdenticalCharsCount, 2);
            } else {
                deduction = Math.min(consecutiveIdenticalCharsCount, 3);
            }
            if (deduction > 0) {
                feedback.push({ text: `Repetitive sequences found (e.g., "aaa"). Weakens password.`, valid: false });
            }
        }
        return deduction;
    },

    /**
     * Calculates deduction for sequential characters.
     * @param {string} password - The password string.
     * @param {number} positiveScore - The current positive score before deductions.
     * @param {Array<object>} feedback - The feedback array.
     * @returns {number} The deduction score for sequences.
     */
    _deductForSequences: function (password, positiveScore, feedback) {
        let deduction = 0;
        let sequentialCharsCount = 0;
        const sequences = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl"];
        const lowerPassword = password.toLowerCase();

        if (password.length > 2) {
            for (let i = 0; i < password.length - 2; i++) {
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
            if (positiveScore >= this.SUPER_STRONG_POSITIVE_THRESHOLD) {
                deduction = Math.min(sequentialCharsCount, 1);
            } else if (positiveScore >= this.STRONG_POSITIVE_THRESHOLD) {
                deduction = Math.min(sequentialCharsCount, 2);
            } else {
                deduction = Math.min(sequentialCharsCount, 3);
            }
            if (deduction > 0) {
                feedback.push({ text: `Common keyboard sequences found (e.g., "abc"). Weakens password.`, valid: false });
            }
        }
        return deduction;
    },

    /**
     * Determines the strength text, bar class, and bar width based on the final score.
     * @param {number} finalScore - The calculated final score for the password.
     * @param {number} length - The length of the password.
     * @returns {object} Object containing strengthDescription, barClass, barWidthPercentage.
     */
    _determineStrengthPresentation: function (finalScore, length) {
        let strengthDescription = '';
        let barClass = '';
        let barWidthPercentage = 0;

        // Max Positive Score is 9 (3 length + 4 types + 2 variety)
        // Tiers based on a potential score of 0-9
        if (length === 0) { // This case is handled earlier, but good for completeness
            strengthDescription = 'N/A'; barClass = ''; barWidthPercentage = 0;
        } else if (length < this.MIN_LENGTH) {
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
        return { strengthDescription, barClass, barWidthPercentage };
    },

    /**
     * The main function to check password strength.
     * @param {string} password - The password to check.
     * @returns {object} An object containing the score, text, barClass, barWidth, and feedback.
     */
    checkPasswordStrength: function (password) {
        if (!password || password.length === 0) {
            return {
                score: 0,
                text: 'N/A',
                barClass: '',
                barWidth: 0,
                feedback: [{ text: 'Enter a password to check its strength.', valid: false }]
            };
        }

        const feedback = [];
        const properties = this._getPasswordProperties(password);

        let positiveScore = 0;
        positiveScore += this._scoreLength(properties.length, feedback);
        positiveScore += this._scoreCharacterTypes(properties, feedback);
        positiveScore += this._scoreVariety(properties, feedback);

        let totalDeductionScore = 0;
        totalDeductionScore += this._deductForSingleType(properties, feedback);
        totalDeductionScore += this._deductForRepetitions(password, positiveScore, feedback);
        totalDeductionScore += this._deductForSequences(password, positiveScore, feedback);

        const finalScore = Math.max(0, positiveScore - totalDeductionScore);

        let { strengthDescription, barClass, barWidthPercentage } = this._determineStrengthPresentation(finalScore, properties.length);

        // Override strength if "Too short" feedback is present, as it's a fundamental weakness.
        if (feedback.some(f => f.text.startsWith("Too short"))) {
            strengthDescription = 'Very Weak';
            barClass = 'very-weak';
            barWidthPercentage = 10;
        }

        // Sort feedback: invalid items first for prominence
        feedback.sort((a, b) => (a.valid === b.valid) ? 0 : (a.valid ? 1 : -1));

        return {
            score: finalScore,
            text: strengthDescription,
            barClass: barClass,
            barWidth: barWidthPercentage,
            feedback: feedback
        };
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