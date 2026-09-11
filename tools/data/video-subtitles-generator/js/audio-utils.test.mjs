import test from 'node:test';
import assert from 'node:assert/strict';
import { downmixToMono } from './audio-utils.mjs';

test('downmixes stereo in place with the Web Audio 0.5*(L+R) rule', () => {
    const left = Float32Array.from([1, -1, 0.5]);
    const right = Float32Array.from([1, 0, -0.5]);
    const out = downmixToMono(left, right);
    assert.equal(out, left);
    assert.deepEqual(Array.from(out), [1, -0.5, 0]);
});

test('leaves silence silent', () => {
    const left = new Float32Array(8);
    const right = new Float32Array(8);
    assert.deepEqual(Array.from(downmixToMono(left, right)), new Array(8).fill(0));
});
