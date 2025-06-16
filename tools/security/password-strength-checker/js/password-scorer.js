/**
 * Calculates password strength using zxcvbn and maps it to the UI structure.
 * @param {string} password The password to check.
 * @returns {object} Strength analysis result.
 */
export function checkPasswordStrength(password) {
    if (!password || password.length === 0) {
        return {
            score: 0, // zxcvbn score 0-4
            entropy: 0,
            text: 'N/A',
            barClass: '',
            barWidth: 0,
            feedback: [{ text: 'Enter a password to check its strength.', type: 'info' }] // type: 'info', 'warning', 'suggestion'
        };
    }

    const zxcvbnResult = zxcvbn(password);
    const score = zxcvbnResult.score; // 0-4
    const entropy = zxcvbnResult.guesses_log10 / Math.log10(2); // Convert log10 guesses to bits of entropy

    let strengthDescription = '';
    let barClass = '';
    let barWidthPercentage = 0;

    switch (score) {
        case 0:
            strengthDescription = 'Very Weak';
            barClass = 'very-weak';
            barWidthPercentage = 20;
            break;
        case 1:
            strengthDescription = 'Weak';
            barClass = 'weak';
            barWidthPercentage = 40;
            break;
        case 2:
            strengthDescription = 'Moderate';
            barClass = 'moderate';
            barWidthPercentage = 60;
            break;
        case 3:
            strengthDescription = 'Strong';
            barClass = 'strong';
            barWidthPercentage = 80;
            break;
        case 4:
            strengthDescription = 'Very Strong';
            barClass = 'very-strong';
            barWidthPercentage = 100;
            break;
        default:
            strengthDescription = 'N/A';
            barClass = '';
            barWidthPercentage = 0;
    }

    // If zxcvbn score is low due to common password, override bar width to minimum if not already very low
    if (zxcvbnResult.feedback && zxcvbnResult.feedback.warning && password.length >= 1 && score < 2) {
        if (barWidthPercentage > 10) barWidthPercentage = 10;
        if (strengthDescription !== 'Very Weak') strengthDescription = 'Very Weak';
        if (barClass !== 'very-weak') barClass = 'very-weak';
    }


    const feedbackItems = [];
    if (zxcvbnResult.feedback && zxcvbnResult.feedback.warning) {
        feedbackItems.push({ text: zxcvbnResult.feedback.warning, type: 'warning' });
    }
    if (zxcvbnResult.feedback && zxcvbnResult.feedback.suggestions) {
        zxcvbnResult.feedback.suggestions.forEach(suggestion => {
            feedbackItems.push({ text: suggestion, type: 'suggestion' });
        });
    }

    // Add crack time information
    let crackTimeText = "Estimated crack time: N/A";
    if (zxcvbnResult.crack_times_display) {
        // Prefer offline_fast_hashing, fallback to others if necessary
        const crackTime = zxcvbnResult.crack_times_display.offline_fast_hashing_1e10_per_second ||
            zxcvbnResult.crack_times_display.offline_slow_hashing_1e4_per_second ||
            zxcvbnResult.crack_times_display.online_throttling_100_per_hour ||
            "N/A";
        crackTimeText = `Estimated time to crack: ${crackTime}`;
    }
    feedbackItems.unshift({ text: crackTimeText, type: 'info' });


    return {
        score: score,
        entropy: entropy,
        text: strengthDescription,
        barClass: barClass,
        barWidth: barWidthPercentage,
        feedback: feedbackItems
    };
}