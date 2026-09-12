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
