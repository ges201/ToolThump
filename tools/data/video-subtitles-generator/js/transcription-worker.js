import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
import { SRTFormatter } from './srt-formatter.mjs';

env.useBrowserCache = true;
// ponytail: multithreaded ONNX needs SharedArrayBuffer, i.e. crossOriginIsolated. Cap at 4 threads - beyond that Whisper gains little and memory climbs.
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1)) : 1;

// Whisper advances its window by (chunk_length - 2*stride) per pass.
const CHUNK_LEN_S = 29;
const STRIDE_LEN_S = 5;
// Short clips get smaller chunks so the bar advances during transcription.
const SHORT_CLIP_S = 30;
const SHORT_CHUNK_S = 12;
const SHORT_STRIDE_S = 3;

// Progress bands of the Generate flow: 0-25% model download, 25-30% engine
// warm-up, 30-90% transcription, 90-100% SRT formatting.
const DOWNLOAD_END = 25;
const TRANSCRIBE_START = 30;
const TRANSCRIBE_END = 90;

function fmtTime(totalSec) {
    const s = Math.floor(totalSec);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m % 60).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

let transcriber = null;
let currentModel = null;
let currentDevice = 'wasm';

// Jobs run one at a time so a transcribe arriving mid-download waits for it.
let queue = Promise.resolve();
self.onmessage = (event) => {
    const data = event.data;
    queue = queue.then(() => handleMessage(data));
    queue.catch(() => {});
};

async function handleMessage(data) {
    try {
        const modelName = `Xenova/whisper-${data.modelSize}`;
        if (data.type === 'load') {
            await loadModel(modelName);
        } else if (data.type === 'transcribe') {
            if (!transcriber || currentModel !== modelName) await loadModel(modelName);
            await transcribe(modelName, data);
        }
    } catch (error) {
        console.error('Transcription failed:', error);
        self.postMessage({ type: 'error', message: error.message || String(error) });
    }
}

async function loadModel(modelName) {
    if (transcriber && currentModel === modelName) return;

    // Sum loaded/total across all files seen so far for an overall
    // percentage (brief dips when a new file joins the denominator).
    const files = new Map();
    let lastPost = 0;
    const create = (options) => pipeline('automatic-speech-recognition', modelName, {
        ...options,
        progress_callback: (data) => {
            if (data.status !== 'progress' || !data.total) return;
            files.set(data.file, { loaded: data.loaded, total: data.total });
            let loaded = 0;
            let total = 0;
            for (const f of files.values()) {
                loaded += f.loaded;
                total += f.total;
            }
            const now = performance.now();
            if (now - lastPost < 100) return;
            lastPost = now;
            self.postMessage({
                type: 'download',
                pct: Math.round(DOWNLOAD_END * loaded / total),
                file: data.file.split('/').pop(),
                perFile: Math.round(data.progress)
            });
        }
    });

    transcriber = null;
    let device = 'wasm';
    if (navigator.gpu) {
        try {
            transcriber = await create({ device: 'webgpu' });
            device = 'webgpu';
        } catch (error) {
            console.warn('WebGPU unavailable, falling back to WASM:', error);
        }
    }
    if (!transcriber) transcriber = await create({});
    console.log(`Whisper backend: ${device}`);
    currentDevice = device;
    currentModel = modelName;
}

async function transcribe(modelName, { audio, language, duration }) {
    try {
        self.postMessage({ type: 'preparing', pct: DOWNLOAD_END, status: 'Loading model into memory...' });

        // 16kHz mono audio decoded on the main thread (workers lack AudioContext);
        // 'word' timestamps feed the SRT cue boundaries. Shorter chunks on
        // small clips keep progress updates frequent.
        const isShortClip = duration < SHORT_CLIP_S;
        const chunkLen = isShortClip ? SHORT_CHUNK_S : CHUNK_LEN_S;
        const strideLen = isShortClip ? SHORT_STRIDE_S : STRIDE_LEN_S;
        const step = chunkLen - 2 * strideLen;
        const options = {
            return_timestamps: 'word',
            chunk_length_s: chunkLen,
            stride_length_s: strideLen
        };

        if (language !== 'auto') options.language = language;

        // Real-time transcription progress: the pipeline fires chunk_callback
        // once per processed chunk, so count against the chunks the duration
        // implies (duration always comes from the decoded audio).
        const totalChunks = duration >= chunkLen ? Math.max(1, Math.ceil(duration / step)) : 1;
        let chunksDone = 0;
        options.chunk_callback = () => {
            chunksDone++;
            const frac = Math.min(1, chunksDone / totalChunks);
            const pct = Math.round(TRANSCRIBE_START + (TRANSCRIBE_END - TRANSCRIBE_START) * frac);
            self.postMessage({
                type: 'transcribe',
                pct,
                status: `Transcribing: ${fmtTime(Math.min(duration, chunksDone * step))} / ${fmtTime(duration)}`
            });
        };

        self.postMessage({
            type: 'transcribe-start',
            pct: TRANSCRIBE_START,
            status: 'Analyzing audio...'
        });

        const output = await transcriber(audio, options);

        self.postMessage({ type: 'finalize', pct: 90 });
        const { srt, cues } = new SRTFormatter().format(output);
        self.postMessage({ type: 'done', srt, cues });
    } catch (error) {
        if (currentDevice === 'webgpu') {
            // Some ops can choke on the WebGPU backend (ORT 1.17); retry once on WASM.
            console.warn('WebGPU inference failed, retrying on WASM:', error);
            transcriber = null;
            currentModel = null;
            await loadModel(modelName);
            return transcribe(modelName, { audio, language, duration });
        }
        throw error;
    }
}
