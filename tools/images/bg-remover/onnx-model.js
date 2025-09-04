const modelCache = {
    dbName: 'toolthump-model-cache',
    storeName: 'onnx-models',
    db: null,
    version: 1,

    openDB: function() {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);

            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    get: async function(key) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        } catch (error) {
            console.error("Failed to get model from cache:", error);
            return null; // Fallback if DB can't be opened
        }
    },

    set: async function(key, value) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(value, key);
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            });
        } catch (error) {
            console.error("Failed to set model in cache:", error);
            // Don't reject, as this is a non-critical enhancement
        }
    }
};

const onnxModel = {
    ortSession: null,
    modelPath: '/tools/images/bg-remover/u2net.quant.onnx',
    modelInputSize: 320,
    isInitialized: false,

    init: async function (statusCallback, progressCallback) {
        if (this.isInitialized) return true;

        try {
            ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
            
            let modelBuffer = await modelCache.get(this.modelPath);

            if (modelBuffer) {
                statusCallback('loading', 'Loading model from cache...');
            } else {
                statusCallback('loading', 'Downloading AI model (42 MB)...', true);
                const response = await fetch(this.modelPath);
                if (!response.ok) throw new Error(`Failed to fetch model: ${response.statusText}`);

                const reader = response.body.getReader();
                const contentLength = +response.headers.get('content-length');
                const chunks = [];
                let loadedSize = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    loadedSize += value.length;
                    if (contentLength && progressCallback) {
                        const progress = Math.round((loadedSize / contentLength) * 100);
                        progressCallback(progress);
                    }
                }
                
                const blob = new Blob(chunks);
                modelBuffer = await blob.arrayBuffer();
                
                // Don't block on this, let it happen in the background
                modelCache.set(this.modelPath, modelBuffer.slice(0));
            }

            statusCallback('loading', 'Initializing AI model...');
            this.ortSession = await ort.InferenceSession.create(modelBuffer);
            
            statusCallback('clear');
            const warningEl = document.getElementById('tool-warning');
            if (warningEl) warningEl.style.display = 'none';

            console.log("ONNX session initialized successfully.");
            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error("Failed to initialize ONNX session:", error);
            statusCallback('error', 'Failed to load the AI model. Please refresh and try again.');
            this.isInitialized = false;
            // Clear corrupted cache entry if something went wrong during creation
            modelCache.set(this.modelPath, undefined);
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