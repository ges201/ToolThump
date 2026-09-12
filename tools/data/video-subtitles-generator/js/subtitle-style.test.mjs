import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAss, hexToAss, hexToRgb } from './subtitle-style.mjs';

const DEFAULT_STYLE_AT_720P = 'Style: Default,Arial,40,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,5,5,2,25,25,25,1';

test('hexToRgb parses channels', () => {
    assert.deepEqual(hexToRgb('#123456'), [18, 52, 86]);
});

test('hexToAss converts RGB to ASS BGR order', () => {
    assert.equal(hexToAss('#123456'), '&H00563412');
    assert.equal(hexToAss('#000000', '80'), '&H80000000');
    assert.equal(hexToAss('#FF0000'), '&H000000FF');
});

test('PlayRes matches the video so centring maps 1:1 on any ratio', () => {
    const ass = buildAss('', {}, 720, 1280);
    assert.match(ass, /PlayResX: 720/);
    assert.match(ass, /PlayResY: 1280/);
});

test('defaults scale sizes against the video height', () => {
    const ass = buildAss('', {}, 1280, 720);
    assert.ok(ass.includes(DEFAULT_STYLE_AT_720P), ass);
});

test('a 288-high frame keeps the authored size unchanged', () => {
    const ass = buildAss('', {}, 512, 288);
    assert.match(ass, /Style: Default,Arial,16,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1/);
});

test('maps position to ASS alignment and falls back to bottom', () => {
    assert.match(buildAss('', { position: 'top' }, 1280, 720), /,8,25,25,25,1/);
    assert.match(buildAss('', { position: 'middle' }, 1280, 720), /,5,25,25,25,1/);
    assert.match(buildAss('', { position: 'nonsense' }, 1280, 720), /,2,25,25,25,1/);
});

test('box mode paints the box with OutlineColour and adds a bold flag', () => {
    const ass = buildAss('', { bold: true, box: true, boxColor: '#0000FF' }, 1280, 720);
    assert.match(ass, /Style: Default,Arial,40,&H00FFFFFF,&H000000FF,&H80FF0000,&H80FF0000,-1,0,0,0,100,100,0,0,3,5,5,2,25,25,25,1/);
});

test('converts SRT cues to ASS dialogue lines', () => {
    const srt = '1\n00:00:00,000 --> 00:00:01,500\nHello\nworld\n\n2\n00:00:02,000 --> 00:00:03,000\nSecond\n';
    const ass = buildAss(srt, {}, 1280, 720);
    assert.match(ass, /Dialogue: 0,0:00:00\.00,0:00:01\.50,Default,,0,0,0,,Hello\\Nworld/);
    assert.match(ass, /Dialogue: 0,0:00:02\.00,0:00:03\.00,Default,,0,0,0,,Second/);
});

test('tolerates dot millisecond separators and skips malformed blocks', () => {
    const srt = '1\n00:00:01.250 --> 00:00:02.750\nDots\n\nno timestamps here\nignored\n';
    const ass = buildAss(srt, {}, 1280, 720);
    assert.match(ass, /Dialogue: 0,0:00:01\.25,0:00:02\.75,Default,,0,0,0,,Dots/);
    assert.doesNotMatch(ass, /ignored/);
});

test('word-timed cues render per-word karaoke events with gap fillers', () => {
    const cues = [{
        start: 0,
        end: 2,
        text: 'Hello world',
        words: [
            { word: 'Hello', start: 0.1, end: 0.8 },
            { word: 'world', start: 1.2, end: 2.0 }
        ]
    }];
    const ass = buildAss('', { highlight: '#FFD700' }, 1280, 720, cues);
    assert.ok(ass.includes('Dialogue: 0,0:00:00.00,0:00:00.10,Default,,0,0,0,,Hello world'), ass);
    assert.ok(ass.includes('Dialogue: 0,0:00:00.10,0:00:00.80,Default,,0,0,0,,{\\1c&H0000D7FF&}Hello{\\1c&H00FFFFFF&} world'), ass);
    assert.ok(ass.includes('Dialogue: 0,0:00:00.80,0:00:01.20,Default,,0,0,0,,Hello world'), ass);
    assert.ok(ass.includes('Dialogue: 0,0:00:01.20,0:00:02.00,Default,,0,0,0,,Hello {\\1c&H0000D7FF&}world{\\1c&H00FFFFFF&}'), ass);
});

test('cues without word timings fall back to plain SRT events', () => {
    const srt = '1\n00:00:00,000 --> 00:00:01,000\nPlain\n';
    const ass = buildAss(srt, {}, 1280, 720, [{ start: 0, end: 1, text: 'Plain', words: [] }]);
    assert.match(ass, /Dialogue: 0,0:00:00\.00,0:00:01\.00,Default,,0,0,0,,Plain/);
    assert.doesNotMatch(ass, /\\1c/);
});

test('oversized words are shrunk until they fit inside the frame', () => {
    // Stub metrics: every glyph 30 units wide, a space 10, at any font size.
    const measure = (text) => (text === ' ' ? 10 : text.length * 30);
    const word = 'x'.repeat(50); // 1500 units, frame budget is 976
    const ass = buildAss(`1\n00:00:00,000 --> 00:00:01,000\n${word}\n`, {}, 1000, 288, null, measure);
    // 976 / 1500 * 16 * 0.98 = 10.2 -> 10.
    assert.ok(ass.includes(`,,{\\fs10}${word}`), ass);
});

test('long wrapped cues are shrunk until their lines fit vertically', () => {
    const measure = (text) => (text === ' ' ? 10 : text.length * 30);
    const words = Array(100).fill('aaaa').join(' '); // 1 line would fit, wrap does not
    const ass = buildAss(`1\n00:00:00,000 --> 00:00:01,000\n${words}\n`, {}, 1000, 288, null, measure);
    assert.ok(ass.includes('{\\fs12}'), ass);
});

test('every karaoke event for an oversized cue carries the fit override', () => {
    const measure = (text) => (text === ' ' ? 10 : text.length * 30);
    const cue = {
        start: 0,
        end: 2,
        text: '',
        words: [
            { word: 'x'.repeat(50), start: 0.1, end: 0.8 },
            { word: 'y', start: 1.2, end: 2.0 }
        ]
    };
    const ass = buildAss('', {}, 1000, 288, [cue], measure);
    const dialogues = ass.split('\n').filter((line) => line.startsWith('Dialogue'));
    assert.equal(dialogues.length, 4);
    for (const line of dialogues) assert.ok(line.includes('{\\fs10}'), line);
});

test('text that fits gets no size override', () => {
    const measure = (text) => (text === ' ' ? 10 : text.length * 30);
    const ass = buildAss('1\n00:00:00,000 --> 00:00:01,000\nHello world\n', {}, 1000, 288, null, measure);
    assert.doesNotMatch(ass, /\\fs/);
});

test('highlightWords off renders plain events even with word timings', () => {
    const srt = '1\n00:00:00,000 --> 00:00:02,000\nHello world\n';
    const cues = [{
        start: 0,
        end: 2,
        text: 'Hello world',
        words: [
            { word: 'Hello', start: 0.1, end: 0.8 },
            { word: 'world', start: 1.2, end: 2.0 }
        ]
    }];
    const ass = buildAss(srt, { highlightWords: false }, 1280, 720, cues);
    assert.match(ass, /Dialogue: 0,0:00:00\.00,0:00:02\.00,Default,,0,0,0,,Hello world/);
    assert.doesNotMatch(ass, /\\1c/);
});
