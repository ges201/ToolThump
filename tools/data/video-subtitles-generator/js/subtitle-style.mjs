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

export function buildAss(srt, style, width, height) {
    const events = parseSrt(srt).map((cue) =>
        `Dialogue: 0,${cue.start},${cue.end},Default,,0,0,0,,${escapeAssText(cue.text)}`);
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
