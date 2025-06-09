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

    // Entropy thresholds (in bits)
    ENTROPY_THRESHOLDS: {
        VERY_WEAK: 25,    // < 25 bits
        WEAK: 35,         // 25-35 bits
        MODERATE: 50,     // 35-50 bits
        STRONG: 65,       // 50-65 bits
        VERY_STRONG: 80   // 65+ bits
    },

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

    _calculateEntropy: function (password, properties, feedback) {
        if (password.length === 0) return 0;

        // Calculate character space size
        let charSpaceSize = 0;
        if (properties.hasLower) charSpaceSize += 26;
        if (properties.hasUpper) charSpaceSize += 26;
        if (properties.hasNumbers) charSpaceSize += 10;
        if (properties.hasSymbols) charSpaceSize += 32; // Common symbols

        // Calculate frequency-based entropy
        const charFrequency = {};
        for (let char of password) {
            charFrequency[char] = (charFrequency[char] || 0) + 1;
        }

        // Shannon entropy calculation
        let shannonEntropy = 0;
        const passwordLength = password.length;
        for (let char in charFrequency) {
            const frequency = charFrequency[char] / passwordLength;
            shannonEntropy -= frequency * Math.log2(frequency);
        }

        // Theoretical maximum entropy (assuming uniform distribution)
        const theoreticalEntropy = Math.log2(charSpaceSize) * passwordLength;

        // Actual entropy (combines theoretical and Shannon entropy)
        const actualEntropy = Math.min(theoreticalEntropy, shannonEntropy * passwordLength);

        // Apply penalties for patterns
        let entropyPenalty = 0;

        // Penalty for repetitive characters
        const maxRepeats = Math.max(...Object.values(charFrequency));
        if (maxRepeats > 1) {
            entropyPenalty += Math.log2(maxRepeats) * 2;
        }

        // Penalty for sequential patterns
        entropyPenalty += this._calculateSequentialPenalty(password);

        const finalEntropy = Math.max(0, actualEntropy - entropyPenalty);

        // Add entropy feedback
        this._addEntropyFeedback(finalEntropy, charSpaceSize, feedback);

        return finalEntropy; // Return raw value, formatting handled in feedback
    },

    _calculateSequentialPenalty: function (password) {
        let penalty = 0;
        const sequences = [
            "abcdefghijklmnopqrstuvwxyz",
            "0123456789",
            "qwertyuiop",
            "asdfghjkl",
            "zxcvbnm"
        ];

        const lowerPassword = password.toLowerCase();

        for (let i = 0; i < password.length - 2; i++) {
            const sub3 = lowerPassword.substring(i, i + 3);
            const sub4 = lowerPassword.substring(i, i + 4);

            for (const seq of sequences) {
                if (seq.includes(sub3) || seq.split("").reverse().join("").includes(sub3)) {
                    penalty += 3;
                }
                if (sub4.length === 4 && (seq.includes(sub4) || seq.split("").reverse().join("").includes(sub4))) {
                    penalty += 2; // Additional penalty for longer sequences
                }
            }
        }

        return penalty;
    },

    _addEntropyFeedback: function (entropy, charSpaceSize, feedback) {
        // Time to crack estimation (assuming 1 billion guesses per second)
        const possibleCombinations = Math.pow(2, entropy);
        const secondsToCrack = possibleCombinations / (2 * 1000000000); // Divide by 2 for average case

        let timeString = this._formatCrackTime(secondsToCrack);

        // Combined entropy feedback with descriptive text
        let entropyDescription = "";
        let entropyValid = false;

        if (entropy < this.ENTROPY_THRESHOLDS.VERY_WEAK) {
            entropyDescription = "very low - highly predictable";
            entropyValid = false;
        } else if (entropy < this.ENTROPY_THRESHOLDS.WEAK) {
            entropyDescription = "low - easily guessable";
            entropyValid = false;
        } else if (entropy < this.ENTROPY_THRESHOLDS.MODERATE) {
            entropyDescription = "moderate - consider more diversity";
            entropyValid = false;
        } else if (entropy < this.ENTROPY_THRESHOLDS.STRONG) {
            entropyDescription = "good - reasonably secure";
            entropyValid = true;
        } else if (entropy < this.ENTROPY_THRESHOLDS.VERY_STRONG) {
            entropyDescription = "strong - well protected";
            entropyValid = true;
        } else {
            entropyDescription = "excellent - highly unpredictable";
            entropyValid = true;
        }

        feedback.push({
            text: `Entropy: ${entropy.toFixed(1)} bits (${entropyDescription})`,
            valid: entropyValid
        });

        feedback.push({
            text: `Estimated crack time: ${timeString}`,
            valid: entropy >= this.ENTROPY_THRESHOLDS.STRONG
        });
    },

    _formatCrackTime: function (seconds) {
        if (seconds < 1) return "Less than 1 second";
        if (seconds < 60) return `${Math.round(seconds)} seconds`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
        if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
        if (seconds < 31536000000) return `${Math.round(seconds / 31536000)} years`;
        return "Billions of years";
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

    _determineStrengthPresentation: function (finalScore, length, entropy) {
        let strengthDescription = '';
        let barClass = '';
        let barWidthPercentage = 0;

        if (length === 0) {
            strengthDescription = 'N/A'; barClass = ''; barWidthPercentage = 0;
        } else if (length < this.MIN_LENGTH) {
            strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 10;
        } else {
            // Use entropy as primary factor, but consider traditional score as well
            const entropyWeight = 0.7;
            const scoreWeight = 0.3;

            // Normalize entropy to 0-10 scale
            const normalizedEntropy = Math.min(10, (entropy / this.ENTROPY_THRESHOLDS.VERY_STRONG) * 10);
            const combinedScore = (normalizedEntropy * entropyWeight) + (finalScore * scoreWeight);

            if (entropy < this.ENTROPY_THRESHOLDS.VERY_WEAK || combinedScore <= 2) {
                strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 25;
            } else if (entropy < this.ENTROPY_THRESHOLDS.WEAK || combinedScore <= 4) {
                strengthDescription = 'Weak'; barClass = 'weak'; barWidthPercentage = 45;
            } else if (entropy < this.ENTROPY_THRESHOLDS.MODERATE || combinedScore <= 6) {
                strengthDescription = 'Moderate'; barClass = 'moderate'; barWidthPercentage = 65;
            } else if (entropy < this.ENTROPY_THRESHOLDS.STRONG || combinedScore <= 8) {
                strengthDescription = 'Strong'; barClass = 'strong'; barWidthPercentage = 85;
            } else {
                strengthDescription = 'Very Strong'; barClass = 'very-strong'; barWidthPercentage = 100;
            }
        }
        return { strengthDescription, barClass, barWidthPercentage };
    },

    checkPasswordStrength: function (password) {
        if (!password || password.length === 0) {
            return {
                score: 0,
                entropy: 0,
                text: 'N/A',
                barClass: '',
                barWidth: 0,
                feedback: [{ text: 'Enter a password to check its strength.', valid: false }]
            };
        }

        const feedback = [];
        const properties = this._getPasswordProperties(password);

        // Calculate entropy first
        const entropy = this._calculateEntropy(password, properties, feedback);

        let positiveScore = 0;
        positiveScore += this._scoreLength(properties.length, feedback);
        positiveScore += this._scoreCharacterTypes(properties, feedback);
        positiveScore += this._scoreVariety(properties, feedback);

        let totalDeductionScore = 0;
        totalDeductionScore += this._deductForSingleType(properties, feedback);
        totalDeductionScore += this._deductForRepetitions(password, positiveScore, feedback);
        totalDeductionScore += this._deductForSequences(password, positiveScore, feedback);

        const finalScore = Math.max(0, positiveScore - totalDeductionScore);
        let { strengthDescription, barClass, barWidthPercentage } = this._determineStrengthPresentation(finalScore, properties.length, entropy);

        if (feedback.some(f => f.text.startsWith("Too short"))) {
            strengthDescription = 'Very Weak';
            barClass = 'very-weak';
            barWidthPercentage = 10;
        }

        // Sort feedback: entropy info first, then invalid items, then valid items
        feedback.sort((a, b) => {
            if (a.text.includes('Entropy:')) return -1;
            if (b.text.includes('Entropy:')) return 1;
            if (a.text.includes('Estimated crack time:')) return -1;
            if (b.text.includes('Estimated crack time:')) return 1;
            return (a.valid === b.valid) ? 0 : (a.valid ? 1 : -1);
        });

        return {
            score: finalScore,
            entropy: entropy,
            text: strengthDescription,
            barClass: barClass,
            barWidth: barWidthPercentage,
            feedback: feedback
        };
    },

    updateUI: function (password) {
        if (!this.strengthText || !this.strengthBar || !this.feedbackList) return; // Elements not fetched

        const strength = this.checkPasswordStrength(password);
        this.strengthText.textContent = `Strength: ${strength.text} (${strength.entropy} bits)`;
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

            console.log("Enhanced Password Strength Checker with Entropy Initialized.");
        } else {
            console.error("PSC_INIT: Password Strength Checker: Input field not found. Aborting init.");
        }
    }
};

// Self-initialize when the script is loaded on a page containing the password strength checker
if (document.getElementById('passwordStrengthChecker')) { // Check for the main section ID
    psc.init();
}