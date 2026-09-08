import { SRTFormatter } from './srt-formatter.mjs';

const srtFormatter = new SRTFormatter();

export class UIManager {
    constructor() {
        this.elements = {
            dropZone: document.getElementById('video-drop-zone'),
            fileInput: document.getElementById('video-input'),
            fileInfo: document.getElementById('video-info'),
            videoPreview: document.getElementById('video-preview'),
            uploadedVideoNameContainer: document.getElementById('uploaded-video-name-container'),
            uploadedVideoName: document.getElementById('uploaded-video-name'),
            processingOptions: document.getElementById('processing-options'),
            generateBtn: document.getElementById('vsg-generate-btn'),
            languageSelect: document.getElementById('language-select'),
            modelSelect: document.getElementById('model-select'),
            progressArea: document.getElementById('progress-area'),
            progressSpinner: document.getElementById('progress-spinner'),
            progressTitle: document.getElementById('progress-title'),
            progressMessage: document.getElementById('progress-message'),
            progressBar: document.getElementById('progress-bar'),
            progressStatus: document.getElementById('progress-status'),
            resultsArea: document.getElementById('results-area'),
            subtitlePreview: document.getElementById('subtitle-preview'),
            subtitleEditor: document.getElementById('subtitle-editor'),
            editBtn: document.getElementById('vsg-edit-btn'),
            saveEditBtn: document.getElementById('vsg-save-edit-btn'),
            cancelEditBtn: document.getElementById('vsg-cancel-edit-btn'),
            editActions: document.getElementById('subtitle-edit-actions'),
            downloadBtn: document.getElementById('vsg-download-btn'),
            mkvExportBtn: document.getElementById('vsg-mkv-export-btn'),
            renderBtn: document.getElementById('vsg-render-btn')
        };
        this.previewUrl = null;
        this.generatedSrt = null;
        this.generatedCues = null;
        this.srtContent = null;
        this.cues = null;
        this.cueEls = [];
        this.activeCueIndex = -1;
        this.rafId = 0;

        // Word-highlight sync: a rAF loop while playing keeps words in step
        // (timeupdate alone fires too rarely for word-length cues).
        const video = this.elements.videoPreview;
        video.addEventListener('play', () => this.startCaptionSync());
        video.addEventListener('pause', () => this.stopCaptionSync());
        video.addEventListener('seeked', () => this.syncCaptions());
    }

