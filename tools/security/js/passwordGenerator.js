// tools/security/js/passwordGenerator.js
const pg = {
    // Re-fetch elements on init as they are page-specific
    lengthInput: null,
    uppercaseCheckbox: null,
    lowercaseCheckbox: null,
    numbersCheckbox: null,
    symbolsCheckbox: null,
    minUppercaseInput: null,
    minLowercaseInput: null,
    minNumbersInput: null,
    minSymbolsInput: null,
    generateBtn: null,
    passwordDisplay: null,
    passwordPlaceholderSpan: null,
    errorMessage: null,
    copyBtn: null, // New element for the copy button
    copyFeedbackTimeout: null, // For "Copied!" message timeout

    plainPassword: '', // Stores the generated password as a plain string
    maxLength: 64,
    minLength: 8,

    charSets: {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    },

    fetchElements: function () {
        this.lengthInput = document.getElementById('pg-length');
        this.uppercaseCheckbox = document.getElementById('pg-include-uppercase');
        this.lowercaseCheckbox = document.getElementById('pg-include-lowercase');
        this.numbersCheckbox = document.getElementById('pg-include-numbers');
        this.symbolsCheckbox = document.getElementById('pg-include-symbols');
        this.minUppercaseInput = document.getElementById('pg-min-uppercase');
        this.minLowercaseInput = document.getElementById('pg-min-lowercase');
        this.minNumbersInput = document.getElementById('pg-min-numbers');
        this.minSymbolsInput = document.getElementById('pg-min-symbols');
        this.generateBtn = document.getElementById('pg-generate-btn');
        this.passwordDisplay = document.getElementById('pg-generated-password-display');
        this.passwordPlaceholderSpan = this.passwordDisplay ? this.passwordDisplay.querySelector('.pg-password-placeholder') : null;
        this.errorMessage = document.getElementById('pg-error-message');
        this.copyBtn = document.getElementById('pg-copy-btn'); // Fetch the copy button
    },

    getRandomChar: function (charSet) {
        return charSet[Math.floor(Math.random() * charSet.length)];
    },

    updateValidationState: function () {
        if (!this.lengthInput) return false; // Elements not fetched yet

        let isFormValidForButton = true;
        let primaryErrorForDisplay = '';
        let lengthCorrectionInfo = '';

        const totalLength = parseInt(this.lengthInput.value);

        if (isNaN(totalLength)) {
            primaryErrorForDisplay = 'Password length must be a number.';
            isFormValidForButton = false;
        } else {
            if (totalLength > this.maxLength) {
                this.lengthInput.value = this.maxLength;
                lengthCorrectionInfo = `Length reset to max ${this.maxLength}.`;
                if (this.maxLength < this.minLength) isFormValidForButton = false;
            } else if (totalLength < this.minLength) {
                primaryErrorForDisplay = `Length must be at least ${this.minLength}.`;
                isFormValidForButton = false;
            }
        }

        let currentMinSum = 0;
        let minSumValidationError = '';
        const currentDisplayLength = parseInt(this.lengthInput.value);

        const optionsForMinValidation = [
            { include: this.uppercaseCheckbox.checked, minInput: this.minUppercaseInput, type: 'uppercase' },
            { include: this.lowercaseCheckbox.checked, minInput: this.minLowercaseInput, type: 'lowercase' },
            { include: this.numbersCheckbox.checked, minInput: this.minNumbersInput, type: 'numbers' },
            { include: this.symbolsCheckbox.checked, minInput: this.minSymbolsInput, type: 'symbols' }
        ];

        for (const opt of optionsForMinValidation) {
            if (opt.include && opt.minInput) {
                let minVal = parseInt(opt.minInput.value);
                if (isNaN(minVal) || minVal < 1) {
                    minVal = 1;
                    opt.minInput.value = "1";
                }
                currentMinSum += minVal;
            }
        }

        if (!isNaN(currentDisplayLength) && currentDisplayLength >= this.minLength) {
            if (currentMinSum > currentDisplayLength) {
                minSumValidationError = `Sum of minimums (${currentMinSum}) exceeds total length (${currentDisplayLength}).`;
                isFormValidForButton = false;
            }
        } else if (isFormValidForButton) {
            isFormValidForButton = false;
            if (!primaryErrorForDisplay && !minSumValidationError) primaryErrorForDisplay = "Invalid length for sum calculation.";
        }

        const finalError = minSumValidationError || primaryErrorForDisplay || lengthCorrectionInfo || '';
        this.errorMessage.textContent = finalError;

        if (this.generateBtn) {
            this.generateBtn.disabled = !isFormValidForButton;
        }

        return isFormValidForButton;
    },

    generatePassword: function () {
        if (!this.passwordDisplay) return;

        // Reset copy button state if it was 'Copied!' or 'Failed!'
        if (this.copyBtn) {
            if (this.copyBtn.classList.contains('copied') || this.copyBtn.textContent === 'Failed!') {
                this.copyBtn.textContent = 'Copy';
                this.copyBtn.classList.remove('copied');
                if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);
            }
            this.copyBtn.disabled = true; // Disable copy button until new password generated
        }

        if (this.errorMessage.textContent.startsWith('Length reset to max')) {
            this.errorMessage.textContent = '';
        }

        if (this.passwordPlaceholderSpan) this.passwordPlaceholderSpan.style.display = 'none';
        this.passwordDisplay.innerHTML = '';
        this.plainPassword = ''; // Clear plain password

        if (!this.updateValidationState()) {
            if (this.passwordPlaceholderSpan) {
                this.passwordDisplay.appendChild(this.passwordPlaceholderSpan);
                this.passwordPlaceholderSpan.style.display = 'inline';
            }
            // Copy button remains disabled (set at the start of this function)
            return;
        }

        const totalLength = parseInt(this.lengthInput.value);
        const optionsForGeneration = [
            { type: 'uppercase', include: this.uppercaseCheckbox.checked, minInput: this.minUppercaseInput, set: this.charSets.uppercase },
            { type: 'lowercase', include: this.lowercaseCheckbox.checked, minInput: this.minLowercaseInput, set: this.charSets.lowercase },
            { type: 'numbers', include: this.numbersCheckbox.checked, minInput: this.minNumbersInput, set: this.charSets.numbers },
            { type: 'symbols', include: this.symbolsCheckbox.checked, minInput: this.minSymbolsInput, set: this.charSets.symbols }
        ];

        let characterPool = '';
        let guaranteedChars = [];
        let currentMinSumForGeneration = 0;

        for (const opt of optionsForGeneration) {
            let minVal = 0;
            if (opt.include && opt.minInput) {
                minVal = parseInt(opt.minInput.value);
                if (isNaN(minVal) || minVal < 1) {
                    minVal = 1;
                    opt.minInput.value = "1";
                }
            }

            if (opt.include) {
                characterPool += opt.set;
                currentMinSumForGeneration += minVal;
                for (let i = 0; i < minVal; i++) {
                    if (opt.set.length > 0) {
                        guaranteedChars.push(this.getRandomChar(opt.set));
                    } else {
                        this.errorMessage.textContent = `Error: Charset for ${opt.type} is empty.`;
                        if (this.passwordPlaceholderSpan) this.passwordPlaceholderSpan.style.display = 'inline';
                        return; // Copy button remains disabled
                    }
                }
            }
        }

        if (characterPool === '') {
            this.errorMessage.textContent = 'Select at least one character type.';
            if (this.passwordPlaceholderSpan) {
                this.passwordDisplay.appendChild(this.passwordPlaceholderSpan);
                this.passwordPlaceholderSpan.style.display = 'inline';
            }
            return; // Copy button remains disabled
        }
        if (currentMinSumForGeneration > totalLength) {
            this.errorMessage.textContent = `Sum of minimums (${currentMinSumForGeneration}) > total length (${totalLength}). Fix options.`;
            if (this.passwordPlaceholderSpan) {
                this.passwordDisplay.appendChild(this.passwordPlaceholderSpan);
                this.passwordPlaceholderSpan.style.display = 'inline';
            }
            return; // Copy button remains disabled
        }

        let remainingLength = totalLength - guaranteedChars.length;
        let randomFillChars = [];
        for (let i = 0; i < remainingLength; i++) {
            if (characterPool.length === 0) {
                this.errorMessage.textContent = "Error: Character pool became empty unexpectedly.";
                if (this.passwordPlaceholderSpan) {
                    this.passwordDisplay.appendChild(this.passwordPlaceholderSpan);
                    this.passwordPlaceholderSpan.style.display = 'inline';
                }
                return; // Copy button remains disabled
            }
            randomFillChars.push(this.getRandomChar(characterPool));
        }

        let finalPasswordArray = this.shuffleArray(guaranteedChars.concat(randomFillChars));
        this.plainPassword = finalPasswordArray.join('');

        this.displayStyledPassword(this.plainPassword);
        if (this.copyBtn) {
            this.copyBtn.disabled = false; // Enable copy button
        }

        if (this.errorMessage.textContent.toLowerCase().includes('length must be') ||
            this.errorMessage.textContent.toLowerCase().includes('sum of minimums')) {
            this.errorMessage.textContent = '';
        }
    },

    displayStyledPassword: function (password) {
        if (!this.passwordDisplay) return;
        let styledHtml = '';
        for (const char of password) {
            if (this.charSets.numbers.includes(char)) {
                styledHtml += `<span class="char-number">${char}</span>`;
            } else if (this.charSets.symbols.includes(char)) {
                styledHtml += `<span class="char-symbol">${char}</span>`;
            } else {
                styledHtml += `<span>${char}</span>`;
            }
        }
        this.passwordDisplay.innerHTML = styledHtml;
    },

    shuffleArray: function (array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    handleCheckboxChange: function () {
        const optionInputs = [
            { cb: this.uppercaseCheckbox, minIn: this.minUppercaseInput },
            { cb: this.lowercaseCheckbox, minIn: this.minLowercaseInput },
            { cb: this.numbersCheckbox, minIn: this.minNumbersInput },
            { cb: this.symbolsCheckbox, minIn: this.minSymbolsInput },
        ];

        optionInputs.forEach(opt => {
            if (opt.cb && opt.minIn) {
                opt.minIn.disabled = !opt.cb.checked;
                if (opt.cb.checked && (parseInt(opt.minIn.value) < 1 || isNaN(parseInt(opt.minIn.value)))) {
                    opt.minIn.value = "1";
                }
            }
        });
        this.updateValidationState();
    },

    copyPasswordToClipboard: function () {
        if (!this.plainPassword || !this.copyBtn || this.copyBtn.disabled) return;

        navigator.clipboard.writeText(this.plainPassword)
            .then(() => {
                const originalButtonText = "Copy";
                this.copyBtn.textContent = 'Copied!';
                this.copyBtn.classList.add('copied');
                this.copyBtn.disabled = true; // Temporarily disable to prevent spamming and show feedback

                if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);

                this.copyFeedbackTimeout = setTimeout(() => {
                    this.copyBtn.textContent = originalButtonText;
                    this.copyBtn.classList.remove('copied');
                    // Re-enable only if there's still a password to copy
                    this.copyBtn.disabled = !this.plainPassword;
                }, 2000);
            })
            .catch(err => {
                console.error('PG_COPY_ERROR: Could not copy text: ', err);
                const originalButtonText = "Copy";
                this.copyBtn.textContent = 'Failed!';
                // Keep class 'copied' removed or add a 'failed' class if desired
                this.copyBtn.classList.remove('copied');
                this.copyBtn.disabled = true; // Temporarily disable

                if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);

                this.copyFeedbackTimeout = setTimeout(() => {
                    this.copyBtn.textContent = originalButtonText;
                    // Re-enable only if there's still a password to copy
                    this.copyBtn.disabled = !this.plainPassword;
                }, 2000);
            });
    },

    init: function () {
        this.fetchElements();

        if (!this.generateBtn || !this.lengthInput || !this.passwordDisplay || !this.copyBtn) { // Added copyBtn to check
            console.error("PG_INIT: Could not find all required elements for Password Generator. Aborting init.");
            return;
        }

        this.generateBtn.addEventListener('click', () => this.generatePassword());
        this.copyBtn.addEventListener('click', () => this.copyPasswordToClipboard()); // Add listener for copy button

        const allOptionInputsAndCheckboxes = [
            this.uppercaseCheckbox, this.lowercaseCheckbox, this.numbersCheckbox, this.symbolsCheckbox,
            this.minUppercaseInput, this.minLowercaseInput, this.minNumbersInput, this.minSymbolsInput,
            this.lengthInput
        ];

        allOptionInputsAndCheckboxes.forEach(input => {
            if (input) {
                if (input.type === 'checkbox') {
                    input.addEventListener('change', () => this.handleCheckboxChange());
                } else if (input.type === 'number') {
                    input.addEventListener('input', () => this.updateValidationState());
                    input.addEventListener('change', () => {
                        if (input !== this.lengthInput && !input.disabled) {
                            if (parseInt(input.value) < 1 || isNaN(parseInt(input.value))) {
                                input.value = "1";
                            }
                        }
                        this.updateValidationState();
                    });
                }
            }
        });

        this.handleCheckboxChange(); // This calls updateValidationState
        // this.updateValidationState(); // Called by handleCheckboxChange

        if (this.passwordPlaceholderSpan && this.passwordDisplay) {
            this.passwordDisplay.innerHTML = ''; // Clear
            this.passwordDisplay.appendChild(this.passwordPlaceholderSpan);
            this.passwordPlaceholderSpan.style.display = 'inline';
        }

        if (this.copyBtn) { // Initial state for copy button
            this.copyBtn.disabled = true;
        }
        console.log("Password Generator Initialized on its page.");
    }
};

// Self-initialize when the script is loaded on a page containing the password generator
if (document.getElementById('passwordGenerator')) { // Check for the main section ID
    pg.init();
}