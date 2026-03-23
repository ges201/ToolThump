import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;
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
                this.transcriber = await pipeline('automatic-speech-recognition', modelName, {
                    progress_callback: (data) => {
                        if (data.status === 'progress') {
                            const percent = Math.round((data.progress || 0) * 0.2);
                            this.ui.setProgressBarWidth(`${percent}%`);
                            this.ui.updateProgressStatus(`Model Download: ${Math.round(data.progress)}%`);
                        }
                    }
                });
                this.currentModel = modelName;
            }

            this.ui.setProgressBarWidth('20%');
            this.ui.setProgressMessage('Analyzing audio stream...');
            this.ui.setProgressBarIndeterminate(true);

            const fileUrl = URL.createObjectURL(videoFile);
            const options = { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 };
            if (language !== 'auto') options.language = language;

            const output = await this.transcriber(fileUrl, options);
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
