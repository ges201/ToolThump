document.addEventListener('DOMContentLoaded', () => {
    const toolCards = document.querySelectorAll('.tool-card');
    let currentIndex = 0;

    function highlightNextCard() {
        // Remove highlight from the previous card
        if (currentIndex > 0) {
            toolCards[currentIndex - 1].classList.remove('highlighted-tool');
            toolCards[currentIndex - 1].querySelector('h3').style.color = 'var(--text-secondary-color)';
        } else if (toolCards.length > 0) {
            // If it's the first iteration, remove highlight from the last card (for looping)
            toolCards[toolCards.length - 1].classList.remove('highlighted-tool');
            toolCards[toolCards.length - 1].querySelector('h3').style.color = 'var(--text-secondary-color)';
        }

        // Add highlight to the current card
        if (toolCards.length > 0) {
            toolCards[currentIndex].classList.add('highlighted-tool');
            toolCards[currentIndex].querySelector('h3').style.color = '#ffffff';
        }

        // Move to the next index, loop back to 0 if at the end
        currentIndex = (currentIndex + 1) % toolCards.length;
    }

    // Start the animation
    if (toolCards.length > 0) {
        setInterval(highlightNextCard, 700); // Highlight every 0.7 seconds
    }
});