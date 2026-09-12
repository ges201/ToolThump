export const FONT_URLS = {
    Arial: 'https://cdn.jsdelivr.net/gh/ffmpegwasm/testdata@master/arial.ttf',
    Lato: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lato/Lato-Regular.ttf',
    Montserrat: 'https://cdn.jsdelivr.net/gh/JulietaUla/Montserrat@master/fonts/ttf/Montserrat-Regular.ttf',
    Bangers: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bangers/Bangers-Regular.ttf'
};

// ASS alignment uses numpad positions: 2 bottom, 5 middle, 8 top.
const ALIGNMENT = { bottom: 2, middle: 5, top: 8 };

// Sizes are authored against the default 288-high ASS script (the same basis
// the UI and preview use) and scaled to the real frame below.
const REF_HEIGHT = 288;

export function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
}

// ASS colours are &HAABBGGRR: alpha, then blue, green, red.
export function hexToAss(hex, alpha = '00') {
    const [r, g, b] = hexToRgb(hex);
    const byte = (n) => n.toString(16).padStart(2, '0').toUpperCase();
    return `&H${alpha}${byte(b)}${byte(g)}${byte(r)}`;
}

function toAssTime(h, m, s, ms) {
    return `${Number(h)}:${m}:${s}.${String(Math.floor(ms / 10)).padStart(2, '0')}`;
}

// SRT blocks -> { start, end, text }; malformed blocks (hand-edited SRT) are skipped.
function parseSrt(srt) {
    const cues = [];
    for (const block of String(srt).replace(/\r/g, '').trim().split(/\n{2,}/)) {
        const lines = block.split('\n').filter((line) => line.trim() !== '');
        const timeIndex = lines.findIndex((line) => line.includes('-->'));
        if (timeIndex < 0) continue;
        const m = lines[timeIndex].match(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/);
        if (!m) continue;
        cues.push({
            start: toAssTime(m[1], m[2], m[3], m[4]),
            end: toAssTime(m[5], m[6], m[7], m[8]),
            text: lines.slice(timeIndex + 1).join('\n')
        });
    }
    return cues;
}

// V4+ Style values, in Format order below. Sizes scale against the video's own
// height and PlayResX/Y are the video's pixels, so libass maps 1:1: centring
// stays centred and margins keep their proportion on any aspect ratio.
function buildStyleLine(style, height) {
    const {
        font = 'Arial', size = 16, color = '#FFFFFF', bold = false,
        position = 'bottom', outline = 2, outlineColor = '#000000',
        box = false, boxColor = '#000000'
    } = style;
    const px = (v) => Math.round((v / REF_HEIGHT) * height);
    return [
        font, px(size), hexToAss(color), '&H000000FF',
        // Box mode fills with OutlineColour (libass has no glyph outline then),
        // so the box colour takes it over.
        box ? hexToAss(boxColor, '80') : hexToAss(outlineColor),
        box ? hexToAss(boxColor, '80') : '&H00000000',
        bold ? '-1' : '0', '0', '0', '0', '100', '100', '0', '0',
        box ? '3' : '1', px(outline), px(2),
        ALIGNMENT[position] ?? 2,
        px(10), px(10), px(10), '1'
    ].join(',');
}

const escapeAssText = (text) => text
    .replace(/\\/g, '\\\\')
    .replace(/[{}]/g, (c) => `\\${c}`)
    .replace(/\n/g, '\\N');

// Largest font scale <= 1 that keeps a cue inside the frame. libass wraps at
// spaces but clips a word wider than the frame, and a long cue wrapped at a
// large size can run off the top. Widths are measured once at fontPx; every
// candidate scale is arithmetic, so shrinking never needs a re-measure.
// ponytail: line height is estimated, not measured — the spare line below
// covers fonts that run taller.
const LINE_HEIGHT = 1.25;

