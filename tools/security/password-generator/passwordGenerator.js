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
    copyFeedback: null,
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
        this.copyFeedback = document.getElementById('pg-copy-feedback');
    },

    getRandomChar: function (charSet) {
        return charSet[Math.floor(Math.random() * charSet.length)];
    },

    updateValidationState: function () {
        if (!this.lengthInput) return false;

        let isFormValidForButton = true;
        let primaryErrorForDisplay = '';
        let lengthCorrectionInfo = '';
        let minSumError = '';

        const totalLength = parseInt(this.lengthInput.value);

        if (isNaN(totalLength)) {
            primaryErrorForDisplay = 'Password length must be a number.';
            isFormValidForButton = false;
        } else {
            if (totalLength > this.maxLength) {
                this.lengthInput.value = this.maxLength;
                lengthCorrectionInfo = `Length reset to max ${this.maxLength}. Adjusting.`;
            } else if (totalLength < this.minLength) {
                primaryErrorForDisplay = `Length must be at least ${this.minLength}.`;
                isFormValidForButton = false;
            }
        }

        let currentMinSum = 0;
        const currentDisplayLength = parseInt(this.lengthInput.value);

        const optionsForMinValidation = [
            { include: this.uppercaseCheckbox.checked, minInput: this.minUppercaseInput, type: 'Uppercase' },
            { include: this.lowercaseCheckbox.checked, minInput: this.minLowercaseInput, type: 'Lowercase' },
            { include: this.numbersCheckbox.checked, minInput: this.minNumbersInput, type: 'Numbers' },
            { include: this.symbolsCheckbox.checked, minInput: this.minSymbolsInput, type: 'Symbols' }
        ];

        for (const opt of optionsForMinValidation) {
            if (opt.include && opt.minInput) {
                const rawValue = opt.minInput.value.trim();
                const minVal = parseInt(opt.minInput.value);

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
        }

        const finalError = minSumError || primaryErrorForDisplay || lengthCorrectionInfo || '';
        this.errorMessage.textContent = finalError;

        if (this.generateBtn) {
            this.generateBtn.disabled = !isFormValidForButton;
        }

        return isFormValidForButton;
    },

    generatePassword: function () {
        if (!this.passwordDisplay || !this.generateBtn || this.generateBtn.disabled) return;

        if (this.copyFeedback && this.copyFeedback.classList.contains('show')) {
            this.copyFeedback.classList.remove('show');
            if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);
        }
        if (this.copyBtn) {
            this.copyBtn.disabled = true;
        }

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
                    opt.minInput.value = "1";
                    minVal = 1;
                }
                opt.correctedMin = minVal;
                currentMinSumForGeneration += minVal;
            } else {
                opt.correctedMin = 0;
            }
        }

        let totalLength = parseInt(this.lengthInput.value);
        if (isNaN(totalLength) || totalLength < this.minLength) {
            this.lengthInput.value = this.minLength;
            totalLength = this.minLength;
        } else if (totalLength > this.maxLength) {
            this.lengthInput.value = this.maxLength;
            totalLength = this.maxLength;
        }

        if (currentMinSumForGeneration > totalLength) {
            this.errorMessage.textContent = `Sum of minimums (${currentMinSumForGeneration}) exceeds total length (${totalLength}).`;
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
            return;
        }

        this.updateValidationState();

        if (this.passwordPlaceholderSpan) this.passwordPlaceholderSpan.style.display = 'none';
        this.passwordDisplay.innerHTML = '';
        this.plainPassword = '';

        let guaranteedChars = [];
        for (const opt of optionsForGeneration) {
            if (opt.include) {
                for (let i = 0; i < opt.correctedMin; i++) {
                    guaranteedChars.push(this.getRandomChar(opt.set));
                }
            }
        }

        let remainingLength = totalLength - guaranteedChars.length;
        if (remainingLength < 0) remainingLength = 0;

        let randomFillChars = [];
        for (let i = 0; i < remainingLength; i++) {
            randomFillChars.push(this.getRandomChar(characterPool));
        }

        let finalPasswordArray = this.shuffleArray(guaranteedChars.concat(randomFillChars));
        this.plainPassword = finalPasswordArray.join('');

        this.displayStyledPassword(this.plainPassword);
        if (this.copyBtn) {
            this.copyBtn.disabled = !this.plainPassword;
        }

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
                if (opt.cb.checked) {
                    const valueStr = opt.minIn.value.trim();
                    const valInt = parseInt(opt.minIn.value);
                    if (valueStr === '' || isNaN(valInt) || valInt < 1) {
                        opt.minIn.value = "1";
                    }
                }
            }
        });
        this.updateValidationState();
    },

    copyPasswordToClipboard: function () {
        if (!this.plainPassword || !this.copyBtn || this.copyBtn.disabled || !this.copyFeedback) return;

        navigator.clipboard.writeText(this.plainPassword)
            .then(() => {
                this.copyFeedback.textContent = 'Copied!';
                this.copyFeedback.classList.add('show');

                if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);

                this.copyFeedbackTimeout = setTimeout(() => {
                    this.copyFeedback.classList.remove('show');
                }, 2000);
            })
            .catch(err => {
                console.error('PG_COPY_ERROR: Could not copy text: ', err);
                this.copyFeedback.textContent = 'Failed!';
                this.copyFeedback.classList.add('show');

                if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);

                this.copyFeedbackTimeout = setTimeout(() => {
                    this.copyFeedback.classList.remove('show');
                }, 2000);
            });
    },

    init: function () {
        this.fetchElements();

        if (!this.generateBtn || !this.lengthInput || !this.passwordDisplay || !this.copyBtn || !this.copyFeedback) {
            console.error("PG_INIT: Could not find all required elements for Password Generator. Aborting init.");
            return;
        }

        // MODIFIED: Simplified the click handler to call the function directly
        this.generateBtn.addEventListener('click', () => this.generatePassword());
        this.copyBtn.addEventListener('click', () => this.copyPasswordToClipboard());

        const allInputs = [this.lengthInput, this.minUppercaseInput, this.minLowercaseInput, this.minNumbersInput, this.minSymbolsInput];
        const allCheckboxes = [this.uppercaseCheckbox, this.lowercaseCheckbox, this.numbersCheckbox, this.symbolsCheckbox];

        allCheckboxes.forEach(cb => cb && cb.addEventListener('change', () => this.handleCheckboxChange()));

        allInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.updateValidationState());
                input.addEventListener('change', (e) => {
                    const target = e.currentTarget;
                    if (target.id === 'pg-length') {
                        let lenVal = parseInt(target.value);
                        if (isNaN(lenVal) || lenVal < this.minLength) target.value = this.minLength;
                        if (lenVal > this.maxLength) target.value = this.maxLength;
                    } else if (!target.disabled) {
                        const valueStr = target.value.trim();
                        const valInt = parseInt(target.value);
                        if (valueStr === '' || isNaN(valInt) || valInt < 1) {
                            target.value = "1";
                        }
                    }
                    this.updateValidationState();
                });
            }
        });

        this.handleCheckboxChange();

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