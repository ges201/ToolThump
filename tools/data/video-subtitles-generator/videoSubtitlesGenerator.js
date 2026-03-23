import { UIManager } from './js/ui-manager.js';
import { SRTFormatter } from './js/srt-formatter.js';
import { Transcriber } from './js/transcriber.js';
import { FFmpegManager } from './js/ffmpeg-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    const ui = new UIManager();
    const srtFormatter = new SRTFormatter();
    const transcriber = new Transcriber(ui, srtFormatter);
    const ffmpegManager = new FFmpegManager(ui);

    const state = {
        videoFile: null,
        isProcessing: false,
        srtContent: null
    };

    const handlers = {
        onFileSelect(file) {
            if (!ui.handleFileSelect(file)) return;
            state.videoFile = file;
            ui.updateFileInfo(file);
            ui.updateVideoPreview(file);
            ui.showProcessingOptions(true);
            ui.setGenerateButtonDisabled(false);
            ui.elements.resultsArea.style.display = 'none';
        },

        async onGenerate() {
            if (!state.videoFile || state.isProcessing) return;
            state.isProcessing = true;

            const language = ui.elements.languageSelect.value;
            const modelSize = ui.elements.modelSelect.value;

            const result = await transcriber.generate(state.videoFile, language, modelSize);
            
            if (result.success) {
                state.srtContent = result.srtContent;
            }

            state.isProcessing = false;
            ui.setProgressBarIndeterminate(false);
        },

        onDownload() {
            if (!state.srtContent) return;
            ui.downloadSubtitles(state.srtContent, state.videoFile);
        },

        async onMkvExport() {
            if (!state.videoFile || !state.srtContent) {
                alert('Please generate subtitles first.');
                return;
            }

            if (state.isProcessing) return;
            state.isProcessing = true;

            const result = await ffmpegManager.exportMkv(state.videoFile, state.srtContent);

            state.isProcessing = false;
            ui.setProgressBarIndeterminate(false);
        },

        async onRender() {
            if (!state.videoFile || !state.srtContent) {
                alert('Please generate subtitles first.');
                return;
            }

            if (state.isProcessing) return;
            state.isProcessing = true;

            const result = await ffmpegManager.renderWithSubtitles(state.videoFile, state.srtContent);

            state.isProcessing = false;
            ui.setProgressBarIndeterminate(false);
        },

        onReset() {
            state.videoFile = null;
            state.isProcessing = false;
            state.srtContent = null;
            ui.reset();
        }
    };

    ui.addEventListeners(handlers);

    console.log('Video Subtitles Generator (Refactored) Initializing...');
    console.log('Cross-Origin Isolated:', window.crossOriginIsolated);

    window.videoSubtitlesGenerator = {
        ui,
        transcriber,
        ffmpegManager,
        state
    };
});
