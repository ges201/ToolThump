import { fetchFile, toBlobURL } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/dist/esm/index.js';
import { buildAss, FONT_URLS } from './subtitle-style.mjs';

let FFmpegClass = null;

export class FFmpegManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.ffmpeg = null;
        this.loaded = false;
        this.loadedFonts = new Set();
    }

    async load() {
        if (this.loaded) return true;
        console.time('ffmpeg-engine-load');

        try {
            const isIsolated = window.crossOriginIsolated;
            const coreName = isIsolated ? 'core-mt' : 'core';
            const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/${coreName}@0.12.10/dist/esm`;

            this.ui.updateProgressStatus('Importing latest renderer library...');

            if (!FFmpegClass) {
                try {
                    const module = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js');
                    FFmpegClass = module.FFmpeg || module.default;
                } catch (e) {
                    console.error('Failed to load classes.js:', e);
                    throw new Error('Unable to load FFmpeg class. Please try again.');
                }
            }

            if (!this.ffmpeg) {
                this.ffmpeg = new FFmpegClass();
            }

            this.ffmpeg.on('log', ({ message }) => {
                console.log('[FFmpeg]', message);
                if (message.includes('time=')) {
                    const match = message.match(/time=\s*([0-9:.]+)/);
                    if (match) {
                        this.ui.updateProgressStatus(`Rendering... Time: ${match[1]}`);
                    }
                } else if (message.includes('Error') || message.includes('failed')) {
                    console.error('[FFmpeg Engine Error]', message);
                }
            });

            this.ffmpeg.on('progress', ({ progress }) => {
                if (progress > 0 && progress <= 1) {
                    const percent = Math.round(progress * 100);
                    this.ui.setProgressBarWidth(`${percent}%`);
                }
            });

            this.ui.setProgressBarIndeterminate(true);
            this.ui.updateProgressStatus(`Fetching engine components (${isIsolated ? 'MT' : 'ST'} mode)...`);

            const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
            const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
            const loadConfig = { coreURL, wasmURL };

            const workerCode = `import "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/worker.js";`;
            loadConfig.classWorkerURL = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' }));

            if (isIsolated) {
                try {
                    loadConfig.workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript');
                } catch (workerError) {
                    console.warn('Worker not available:', workerError);
                }
            }

            this.ui.updateProgressStatus('Starting engine...');
            await this.ffmpeg.load(loadConfig);

            this.ui.updateProgressStatus('Setting up fonts...');
            await this.ensureFont('Arial');

            this.loaded = true;
            console.timeEnd('ffmpeg-engine-load');
            this.ui.setProgressBarIndeterminate(false);
            return true;
        } catch (error) {
            console.error('FFmpeg Load Error:', error);
            this.ui.showError(`Engine Error: ${error.message}. Try refreshing the page.`);
            return false;
        }
    }

    // Fetches a subtitle font on first use and drops it in fontsdir. A missing
    // font is not fatal: libass falls back to whatever is available.
    async ensureFont(name) {
        if (this.loadedFonts.has(name)) return;
        this.loadedFonts.add(name);
        try {
            const fontData = await fetchFile(FONT_URLS[name]);
            await this.ffmpeg.writeFile(`/tmp/${name}.ttf`, fontData);
        } catch (e) {
            console.warn(`Font ${name} load failed, falling back to Arial:`, e);
        }
    }

    async renderWithSubtitles(videoFile, srtContent, style = {}) {
        const loaded = await this.load();
        if (!loaded) {
            return { success: false };
        }

        this.ui.updateProgressStatus('Loading subtitle font...');
        await this.ensureFont(style.font || 'Arial');

        const { width, height } = this.ui.getVideoSize();

        return this.runJob({
            title: 'Preparing Video',
            initialMessage: 'Initializing the processing engine...',
            activeMessage: 'Your video is being processed locally. Keep this tab open.',
            subtitleName: 'subtitles.ass',
            execArgs: (inputName) => [
                '-y',
                '-i', inputName,
                '-vf', 'subtitles=subtitles.ass:fontsdir=/tmp',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-threads', String(this.threadCount()),
                '-c:a', 'aac',
                '-b:a', '128k',
                'output.mp4'
            ],
            outputName: 'output.mp4',
            outputMime: 'video/mp4',
            downloadName: (baseName) => `${baseName}-subtitled.mp4`,
            completeMessage: 'Your video has been saved to your downloads.'
        }, videoFile, buildAss(srtContent, style, width, height));
    }

    async exportMkv(videoFile, srtContent) {
        return this.runJob({
            title: 'Exporting MKV',
            initialMessage: 'Muxing video with subtitles (no re-encoding)...',
            activeMessage: 'Muxing streams...',
            execArgs: (inputName) => [
                '-y',
                '-hide_banner',
                '-i', inputName,
                '-i', 'subtitles.srt',
                '-c:v', 'copy',
                '-c:a', 'copy',
                '-c:s', 'srt',
                '-map', '0:v',
                '-map', '0:a',
                '-map', '1:s',
                '-metadata:s:s:0', 'language=eng',
                '-disposition:s:0', 'default',
                'output.mkv'
            ],
            outputName: 'output.mkv',
            outputMime: 'video/x-matroska',
            downloadName: (baseName) => `${baseName}.mkv`,
            indeterminate: true,
            verifyOutput: true,
            completeMessage: 'Your MKV file has been saved.'
        }, videoFile, srtContent);
    }

    threadCount() {
        return Math.max(2, Math.min(4, navigator.hardwareConcurrency || 2));
    }

    async runJob({ title, initialMessage, activeMessage, execArgs, outputName, outputMime, downloadName, subtitleName = 'subtitles.srt', indeterminate = false, verifyOutput = false, completeMessage }, videoFile, subtitleContent) {
        this.ui.showProgressArea();
        this.ui.setProgressTitle(title);
        this.ui.setProgressMessage(initialMessage);
        this.ui.setProgressBarWidth('0%');

        const loaded = await this.load();
        if (!loaded) {
            return { success: false };
        }

        this.ui.setProgressMessage(activeMessage);
        // Copy-muxing emits no progress events; fall back to indeterminate stripes.
        this.ui.setProgressBarIndeterminate(indeterminate);

        try {
            const ext = videoFile.name.split('.').pop().toLowerCase() || 'mp4';
            const inputName = `input.${ext}`;

            this.ui.updateProgressStatus('Transferring video file... (May take a moment for larger videos)');
            await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

            this.ui.updateProgressStatus('Transferring subtitle data...');
            await this.ffmpeg.writeFile(subtitleName, subtitleContent);

            this.ui.updateProgressStatus('Starting processing...');
            this.ui.setProgressBarWidth('10%');

            const exitCode = await this.ffmpeg.exec(execArgs(inputName));
            if (exitCode !== 0) {
                throw new Error(`FFmpeg process failed (Code ${exitCode}). Check browser console for details.`);
            }

            if (verifyOutput) {
                this.ui.updateProgressStatus('Verifying output...');
                await this.ffmpeg.exec(['-hide_banner', '-i', outputName]);
            }

            this.ui.setProgressMessage('Finalizing file...');
            this.ui.updateProgressStatus('Reading result...');

            const data = await this.ffmpeg.readFile(outputName);

            await this.ffmpeg.deleteFile(inputName);
            await this.ffmpeg.deleteFile(subtitleName);
            await this.ffmpeg.deleteFile(outputName);

            const blob = new Blob([data], { type: outputMime });
            this.ui.downloadBlob(blob, downloadName(this.ui.baseName(videoFile, 'video')));

            this.ui.setProgressComplete('Success!', completeMessage);
            this.ui.updateProgressStatus('Complete.');

            return { success: true };
        } catch (error) {
            console.error('FFmpeg job failed:', error);
            this.ui.showError(`${title} Error: ${error.message}`);
            return { success: false, error };
        }
    }
}
