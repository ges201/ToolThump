// --- Password Generator Logic ---
const pg = {
    lengthInput: document.getElementById('pg-length'),
    uppercaseCheckbox: document.getElementById('pg-include-uppercase'),
    lowercaseCheckbox: document.getElementById('pg-include-lowercase'),
    numbersCheckbox: document.getElementById('pg-include-numbers'),
    symbolsCheckbox: document.getElementById('pg-include-symbols'),
    minUppercaseInput: document.getElementById('pg-min-uppercase'),
    minLowercaseInput: document.getElementById('pg-min-lowercase'),
    minNumbersInput: document.getElementById('pg-min-numbers'),
    minSymbolsInput: document.getElementById('pg-min-symbols'),

    generateBtn: document.getElementById('pg-generate-btn'),
    passwordDisplay: document.getElementById('pg-generated-password-display'),
    passwordPlaceholder: document.querySelector('.pg-password-placeholder'),
    copyBtn: document.getElementById('pg-copy-btn'),
    copyFeedback: document.getElementById('pg-copy-feedback'),
    copyTooltip: document.querySelector('#pg-copy-btn .pg-copy-tooltip'),
    errorMessage: document.getElementById('pg-error-message'),

    plainPassword: '',
    maxLength: 64,
    minLength: 8,

    charSets: {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    },

    getRandomChar: function (charSet) {
        return charSet[Math.floor(Math.random() * charSet.length)];
    },

    updateValidationState: function () {
        let isFormValidForButton = true;
        let primaryErrorForDisplay = '';
        let lengthCorrectionInfo = '';

        // --- 1. Validate Total Length ---
        const totalLength = parseInt(this.lengthInput.value);

        if (isNaN(totalLength)) {
            primaryErrorForDisplay = 'Password length must be a number.';
            isFormValidForButton = false;
        } else {
            if (totalLength > this.maxLength) {
                this.lengthInput.value = this.maxLength;
                lengthCorrectionInfo = `Length reset to max ${this.maxLength}.`;
                // Button might still be valid if minLength <= maxLength
                if (this.maxLength < this.minLength) isFormValidForButton = false;

            } else if (totalLength < this.minLength) {
                primaryErrorForDisplay = `Length must be at least ${this.minLength}.`;
                isFormValidForButton = false;
            }
        }

        // --- 2. Calculate Sum of Minimums and Validate Min Inputs ---
        let currentMinSum = 0;
        let minSumValidationError = '';
        const currentDisplayLength = parseInt(this.lengthInput.value); // Re-parse, could have been corrected

        const optionsForMinValidation = [
            { include: this.uppercaseCheckbox.checked, minInput: this.minUppercaseInput, type: 'uppercase' },
            { include: this.lowercaseCheckbox.checked, minInput: this.minLowercaseInput, type: 'lowercase' },
            { include: this.numbersCheckbox.checked, minInput: this.minNumbersInput, type: 'numbers' },
            { include: this.symbolsCheckbox.checked, minInput: this.minSymbolsInput, type: 'symbols' }
        ];

        for (const opt of optionsForMinValidation) {
            if (opt.include) {
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
        } else if (isFormValidForButton) { // If length was valid before this sum check, but now currentDisplayLength is not valid (e.g. NaN or < minLength due to other checks)
            // This might happen if totalLength was initially NaN or became so and wasn't caught by the first block.
            // Or if totalLength was < minLength.
            isFormValidForButton = false; // Ensure button is disabled.
            if (!primaryErrorForDisplay && !minSumValidationError) primaryErrorForDisplay = "Invalid length for sum calculation.";
        }


        // --- 3. Determine final error message and button state ---
        if (minSumValidationError) {
            this.errorMessage.textContent = minSumValidationError;
        } else if (primaryErrorForDisplay) {
            this.errorMessage.textContent = primaryErrorForDisplay;
        } else if (lengthCorrectionInfo) {
            this.errorMessage.textContent = lengthCorrectionInfo;
        } else {
            this.errorMessage.textContent = '';
        }

        if (this.generateBtn) {
            this.generateBtn.disabled = !isFormValidForButton;
        }

        return isFormValidForButton;
    },

    generatePassword: function () {
        if (this.errorMessage.textContent.startsWith('Length reset to max')) {
            this.errorMessage.textContent = ''; // Clear transient message
        }

        if (this.passwordPlaceholder) this.passwordPlaceholder.style.display = 'none';

        if (!this.updateValidationState()) { // Re-validate before generating
            this.passwordDisplay.innerHTML = ''; // Clear display
            if (this.passwordPlaceholder) this.passwordPlaceholder.style.display = 'inline';
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
            let minVal = parseInt(opt.minInput.value);
            if (opt.include && (isNaN(minVal) || minVal < 1)) {
                minVal = 1;
                opt.minInput.value = "1";
            } else if (!opt.include) {
                minVal = 0;
            }


            if (opt.include) {
                characterPool += opt.set;
                currentMinSumForGeneration += minVal;
                for (let i = 0; i < minVal; i++) {
                    if (opt.set.length > 0) {
                        guaranteedChars.push(this.getRandomChar(opt.set));
                    } else { // Should not happen with predefined charsets
                        this.errorMessage.textContent = `Error: Charset for ${opt.type} is empty.`;
                        this.passwordDisplay.innerHTML = '';
                        if (this.passwordPlaceholder) this.passwordPlaceholder.style.display = 'inline';
                        return;
                    }
                }
            }
            // No explicit error here if !opt.include and minInput.value > 0, as updateValidationState handles sums of *active* minimums.
            // The checkbox disabling the minInput is the primary UI cue.
        }

        if (characterPool === '') {
            this.errorMessage.textContent = 'Select at least one character type.';
            this.passwordDisplay.innerHTML = '';
            if (this.passwordPlaceholder) this.passwordPlaceholder.style.display = 'inline';
            return;
        }
        // This check should ideally be covered by updateValidationState, but as a safeguard:
        if (currentMinSumForGeneration > totalLength) {
            this.errorMessage.textContent = `Sum of minimums (${currentMinSumForGeneration}) > total length (${totalLength}). Fix options.`;
            this.passwordDisplay.innerHTML = '';
            if (this.passwordPlaceholder) this.passwordPlaceholder.style.display = 'inline';
            return;
        }

        let remainingLength = totalLength - guaranteedChars.length;
        let randomFillChars = [];
        for (let i = 0; i < remainingLength; i++) {
            if (characterPool.length === 0) { // Should not happen if initial check passed
                this.errorMessage.textContent = "Error: Character pool became empty unexpectedly.";
                this.passwordDisplay.innerHTML = '';
                if (this.passwordPlaceholder) this.passwordPlaceholder.style.display = 'inline';
                return;
            }
            randomFillChars.push(this.getRandomChar(characterPool));
        }

        let finalPasswordArray = this.shuffleArray(guaranteedChars.concat(randomFillChars));
        this.plainPassword = finalPasswordArray.join('');

        this.displayStyledPassword(this.plainPassword);
        // Clear errors that were resolved by generation (like sum errors if length was adjusted etc.)
        if (this.errorMessage.textContent.toLowerCase().includes('length must be') ||
            this.errorMessage.textContent.toLowerCase().includes('sum of minimums')) {
             this.errorMessage.textContent = '';
        }
        this.copyFeedback.textContent = '';
        this.updateCopyButtonTooltip('Copy');
    },

    displayStyledPassword: function (password) {
        let styledHtml = '';
        for (const char of password) {
            if (this.charSets.numbers.includes(char)) {
                styledHtml += `<span class="char-number">${char}</span>`;
            } else if (this.charSets.symbols.includes(char)) {
                styledHtml += `<span class="char-symbol">${char}</span>`;
            } else {
                styledHtml += `<span>${char}</span>`; // Wrap all chars for consistency if needed
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

    copyToClipboard: async function () {
        if (!this.plainPassword) {
            this.copyFeedback.textContent = 'Nothing to copy!';
            this.copyFeedback.style.color = 'var(--error-color)'; // Use CSS var
            setTimeout(() => {
                this.copyFeedback.textContent = '';
                this.copyFeedback.style.color = ''; // Reset color
            }, 2000);
            return;
        }

        try {
            await navigator.clipboard.writeText(this.plainPassword);
            this.copyFeedback.textContent = 'Copied!';
            this.copyFeedback.style.color = 'var(--success-color)';
            this.updateCopyButtonTooltip('Copied!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            this.copyFeedback.textContent = 'Copy failed!';
            this.copyFeedback.style.color = 'var(--error-color)';
            // Fallback for older browsers or if clipboard API fails
            try {
                const tempInput = document.createElement('textarea');
                tempInput.style.position = 'absolute'; // Hide it
                tempInput.style.left = '-9999px';
                tempInput.value = this.plainPassword;
                document.body.appendChild(tempInput);
                tempInput.select();
                tempInput.setSelectionRange(0, 99999); /* For mobile devices */
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                this.copyFeedback.textContent = 'Copied (fallback)!';
                this.copyFeedback.style.color = 'var(--success-color)';
                this.updateCopyButtonTooltip('Copied!');
            } catch (execErr) {
                console.error('Fallback copy failed: ', execErr);
                this.copyFeedback.textContent = 'Automatic copy failed. Please copy manually.';
                // Keep error color for this message
            }
        }

        setTimeout(() => {
            if (this.copyFeedback.textContent !== 'Automatic copy failed. Please copy manually.') {
                this.copyFeedback.textContent = '';
            }
            this.updateCopyButtonTooltip('Copy'); // Reset tooltip regardless
        }, 2000);
    },

    updateCopyButtonTooltip: function (text) {
        if (this.copyTooltip) {
            this.copyTooltip.textContent = text;
            const successTexts = ['Copied!', 'Copied (fallback)!'];
            if (successTexts.includes(text)) {
                this.copyTooltip.classList.add('show');
                setTimeout(() => this.copyTooltip.classList.remove('show'), 2000);
            } else {
                this.copyTooltip.classList.remove('show');
            }
        }
    },

    handleCheckboxChange: function () {
        const optionInputs = [
            { cb: this.uppercaseCheckbox, minIn: this.minUppercaseInput },
            { cb: this.lowercaseCheckbox, minIn: this.minLowercaseInput },
            { cb: this.numbersCheckbox, minIn: this.minNumbersInput },
            { cb: this.symbolsCheckbox, minIn: this.minSymbolsInput },
        ];

        optionInputs.forEach(opt => {
            if (opt.cb && opt.minIn) { // Ensure elements exist
                opt.minIn.disabled = !opt.cb.checked;
                if (opt.cb.checked && (parseInt(opt.minIn.value) < 1 || isNaN(parseInt(opt.minIn.value)))) {
                    opt.minIn.value = "1";
                }
                // If unchecked, we don't reset its value, just disable it.
                // User might re-check and want their previous min value.
            }
        });
        this.updateValidationState();
    },

    init: function () {
        // Ensure all elements are present before adding listeners
        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', () => this.generatePassword());
        }
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => this.copyToClipboard().catch(err => console.error("Copy error:", err)));
        }

        const allOptionInputsAndCheckboxes = [
            this.uppercaseCheckbox, this.lowercaseCheckbox, this.numbersCheckbox, this.symbolsCheckbox,
            this.minUppercaseInput, this.minLowercaseInput, this.minNumbersInput, this.minSymbolsInput,
            this.lengthInput // Add lengthInput to the list for consistent handling if needed
        ];
        
        allOptionInputsAndCheckboxes.forEach(input => {
            if (input) { // Check if element exists
                if (input.type === 'checkbox') {
                    input.addEventListener('change', () => this.handleCheckboxChange());
                } else if (input.type === 'number') { // This now covers lengthInput and min count inputs
                    input.addEventListener('input', () => this.updateValidationState());
                    input.addEventListener('change', () => { // On change (e.g., blur, arrow clicks)
                        if (input !== this.lengthInput && !input.disabled) { // Min count inputs that are active
                            if (parseInt(input.value) < 1 || isNaN(parseInt(input.value))) {
                                input.value = "1"; // Enforce min 1 if active
                            }
                        }
                        this.updateValidationState(); // Always re-validate
                    });
                }
            }
        });

        // Initial setup
        this.handleCheckboxChange(); // Set initial state of min inputs based on checkboxes
        this.updateValidationState(); // Perform initial validation

        // Set initial placeholder visibility
        if (this.passwordPlaceholder && this.passwordDisplay) {
            this.passwordDisplay.innerHTML = ''; // Clear any potential old content
            this.passwordDisplay.appendChild(this.passwordPlaceholder);
            this.passwordPlaceholder.style.display = 'inline';
        }
    }
};