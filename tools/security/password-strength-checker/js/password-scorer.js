import { calculateEntropy } from './entropy-calculator.js';
import {
    scoreLength,
    scoreCharacterTypes,
    scoreVariety,
    deductForCommonPassword,
    deductForDictionaryWord,
    deductForDate,
    deductForSingleType,
    deductForRepetitions,
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
        const normalizedEntropy = Math.min(10, (entropy / ENTROPY_THRESHOLDS.VERY_STRONG) * 10);
        const combinedScore = (normalizedEntropy * entropyWeight) + (finalScore * scoreWeight);

        if (entropy < ENTROPY_THRESHOLDS.VERY_WEAK || combinedScore <= 2) {
            strengthDescription = 'Very Weak'; barClass = 'very-weak'; barWidthPercentage = 25;
        } else if (entropy < ENTROPY_THRESHOLDS.WEAK || combinedScore <= 4) {
            strengthDescription = 'Weak'; barClass = 'weak'; barWidthPercentage = 45;
        } else if (entropy < ENTROPY_THRESHOLDS.MODERATE || combinedScore <= 6) {
            strengthDescription = 'Moderate'; barClass = 'moderate'; barWidthPercentage = 65;
        } else if (entropy < ENTROPY_THRESHOLDS.STRONG || combinedScore <= 8) {
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
    totalDeductionScore += deductForRepetitions(password, positiveScore, feedback);
    totalDeductionScore += deductForSequences(password, positiveScore, feedback);

    const isCommon = feedback.some(f => f.isCommon);
    const entropy = calculateEntropy(password, properties, feedback);

    const finalScore = Math.max(0, positiveScore - totalDeductionScore);
    let { strengthDescription, barClass, barWidthPercentage } = determineStrengthPresentation(finalScore, properties.length, entropy, isCommon);

    if (feedback.some(f => f.text.startsWith("Too short"))) {
        strengthDescription = 'Very Weak';
        barClass = 'very-weak';
        barWidthPercentage = 10;
    }

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
}