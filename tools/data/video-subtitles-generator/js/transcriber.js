const WHISPER_SAMPLE_RATE = 16000;

export class Transcriber {
    constructor(uiManager) {
        this.ui = uiManager;
        this.worker = null;
        this.workerError = null;
    }

    ensureWorker() {
        if (this.worker) return this.worker;
        this.worker = new Worker(new URL('./transcription-worker.js', import.meta.url), { type: 'module' });
        this.worker.onerror = (e) => {
            this.workerError = e.message || 'Worker error';
            console.error('Transcription worker error:', e);
        };
        return this.worker;
    }

    // Workers have no AudioContext, so decode + resample the audio track here
    // (OfflineAudioContext needs no user gesture) and hand the worker a raw
    // 16kHz mono Float32Array, which the pipeline accepts directly.
    async decodeAudioFile(videoFile) {
        try {
            const buf = await videoFile.arrayBuffer();
            const decoder = new OfflineAudioContext(1, 1, WHISPER_SAMPLE_RATE);
            const decoded = await decoder.decodeAudioData(buf);

            if (decoded.sampleRate === WHISPER_SAMPLE_RATE && decoded.numberOfChannels === 1) {
                return { audio: decoded.getChannelData(0), duration: decoded.duration };
            }

            const frameCount = Math.max(1, Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE));
            const offline = new OfflineAudioContext(1, frameCount, WHISPER_SAMPLE_RATE);
            const source = offline.createBufferSource();
            source.buffer = decoded;
            source.connect(offline.destination);
            source.start();
            const rendered = await offline.startRendering();

            return { audio: rendered.getChannelData(0), duration: rendered.duration };
        } catch (error) {
            console.error('Audio decode failed:', error);
            throw new Error('Could not decode the audio track from this file. Try converting it to MP4 or WebM first.');
        }
    }

    async generate(videoFile, language, modelSize) {
        this.ui.showProgressArea();
        this.ui.setProgressTitle('Generating Subtitles');
        this.ui.setProgressMessage('Preparing audio...');
        this.ui.setProgressBarWidth('0%');
        this.ui.setProgressBarIndeterminate(false);
        this.ui.setProgressActive(false);

        try {
            const worker = this.ensureWorker();
            if (this.workerError) throw new Error(this.workerError);

            return new Promise((resolve) => {
                worker.onmessage = (e) => {
                    const data = e.data;
                    if (data.pct !== undefined) this.ui.setProgressBarWidth(`${data.pct}%`);
                    switch (data.type) {
                        case 'download':
                            this.ui.updateProgressStatus(`Model Download: ${data.file} ${data.perFile}%`);
                            break;
                        case 'preparing':
                            this.ui.setProgressMessage('Preparing transcription engine...');
                            this.ui.updateProgressStatus(data.status);
                            break;
                        case 'transcribe-start':
                            this.ui.setProgressMessage('Transcribing audio...');
                            this.ui.setProgressActive(true);
                            this.ui.updateProgressStatus(data.status);
                            break;
                        case 'transcribe':
                            this.ui.updateProgressStatus(data.status);
                            break;
                        case 'finalize':
                            this.ui.setProgressActive(false);
                            this.ui.setProgressMessage('Formatting subtitles...');
                            this.ui.updateProgressStatus('');
                            break;
                        case 'done':
                            this.ui.showResults(data.srt);
                            resolve({ success: true, srtContent: data.srt });
                            break;
                        case 'error':
                            this.ui.showError(`AI Error: ${data.message}`);
                            resolve({ success: false, error: new Error(data.message) });
                            break;
                    }
                };

                // Model download runs in the worker while the audio decodes here.
                worker.postMessage({ type: 'load', modelSize });

                this.ui.updateProgressStatus('Decoding audio track...');
                this.decodeAudioFile(videoFile).then(
                    ({ audio, duration }) => {
                        worker.postMessage({ type: 'transcribe', audio, language, duration, modelSize }, [audio.buffer]);
                    },
                    (error) => {
                        this.ui.showError(`AI Error: ${error.message}`);
                        resolve({ success: false, error });
                    }
                );
            });
        } catch (error) {
            console.error('Transcription failed:', error);
            this.ui.showError(`AI Error: ${error.message}`);
            return { success: false, error };
        }
    }
}
