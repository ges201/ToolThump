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

// Maximum number of items to list before summarizing with "and X other(s)"
const MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK = 3;
const MIN_CONSECUTIVE_RUN_LENGTH = 4; // Minimum length for a run to be flagged

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
    const guessesPerSecond = 2 * 1000 * 1000 * 1000;
    const secondsToCrack = possibleCombinations / guessesPerSecond;
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
        valid: entropy >= ENTROPY_THRESHOLDS.MODERATE
    });
}

function unleet(password) {
    let unleetedPassword = password.toLowerCase();
    for (const [letter, subs] of Object.entries(L33T_MAP)) {
        for (const sub of subs) {
            const escapedSub = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            unleetedPassword = unleetedPassword.replace(new RegExp(escapedSub, 'g'), letter);
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
    const foundWords = new Set();

    for (const word of COMMON_WORDS) {
        if (lowerPassword.includes(word)) {
            foundWords.add(word);
        }
        if (unleetedPassword !== lowerPassword && unleetedPassword.includes(word)) {
            foundWords.add(word);
        }
    }

    if (foundWords.size > 0) {
        const wordsArray = Array.from(foundWords);
        let wordListText;
        if (wordsArray.length > MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK) {
            wordListText = wordsArray.slice(0, MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK).map(w => `'${w}'`).join(', ') +
                `, and ${wordsArray.length - MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK} other(s)`;
        } else {
            wordListText = wordsArray.map(w => `'${w}'`).join(', ');
        }
        const message = `Contains common word(s) (${wordListText}). Weakens password.`;
        feedback.push({ text: message, valid: false });
        return 3 + Math.min(2, wordsArray.length - 1);
    }
    return 0;
}

export function deductForDate(password, feedback) {
    const datePatterns = [
        /\b(19\d{2}|20\d{2})\b/,
        /\b\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\b/,
        /\b(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{2}\b/,
        /\b(0?[1-9]|1[0-2])[\/\.-](0?[1-9]|[12]\d|3[01])[\/\.-](\d{2}|\d{4})\b/
    ];
    let foundDatePatterns = 0;
    for (const pattern of datePatterns) {
        if (pattern.test(password)) {
            foundDatePatterns++;
        }
    }

    if (foundDatePatterns > 0) {
        feedback.push({ text: 'Contains date-like patterns, which can be easy to guess.', valid: false });
        return 2 + Math.min(foundDatePatterns - 1, 2);
    }
    return 0;
}

export function deductForSingleType(properties, feedback) {
    if (properties.length >= MIN_LENGTH && properties.typesCount === 1) {
        let typeUsed = '';
        if (properties.hasLower) typeUsed = 'lowercase letters only';
        else if (properties.hasUpper) typeUsed = 'uppercase letters only';
        else if (properties.hasNumbers) typeUsed = 'numbers only';
        else if (properties.hasSymbols) typeUsed = 'symbols only';
        feedback.push({ text: `Weakness: Uses ${typeUsed}. Add more character types.`, valid: false });
        return 2;
    }
    return 0;
}

/**
 * Deducts points for long consecutive runs of identical characters.
 */
export function deductForConsecutiveRuns(password, feedback) {
    if (!password || password.length < MIN_CONSECUTIVE_RUN_LENGTH) {
        return 0;
    }

    let deduction = 0;
    const foundRunsStrings = []; // Stores the actual run strings for feedback, e.g., "aaaaa"
    let currentChar = '';
    let currentCount = 0;
    // Using password.toLowerCase() for case-insensitive run detection (e.g. "aAAa" is a run of 'a')
    const lowerPassword = password.toLowerCase();

    for (let i = 0; i < lowerPassword.length; i++) {
        if (lowerPassword[i] === currentChar) {
            currentCount++;
        } else {
            // End of a run (or start of password)
            if (currentCount >= MIN_CONSECUTIVE_RUN_LENGTH) {
                foundRunsStrings.push(currentChar.repeat(currentCount));
                // Deduction: 1 point for meeting threshold, +1 for each char over threshold, capped per run
                deduction += 1 + Math.min(2, Math.floor((currentCount - MIN_CONSECUTIVE_RUN_LENGTH)));
            }
            currentChar = lowerPassword[i];
            currentCount = 1;
        }
    }
    // Check for a run at the end of the password
    if (currentCount >= MIN_CONSECUTIVE_RUN_LENGTH) {
        foundRunsStrings.push(currentChar.repeat(currentCount));
        deduction += 1 + Math.min(2, Math.floor((currentCount - MIN_CONSECUTIVE_RUN_LENGTH)));
    }

    if (foundRunsStrings.length > 0) {
        const formattedRunsForFeedback = foundRunsStrings.map(run => {
            // Use the original casing from the password for the feedback segment
            // To do this, we need to know where this run started in the original password.
            // This is a bit tricky since we iterated on lowerPassword.
            // For simplicity in feedback, we'll show the lowercase char and length.
            // Or, show the first char of the run as it appeared.
            // Let's stick to the example: 'aaaa...'
            const displayChar = run.charAt(0);
            if (run.length > MIN_CONSECUTIVE_RUN_LENGTH) {
                return `'${displayChar.repeat(MIN_CONSECUTIVE_RUN_LENGTH)}...'`;
            }
            return `'${displayChar.repeat(MIN_CONSECUTIVE_RUN_LENGTH)}'`;
        });

        let runListText;
        if (formattedRunsForFeedback.length > MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK) {
            runListText = formattedRunsForFeedback.slice(0, MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK).join(', ') +
                `, and ${formattedRunsForFeedback.length - MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK} other(s)`;
        } else {
            runListText = formattedRunsForFeedback.join(', ');
        }
        feedback.push({
            text: `Contains long consecutive characters (${runListText}). Weakens password.`,
            valid: false
        });
    }
    return Math.min(deduction, 5); // Cap total deduction from this rule (e.g., max 5 points)
}


export function deductForSequences(password, positiveScore, feedback) {
    let deduction = 0;
    const foundSequences = new Set();
    const basicSequences = [
        "abcdefghijklmnopqrstuvwxyz",
        "0123456789",
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm"
    ];
    const lowerPassword = password.toLowerCase();

    if (password.length > 2) {
        for (let i = 0; i <= lowerPassword.length - 3; i++) {
            let sub3 = lowerPassword.substring(i, i + 3);
            let sub4 = lowerPassword.length > i + 3 ? lowerPassword.substring(i, i + 4) : null;

            for (const seq of basicSequences) {
                const reversedSeq = seq.split("").reverse().join("");
                if (sub4 && (seq.includes(sub4) || reversedSeq.includes(sub4))) {
                    foundSequences.add(sub4);
                } else if (seq.includes(sub3) || reversedSeq.includes(sub3)) {
                    let alreadyCoveredByLonger = false;
                    if (sub4) { // check if sub3 is part of an already added longer sequence from this position
                        for (const found of foundSequences) {
                            if (found.startsWith(lowerPassword.substring(i, i + 1)) && found.includes(sub3) && found.length > sub3.length) {
                                alreadyCoveredByLonger = true;
                                break;
                            }
                        }
                    }
                    if (!alreadyCoveredByLonger) foundSequences.add(sub3);
                }
            }
        }
    }

    const uniqueSequencesFound = Array.from(foundSequences);

    if (uniqueSequencesFound.length > 0) {
        let baseSequenceDeduction = 0;
        uniqueSequencesFound.forEach(seq => {
            baseSequenceDeduction += (seq.length - 2); // e.g. 3-char seq = 1pt, 4-char = 2pts
        });

        if (positiveScore >= SUPER_STRONG_POSITIVE_THRESHOLD) {
            deduction = Math.min(baseSequenceDeduction, 2);
        } else if (positiveScore >= STRONG_POSITIVE_THRESHOLD) {
            deduction = Math.min(baseSequenceDeduction, 3);
        } else {
            deduction = Math.min(baseSequenceDeduction, 4);
        }
        deduction = Math.max(0, deduction); // ensure deduction is not negative

        if (deduction > 0) {
            let sequenceListText;
            if (uniqueSequencesFound.length > MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK) {
                sequenceListText = uniqueSequencesFound.slice(0, MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK).map(s => `"${s}"`).join(', ') +
                    `, and ${uniqueSequencesFound.length - MAX_ITEMS_TO_DISPLAY_IN_FEEDBACK} other(s)`;
            } else {
                sequenceListText = uniqueSequencesFound.map(s => `"${s}"`).join(', ');
            }
            feedback.push({ text: `Contains keyboard/alphanumeric sequences (${sequenceListText}). Weakens password.`, valid: false });
        }
    }
    return deduction;
}