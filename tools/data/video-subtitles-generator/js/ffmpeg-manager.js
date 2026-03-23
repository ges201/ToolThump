import { fetchFile, toBlobURL } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js';

let FFmpegClass = null;

export class FFmpegManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.ffmpeg = null;
        this.loaded = false;
    }

    async load() {
        if (this.loaded) return true;

        try {
            const isIsolated = window.crossOriginIsolated;
            const coreName = isIsolated ? 'core-mt' : 'core';
            const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/${coreName}@0.12.10/dist/esm`;

            this.ui.updateProgressStatus('Importing latest renderer library...');

            if (!FFmpegClass) {
                try {
                    const module = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
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

            const workerCode = `import "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js";`;
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
            try {
                const fontURL = 'https://cdn.jsdelivr.net/gh/ffmpegwasm/testdata@master/arial.ttf';
                const fontData = await fetchFile(fontURL);
                await this.ffmpeg.writeFile('/tmp/Arial.ttf', fontData);
            } catch (e) {
                console.warn('Font load failed:', e);
            }

            this.loaded = true;
            this.ui.setProgressBarIndeterminate(false);
            return true;
        } catch (error) {
            console.error('FFmpeg Load Error:', error);
            this.ui.showError(`Engine Error: ${error.message}. Try refreshing the page.`);
            return false;
        }
    }

    async renderWithSubtitles(videoFile, srtContent) {
        this.ui.showProgressArea();
        this.ui.setProgressTitle('Preparing Video');
        this.ui.setProgressMessage('Initializing the processing engine...');
        this.ui.setProgressBarWidth('0%');

        const loaded = await this.load();
        if (!loaded) {
            return { success: false };
        }

        this.ui.setProgressTitle('Baking Subtitles');
        this.ui.setProgressMessage('Your video is being processed locally. Keep this tab open.');

        try {
            const ext = videoFile.name.split('.').pop().toLowerCase() || 'mp4';
            const inputName = `input.${ext}`;

            this.ui.updateProgressStatus('Transferring video file... (May take a moment for larger videos)');
            await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

            this.ui.updateProgressStatus('Transferring subtitle data...');
            await this.ffmpeg.writeFile('subtitles.srt', srtContent);

            this.ui.updateProgressStatus('Starting rendering process...');
            this.ui.setProgressBarWidth('10%');

            const exitCode = await this.ffmpeg.exec([
                '-y',
                '-i', inputName,
                '-vf', 'subtitles=subtitles.srt:fontsdir=/tmp:force_style=Fontname=Arial',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-threads', '2',
                '-c:a', 'aac',
                '-b:a', '128k',
                'output.mp4'
            ]);

            if (exitCode !== 0) {
                throw new Error(`FFmpeg process failed (Code ${exitCode}). Check browser console for details.`);
            }

            this.ui.setProgressMessage('Finalizing file...');
            this.ui.updateProgressStatus('Reading result...');

            const data = await this.ffmpeg.readFile('output.mp4');

            await this.ffmpeg.deleteFile(inputName);
            await this.ffmpeg.deleteFile('subtitles.srt');
            await this.ffmpeg.deleteFile('output.mp4');

            const blob = new Blob([data], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const baseName = videoFile.name.split('.').slice(0, -1).join('.') || 'video';

            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}-subtitled.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            this.ui.setProgressTitle('Success!');
            this.ui.setProgressMessage('Your video has been saved to your downloads.');
            this.ui.setProgressBarWidth('100%');
            this.ui.updateProgressStatus('Complete.');

            return { success: true };
        } catch (error) {
            console.error('Rendering failed:', error);
            this.ui.showError(`Rendering Error: ${error.message}`);
            return { success: false, error };
        }
    }

    async exportMkv(videoFile, srtContent) {
        this.ui.showProgressArea();
        this.ui.setProgressTitle('Exporting MKV');
        this.ui.setProgressMessage('Muxing video with subtitles (no re-encoding)...');
        this.ui.setProgressBarWidth('0%');

        const loaded = await this.load();
        if (!loaded) {
            return { success: false };
        }

        try {
            const ext = videoFile.name.split('.').pop().toLowerCase() || 'mp4';
            const inputName = `input.${ext}`;

            this.ui.updateProgressStatus('Transferring video file...');
            await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

            this.ui.updateProgressStatus('Transferring subtitle data...');
            await this.ffmpeg.writeFile('subtitles.srt', srtContent);
            console.log('SRT content preview:', srtContent.substring(0, 500));

            this.ui.updateProgressStatus('Muxing streams...');
            this.ui.setProgressBarIndeterminate(true);

            const exitCode = await this.ffmpeg.exec([
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
            ]);

            if (exitCode !== 0) {
                throw new Error(`FFmpeg process failed (Code ${exitCode}). Check browser console for details.`);
            }

            this.ui.updateProgressStatus('Verifying output...');
            await this.ffmpeg.exec(['-hide_banner', '-i', 'output.mkv']);

            this.ui.setProgressMessage('Finalizing file...');
            this.ui.updateProgressStatus('Reading result...');

            const data = await this.ffmpeg.readFile('output.mkv');

            await this.ffmpeg.deleteFile(inputName);
            await this.ffmpeg.deleteFile('subtitles.srt');
            await this.ffmpeg.deleteFile('output.mkv');

            const blob = new Blob([data], { type: 'video/x-matroska' });
            const url = URL.createObjectURL(blob);
            const baseName = videoFile.name.split('.').slice(0, -1).join('.') || 'video';

            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}.mkv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            this.ui.setProgressTitle('Success!');
            this.ui.setProgressMessage('Your MKV file has been saved.');
            this.ui.setProgressBarWidth('100%');
            this.ui.updateProgressStatus('Complete.');

            return { success: true };
        } catch (error) {
            console.error('MKV export failed:', error);
            this.ui.showError(`Export Error: ${error.message}`);
            return { success: false, error };
        }
    }
}
