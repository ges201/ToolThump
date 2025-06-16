import { calculateEntropy } from './entropy-calculator.js';
import {
    scoreLength,
    scoreCharacterTypes,
    scoreVariety,
    deductForCommonPassword,
    deductForDictionaryWord,
    deductForDate,
    deductForSingleType,
    deductForConsecutiveRuns, // Ensure this is deductForConsecutiveRuns
    deductForSequences
} from './feedback-provider.js';
import {
    MIN_LENGTH,
    ENTROPY_THRESHOLDS
} from './constants.js';

function getPasswordProperties(password) {
    const length = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSymbols = /[^A-Za-z0-9]/.test(password);
    const typesCount = (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasSymbols ? 1 : 0);
    return { length, hasUpper, hasLower, hasNumbers, hasSymbols, typesCount };
}

function determineStrengthPresentation(finalScore, length, entropy, isCommonPassword) {
    let strengthDescription = '';
    let barClass = '';
    let barWidthPercentage = 0;

    if (length === 0) {
        strengthDescription = 'N/A'; barClass = ''; barWidthPercentage = 0;
    } else if (isCommonPassword || length < MIN_LENGTH) {
        strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 10;
    } else {
        const entropyWeight = 0.7;
        const scoreWeight = 0.3;
        const normalizedEntropy = Math.min(10, Math.max(0, entropy / ENTROPY_THRESHOLDS.VERY_STRONG) * 10);
        const combinedScore = (normalizedEntropy * entropyWeight) + (finalScore * scoreWeight);

        if (entropy < ENTROPY_THRESHOLDS.VERY_WEAK || combinedScore <= 2.5) {
            strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 25;
        } else if (entropy < ENTROPY_THRESHOLDS.WEAK || combinedScore <= 4.5) {
            strengthDescription = 'Weak'; barClass = 'weak'; barWidthPercentage = 45;
        } else if (entropy < ENTROPY_THRESHOLDS.MODERATE || combinedScore <= 6.5) {
            strengthDescription = 'Moderate'; barClass = 'moderate'; barWidthPercentage = 65;
        } else if (entropy < ENTROPY_THRESHOLDS.STRONG || combinedScore <= 8.5) {
            strengthDescription = 'Strong'; barClass = 'strong'; barWidthPercentage = 85;
        } else {
            strengthDescription = 'Very Strong'; barClass = 'very-strong'; barWidthPercentage = 100;
        }
    }
    return { strengthDescription, barClass, barWidthPercentage };
}

export function checkPasswordStrength(password) {
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
    const properties = getPasswordProperties(password);

    let positiveScore = 0;
    positiveScore += scoreLength(properties.length, feedback);
    positiveScore += scoreCharacterTypes(properties, feedback);
    positiveScore += scoreVariety(properties, feedback);

    let totalDeductionScore = 0;
    totalDeductionScore += deductForCommonPassword(password, feedback);
    totalDeductionScore += deductForDictionaryWord(password, feedback);
    totalDeductionScore += deductForDate(password, feedback);
    totalDeductionScore += deductForSingleType(properties, feedback);
    // CRITICAL: Ensure this is calling the new function
    totalDeductionScore += deductForConsecutiveRuns(password, feedback);
    totalDeductionScore += deductForSequences(password, positiveScore, feedback);

    const isCommon = feedback.some(f => f.isCommon);
    // Entropy calculation in entropy-calculator.js already penalizes severe repetition
    // via Shannon entropy and its own consecutive char penalty.
    // The feedback here is more for user guidance.
    const entropy = calculateEntropy(password, properties, feedback);

    const finalScore = Math.max(0, positiveScore - totalDeductionScore);
    let { strengthDescription, barClass, barWidthPercentage } = determineStrengthPresentation(finalScore, properties.length, entropy, isCommon);

    if (feedback.some(f => f.text.startsWith("Too short"))) {
        strengthDescription = 'Very Weak';
        barClass = 'very-weak';
        barWidthPercentage = 10;
    }

    feedback.sort((a, b) => {
        const order = {
            "Entropy:": -4,
            "Estimated crack time:": -3,
            "Too short": -2
        };
        const aOrderKey = Object.keys(order).find(key => a.text.startsWith(key));
        const bOrderKey = Object.keys(order).find(key => b.text.startsWith(key));
        const aOrder = aOrderKey ? order[aOrderKey] : (a.valid ? 1 : 0); // invalid (0) before valid (1)
        const bOrder = bOrderKey ? order[bOrderKey] : (b.valid ? 1 : 0);

        if (aOrderKey && !bOrderKey) return -1; // Prioritized items first
        if (!aOrderKey && bOrderKey) return 1;
        if (aOrderKey && bOrderKey && aOrder !== bOrder) return aOrder - bOrder; // Sort among prioritized

        // Then sort by validity (invalid items first)
        if (a.valid !== b.valid) return a.valid ? 1 : -1;

        return 0; // Keep original order for items of same priority and validity
    });

    return {
        score: finalScore,
        entropy: entropy,
        text: strengthDescription,
        barClass: barClass,
        barWidth: barWidthPercentage,
        feedback: feedback
    };
}