import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.useBrowserCache = true;
// ponytail: multithreaded ONNX needs SharedArrayBuffer, i.e. crossOriginIsolated (served via coi-serviceworker). Cap at 4 threads - beyond that Whisper gains little and memory climbs.
env.backends.onnx.wasm.numThreads = window.crossOriginIsolated ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1)) : 1;
env.backends.onnx.wasm.simd = true;

export class Transcriber {
    constructor(uiManager, srtFormatter) {
        this.ui = uiManager;
        this.srt = srtFormatter;
        this.transcriber = null;
        this.currentModel = null;
    }

    async generate(videoFile, language, modelSize) {
        const modelName = `Xenova/whisper-${modelSize}`;

        this.ui.showProgressArea();
        this.ui.setProgressTitle('Generating Subtitles');
        this.ui.setProgressMessage('Downloading AI model...');
        this.ui.setProgressBarWidth('0%');
        this.ui.setProgressBarIndeterminate(false);

        try {
            if (!this.transcriber || this.currentModel !== modelName) {
                console.time('whisper-model-download');
                this.transcriber = await pipeline('automatic-speech-recognition', modelName, {
                    progress_callback: (data) => {
                        if (data.status === 'progress') {
                            const percent = Math.round((data.progress || 0) * 0.2);
                            this.ui.setProgressBarWidth(`${percent}%`);
                            this.ui.updateProgressStatus(`Model Download: ${Math.round(data.progress)}%`);
                        }
                    }
                });
                console.timeEnd('whisper-model-download');
                this.currentModel = modelName;
            }

            this.ui.setProgressBarWidth('20%');
            this.ui.setProgressMessage('Analyzing audio stream...');
            this.ui.setProgressBarIndeterminate(true);

            const fileUrl = URL.createObjectURL(videoFile);

            // FIX: 'word' timestamps give us granular control.
            // FIX: Removed stride_length_s to prevent end-of-video hallucination loops.
            const options = {
                return_timestamps: 'word',
                chunk_length_s: 29,
                stride_length_s: 5
            };

            if (language !== 'auto') options.language = language;

            console.time('whisper-inference');
            const output = await this.transcriber(fileUrl, options);
            console.timeEnd('whisper-inference');
            URL.revokeObjectURL(fileUrl);

            const srtContent = this.srt.convertToSRT(output);
            this.ui.showResults(srtContent);

            return { success: true, srtContent };
        } catch (error) {
            console.error('Transcription failed:', error);
            this.ui.showError(`AI Error: ${error.message}`);
            return { success: false, error };
        }
    }
}