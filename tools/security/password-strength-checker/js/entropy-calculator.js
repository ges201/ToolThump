import { ENTROPY_THRESHOLDS, COMMON_WORDS, L33T_MAP } from './constants.js';
import { addEntropyFeedback } from './feedback-provider.js';

// --- Enhanced Helper Functions ---

// Comprehensive list of sequences including reversed and common keyboard paths
const KEYBOARD_SEQUENCES = [
    "abcdefghijklmnopqrstuvwxyz", "zyxwvutsrqponmlkjihgfedcba",
    "0123456789", "9876543210",
    "qwertyuiop", "poiuytrewq",
    "asdfghjkl", "lkjhgfdsa",
    "zxcvbnm", "mnbvcxz",
    // Common QWERTY keyboard diagonals/adjacents (can be expanded)
    "1qaz", "zaq1", "2wsx", "xsw2", "3edc", "cde3", "4rfv", "vfr4", "5tgb", "bgt5",
    "6yhn", "nhy6", "7ujm", "mju7", "8ik,", ",ki8", "9ol.", ".lo9", "0p;/", "/;p0",
    "qwer", "rewq", "asdf", "fdsa", "zxcv", "vcxz", "uiop", "poiu", "hjkl", "lkjh", "bnm,", ",mnb"
];

/**
 * Calculates a penalty based on sequential characters (alphabetic, numeric, keyboard).
 * Prioritizes longer matches and tries to avoid penalizing the same segment multiple times.
 */
function calculateSequentialPatternPenalty(password) {
    let penalty = 0;
    const n = password.length;
    if (n < 3) return 0;
    const lowerPassword = password.toLowerCase();
    const matchedSegments = new Array(n).fill(false); // To mark parts of the password already penalized

    // Iterate through predefined sequence patterns
    for (const seqPattern of KEYBOARD_SEQUENCES) {
        // Check for matches of this pattern, from full length down to 3 characters
        for (let len = seqPattern.length; len >= 3; len--) {
            const subPattern = seqPattern.substring(0, len);
            let searchIndex = -1;
            while ((searchIndex = lowerPassword.indexOf(subPattern, searchIndex + 1)) !== -1) {
                // Check if this segment (or part of it) has already been penalized by a longer/earlier match
                let isNewSegment = false;
                for (let k = 0; k < len; k++) {
                    if (!matchedSegments[searchIndex + k]) {
                        isNewSegment = true;
                        matchedSegments[searchIndex + k] = true; // Mark as matched
                    }
                }

                if (isNewSegment) {
                    // Penalty increases with the length of the sequence
                    // (len - 2) makes a 3-char sequence penalty 1, 4-char -> 2, etc.
                    // Multiplier makes it more significant in bits. Tunable.
                    penalty += (len - 2) * 2.5;
                }
            }
        }
    }
    return penalty;
}

/**
 * Performs a simplified "unleet" transformation on the password.
 * Uses L33T_MAP imported from constants.js.
 */
function unleetPassword(password, leetMap) {
    let unleetedPassword = password.toLowerCase();
    for (const [letter, subs] of Object.entries(leetMap)) {
        for (const sub of subs) {
            // Escape special characters in 'sub' for RegExp
            const escapedSub = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            unleetedPassword = unleetedPassword.replace(new RegExp(escapedSub, 'g'), letter);
        }
    }
    return unleetedPassword;
}


// --- Main Entropy Calculation ---

