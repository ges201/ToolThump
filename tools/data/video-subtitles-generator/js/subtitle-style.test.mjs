import test from 'node:test';
import assert from 'node:assert/strict';
import { buildForceStyle, hexToAss, hexToRgb } from './subtitle-style.mjs';

test('hexToRgb parses channels', () => {
    assert.deepEqual(hexToRgb('#123456'), [18, 52, 86]);
});

test('hexToAss converts RGB to ASS BGR order', () => {
    assert.equal(hexToAss('#123456'), '&H00563412');
    assert.equal(hexToAss('#000000', '80'), '&H80000000');
    assert.equal(hexToAss('#FF0000'), '&H000000FF');
});

test('defaults reproduce the previous hardcoded render style', () => {
    assert.equal(
        buildForceStyle(),
        'Fontname=Arial,FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Alignment=2'
    );
});

test('maps position to ASS alignment and falls back to bottom', () => {
    assert.match(buildForceStyle({ position: 'top' }), /Alignment=8/);
    assert.match(buildForceStyle({ position: 'middle' }), /Alignment=5/);
    assert.match(buildForceStyle({ position: 'nonsense' }), /Alignment=2/);
});

test('adds bold and background box fields', () => {
    const style = buildForceStyle({ bold: true, box: true, boxColor: '#0000FF' });
    assert.match(style, /Bold=-1/);
    assert.match(style, /BorderStyle=3/);
    // Box mode paints the box with OutlineColour, not BackColour.
    assert.match(style, /OutlineColour=&H80FF0000/);
    assert.match(style, /BackColour=&H80FF0000/);
});

test('omits bold and box fields by default', () => {
    const style = buildForceStyle();
    assert.doesNotMatch(style, /Bold/);
    assert.doesNotMatch(style, /BorderStyle/);
});
