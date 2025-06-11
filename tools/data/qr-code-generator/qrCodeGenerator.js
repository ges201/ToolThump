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
            qrCodeInstance: null,
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

            // MODIFIED: Event listener is on a <button>, not <a>
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

            // JS now toggles the 'active' class for styling
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

        generateQRCode() {
            const data = this.getQRCodeData();
            const { qrCodeContainer, downloadBtn, placeholderText } = this.elements;

            qrCodeContainer.innerHTML = '';

            if (!data) {
                qrCodeContainer.appendChild(placeholderText);
                downloadBtn.style.display = 'none';
                return;
            }

            if (!this.state.qrCodeInstance) {
                this.state.qrCodeInstance = new QRCode(qrCodeContainer, {
                    width: 224,
                    height: 224,
                    colorDark: "#1a1c2c",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }

            try {
                this.state.qrCodeInstance.makeCode(data);
                downloadBtn.style.display = 'block'; // Use block for button
            } catch (error) {
                console.error("QR Code generation failed:", error);
                qrCodeContainer.innerHTML = '<p class="qrg-placeholder" style="color: var(--error-color);">Error: Input too long or invalid.</p>';
                downloadBtn.style.display = 'none';
            }
        },

        // MODIFIED: This function now programmatically creates a link to download the canvas content.
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