export function calculateEntropy(password, properties, feedback) {
    if (password.length === 0) {
        addEntropyFeedback(0, 0, feedback, ENTROPY_THRESHOLDS);
        return 0;
    }

    let charSpaceSize = 0;
    if (properties.hasLower) charSpaceSize += 26;
    if (properties.hasUpper) charSpaceSize += 26;
    if (properties.hasNumbers) charSpaceSize += 10;
    if (properties.hasSymbols) charSpaceSize += 32; // Common estimate for symbols

    // Fallback if properties somehow report no character types but password exists
    if (charSpaceSize === 0 && password.length > 0) {
        const uniqueChars = new Set(password);
        if (uniqueChars.size <= 1) charSpaceSize = 1; // Avoid log(0) or issues with single unique char
        else if (uniqueChars.size <= 10 && /\d/.test(password) && !/[a-zA-Z]/.test(password)) charSpaceSize = 10; // Looks like only numbers
        else if (uniqueChars.size <= 26 && !/\d/.test(password) && !/[^a-zA-Z0-9]/.test(password)) charSpaceSize = 26; // Looks like only letters
        else charSpaceSize = Math.max(uniqueChars.size, 50); // Generic fallback pool size
    }
    charSpaceSize = Math.max(1, charSpaceSize); // Ensure charSpaceSize is at least 1

    // Theoretical maximum entropy (attacker knows character types used)
    const theoreticalEntropy = Math.log2(charSpaceSize) * password.length;

    // Shannon entropy (attacker analyzes this specific password's character distribution)
    const charFrequency = {};
    for (let char of password) {
        charFrequency[char] = (charFrequency[char] || 0) + 1;
    }

    let shannonEntropyBits = 0;
    const passwordLength = password.length;
    for (let char in charFrequency) {
        const p = charFrequency[char] / passwordLength;
        shannonEntropyBits -= p * Math.log2(p);
    }
    const totalShannonEntropy = shannonEntropyBits * passwordLength;

    // Base entropy: Use the lesser of theoretical and Shannon.
    // This correctly handles cases like "aaaaa" (low Shannon) vs. a random string from the same charset.
    let currentEntropy = passwordLength > 0 ? Math.min(theoreticalEntropy, totalShannonEntropy) : 0;
    if (charSpaceSize === 1 && passwordLength > 0) currentEntropy = 0; // If only one char type is possible, effectively zero entropy


    // --- PENALTIES ---
    // Penalties are subtracted from the base entropy.
    let totalPenalty = 0;

    // 1. Penalty for very short passwords (explicit, supplements natural low entropy)
    if (passwordLength < 4) totalPenalty += (4 - passwordLength) * 5; // e.g. 3-char: 5, 2-char: 10
    else if (passwordLength < MIN_LENGTH) totalPenalty += (MIN_LENGTH - passwordLength) * 2;


    // 2. Repetition Penalties
    let repetitionPenalty = 0;
    //  a) Consecutive identical characters (e.g., 'aaa', '11')
    let consecutiveCharCount = 0;
    if (passwordLength > 1) {
        for (let i = 0; i < passwordLength - 1; i++) {
            if (password[i].toLowerCase() === password[i + 1].toLowerCase()) { // Case-insensitive check for sequences
                consecutiveCharCount++;
            }
        }
        repetitionPenalty += consecutiveCharCount * 2.0; // Tunable factor
    }
    //  b) Overall character repetition (original logic for most frequent character)
    const maxRepeats = Math.max(0, ...Object.values(charFrequency));
    if (maxRepeats > passwordLength / 2 && passwordLength > 3) { // If one char is >50% of a non-trivial password
        repetitionPenalty += Math.log2(maxRepeats) * 2.0; // Tunable factor
    }
    totalPenalty += repetitionPenalty;


    // 3. Sequential Pattern Penalty (alphabetic, numeric, keyboard)
    totalPenalty += calculateSequentialPatternPenalty(password);


    // 4. Dictionary Word Penalty
    let dictionaryPenalty = 0;
    const lowerPassword = password.toLowerCase();
    const unleetedLowerPassword = unleetPassword(password, L33T_MAP); // Use L33T_MAP from constants

    let longestWordMatchLength = 0;
    for (const word of COMMON_WORDS) {
        let currentMatch = false;
        if (lowerPassword.includes(word)) {
            currentMatch = true;
        }
        // Only check unleeted if it's different and word not already found
        if (!currentMatch && unleetedLowerPassword !== lowerPassword && unleetedLowerPassword.includes(word)) {
            currentMatch = true;
        }

        if (currentMatch) {
            // Penalty based on the "saved" bits by knowing this word.
            // log2(COMMON_WORDS.length) is an estimate of bits to guess word from list.
            // word.length * log2(avg_charset_for_words e.g. 26) is bits if it were random.
            // A simple strong penalty:
            dictionaryPenalty += (word.length / passwordLength) * 20; // Proportional to word length, up to 20 bits
            longestWordMatchLength = Math.max(longestWordMatchLength, word.length);
        }
    }
    if (longestWordMatchLength > 0) {
        // Add a base penalty plus factor for the longest word found, ensures significance
        totalPenalty += Math.min(dictionaryPenalty + 5 + longestWordMatchLength, currentEntropy * 0.8); // Cap to avoid huge negative
    }


    // 5. Date Pattern Penalty (simple year check)
    if (/\b(19\d{2}|20\d{2})\b/.test(password)) {
        totalPenalty += 10; // Penalty for a 4-digit year, ~10 bits guess
    }
    // Could add more date patterns (MMDD, MMDDYY etc.)

    // Calculate final entropy
    const finalEntropy = Math.max(0, currentEntropy - totalPenalty);

    // Provide feedback based on the new, more precise entropy score
    addEntropyFeedback(finalEntropy, charSpaceSize, feedback, ENTROPY_THRESHOLDS);

    return finalEntropy;
}

// Ensure MIN_LENGTH is available if used directly for penalties
const MIN_LENGTH = 8; // Or import from constants.js if it's defined there and needed here.
// The provided constants.js has it.