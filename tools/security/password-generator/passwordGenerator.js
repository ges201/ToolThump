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
    copyBtn: null,
    copyFeedbackTimeout: null,

    plainPassword: '',
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
        this.copyBtn = document.getElementById('pg-copy-btn');
    },

    getRandomChar: function (charSet) {
        return charSet[Math.floor(Math.random() * charSet.length)];
    },

    updateValidationState: function () {
        if (!this.lengthInput) return false;

        let isFormValidForButton = true;
        let primaryErrorForDisplay = '';
        let lengthCorrectionInfo = '';
        let minSumError = ''; // Specific error for min sum issues

        const totalLength = parseInt(this.lengthInput.value);

        if (isNaN(totalLength)) {
            primaryErrorForDisplay = 'Password length must be a number.';
            isFormValidForButton = false;
        } else {
            if (totalLength > this.maxLength) {
                this.lengthInput.value = this.maxLength;
                lengthCorrectionInfo = `Length reset to max ${this.maxLength}. Adjusting.`;
                // Re-read totalLength if it was capped
                // No, updateValidationState should reflect current state. GeneratePassword can cap.
                // Actually, capping here is fine for immediate feedback.
            } else if (totalLength < this.minLength) {
                primaryErrorForDisplay = `Length must be at least ${this.minLength}.`;
                isFormValidForButton = false;
            }
        }

        let currentMinSum = 0;
        const currentDisplayLength = parseInt(this.lengthInput.value); // Use potentially corrected length

        const optionsForMinValidation = [
            { include: this.uppercaseCheckbox.checked, minInput: this.minUppercaseInput, type: 'Uppercase' },
            { include: this.lowercaseCheckbox.checked, minInput: this.minLowercaseInput, type: 'Lowercase' },
            { include: this.numbersCheckbox.checked, minInput: this.minNumbersInput, type: 'Numbers' },
            { include: this.symbolsCheckbox.checked, minInput: this.minSymbolsInput, type: 'Symbols' }
        ];

        for (const opt of optionsForMinValidation) {
            if (opt.include && opt.minInput) {
                const rawValue = opt.minInput.value.trim();
                const minVal = parseInt(opt.minInput.value); // parseInt handles leading/trailing spaces

                if (rawValue === '') {
                    if (!minSumError) minSumError = `Min ${opt.type.toLowerCase()} cannot be empty.`;
                    isFormValidForButton = false;
                } else if (isNaN(minVal) || minVal < 1) {
                    if (!minSumError) minSumError = `Min ${opt.type.toLowerCase()} must be at least 1.`;
                    isFormValidForButton = false;
                } else {
                    currentMinSum += minVal;
                }
            }
        }

        if (isFormValidForButton && !isNaN(currentDisplayLength) && currentDisplayLength >= this.minLength) {
            if (currentMinSum > currentDisplayLength) {
                if (!minSumError) minSumError = `Sum of minimums (${currentMinSum}) exceeds total length (${currentDisplayLength}).`;
                isFormValidForButton = false;
            }
        } else if (isFormValidForButton && isNaN(currentDisplayLength)) {
            // This case implies lengthInput is not a number, already handled by primaryErrorForDisplay
        }


        const finalError = minSumError || primaryErrorForDisplay || lengthCorrectionInfo || '';
        this.errorMessage.textContent = finalError;

        if (this.generateBtn) {
            this.generateBtn.disabled = !isFormValidForButton;
        }

        return isFormValidForButton;
    },

    generatePassword: function () {
        if (!this.passwordDisplay) return;

        if (this.copyBtn) {
            if (this.copyBtn.classList.contains('copied') || this.copyBtn.textContent === 'Failed!') {
                this.copyBtn.textContent = 'Copy';
                this.copyBtn.classList.remove('copied');
                if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);
            }
            this.copyBtn.disabled = true;
        }

        // Perform final validation and correction before generation
        // This also ensures that if updateValidationState was bypassed, we still have valid numbers.
        const optionsForGeneration = [
            { type: 'uppercase', include: this.uppercaseCheckbox.checked, minInput: this.minUppercaseInput, set: this.charSets.uppercase },
            { type: 'lowercase', include: this.lowercaseCheckbox.checked, minInput: this.minLowercaseInput, set: this.charSets.lowercase },
            { type: 'numbers', include: this.numbersCheckbox.checked, minInput: this.minNumbersInput, set: this.charSets.numbers },
            { type: 'symbols', include: this.symbolsCheckbox.checked, minInput: this.minSymbolsInput, set: this.charSets.symbols }
        ];

        let currentMinSumForGeneration = 0;
        let generationOptionsValid = true;

        for (const opt of optionsForGeneration) {
            if (opt.include && opt.minInput) {
                let minVal = parseInt(opt.minInput.value);
                if (opt.minInput.value.trim() === '' || isNaN(minVal) || minVal < 1) {
                    opt.minInput.value = "1"; // Correct the input field's value
                    minVal = 1; // Use 1 for generation
                }
                opt.correctedMin = minVal; // Store corrected min for use later in this function
                currentMinSumForGeneration += minVal;
            } else if (opt.include) { // If include is checked but minInput somehow missing (defensive)
                opt.correctedMin = 0;
            } else {
                opt.correctedMin = 0;
            }
        }

        // Re-validate length and sum after potential min corrections
        let totalLength = parseInt(this.lengthInput.value);
        if (isNaN(totalLength) || totalLength < this.minLength) {
            this.lengthInput.value = this.minLength; // Correct length if invalid
            totalLength = this.minLength;
        } else if (totalLength > this.maxLength) {
            this.lengthInput.value = this.maxLength; // Correct length if invalid
            totalLength = this.maxLength;
        }

        if (currentMinSumForGeneration > totalLength) {
            this.errorMessage.textContent = `Sum of minimums (${currentMinSumForGeneration}) now exceeds total length (${totalLength}) after corrections. Adjust options.`;
            generationOptionsValid = false;
        }

        let characterPool = '';
        for (const opt of optionsForGeneration) {
            if (opt.include) characterPool += opt.set;
        }
        if (characterPool === '') {
            this.errorMessage.textContent = 'Select at least one character type.';
            generationOptionsValid = false;
        }


        if (!generationOptionsValid) {
            if (this.passwordPlaceholderSpan) {
                this.passwordDisplay.innerHTML = '';
                this.passwordDisplay.appendChild(this.passwordPlaceholderSpan);
                this.passwordPlaceholderSpan.style.display = 'inline';
            }
            this.plainPassword = '';
            return; // Abort generation
        }
        // At this point, all inputs should be valid or corrected.
        // Now, call updateValidationState one more time to reflect any corrections on UI error message
        // This is important if generatePassword corrected something the user didn't blur from.
        this.updateValidationState(); // This will refresh the error message based on corrected values


        if (this.passwordPlaceholderSpan) this.passwordPlaceholderSpan.style.display = 'none';
        this.passwordDisplay.innerHTML = '';
        this.plainPassword = '';

        let guaranteedChars = [];

        for (const opt of optionsForGeneration) {
            if (opt.include) {
                for (let i = 0; i < opt.correctedMin; i++) {
                    if (opt.set.length > 0) {
                        guaranteedChars.push(this.getRandomChar(opt.set));
                    } else {
                        // This case should be rare if charSets are correctly defined
                        this.errorMessage.textContent = `Error: Charset for ${opt.type} is empty.`;
                        if (this.passwordPlaceholderSpan) this.passwordPlaceholderSpan.style.display = 'inline';
                        return;
                    }
                }
            }
        }

        let remainingLength = totalLength - guaranteedChars.length;
        if (remainingLength < 0) remainingLength = 0; // Should be caught by sum check, but defensive

        let randomFillChars = [];
        for (let i = 0; i < remainingLength; i++) {
            if (characterPool.length === 0) {
                this.errorMessage.textContent = "Error: Character pool became empty unexpectedly.";
                if (this.passwordPlaceholderSpan) this.passwordPlaceholderSpan.style.display = 'inline';
                return;
            }
            randomFillChars.push(this.getRandomChar(characterPool));
        }

        let finalPasswordArray = this.shuffleArray(guaranteedChars.concat(randomFillChars));
        this.plainPassword = finalPasswordArray.join('');

        this.displayStyledPassword(this.plainPassword);
        if (this.copyBtn) {
            this.copyBtn.disabled = !this.plainPassword;
        }

        // Clear specific error messages if password generation was successful
        // (e.g. if an error was set by updateValidationState just before successful generation)
        if (this.errorMessage.textContent.toLowerCase().includes('sum of minimums') ||
            this.errorMessage.textContent.toLowerCase().includes('cannot be empty') ||
            this.errorMessage.textContent.toLowerCase().includes('must be at least 1')) {
            if (generationOptionsValid && this.plainPassword) this.errorMessage.textContent = '';
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
                if (opt.cb.checked) { // If checkbox is now checked
                    const valueStr = opt.minIn.value.trim();
                    const valInt = parseInt(opt.minIn.value);
                    if (valueStr === '' || isNaN(valInt) || valInt < 1) {
                        opt.minIn.value = "1"; // Ensure it's at least 1
                    }
                }
            }
        });
        this.updateValidationState(); // Update after enabling/disabling and potential correction
    },

    copyPasswordToClipboard: function () {
        if (!this.plainPassword || !this.copyBtn || this.copyBtn.disabled) return;

        navigator.clipboard.writeText(this.plainPassword)
            .then(() => {
                const originalButtonText = "Copy";
                this.copyBtn.textContent = 'Copied!';
                this.copyBtn.classList.add('copied');
                this.copyBtn.disabled = true;

                if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);

                this.copyFeedbackTimeout = setTimeout(() => {
                    this.copyBtn.textContent = originalButtonText;
                    this.copyBtn.classList.remove('copied');
                    this.copyBtn.disabled = !this.plainPassword;
                }, 2000);
            })
            .catch(err => {
                console.error('PG_COPY_ERROR: Could not copy text: ', err);
                const originalButtonText = "Copy";
                this.copyBtn.textContent = 'Failed!';
                this.copyBtn.classList.remove('copied');
                this.copyBtn.disabled = true;

                if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);

                this.copyFeedbackTimeout = setTimeout(() => {
                    this.copyBtn.textContent = originalButtonText;
                    this.copyBtn.disabled = !this.plainPassword;
                }, 2000);
            });
    },

    init: function () {
        this.fetchElements();

        if (!this.generateBtn || !this.lengthInput || !this.passwordDisplay || !this.copyBtn) {
            console.error("PG_INIT: Could not find all required elements for Password Generator. Aborting init.");
            return;
        }

        this.generateBtn.addEventListener('click', () => this.generatePassword());
        this.copyBtn.addEventListener('click', () => this.copyPasswordToClipboard());

        const allMinInputs = [
            this.minUppercaseInput, this.minLowercaseInput, this.minNumbersInput, this.minSymbolsInput
        ];

        const allCheckboxes = [
            this.uppercaseCheckbox, this.lowercaseCheckbox, this.numbersCheckbox, this.symbolsCheckbox
        ];

        // Event listeners for checkboxes
        allCheckboxes.forEach(checkbox => {
            if (checkbox) {
                checkbox.addEventListener('change', () => this.handleCheckboxChange());
            }
        });

        // Event listeners for total length input
        if (this.lengthInput) {
            this.lengthInput.addEventListener('input', () => this.updateValidationState());
            this.lengthInput.addEventListener('change', () => { // On blur/enter for length
                let lenVal = parseInt(this.lengthInput.value);
                if (isNaN(lenVal) || lenVal < this.minLength) this.lengthInput.value = this.minLength;
                if (lenVal > this.maxLength) this.lengthInput.value = this.maxLength;
                this.updateValidationState();
            });
        }

        // Event listeners for min-number inputs
        allMinInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    // Allow typing, updateValidationState will show errors if current input is invalid
                    this.updateValidationState();
                });
                input.addEventListener('change', () => { // On blur/enter for min inputs
                    if (!input.disabled) { // Only validate/correct if the corresponding checkbox is checked
                        const valueStr = input.value.trim();
                        const valInt = parseInt(input.value);
                        if (valueStr === '' || isNaN(valInt) || valInt < 1) {
                            input.value = "1";
                        }
                        // No upper cap here, sum check in updateValidationState handles it
                    }
                    this.updateValidationState(); // Update based on potentially corrected value
                });
            }
        });

        this.handleCheckboxChange(); // Initial setup for min input disabled states and values
        // updateValidationState is called by handleCheckboxChange

        if (this.passwordPlaceholderSpan && this.passwordDisplay) {
            this.passwordDisplay.innerHTML = '';
            this.passwordDisplay.appendChild(this.passwordPlaceholderSpan);
            this.passwordPlaceholderSpan.style.display = 'inline';
        }

        if (this.copyBtn) {
            this.copyBtn.disabled = true;
        }
        console.log("Password Generator Initialized on its page.");
    }
};

if (document.getElementById('passwordGenerator')) {
    pg.init();
}