export function fitScale(words, fontPx, maxWidth, maxHeight, measure) {
    if (!words.length) return 1;
    const widths = words.map((word) => measure(word, fontPx));
    const space = measure(' ', fontPx) || fontPx * 0.3;
    let scale = Math.min(1, maxWidth / Math.max(...widths));

    // Wrap greedily at the candidate scale and settle on a size whose lines
    // fit vertically too; one correction lands because line count only drops
    // as the font shrinks (the loop is only a safety net).
    for (let i = 0; i < 4; i++) {
        let lines = 1;
        let used = widths[0] * scale;
        for (const width of widths.slice(1)) {
            const word = width * scale;
            if (used + space * scale + word > maxWidth) {
                lines++;
                used = word;
            } else {
                used += space * scale + word;
            }
        }
        // One spare line: libass balances lines and may break one later than
        // a greedy wrap does.
        const needed = (lines > 1 ? lines + 1 : 1) * fontPx * scale * LINE_HEIGHT;
        if (needed <= maxHeight) break;
        scale *= maxHeight / needed;
    }
    return scale;
}

// Centiseconds (ASS time base) -> H:MM:SS.cc
function assTime(cs) {
    const c = Math.max(0, Math.round(cs));
    const s = Math.floor(c / 100);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(c % 100).padStart(2, '0')}`;
}

// One event per word window: the whole line is redrawn with only the word
// being spoken recoloured, so the highlight clears on the next event. Plain
// events cover the gaps between words, keeping the line on screen throughout.
// ponytail: no \k tags — same visual in any ASS renderer, at the cost of a
// redrawn event per word.
function karaokeEvents(cue, style, sizeTag = '') {
    const highlight = `{\\1c${hexToAss(style.highlight || '#FFD700')}&}`;
    const base = `{\\1c${hexToAss(style.color || '#FFFFFF')}&}`;
    const texts = cue.words.map((w) => escapeAssText(w.word));
    const plain = sizeTag + texts.join(' ');
    const cs = (t) => Math.round(t * 100);

    const events = [];
    let cursor = cs(cue.start);
    cue.words.forEach((word, j) => {
        const start = Math.max(cursor, cs(word.start));
        const end = Math.max(start + 1, cs(word.end));
        if (start > cursor) events.push([cursor, start, plain]);
        events.push([start, end, sizeTag + texts.map((t, k) => (k === j ? highlight + t + base : t)).join(' ')]);
        cursor = end;
    });
    const end = Math.max(cursor, cs(cue.end));
    if (end > cursor) events.push([cursor, end, plain]);
    return events;
}

// The optional measure(text, fontPx) -> width callback lets the browser cap
// each cue's size so no line can cross the frame edges. Without it (tests,
// callers that don't care) sizes are emitted exactly as authored.
export function buildAss(srt, style, width, height, cues, measure) {
    const canKaraoke = style.highlightWords !== false
        && Array.isArray(cues) && cues.every((cue) => cue.words && cue.words.length);
    const px = (v) => Math.round((v / REF_HEIGHT) * height);
    const fontPx = px(style.size ?? 16);
    // Outline sits outside the glyph box, so the text budget is the frame
    // minus margins and outline.
    const maxWidth = width - 2 * (px(10) + px(style.outline ?? 2));
    const maxHeight = height - 2 * (px(10) + px(style.outline ?? 2));
    // 0.98 covers canvas-vs-libass metric drift on the shrunk size.
    const sizeTag = (words) => {
        if (!measure || !words.length) return '';
        const scale = fitScale(words, fontPx, maxWidth, maxHeight, measure);
        return scale < 1 ? `{\\fs${Math.max(1, Math.floor(fontPx * scale * 0.98))}}` : '';
    };
    const events = canKaraoke
        ? cues.flatMap((cue) => karaokeEvents(cue, style, sizeTag(cue.words.map((w) => w.word))))
            .map(([start, end, text]) => `Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${text}`)
        : parseSrt(srt).map((cue) =>
            `Dialogue: 0,${cue.start},${cue.end},Default,,0,0,0,,${sizeTag(cue.text.split(/\s+/))}${escapeAssText(cue.text)}`);
    return [
        '[Script Info]',
        'ScriptType: v4.00+',
        `PlayResX: ${width}`,
        `PlayResY: ${height}`,
        'WrapStyle: 0',
        'ScaledBorderAndShadow: yes',
        '',
        '[V4+ Styles]',
        'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
        `Style: Default,${buildStyleLine(style, height)}`,
        '',
        '[Events]',
        'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
        ...events,
        ''
    ].join('\n');
}