    addEventListeners(handlers) {
        const { dropZone, fileInput, generateBtn, downloadBtn, mkvExportBtn, renderBtn, editBtn, saveEditBtn, cancelEditBtn } = this.elements;

        dropZone.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target === fileInput) return;
            fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handlers.onFileSelect(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handlers.onFileSelect(e.target.files[0]);
            }
        });

        generateBtn.addEventListener('click', () => handlers.onGenerate());
        downloadBtn.addEventListener('click', () => handlers.onDownload());
        mkvExportBtn.addEventListener('click', () => handlers.onMkvExport());
        renderBtn.addEventListener('click', () => handlers.onRender());
        editBtn.addEventListener('click', () => handlers.onEdit());
        saveEditBtn.addEventListener('click', () => handlers.onSaveEdit());
        cancelEditBtn.addEventListener('click', () => handlers.onCancelEdit());
    }

    handleFileSelect(file) {
        if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
            alert('Please upload a video file.');
            return false;
        }
        return true;
    }

    updateFileInfo(file) {
        const { dropZone, uploadedVideoNameContainer, uploadedVideoName } = this.elements;
        if (file) {
            uploadedVideoName.textContent = file.name;
            uploadedVideoNameContainer.style.display = 'block';
            dropZone.classList.add('file-loaded');
        } else {
            uploadedVideoNameContainer.style.display = 'none';
            dropZone.classList.remove('file-loaded');
        }
    }

    updateVideoPreview(file) {
        const { videoPreview } = this.elements;
        // A new file invalidates any captions synced to the previous video.
        this.cues = null;
        this.cueEls = [];
        this.activeCueIndex = -1;
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = null;
        }
        if (file && file.type.startsWith('video/')) {
            this.previewUrl = URL.createObjectURL(file);
            videoPreview.src = this.previewUrl;
            videoPreview.style.display = 'block';
        } else {
            videoPreview.style.display = 'none';
        }
    }

    showProcessingOptions(show = true) {
        this.elements.processingOptions.style.display = show ? 'block' : 'none';
    }

    setGenerateButtonDisabled(disabled) {
        this.elements.generateBtn.disabled = disabled;
    }

    showProgressArea() {
        this.elements.progressArea.style.display = 'block';
        this.elements.resultsArea.style.display = 'none';
        this.elements.generateBtn.disabled = true;
        this.elements.progressSpinner.style.display = 'block';
    }

    showResults(srtContent, cues) {
        this.generatedSrt = srtContent;
        this.generatedCues = cues || null;
        this.srtContent = srtContent;
        this.cues = cues || null;
        this.cueEls = [];
        this.activeCueIndex = -1;
        this.renderSubtitlePreview();
        this.setEditMode(false);
        this.elements.progressArea.style.display = 'none';
        this.elements.resultsArea.style.display = 'block';
        this.elements.generateBtn.disabled = false;
        this.elements.progressSpinner.style.display = 'none';
        this.elements.progressBar.classList.remove('active');
    }

    // The preview doubles as the karaoke view: each cue is rendered as spans
    // so a single word can light up during playback. Falls back to the raw
    // SRT text when no word timings survived transcription.
    renderSubtitlePreview() {
        const preview = this.elements.subtitlePreview;
        preview.textContent = '';
        if (!this.cues || !this.cues.length) {
            preview.textContent = this.srtContent;
            return;
        }
        for (const cue of this.cues) {
            const cueEl = document.createElement('span');
            cueEl.className = 'vsg-preview-cue';
            for (const w of cue.words) {
                const wordEl = document.createElement('span');
                wordEl.className = 'vsg-preview-word';
                wordEl.textContent = w.word;
                cueEl.appendChild(wordEl);
            }
            preview.appendChild(cueEl);
            this.cueEls.push(cueEl);
        }
    }

    showError(message) {
        this.elements.progressTitle.textContent = 'Error';
        this.elements.progressMessage.textContent = message;
        this.elements.progressBar.style.width = '0%';
        this.elements.progressBar.classList.remove('indeterminate');
        this.elements.progressBar.classList.remove('active');
        this.elements.generateBtn.disabled = false;
        this.elements.progressSpinner.style.display = 'none';
    }

    setProgressComplete(title, message) {
        this.setProgressTitle(title);
        this.setProgressMessage(message);
        this.elements.progressBar.style.width = '100%';
        this.elements.progressSpinner.style.display = 'none';
    }

    setProgressTitle(text) {
        this.elements.progressTitle.textContent = text;
    }

    setProgressMessage(text) {
        this.elements.progressMessage.textContent = text;
    }

    setProgressBarWidth(width) {
        this.elements.progressBar.style.width = width;
    }

    setProgressBarIndeterminate(indeterminate) {
        if (indeterminate) {
            this.elements.progressBar.classList.add('indeterminate');
        } else {
            this.elements.progressBar.classList.remove('indeterminate');
        }
    }

    setProgressActive(active) {
        this.elements.progressBar.classList.toggle('active', active);
    }

    updateProgressStatus(text) {
        this.elements.progressStatus.textContent = text;
    }

    baseName(file, fallback) {
        const name = file?.name || '';
        return name.split('.').slice(0, -1).join('.') || fallback;
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadSubtitles(srtContent, videoFile) {
        const blob = new Blob([srtContent], { type: 'text/plain' });
        this.downloadBlob(blob, `${this.baseName(videoFile, 'subtitles')}.srt`);
    }

    startCaptionSync() {
        this.stopCaptionSync();
        const loop = () => {
            this.syncCaptions();
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    stopCaptionSync() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
        }
    }

    syncCaptions() {
        const { videoPreview } = this.elements;
        if (!this.cues || !this.cues.length) return;
        const t = videoPreview.currentTime;
        const cues = this.cues;

        if (t < cues[0].start) {
            this.activeCueIndex = -1;
            this.clearActiveWords();
            this.cueEls.forEach((el) => el.classList.remove('dim'));
            return;
        }

        // Cues are time-sorted; walk from the last known cue so a frame costs
        // a step or two, not a scan of the whole list.
        let i = this.activeCueIndex < 0 ? 0 : this.activeCueIndex;
        while (i > 0 && t < cues[i].start) i--;
        while (i < cues.length - 1 && t >= cues[i + 1].start) i++;

        if (i !== this.activeCueIndex) {
            // Unlight the previous cue's word before moving on.
            this.clearActiveWords();
            this.activeCueIndex = i;
            this.cueEls.forEach((el, k) => el.classList.toggle('dim', k !== i));
            this.cueEls[i].scrollIntoView({ block: 'nearest' });
        }

        const cue = cues[i];
        const words = this.cueEls[i].querySelectorAll('.vsg-preview-word');
        words.forEach((el, j) => {
            const w = cue.words[j];
            el.classList.toggle('active', t >= w.start && t < w.end);
        });
    }

    clearActiveWords() {
        this.cueEls.forEach((el) => {
            el.querySelectorAll('.vsg-preview-word.active').forEach((w) => w.classList.remove('active'));
        });
    }

    setEditMode(editing) {
        const { subtitlePreview, subtitleEditor, editBtn, editActions } = this.elements;
        subtitlePreview.style.display = editing ? 'none' : 'block';
        subtitleEditor.style.display = editing ? 'block' : 'none';
        editBtn.style.display = editing ? 'none' : 'inline-block';
        editActions.style.display = editing ? 'flex' : 'none';
    }

    enterEditMode() {
        this.elements.subtitleEditor.value = this.srtContent || '';
        this.setEditMode(true);
        this.elements.subtitleEditor.focus();
    }

    // Returns the edited SRT, or null if the user cleared everything (stays in edit mode).
    saveEdit() {
        const srt = this.elements.subtitleEditor.value;
        if (!srt.trim()) {
            alert('Subtitles cannot be empty.');
            return null;
        }
        this.srtContent = srt;
        // Rebuild karaoke from the edited text: unedited cues keep their exact
        // word timings; changed cues keep timing for words that survived the
        // edit. Unparseable SRT (a pasted block without timestamps) falls back
        // to the plain text view.
        if (srt !== this.generatedSrt) {
            this.cues = srtFormatter.parseSRT(srt, this.generatedCues);
            this.cueEls = [];
            this.activeCueIndex = -1;
            this.renderSubtitlePreview();
        }
        this.setEditMode(false);
        return srt;
    }

    cancelEdit() {
        this.setEditMode(false);
    }
}
