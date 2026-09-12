export const FONT_URLS = {
    Arial: 'https://cdn.jsdelivr.net/gh/ffmpegwasm/testdata@master/arial.ttf',
    Lato: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lato/Lato-Regular.ttf',
    Montserrat: 'https://cdn.jsdelivr.net/gh/JulietaUla/Montserrat@master/fonts/ttf/Montserrat-Regular.ttf',
    Bangers: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bangers/Bangers-Regular.ttf'
};

// ASS alignment uses numpad positions: 2 bottom, 5 middle, 8 top.
const ALIGNMENT = { bottom: 2, middle: 5, top: 8 };

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

// Values must not contain commas: force_style is a comma-separated list.
export function buildForceStyle(style = {}) {
    const {
        font = 'Arial', size = 16, color = '#FFFFFF', bold = false,
        position = 'bottom', outline = 2, outlineColor = '#000000',
        box = false, boxColor = '#000000'
    } = style;

    const fields = [
        `Fontname=${font}`,
        `FontSize=${size}`,
        `PrimaryColour=${hexToAss(color)}`,
        // Box mode fills with OutlineColour (libass has no glyph outline then),
        // so the box colour takes it over.
        `OutlineColour=${hexToAss(box ? boxColor : outlineColor, box ? '80' : '00')}`,
        `Outline=${outline}`,
        `Alignment=${ALIGNMENT[position] ?? 2}`
    ];
    if (bold) fields.push('Bold=-1');
    if (box) {
        fields.push('BorderStyle=3');
        // BackColour only tints the shadow; keep it in step with the box.
        fields.push(`BackColour=${hexToAss(boxColor, '80')}`);
    }
    return fields.join(',');
}
