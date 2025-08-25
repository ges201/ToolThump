const onnxModel = {
    ortSession: null,
    modelPath: '/tools/images/bg-remover/u2net.quant.onnx',
    modelInputSize: 320,
    isInitialized: false,

    init: async function (statusCallback, progressCallback) {
        if (this.isInitialized) return true;

        statusCallback('loading', 'Downloading AI model (42 MB)...', true);
        try {
            ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
            const response = await fetch(this.modelPath);
            if (!response.ok) throw new Error(`Failed to fetch model: ${response.statusText}`);

            const reader = response.body.getReader();
            const contentLength = +response.headers.get('content-length');
            const chunks = [];
            let loadedSize = 0;

            while (true) {
                const {
                    done,
                    value
                } = await reader.read();
                if (done) break;
                chunks.push(value);
                loadedSize += value.length;
                if (contentLength && progressCallback) {
                    const progress = Math.round((loadedSize / contentLength) * 100);
                    progressCallback(progress);
                }
            }

            const modelBuffer = new Blob(chunks).arrayBuffer();
            statusCallback('loading', 'Initializing AI model...');
            this.ortSession = await ort.InferenceSession.create(await modelBuffer);
            statusCallback('clear');
            document.getElementById('tool-warning')?.remove();
            console.log("ONNX session initialized successfully.");
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("Failed to initialize ONNX session:", error);
            statusCallback('error', 'Failed to load the AI model. Please refresh and try again.');
            this.isInitialized = false;
            return false;
        }
    },

    run: async function (image) {
        if (!this.isInitialized || !image) return null;

        const inputTensor = this._preprocess(image);
        const results = await this.ortSession.run({
            'input.1': inputTensor
        });
        const outputTensor = results['1959'];
        return this._postprocess(outputTensor, image.naturalWidth, image.naturalHeight, image);
    },

    _preprocess: function (image) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = this.modelInputSize;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(image, 0, 0, size, size);
        const {
            data
        } = ctx.getImageData(0, 0, size, size);

        const float32Data = new Float32Array(3 * size * size);
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];

        for (let i = 0; i < size * size; i++) {
            for (let j = 0; j < 3; j++) {
                float32Data[i + j * size * size] = (data[i * 4 + j] / 255 - mean[j]) / std[j];
            }
        }
        return new ort.Tensor('float32', float32Data, [1, 3, size, size]);
    },

    _normPRED: function (d) {
        const mi = Math.min(...d);
        const ma = Math.max(...d);
        const range = ma - mi;
        return range === 0 ? d.map(() => 0) : d.map(i => (i - mi) / range);
    },

    _postprocess: function (tensor, originalWidth, originalHeight, originalImage) {
        const pred = this._normPRED(tensor.data);
        const size = this.modelInputSize;

        const tempMaskCanvas = document.createElement('canvas');
        tempMaskCanvas.width = size;
        tempMaskCanvas.height = size;
        const tempMaskCtx = tempMaskCanvas.getContext('2d');
        const maskImageData = tempMaskCtx.createImageData(size, size);

        for (let i = 0; i < size * size; i++) {
            maskImageData.data[i * 4 + 3] = pred[i] * 255;
        }
        tempMaskCtx.putImageData(maskImageData, 0, 0);

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = originalWidth;
        maskCanvas.height = originalHeight;
        const storedMaskCtx = maskCanvas.getContext('2d');
        storedMaskCtx.imageSmoothingEnabled = true;
        storedMaskCtx.imageSmoothingQuality = 'high';
        storedMaskCtx.drawImage(tempMaskCanvas, 0, 0, originalWidth, originalHeight);

        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = originalWidth;
        resultCanvas.height = originalHeight;
        const ctx = resultCanvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0, originalWidth, originalHeight);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0, originalWidth, originalHeight);

        return {
            processedImage: resultCanvas,
            maskCanvas: maskCanvas
        };
    }
};