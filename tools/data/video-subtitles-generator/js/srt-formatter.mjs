// Seconds -> M:SS (or H:MM:SS). Shared by the worker's status messages and
// the main thread's elapsed clock.
export function fmtTime(totalSec) {
    const s = Math.floor(totalSec);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m % 60).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const SENTENCE_END = /[.!?…。！？]$/;
const CLOSERS = /["'”’»」』）)\]]+$/;
// Dotted abbreviations that shouldn't end a cue on their own dot.
const ABBREVIATIONS = /^(?:[a-z]|mr|mrs|ms|dr|prof|st|vs|etc|no|fig|jr|sr|e\.g|i\.e|a\.m|p\.m|u\.s)\.$/i;

function isSentenceEnd(text) {
    const bare = text.replace(CLOSERS, '');
    if (!SENTENCE_END.test(bare)) return false;
    if (!bare.endsWith('.')) return true;
    return !ABBREVIATIONS.test(bare.split(/\s+/).pop());
}

// Whisper word chunks are single words, but recovery retries emit whole
// segment phrases. Expand every chunk into word entries with even timings so
// the grouping caps apply to recovered text and karaoke keeps per-word times.
function flattenWords(chunks) {
    const words = [];
    for (const chunk of chunks) {
        const start = chunk.timestamp[0];
        // Sometimes the very last word lacks an end timestamp, fallback to +0.5s
        const end = chunk.timestamp[1] !== null ? chunk.timestamp[1] : start + 0.5;
        const tokens = chunk.text.trim().split(/\s+/).filter(Boolean);
        if (tokens.length <= 1) {
            words.push({ word: tokens[0] ?? '', text: chunk.text, start, end });
            continue;
        }
        const lead = chunk.text.match(/^\s*/)[0];
        tokens.forEach((token, i) => {
            words.push({
                word: token,
                text: (i === 0 ? lead : ' ') + token,
                start: start + (end - start) * i / tokens.length,
                end: start + (end - start) * (i + 1) / tokens.length
            });
        });
    }
    return words;
}

export class SRTFormatter {
    // Group whisper word-chunks into subtitle cues. The cues keep each word
    // with its own timestamps so playback can highlight word by word.
    buildLines(output) {
        if (!output || !output.chunks) return [];

        const lines = [];
        let currentLine = { text: '', start: null, end: null, words: [] };

        // Subtitle grouping rules (Tweak these if you want shorter/longer captions)
        const MAX_CHARS = 64;        // Max characters per subtitle block
        const MAX_DURATION = 4.0;    // Max seconds a subtitle stays on screen
        const MAX_PAUSE = 1.0;       // Start a new subtitle if there's a > 1 second pause
        const CLAUSE_AT = MAX_CHARS * 0.6; // Break at a clause mark once the line is this long

        for (const { word, text, start, end } of flattenWords(output.chunks)) {
            // Initialize the first word of a new line
            if (currentLine.start === null) {
                currentLine.start = start;
                currentLine.end = end;
                currentLine.text = text;
                currentLine.words = [{ word, start, end }];
                continue;
            }

            const duration = end - currentLine.start;
            const pause = start - currentLine.end;
            const futureLength = currentLine.text.length + text.length;

            // Look for end-of-sentence punctuation or a clause mark to split at
            const trimmed = currentLine.text.trim();
            const clauseEnd = /[,;:—–]$/.test(trimmed);

            // Check if we should split and start a new subtitle block
            if (
                duration > MAX_DURATION ||
                futureLength > MAX_CHARS ||
                pause > MAX_PAUSE ||
                isSentenceEnd(trimmed) ||
                (clauseEnd && futureLength > CLAUSE_AT)
            ) {
                // Save current line
                lines.push(currentLine);

                // Start a new line
                currentLine = {
                    start,
                    end,
                    text: text.trimStart(), // Remove leading space on new line
                    words: [{ word, start, end }]
                };
            } else {
                // Append word to current line
                currentLine.text += text;
                currentLine.end = end;
                currentLine.words.push({ word, start, end });
            }
        }

        // Push the final remaining line
        if (currentLine.start !== null) {
            lines.push(currentLine);
        }

        return lines;
    }

    format(output) {
        const lines = this.buildLines(output);
        return {
            srt: lines.map((line, index) => {
                const start = this.formatTimestamp(line.start);
                const end = this.formatTimestamp(line.end);
                return `${index + 1}\n${start} --> ${end}\n${line.text.trim()}\n`;
            }).join('\n'),
            cues: lines.map((line) => ({
                start: line.start,
                end: line.end,
                text: line.text.trim(),
                words: line.words
            }))
        };
    }

    convertToSRT(output) {
        return this.format(output).srt;
    }

    // Rebuild cues from (possibly edited) SRT text. Cue boundaries stay exact;
    // words inside a cue are spread evenly since edited text has no word
    // timestamps. When the pristine cues from generation are passed in, cues
    // that are unchanged reuse their original word timings, and changed cues
    // keep the timings of any words that survived the edit. Returns null when
    // any block lacks a valid timestamp, so the caller can fall back to plain
    // text instead of guessing timing.
    parseSRT(srt, originalCues) {
        const cues = [];
        const blocks = String(srt).trim().split(/\n\s*\n/);

        for (const block of blocks) {
            const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
            const timeLineIndex = lines.findIndex((l) => l.includes('-->'));
            if (timeLineIndex === -1) return null;

            const timeLine = lines[timeLineIndex];
            const times = timeLine.split('-->').map((t) => this.parseTimestamp(t.trim()));
            if (times.length !== 2 || times[0] === null || times[1] === null) return null;
            const [start, end] = times;

            // Lines before the timestamp are the optional numeric cue index.
            const text = lines.slice(timeLineIndex + 1).join(' ').trim();
            if (!text) return null;

            const wordStrs = text.split(/\s+/);
            const words = this.distributeWords(wordStrs, start, end);

            const cue = { start, end, text, words };
            this.anchorToOriginal(cue, originalCues);
            cues.push(cue);
        }

        return cues.length ? cues : null;
    }

    distributeWords(wordStrs, start, end) {
        return wordStrs.map((word, j) => ({
            word,
            start: start + (end - start) * j / wordStrs.length,
            end: start + (end - start) * (j + 1) / wordStrs.length
        }));
    }

    // Wherever the edited cue still matches a pristine one, keep the original
    // word timings so unedited parts stay as accurate as the model output.
    anchorToOriginal(cue, originalCues) {
        if (!originalCues) return;
        const ms = (t) => Math.round(t * 1000);
        const orig = originalCues.find((c) => ms(c.start) === ms(cue.start) && ms(c.end) === ms(cue.end));
        if (!orig) return;

        if (orig.text === cue.text) {
            cue.words = orig.words;
            return;
        }

        const oWords = orig.words;
        const words = cue.words.map((w) => ({ ...w, start: null, end: null }));
        const oIdxOf = new Array(words.length).fill(-1);

        // Greedy first-match: words that survived the edit keep their timing.
        // ponytail: not an optimal LCS; cues are short and this is exact for
        // the common edit shapes (replace / insert / delete).
        const used = new Array(oWords.length).fill(false);
        for (let j = 0; j < words.length; j++) {
            for (let i = 0; i < oWords.length; i++) {
                if (!used[i] && oWords[i].word === words[j].word) {
                    used[i] = true;
                    oIdxOf[j] = i;
                    words[j].start = oWords[i].start;
                    words[j].end = oWords[i].end;
                    break;
                }
            }
        }

        // Each maximal run of unmatched words either replaces the unmatched
        // original words in its region (inheriting their exact span) or, as a
        // pure insertion, lands in the gap between its timed neighbours. A
        // zero-width gap borrows a little from each side so the inserted word
        // stays visible.
        const regionBounds = (prevIdx, nextIdx) => {
            const op = prevIdx >= 0 ? oIdxOf[prevIdx] : -1;
            const oq = nextIdx >= 0 ? oIdxOf[nextIdx] : oWords.length;
            let firstOrphan = -1, lastOrphan = -1;
            for (let i = op + 1; i < oq; i++) {
                if (!used[i]) {
                    if (firstOrphan === -1) firstOrphan = i;
                    lastOrphan = i;
                }
            }
            if (lastOrphan !== -1) {
                return { rs: oWords[firstOrphan].start, re: oWords[lastOrphan].end, borrowed: false };
            }
            return {
                rs: op >= 0 ? oWords[op].end : cue.start,
                re: oq < oWords.length ? oWords[oq].start : cue.end,
                borrowed: false,
                op, oq
            };
        };

        for (let s = 0; s < words.length; s++) {
            if (words[s].start !== null) continue;
            let e = s;
            while (e < words.length && words[e].start === null) e++;
            const runLen = e - s;

            let prevIdx = -1;
            for (let k = s - 1; k >= 0; k--) {
                if (words[k].start !== null) { prevIdx = k; break; }
            }
            let nextIdx = -1;
            for (let k = e; k < words.length; k++) {
                if (words[k].start !== null) { nextIdx = k; break; }
            }

            const region = regionBounds(prevIdx, nextIdx);
            let { rs, re } = region;
            if (region.op !== undefined && re - rs <= 0.0001) {
                // Pure insertion with no room: borrow up to half of each
                // neighbour's duration and clip the neighbour accordingly.
                const deficit = runLen * 0.05;
                const left = region.op >= 0
                    ? Math.min(deficit / 2, (oWords[region.op].end - oWords[region.op].start) * 0.4)
                    : 0;
                const right = region.oq < oWords.length
                    ? Math.min(deficit / 2, (oWords[region.oq].end - oWords[region.oq].start) * 0.4)
                    : 0;
                rs -= left;
                re += right;
                if (prevIdx >= 0 && left > 0) words[prevIdx].end = rs;
                if (nextIdx >= 0 && right > 0) words[nextIdx].start = re;
            }

            const span = re - rs;
            for (let g = s; g < e; g++) {
                words[g].start = rs + span * (g - s) / runLen;
                words[g].end = rs + span * (g - s + 1) / runLen;
            }
            s = e;
        }
        cue.words = words;
    }

    parseTimestamp(str) {
        const m = str.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})[,.](\d{1,3})$/);
        if (!m) return null;
        return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4].padEnd(3, '0')) / 1000;
    }

    formatTimestamp(seconds) {
        const s = seconds || 0;
        const date = new Date(s * 1000);
        const hh = String(Math.floor(s / 3600)).padStart(2, '0');
        const mm = String(date.getUTCMinutes()).padStart(2, '0');
        const ss = String(date.getUTCSeconds()).padStart(2, '0');
        const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
        return `${hh}:${mm}:${ss},${ms}`;
    }
}
