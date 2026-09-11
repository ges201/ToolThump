import { pipeline, env, Tensor } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
import { SRTFormatter } from './srt-formatter.mjs';

env.useBrowserCache = true;
// The site ships no /models/ directory, so skip the local-file probes and
// fetch straight from the Hub.
env.allowLocalModels = false;
// ponytail: multithreaded ONNX needs SharedArrayBuffer, i.e. crossOriginIsolated. Cap at 4 threads - beyond that Whisper gains little and memory climbs.
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1)) : 1;

// Whisper advances its window by (chunk_length - 2*stride) per pass.
const CHUNK_LEN_S = 29;
const STRIDE_LEN_S = 5;
// Short clips get smaller chunks so progress updates land sooner.
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
// Chunk progress state, only set while a transcription is running.
let progress = null;
// Display name of the auto-detected language, while a transcription runs.
let detectedLanguage = null;

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

// v4 runs the chunk loop internally with no per-chunk callback, but it calls
// the processor once per chunk, so count those calls for the progress bar.
function reportChunkProgress() {
    if (!progress) return;
    const { duration, step, total, done } = progress;
    const frac = Math.min(1, done / total);
    self.postMessage({
        type: 'transcribe',
        pct: Math.round(TRANSCRIBE_START + (TRANSCRIBE_END - TRANSCRIBE_START) * frac),
        status: `Transcribing: ${fmtTime(Math.min(duration, done * step))} / ${fmtTime(duration)}`
    });
}

// v4's Whisper silently forces English when no language is given, so "auto"
// runs Whisper's own detection: one decoder step from <|startoftranscript|>
// over the first 30s, argmax across the language tokens. Called before chunk
// progress is armed, so the processor proxy stays quiet.
async function detectLanguage(audio) {
    const generation = transcriber.model.generation_config;
    if (!generation?.is_multilingual || !generation.lang_to_id) return null;

    const { input_features } = await transcriber.processor(audio.subarray(0, 30 * 16000));
    const sot = generation.decoder_start_token_id ?? transcriber.model.config.decoder_start_token_id;
    const output = await transcriber.model.generate({
        inputs: input_features,
        decoder_input_ids: new Tensor('int64', BigInt64Array.from([BigInt(sot)]), [1, 1]),
        max_new_tokens: 1,
        return_timestamps: false
    });
    const sequence = output.tolist()[0];
    const tokenId = Number(sequence[sequence.length - 1]);
    for (const [token, id] of Object.entries(generation.lang_to_id)) {
        if (id === tokenId) return token.slice(2, -2); // "<|it|>" -> "it"
    }
    return null;
}

function languageDisplayName(code) {
    try {
        return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
    } catch {
        return code;
    }
}

async function loadModel(modelName) {
    if (transcriber && currentModel === modelName) return;

    // Sum loaded/total across all files seen so far for an overall
    // percentage (brief dips when a new file joins the denominator).
    const files = new Map();
    let lastPost = 0;
    // WASM q8 is the accuracy/speed sweet spot and WebGPU fp16 is known to
    // produce broken Whisper output, so always run on WASM. The basic
    // optimization level sidesteps an ONNX Runtime 1.26 bug where the extended
    // QDQ pass fails to create the quantized Whisper decoder session
    // (TransposeDQWeightsForMatMulNBits missing required scale).
    transcriber = await pipeline('automatic-speech-recognition', modelName, {
        device: 'wasm',
        dtype: 'q8',
        session_options: { graphOptimizationLevel: 'basic' },
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

    const processor = transcriber.processor;
    transcriber.processor = new Proxy(processor, {
        apply(target, thisArg, args) {
            reportChunkProgress();
            return Reflect.apply(target, thisArg, args);
        }
    });

    console.log('Whisper backend: wasm');
    currentModel = modelName;
}

async function transcribe(modelName, { audio, language, duration }) {
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

    detectedLanguage = null;
    if (language !== 'auto') {
        options.language = language;
    } else {
        try {
            const detected = await detectLanguage(audio);
            if (detected) {
                options.language = detected;
                detectedLanguage = languageDisplayName(detected);
                console.log('Detected language:', detected);
            }
        } catch (error) {
            console.warn('Language detection failed, using the model default:', error);
        }
    }

    self.postMessage({
        type: 'transcribe-start',
        pct: TRANSCRIBE_START,
        status: 'Analyzing audio...'
    });

    // Count against the chunks the duration implies for the processor hook.
    progress = {
        duration,
        step,
        total: duration >= chunkLen ? Math.max(1, Math.ceil(duration / step)) : 1,
        done: 0
    };

    const startedAt = performance.now();
    const ticker = setInterval(() => {
        if (!progress) return;
        const label = detectedLanguage ? ` (${detectedLanguage})` : '';
        self.postMessage({
            type: 'transcribe',
            status: `Transcribing${label}: ${fmtTime(Math.min(duration, progress.done * step))} / ${fmtTime(duration)} (${fmtTime((performance.now() - startedAt) / 1000)} elapsed)`
        });
    }, 1000);

    let output;
    try {
        output = await transcriber(audio, options);
    } finally {
        clearInterval(ticker);
    }

    reportChunkProgress();
    progress = null;

    self.postMessage({ type: 'finalize', pct: TRANSCRIBE_END });
    const { srt, cues } = new SRTFormatter().format(output);
    self.postMessage({ type: 'done', srt, cues });
}
