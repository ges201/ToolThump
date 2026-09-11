// Pinned to v3: v4.2.0's Whisper generation corrupts whisper-small's decoder
// (special-token loops, dropped audio). Revisit when v4 ships a fix.
import { pipeline, env, Tensor } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';
import { SRTFormatter, fmtTime } from './srt-formatter.mjs';

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

// WebGPU stays off until it is validated against the pinned runtime; the
// attention output path used during word timestamps is the fragile part.
const ENABLE_WEBGPU = false;

let transcriber = null;
let currentModel = null;
let currentDevice = 'wasm';
// Set when a WebGPU inference throws, so the reload takes the WASM path.
let webgpuFailed = false;
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

// v4 dropped v2's chunk_callback; the pipeline calls model.generate once per
// chunk in its generation loop, so count completed generations.
function reportChunkProgress() {
    if (!progress) return;
    const { duration, step, total, done, startedAt } = progress;
    const frac = Math.min(1, done / total);
    const label = detectedLanguage ? ` (${detectedLanguage})` : '';
    let status = `Transcribing${label}: ${fmtTime(Math.min(duration, done * step))} / ${fmtTime(duration)}`;
    if (done > 0 && done < total) {
        const eta = ((performance.now() - startedAt) / 1000 / done) * (total - done);
        status += ` · ~${fmtTime(eta)} left`;
    }
    self.postMessage({
        type: 'transcribe',
        pct: Math.round(TRANSCRIBE_START + (TRANSCRIBE_END - TRANSCRIBE_START) * frac),
        status
    });
}

// v4's Whisper silently forces English when no language is given, so "auto"
// runs Whisper's own detection: one decoder step from <|startoftranscript|>
// over the first 30s, argmax across the language tokens. Called before chunk
// progress is armed, so the generate hook stays quiet.
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

async function hasWebGPUAdapter() {
    if (!navigator.gpu) return false;
    try {
        return !!(await navigator.gpu.requestAdapter());
    } catch {
        return false;
    }
}

async function loadModel(modelName) {
    if (transcriber && currentModel === modelName) return;

    // The WASM branch below only builds when no pipeline exists, so a model
    // switch has to release the old one first.
    if (transcriber) {
        await transcriber.dispose();
        transcriber = null;
    }

    // Sum loaded/total across all files seen so far for an overall
    // percentage (brief dips when a new file joins the denominator).
    const files = new Map();
    let lastPost = 0;
    const progressCallback = (data) => {
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
    };

    // WebGPU first when enabled and an adapter exists. fp16 encoders produce
    // broken Whisper output (transformers.js#1590), and q8 maps to int8 files
    // that are slow on GPU, so the proven GPU combo is fp32 encoder + q4
    // decoder.
    if (ENABLE_WEBGPU && !webgpuFailed && await hasWebGPUAdapter()) {
        try {
            transcriber = await pipeline('automatic-speech-recognition', modelName, {
                device: 'webgpu',
                dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
                progress_callback: progressCallback
            });
            currentDevice = 'webgpu';
        } catch (error) {
            console.warn('WebGPU unavailable, falling back to WASM:', error);
            transcriber = null;
        }
    }

    if (!transcriber) {
        // Fallback path. WASM q8 is the accuracy/speed sweet spot here. The
        // basic optimization level sidesteps an ONNX Runtime 1.26 bug where
        // the extended QDQ pass fails to create the quantized Whisper decoder
        // session (TransposeDQWeightsForMatMulNBits missing required scale).
        transcriber = await pipeline('automatic-speech-recognition', modelName, {
            device: 'wasm',
            dtype: 'q8',
            progress_callback: progressCallback
        });
        currentDevice = 'wasm';
    }

    const generate = transcriber.model.generate;
    transcriber.model.generate = new Proxy(generate, {
        apply(target, thisArg, args) {
            const result = Reflect.apply(target, thisArg, args);
            result.then(
                () => {
                    // Language detection generates before progress is armed.
                    if (!progress) return;
                    progress.done++;
                    reportChunkProgress();
                },
                () => {}
            );
            return result;
        }
    });

    console.log(`Whisper backend: ${currentDevice}`);
    currentModel = modelName;
}

// Whisper sometimes emits EOS before the chunk's audio ends, which silently
// truncates the subtitles. Retry the uncovered tail here, bounded, until it
// stops making progress.
async function recoverSkippedAudio(transcriber, audio, duration, options, output) {
    const endOf = (chunk, fallback) => chunk.timestamp[1] ?? fallback;
    const chunks = (output.chunks ?? []).filter((c) => c.timestamp[0] !== null && c.timestamp[0] <= duration + 0.5);
    let coveredEnd = chunks.reduce((max, c) => Math.max(max, endOf(c, c.timestamp[0] + 0.5)), 0);

    // Segment timestamps for the retries: cheaper than word timestamps and
    // enough to fill the gap. Short chunks keep each retry's generation brief.
    const recoveryOptions = {
        ...options,
        return_timestamps: true,
        chunk_length_s: SHORT_CHUNK_S,
        stride_length_s: SHORT_STRIDE_S
    };
    for (let attempt = 0; attempt < 8 && duration - coveredEnd > 2; attempt++) {
        const start = Math.max(0, coveredEnd - 1);
        const tail = audio.subarray(Math.floor(start * 16000));
        const sliceEnd = start + tail.length / 16000;
        const result = await transcriber(tail, recoveryOptions);
        const recovered = (result.chunks ?? [])
            .filter((c) => c.timestamp[0] !== null && start + c.timestamp[0] <= duration + 0.5)
            .map((c) => ({
                ...c,
                timestamp: [start + c.timestamp[0], c.timestamp[1] === null ? null : start + c.timestamp[1]]
            }))
            .filter((c) => endOf(c, sliceEnd) > coveredEnd + 0.05);

        if (!recovered.length) break;
        const newEnd = recovered.reduce((max, c) => Math.max(max, endOf(c, sliceEnd)), coveredEnd);
        if (newEnd <= coveredEnd + 0.5) break;
        chunks.push(...recovered);
        coveredEnd = newEnd;
    }

    return { ...output, chunks };
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

    // Count against the chunks the duration implies for the generate hook.
    // startedAt feeds the ETA once the first chunk lands; the elapsed clock
    // itself lives on the main thread, which keeps ticking while WASM blocks
    // this one.
    progress = {
        duration,
        step,
        total: duration >= chunkLen ? Math.max(1, Math.ceil(duration / step)) : 1,
        done: 0,
        startedAt: performance.now()
    };

    let output;
    try {
        output = await transcriber(audio, options);
    } catch (error) {
        if (currentDevice !== 'webgpu') throw error;
        console.warn('WebGPU inference failed, retrying on WASM:', error);
        webgpuFailed = true;
        transcriber = null;
        currentModel = null;
        progress.done = 0;
        progress.startedAt = performance.now();
        await loadModel(modelName);
        output = await transcriber(audio, options);
    }

    output = await recoverSkippedAudio(transcriber, audio, duration, options, output);

    reportChunkProgress();
    progress = null;

    self.postMessage({ type: 'finalize', pct: TRANSCRIBE_END });
    const { srt, cues } = new SRTFormatter().format(output);
    self.postMessage({ type: 'done', srt, cues });
}
