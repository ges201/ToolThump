import test from 'node:test';
import assert from 'node:assert/strict';
import { SRTFormatter } from './srt-formatter.mjs';

const formatter = new SRTFormatter();

test('joins consecutive chunks into one subtitle', () => {
    const out = formatter.convertToSRT({
        chunks: [
            { timestamp: [0.0, 0.5], text: ' Hello' },
            { timestamp: [0.5, 1.0], text: ' world' }
        ]
    });
    assert.equal(out, '1\n00:00:00,000 --> 00:00:01,000\nHello world\n');
});

test('splits on a long pause between words', () => {
    const out = formatter.convertToSRT({
        chunks: [
            { timestamp: [0.0, 0.5], text: ' First' },
            { timestamp: [2.0, 2.5], text: ' second' }
        ]
    });
    assert.match(out, /1\n00:00:00,000 --> 00:00:00,500\nFirst\n\n2\n00:00:02,000 --> 00:00:02,500\nsecond\n/);
});

test('splits after sentence-ending punctuation', () => {
    const out = formatter.convertToSRT({
        chunks: [
            { timestamp: [0.0, 0.5], text: ' Hi.' },
            { timestamp: [0.5, 1.0], text: ' next' }
        ]
    });
    assert.match(out, /1\n00:00:00,000 --> 00:00:00,500\nHi\.\n\n2\n00:00:00,500 --> 00:00:01,000\nnext\n/);
});

test('splits when the combined text exceeds 80 characters', () => {
    const long = ' word'.repeat(16); // 80 chars
    const tail = ' tail'; // combined 85 > 80
    const chunks = [
        { timestamp: [0.0, 0.1], text: long },
        { timestamp: [0.1, 0.2], text: tail }
    ];
    const out = formatter.convertToSRT({ chunks });
    assert.equal((out.match(/-->/g) || []).length, 2);
});

test('formats timestamps with hours, minutes, seconds and milliseconds', () => {
    assert.equal(formatter.formatTimestamp(0), '00:00:00,000');
    assert.equal(formatter.formatTimestamp(3661.25), '01:01:01,250');
});

test('returns empty string for missing output', () => {
    assert.equal(formatter.convertToSRT(null), '');
});
