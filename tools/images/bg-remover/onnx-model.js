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
    modelPath: '/tools/images/bg-remover/rmbg14-quant.onnx',
    modelInputSize: 1024,
    inputName: null,
    outputName: null,
    isInitialized: false,

    init: async function (statusCallback, progressCallback) {
        if (this.isInitialized) return true;

        try {
            ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
            
            let modelBuffer = await modelCache.get(this.modelPath);

            if (modelBuffer) {
                statusCallback('loading', 'Loading model from cache...');
            } else {
                statusCallback('loading', 'Downloading AI model (44 MB)...', true);
                // ponytail: model exceeds GitHub's 100MB repo-file limit, so it is
                // split into .part1/.part2 and reassembled here; single file if unsuffixed
                const part2Path = this.modelPath.replace(/\.part1$/, '.part2');
                const parts = part2Path !== this.modelPath ? [this.modelPath, part2Path] : [this.modelPath];
                const responses = await Promise.all(parts.map(p => fetch(p)));
                for (const r of responses) {
                    if (!r.ok) throw new Error(`Failed to fetch model: ${r.statusText}`);
                }

                const total = responses.reduce((s, r) => s + (+r.headers.get('content-length') || 0), 0);
                const readers = responses.map(r => r.body.getReader());
                const buffers = readers.map(() => ({ chunks: [], loaded: 0 }));
                let received = 0;

                await Promise.all(readers.map(async (reader, i) => {
                    for (;;) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffers[i].chunks.push(value);
                        buffers[i].loaded += value.length;
                        received += value.length;
                        if (total && progressCallback) {
                            progressCallback(Math.round(received / total * 100));
                        }
                    }
                }));

                const blob = new Blob(buffers.flatMap(b => b.chunks));
                modelBuffer = await blob.arrayBuffer();
                
                // Don't block on this, let it happen in the background
                modelCache.set(this.modelPath, modelBuffer.slice(0));
            }

            statusCallback('loading', 'Initializing AI model...');
            this.ortSession = await ort.InferenceSession.create(modelBuffer);

            // ponytail: resolve IO names from the session instead of hardcoding
            this.inputName = this.ortSession.inputNames[0];
            this.outputName = this.ortSession.outputNames.includes('output')
                ? 'output'
                : this.ortSession.outputNames[0];
            
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
            [this.inputName]: inputTensor
        });
        let outputTensor = results[this.outputName];
        // ISNet exports carry 12 deep-supervision outputs; make sure we grabbed a [1,1,H,W] mask
        if (!outputTensor || outputTensor.dims.length !== 4 || outputTensor.dims[1] !== 1) {
            outputTensor = Object.values(results).find(t => t.dims.length === 4 && t.dims[1] === 1);
        }
        if (!outputTensor) throw new Error('Model returned no usable mask output.');
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
        // RMBG-1.4 normalization: px/255, mean 0.5, std 1
        const mean = [0.5, 0.5, 0.5];
        const std = [1, 1, 1];

        for (let i = 0; i < size * size; i++) {
            for (let j = 0; j < 3; j++) {
                float32Data[i + j * size * size] = (data[i * 4 + j] / 255 - mean[j]) / std[j];
            }
        }
        return new ort.Tensor('float32', float32Data, [1, 3, size, size]);
    },

    _normPRED: function (d) {
        // ponytail: loop instead of Math.min/max spread - 1024^2 args would blow the call stack
        let mi = Infinity, ma = -Infinity;
        for (let i = 0; i < d.length; i++) {
            if (d[i] < mi) mi = d[i];
            if (d[i] > ma) ma = d[i];
        }
        const range = ma - mi;
        if (range === 0) return new Float32Array(d.length);
        const out = new Float32Array(d.length);
        for (let i = 0; i < d.length; i++) out[i] = (d[i] - mi) / range;
        return out;
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