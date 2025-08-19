const brFeatures = {
    // DOM Elements
    featuresContainer: null,
    bgColorContainer: null,
    bgColorPicker: null,
    bgColorSwatches: null,

    // State
    selectedColor: 'transparent', // Default to transparent

    fetchElements: function() {
        this.featuresContainer = document.getElementById('br-features-container');
        this.bgColorContainer = document.getElementById('br-bg-color-container');
        this.bgColorPicker = document.getElementById('br-bg-color-picker');
        this.bgColorSwatches = document.getElementById('br-bg-color-swatches');
    },

    init: function() {
        this.fetchElements();
        if (!this.featuresContainer) return;

        this.bgColorPicker.addEventListener('input', (e) => {
            this.selectedColor = e.target.value;
            this.applyBackgroundColor();
        });

        this.bgColorSwatches.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            if (color) {
                this.selectedColor = color;
                // Only update the color picker if it's a valid hex color
                if (color !== 'transparent') {
                    this.bgColorPicker.value = this.selectedColor;
                }
                this.applyBackgroundColor();
            }
        });
    },

    show: function() {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'block';
        }
    },

    hide: function() {
        if (this.featuresContainer) {
            this.featuresContainer.style.display = 'none';
        }
    },

    applyBackgroundColor: function() {
        if (br.outputCanvas && br.outputCanvas.style.display === 'block' && br.processedImage) {
            const ctx = br.outputCanvas.getContext('2d');
            ctx.clearRect(0, 0, br.outputCanvas.width, br.outputCanvas.height);

            if (this.selectedColor !== 'transparent') {
                ctx.fillStyle = this.selectedColor;
                ctx.fillRect(0, 0, br.outputCanvas.width, br.outputCanvas.height);
            }

            ctx.drawImage(br.processedImage, 0, 0);
        }
    }
};
