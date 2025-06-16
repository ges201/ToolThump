import { ENTROPY_THRESHOLDS } from './constants.js';
import { addEntropyFeedback } from './feedback-provider.js';

function calculateSequentialPenalty(password) {
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
                penalty += 2;
            }
        }
    }

    return penalty;
}

export function calculateEntropy(password, properties, feedback) {
    if (password.length === 0) return 0;

    let charSpaceSize = 0;
    if (properties.hasLower) charSpaceSize += 26;
    if (properties.hasUpper) charSpaceSize += 26;
    if (properties.hasNumbers) charSpaceSize += 10;
    if (properties.hasSymbols) charSpaceSize += 32;

    const charFrequency = {};
    for (let char of password) {
        charFrequency[char] = (charFrequency[char] || 0) + 1;
    }

    let shannonEntropy = 0;
    const passwordLength = password.length;
    for (let char in charFrequency) {
        const frequency = charFrequency[char] / passwordLength;
        shannonEntropy -= frequency * Math.log2(frequency);
    }

    const theoreticalEntropy = Math.log2(charSpaceSize) * passwordLength;
    const actualEntropy = Math.min(theoreticalEntropy, shannonEntropy * passwordLength);

    let entropyPenalty = 0;
    const maxRepeats = Math.max(...Object.values(charFrequency));
    if (maxRepeats > 1) {
        entropyPenalty += Math.log2(maxRepeats) * 2;
    }

    entropyPenalty += calculateSequentialPenalty(password);
    const finalEntropy = Math.max(0, actualEntropy - entropyPenalty);

    addEntropyFeedback(finalEntropy, charSpaceSize, feedback, ENTROPY_THRESHOLDS);

    return finalEntropy;
}