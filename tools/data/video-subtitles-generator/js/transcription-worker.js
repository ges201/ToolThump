import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
import { SRTFormatter } from './srt-formatter.js';

env.allowLocalModels = false;
env.useBrowserCache = true;
// ponytail: multithreaded ONNX needs SharedArrayBuffer, i.e. crossOriginIsolated. Cap at 4 threads - beyond that Whisper gains little and memory climbs.
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1)) : 1;
env.backends.onnx.wasm.simd = true;

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
const srt = new SRTFormatter();

self.onmessage = async (event) => {
    const { audio, language, modelSize, duration } = event.data;
    const modelName = `Xenova/whisper-${modelSize}`;

    try {
        if (!transcriber || currentModel !== modelName) {
            // progress_callback reports bytes per file, downloaded sequentially
            // or in parallel, so sum loaded/total across every file seen so far
            // for an overall percentage (brief dips when a new file joins the
            // denominator - the dominant model file climbs monotonically).
            const files = new Map();
            let lastPost = 0;
            transcriber = await pipeline('automatic-speech-recognition', modelName, {
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
            currentModel = modelName;
        }

        self.postMessage({ type: 'preparing', pct: DOWNLOAD_END, status: 'Loading model into memory...' });

        // Raw 16kHz mono audio arrives from the main thread (workers have no
        // AudioContext, so the waveform is decoded there); the pipeline accepts
        // a Float32Array directly and skips read_audio.

        // 'word' timestamps give us granular control over SRT cue boundaries.
        // Chunking only engages when the audio is longer than the chunk; scale
        // the window down for short clips so progress updates are frequent.
        const isShortClip = duration !== null && duration < SHORT_CLIP_S;
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
        // implies. If duration is unknown, the UI falls back to indeterminate.
        const totalChunks = duration === null ? null
            : (duration >= chunkLen ? Math.max(1, Math.ceil(duration / step)) : 1);
        if (totalChunks) {
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
        }

        self.postMessage({
            type: 'transcribe-start',
            pct: TRANSCRIBE_START,
            indeterminate: totalChunks === null,
            status: 'Analyzing audio...'
        });

        const output = await transcriber(audio, options);

        self.postMessage({ type: 'finalize', pct: 90, status: '' });
        const srtContent = srt.convertToSRT(output);
        self.postMessage({ type: 'done', srt: srtContent });
    } catch (error) {
        console.error('Transcription failed:', error);
        self.postMessage({ type: 'error', message: error.message || String(error) });
    }
};
