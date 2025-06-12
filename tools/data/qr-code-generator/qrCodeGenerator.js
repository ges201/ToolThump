document.addEventListener('DOMContentLoaded', () => {

    const qrCodeGenerator = {
        // --- DOM Elements ---
        elements: {
            tabText: document.getElementById('tab-text'),
            tabWifi: document.getElementById('tab-wifi'),
            panelText: document.getElementById('panel-text'),
            panelWifi: document.getElementById('panel-wifi'),
            textInput: document.getElementById('qrg-text-input'),
            wifiSsidInput: document.getElementById('qrg-wifi-ssid'),
            wifiPasswordInput: document.getElementById('qrg-wifi-password'),
            wifiEncryptionSelect: document.getElementById('qrg-wifi-encryption'),
            generateBtn: document.getElementById('qrg-generate-btn'),
            qrCodeContainer: document.getElementById('qrg-qrcode-container'),
            downloadBtn: document.getElementById('qrg-download-btn'),
            placeholderText: document.querySelector('.qrg-placeholder'),
        },

        // --- State ---
        state: {
            activeTab: 'text',
            // REMOVED: qrCodeInstance is no longer stored in state.
        },

        // --- Initialization ---
        init() {
            this.addEventListeners();
            this.updateView();
        },

        // --- Event Listeners ---
        addEventListeners() {
            const { elements } = this;

            elements.tabText.addEventListener('click', () => this.setActiveTab('text'));
            elements.tabWifi.addEventListener('click', () => this.setActiveTab('wifi'));
            elements.generateBtn.addEventListener('click', () => this.generateQRCode());
            elements.downloadBtn.addEventListener('click', () => this.downloadQRCode());

            elements.wifiPasswordInput.addEventListener('dblclick', (e) => {
                e.target.type = e.target.type === 'password' ? 'text' : 'password';
            });
        },

        // --- Core Logic ---
        setActiveTab(tabName) {
            if (this.state.activeTab === tabName) return;
            this.state.activeTab = tabName;
            this.updateView();
        },

        updateView() {
            const { tabText, tabWifi, panelText, panelWifi } = this.elements;
            const isTextTab = this.state.activeTab === 'text';

            tabText.classList.toggle('active', isTextTab);
            tabText.setAttribute('aria-selected', isTextTab);
            panelText.classList.toggle('active', isTextTab);

            tabWifi.classList.toggle('active', !isTextTab);
            tabWifi.setAttribute('aria-selected', !isTextTab);
            panelWifi.classList.toggle('active', !isTextTab);
        },

        getQRCodeData() {
            if (this.state.activeTab === 'text') {
                return this.elements.textInput.value.trim();
            } else {
                const ssid = this.elements.wifiSsidInput.value.trim();
                const password = this.elements.wifiPasswordInput.value;
                const encryption = this.elements.wifiEncryptionSelect.value;
                if (!ssid) return '';
                return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
            }
        },

        /**
         * MODIFIED: This function is completely rewritten to be stateless.
         * It clears the container and creates a new QRCode instance on every call,
         * which resolves the bug where subsequent generations failed.
         */
        generateQRCode() {
            const data = this.getQRCodeData();
            const { qrCodeContainer, downloadBtn, placeholderText } = this.elements;

            // Clear previous QR code or placeholder text
            qrCodeContainer.innerHTML = '';

            if (!data) {
                // If there's no data, restore the placeholder and hide the download button.
                qrCodeContainer.appendChild(placeholderText);
                downloadBtn.style.display = 'none';
                return;
            }

            // If there is data, generate a new QR Code.
            try {
                // By creating a new QRCode instance each time, we avoid state issues.
                // The library will append the QR code (as a canvas or img) to the container.
                new QRCode(qrCodeContainer, {
                    text: data,
                    width: 224,
                    height: 224,
                    colorDark: "#1a1c2c",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });

                // Show the download button upon successful generation.
                downloadBtn.style.display = 'block';
            } catch (error) {
                // Handle cases where the input data is too long for a QR code.
                console.error("QR Code generation failed:", error);
                qrCodeContainer.innerHTML = '<p class="qrg-placeholder" style="color: var(--error-color);">Error: Input too long or invalid.</p>';
                downloadBtn.style.display = 'none';
            }
        },

        downloadQRCode() {
            const canvas = this.elements.qrCodeContainer.querySelector('canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = 'toolthump-qrcode.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                console.error("Could not find canvas to download.");
            }
        },
    };

    qrCodeGenerator.init();
});
