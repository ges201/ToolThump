const psc = {
    passwordInput: null,
    strengthBar: null,
    strengthText: null,
    feedbackList: null,

    MIN_LENGTH: 8,
    IDEAL_LENGTH: 12,
    VERY_GOOD_LENGTH: 16,
    SUPER_STRONG_POSITIVE_THRESHOLD: 9,
    STRONG_POSITIVE_THRESHOLD: 7,

    fetchElements: function () {
        this.passwordInput = document.getElementById('psc-password-input');
        this.strengthBar = document.getElementById('psc-strength-bar');
        this.strengthText = document.getElementById('psc-strength-text');
        this.feedbackList = document.getElementById('psc-feedback-list');
    },

    _getPasswordProperties: function (password) {
        const length = password.length;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSymbols = /[^A-Za-z0-9]/.test(password);
        const typesCount = (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasSymbols ? 1 : 0);
        return { length, hasUpper, hasLower, hasNumbers, hasSymbols, typesCount };
    },

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

    _scoreVariety: function (properties, feedback) {
        let score = 0;
        if (properties.typesCount >= 3) score += 1;
        if (properties.typesCount === 4) score += 1;

        if (properties.typesCount === 4) {
            feedback.push({ text: 'Excellent mix: All 4 character types used.', valid: true });
        } else if (properties.typesCount === 3) {
            feedback.push({ text: 'Good mix: 3 character types used.', valid: true });
        }
        return score;
    },

    _deductForSingleType: function (properties, feedback) {
        if (properties.length >= this.MIN_LENGTH && properties.typesCount === 1) {
            feedback.push({ text: 'Weakness: Uses only one type of character.', valid: false });
            return 2;
        }
        return 0;
    },

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

    _determineStrengthPresentation: function (finalScore, length) {
        let strengthDescription = '';
        let barClass = '';
        let barWidthPercentage = 0;

        if (length === 0) {
            strengthDescription = 'N/A'; barClass = ''; barWidthPercentage = 0;
        } else if (length < this.MIN_LENGTH) {
            strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 10;
        } else if (finalScore <= 2) {
            strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 25;
        } else if (finalScore <= 4) {
            strengthDescription = 'Weak'; barClass = 'weak'; barWidthPercentage = 45;
        } else if (finalScore <= 6) {
            strengthDescription = 'Moderate'; barClass = 'moderate'; barWidthPercentage = 65;
        } else if (finalScore <= 8) {
            strengthDescription = 'Strong'; barClass = 'strong'; barWidthPercentage = 85;
        } else {
            strengthDescription = 'Very Strong'; barClass = 'very-strong'; barWidthPercentage = 100;
        }
        return { strengthDescription, barClass, barWidthPercentage };
    },

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

        if (feedback.some(f => f.text.startsWith("Too short"))) {
            strengthDescription = 'Very Weak';
            barClass = 'very-weak';
            barWidthPercentage = 10;
        }
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
        if (!this.strengthText || !this.strengthBar || !this.feedbackList) return; // Elements not fetched

        const strength = this.checkPasswordStrength(password);
        this.strengthText.textContent = `Strength: ${strength.text}`;
        this.strengthBar.className = 'psc-strength-bar';
        if (strength.barClass) {
            this.strengthBar.classList.add(strength.barClass);
        }
        this.strengthBar.style.width = `${strength.barWidth}%`;
        this.feedbackList.innerHTML = '';
        strength.feedback.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.text;
            li.classList.add(item.valid ? 'valid' : 'invalid');
            this.feedbackList.appendChild(li);
        });
    },

    init: function () {
        this.fetchElements();

        if (this.passwordInput) {
            // Event listener to prevent space character from being typed
            this.passwordInput.addEventListener('keydown', (e) => {
                // Check for space key (e.key for modern, e.code for physical key, e.keyCode for legacy)
                if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
                    e.preventDefault(); // Prevent the space character from being inserted
                }
            });

            // Event listener to handle input changes (e.g., paste)
            // and ensure no spaces are present. Also updates UI.
            this.passwordInput.addEventListener('input', (e) => {
                const inputElement = e.target;
                let currentValue = inputElement.value;

                if (currentValue.includes(' ')) {
                    // If spaces are found (e.g., from a paste), remove them
                    const originalSelectionStart = inputElement.selectionStart;

                    // Count spaces before the cursor in the string that includes pasted spaces
                    const textBeforeSelection = currentValue.substring(0, originalSelectionStart);
                    const spacesRemovedBeforeCursor = (textBeforeSelection.match(/ /g) || []).length;

                    const newValue = currentValue.replace(/ /g, '');
                    inputElement.value = newValue;

                    // Adjust cursor position:
                    // New position is original position minus the count of spaces removed before it.
                    const newCursorPosition = originalSelectionStart - spacesRemovedBeforeCursor;
                    inputElement.setSelectionRange(newCursorPosition, newCursorPosition);

                    this.updateUI(newValue); // Update strength based on the sanitized value
                } else {
                    this.updateUI(currentValue); // Update strength based on the current value (no spaces)
                }
            });

            // Initial check: Sanitize the pre-filled value of the input field, if any.
            // This handles cases where the input field might have a default value with spaces.
            let initialValue = this.passwordInput.value;
            if (initialValue.includes(' ')) {
                const newValue = initialValue.replace(/ /g, '');
                this.passwordInput.value = newValue;
                this.updateUI(newValue); // Update UI with sanitized initial value
            } else {
                this.updateUI(initialValue); // Perform initial UI update with original value
            }

            console.log("Password Strength Checker Initialized on its page.");
        } else {
            console.error("PSC_INIT: Password Strength Checker: Input field not found. Aborting init.");
        }
    }
};

// Self-initialize when the script is loaded on a page containing the password strength checker
if (document.getElementById('passwordStrengthChecker')) { // Check for the main section ID
    psc.init();
}