import {
    MIN_LENGTH,
    IDEAL_LENGTH,
    VERY_GOOD_LENGTH,
    COMMON_PASSWORDS,
    COMMON_WORDS,
    L33T_MAP,
    SUPER_STRONG_POSITIVE_THRESHOLD,
    STRONG_POSITIVE_THRESHOLD
} from './constants.js';

function formatCrackTime(seconds) {
    if (seconds < 1) return "Less than 1 second";
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 31536000000) return `${Math.round(seconds / 31536000)} years`;
    return "Billions of years";
}

export function addEntropyFeedback(entropy, charSpaceSize, feedback, ENTROPY_THRESHOLDS) {
    const possibleCombinations = Math.pow(2, entropy);
    const secondsToCrack = possibleCombinations / (2 * 1000000000);
    let timeString = formatCrackTime(secondsToCrack);

    let entropyDescription = "";
    let entropyValid = false;

    if (entropy < ENTROPY_THRESHOLDS.VERY_WEAK) {
        entropyDescription = "very low - highly predictable";
        entropyValid = false;
    } else if (entropy < ENTROPY_THRESHOLDS.WEAK) {
        entropyDescription = "low - easily guessable";
        entropyValid = false;
    } else if (entropy < ENTROPY_THRESHOLDS.MODERATE) {
        entropyDescription = "moderate - consider more diversity";
        entropyValid = false;
    } else if (entropy < ENTROPY_THRESHOLDS.STRONG) {
        entropyDescription = "good - reasonably secure";
        entropyValid = true;
    } else if (entropy < ENTROPY_THRESHOLDS.VERY_STRONG) {
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
        valid: entropy >= ENTROPY_THRESHOLDS.STRONG
    });
}

function unleet(password) {
    let unleetedPassword = password.toLowerCase();
    for (const [letter, subs] of Object.entries(L33T_MAP)) {
        for (const sub of subs) {
            unleetedPassword = unleetedPassword.replace(new RegExp('\\' + sub, 'g'), letter);
        }
    }
    return unleetedPassword;
}

export function scoreLength(length, feedback) {
    let score = 0;
    if (length >= MIN_LENGTH) score += 1;
    if (length >= IDEAL_LENGTH) score += 1;
    if (length >= VERY_GOOD_LENGTH) score += 1;

    if (length < MIN_LENGTH) {
        feedback.push({ text: `Too short (minimum ${MIN_LENGTH} characters).`, valid: false });
    } else if (length >= VERY_GOOD_LENGTH) {
        feedback.push({ text: `Excellent length (${length} characters).`, valid: true });
    } else if (length >= IDEAL_LENGTH) {
        feedback.push({ text: `Good length (${length} characters).`, valid: true });
    } else {
        feedback.push({ text: `Meets minimum length (${length} characters).`, valid: true });
    }
    return score;
}

export function scoreCharacterTypes(properties, feedback) {
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
}

export function scoreVariety(properties, feedback) {
    let score = 0;
    if (properties.typesCount >= 3) score += 1;
    if (properties.typesCount === 4) score += 1;

    if (properties.typesCount === 4) {
        feedback.push({ text: 'Excellent mix: All 4 character types used.', valid: true });
    } else if (properties.typesCount === 3) {
        feedback.push({ text: 'Good mix: 3 character types used.', valid: true });
    }
    return score;
}

export function deductForCommonPassword(password, feedback) {
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
        feedback.push({ text: 'This is a very common password and is insecure.', valid: false, isCommon: true });
        return 10;
    }
    return 0;
}

export function deductForDictionaryWord(password, feedback) {
    const lowerPassword = password.toLowerCase();
    const unleetedPassword = unleet(password);

    for (const word of COMMON_WORDS) {
        if (lowerPassword.includes(word) || unleetedPassword.includes(word)) {
            feedback.push({ text: `Contains a common word ('${word}').`, valid: false });
            return 3;
        }
    }
    return 0;
}

export function deductForDate(password, feedback) {
    if (/\b(19|20)\d{2}\b/.test(password)) {
        feedback.push({ text: 'Contains a year, which can be easy to guess.', valid: false });
        return 2;
    }
    return 0;
}

export function deductForSingleType(properties, feedback) {
    if (properties.length >= MIN_LENGTH && properties.typesCount === 1) {
        feedback.push({ text: 'Weakness: Uses only one type of character.', valid: false });
        return 2;
    }
    return 0;
}

export function deductForRepetitions(password, positiveScore, feedback) {
    let deduction = 0;
    const lowerPassword = password.toLowerCase();
    for (let i = 0; i < lowerPassword.length / 2; i++) {
        const sub = lowerPassword.substring(i, i + Math.floor(lowerPassword.length / 3));
        if (sub.length < 2) continue;
        const occurrences = (lowerPassword.match(new RegExp(sub.replace(/[^a-zA-Z0-9]/g, '\\$&'), 'g')) || []).length;
        if (occurrences > 1) {
            deduction = Math.min(occurrences - 1, 3);
            if (deduction > 0) {
                feedback.push({ text: `Repetitive patterns found (e.g., "${sub}..."). Weakens password.`, valid: false });
                return deduction;
            }
        }
    }
    return deduction;
}

export function deductForSequences(password, positiveScore, feedback) {
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
        if (positiveScore >= SUPER_STRONG_POSITIVE_THRESHOLD) {
            deduction = Math.min(sequentialCharsCount, 1);
        } else if (positiveScore >= STRONG_POSITIVE_THRESHOLD) {
            deduction = Math.min(sequentialCharsCount, 2);
        } else {
            deduction = Math.min(sequentialCharsCount, 3);
        }
        if (deduction > 0) {
            feedback.push({ text: `Common keyboard sequences found (e.g., "abc"). Weakens password.`, valid: false });
        }
    }
    return deduction;
}