import test from 'node:test';
import assert from 'node:assert/strict';
import { SRTFormatter, fmtTime } from './srt-formatter.mjs';

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

test('splits when the combined text exceeds 64 characters', () => {
    const long = ' word'.repeat(12); // 60 chars
    const tail = ' tail'; // combined 65 > 64
    const chunks = [
        { timestamp: [0.0, 0.1], text: long },
        { timestamp: [0.1, 0.2], text: tail }
    ];
    const out = formatter.convertToSRT({ chunks });
    assert.equal((out.match(/-->/g) || []).length, 2);
});

test('caps cues at the configured max words', () => {
    const chunks = [' one', ' two', ' three', ' four', ' five', ' six'].map((text, i) => ({
        timestamp: [i * 0.5, (i + 1) * 0.5],
        text
    }));
    const { cues } = formatter.format({ chunks }, { maxWords: 2 });
    assert.deepEqual(cues.map((c) => c.text), ['one two', 'three four', 'five six']);
});

test('maxWords 1 shows one word per cue', () => {
    const chunks = [' one', ' two', ' three'].map((text, i) => ({
        timestamp: [i * 0.5, (i + 1) * 0.5],
        text
    }));
    const { cues } = formatter.format({ chunks }, { maxWords: 1 });
    assert.deepEqual(cues.map((c) => c.text), ['one', 'two', 'three']);
});

test('sentence end still splits under a high maxWords', () => {
    const out = formatter.convertToSRT({
        chunks: [
            { timestamp: [0.0, 0.5], text: ' Hi.' },
            { timestamp: [0.5, 1.0], text: ' next' }
        ]
    }, { maxWords: 10 });
    assert.equal((out.match(/-->/g) || []).length, 2);
});

test('splits recovered multi-word chunks into capped, word-timed cues', () => {
    const text = ' ' + Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ');
    const { cues } = formatter.format({ chunks: [{ timestamp: [0.0, 20.0], text }] });
    assert.ok(cues.length > 1, 'expected the long recovered segment to split');
    for (const cue of cues) {
        assert.ok(cue.text.length <= 64, `cue too long: "${cue.text}"`);
        assert.ok(cue.words.every((w) => typeof w.start === 'number' && typeof w.end === 'number'));
    }
    // Even timings: word i spans [i, i+1) over the 20s segment.
    assert.deepEqual(cues[0].words[0], { word: 'word0', start: 0.0, end: 1.0 });
});

test('splits when the punctuation is closed by a quote', () => {
    for (const q of ['"', "'", '”', ')']) {
        const out = formatter.convertToSRT({
            chunks: [
                { timestamp: [0.0, 0.5], text: ` Hi!${q}` },
                { timestamp: [0.5, 1.0], text: ' next' }
            ]
        });
        assert.equal((out.match(/-->/g) || []).length, 2, `expected a split after "${q}"`);
    }
});

test('splits on ellipsis and CJK full stop', () => {
    for (const end of ['…', '。', '？']) {
        const out = formatter.convertToSRT({
            chunks: [
                { timestamp: [0.0, 0.5], text: ` Hello${end}` },
                { timestamp: [0.5, 1.0], text: ' next' }
            ]
        });
        assert.equal((out.match(/-->/g) || []).length, 2, `expected a split after "${end}"`);
    }
});

test('does not split after abbreviations or initials', () => {
    const out = formatter.convertToSRT({
        chunks: [
            { timestamp: [0.0, 0.5], text: ' Mr.' },
            { timestamp: [0.5, 1.0], text: ' Smith' }
        ]
    });
    assert.equal(out, '1\n00:00:00,000 --> 00:00:01,000\nMr. Smith\n');
});

test('breaks at a clause mark once the line is already long', () => {
    const chunks = [];
    let t = 0;
    for (let i = 0; i < 6; i++) {
        chunks.push({ timestamp: [t, t + 0.1], text: ' word' });
        t += 0.1;
    }
    chunks.push({ timestamp: [t, t + 0.1], text: ' word,' }); // line now 42 chars, past CLAUSE_AT
    t += 0.1;
    chunks.push({ timestamp: [t, t + 0.1], text: ' next' }); // 47 combined, under the 64 cap
    const out = formatter.convertToSRT({ chunks });
    assert.equal((out.match(/-->/g) || []).length, 2);
    assert.match(out, /word,\n\n2\n/);
});

test('keeps short clauses in the same cue', () => {
    const out = formatter.convertToSRT({
        chunks: [
            { timestamp: [0.0, 0.5], text: ' hi,' },
            { timestamp: [0.5, 1.0], text: ' there' }
        ]
    });
    assert.equal((out.match(/-->/g) || []).length, 1);
});

test('formats timestamps with hours, minutes, seconds and milliseconds', () => {
    assert.equal(formatter.formatTimestamp(0), '00:00:00,000');
    assert.equal(formatter.formatTimestamp(3661.25), '01:01:01,250');
});

test('fmtTime formats seconds as M:SS or H:MM:SS', () => {
    assert.equal(fmtTime(0), '0:00');
    assert.equal(fmtTime(59.9), '0:59');
    assert.equal(fmtTime(61), '1:01');
    assert.equal(fmtTime(3661), '1:01:01');
});

test('returns empty string for missing output', () => {
    assert.equal(formatter.convertToSRT(null), '');
});

test('cues keep per-word timestamps for playback highlighting', () => {
    const { srt, cues } = formatter.format({
        chunks: [
            { timestamp: [0.0, 0.4], text: ' Hello' },
            { timestamp: [0.4, 0.9], text: ' world' }
        ]
    });
    assert.equal(srt, '1\n00:00:00,000 --> 00:00:00,900\nHello world\n');
    assert.deepEqual(cues, [{
        start: 0.0,
        end: 0.9,
        text: 'Hello world',
        words: [
            { word: 'Hello', start: 0.0, end: 0.4 },
            { word: 'world', start: 0.4, end: 0.9 }
        ]
    }]);
});

test('parseSRT rebuilds cues with words spread evenly across each cue', () => {
    const cues = formatter.parseSRT(
        '1\n00:00:00,000 --> 00:00:02,000\nHello world\n\n' +
        '2\n00:00:02,000 --> 00:00:04,000\nA longer cue text\n'
    );
    assert.equal(cues.length, 2);
    assert.deepEqual(cues[0], {
        start: 0.0,
        end: 2.0,
        text: 'Hello world',
        words: [
            { word: 'Hello', start: 0.0, end: 1.0 },
            { word: 'world', start: 1.0, end: 2.0 }
        ]
    });
    assert.equal(cues[1].words.length, 4);
    assert.equal(cues[1].words[0].start, 2.0);
    assert.equal(cues[1].words[3].end, 4.0);
});

test('parseSRT joins multi-line cue text', () => {
    const cues = formatter.parseSRT('1\n00:00:00,000 --> 00:00:01,000\nLine one\nline two\n');
    assert.deepEqual(cues[0].words.map((w) => w.word), ['Line', 'one', 'line', 'two']);
});

test('parseSRT tolerates dots as millisecond separators', () => {
    const cues = formatter.parseSRT('1\n00:00:00.000 --> 00:00:01.500\nHi there\n');
    assert.equal(cues[0].end, 1.5);
});

test('parseSRT returns null when any block lacks timestamps', () => {
    assert.equal(formatter.parseSRT('00:00:00,000 --> 00:00:01,000\nHello\n\nplain untimed text'), null);
    assert.equal(formatter.parseSRT(''), null);
});

const generatedCues = [
    {
        start: 0.0, end: 1.0, text: 'Hello world',
        words: [
            { word: 'Hello', start: 0.0, end: 0.5 },
            { word: 'world', start: 0.5, end: 1.0 }
        ]
    },
    {
        start: 1.0, end: 2.0, text: 'Second line',
        words: [
            { word: 'Second', start: 1.0, end: 1.2 },
            { word: 'line', start: 1.2, end: 2.0 }
        ]
    }
];

test('parseSRT keeps exact timings for unedited cues and slots edited words into their original gaps', () => {
    const cues = formatter.parseSRT(
        '1\n00:00:00,000 --> 00:00:01,000\nHello brave world\n\n' +
        '2\n00:00:01,000 --> 00:00:02,000\nSecond line\n',
        generatedCues
    );

    // Untouched cue keeps its original words wholesale.
    assert.deepEqual(cues[1].words, generatedCues[1].words);

    // Inserted word borrows an equal slice from both neighbours.
    assert.deepEqual(cues[0].words, [
        { word: 'Hello', start: 0.0, end: 0.475 },
        { word: 'brave', start: 0.475, end: 0.525 },
        { word: 'world', start: 0.525, end: 1.0 }
    ]);
});

test('parseSRT gives a replaced word the exact slot of the word it replaces', () => {
    const cues = formatter.parseSRT('1\n00:00:00,000 --> 00:00:01,000\nGoodbye world\n', generatedCues);
    assert.deepEqual(cues[0].words, [
        { word: 'Goodbye', start: 0.0, end: 0.5 },
        { word: 'world', start: 0.5, end: 1.0 }
    ]);
});

test('parseSRT keeps neighbours exact when inserting into a real gap', () => {
    const orig = [{
        start: 0.0, end: 1.0, text: 'Hello world',
        words: [
            { word: 'Hello', start: 0.0, end: 0.5 },
            { word: 'world', start: 0.75, end: 1.0 }
        ]
    }];
    const cues = formatter.parseSRT('1\n00:00:00,000 --> 00:00:01,000\nHello kind world\n', orig);
    assert.deepEqual(cues[0].words, [
        { word: 'Hello', start: 0.0, end: 0.5 },
        { word: 'kind', start: 0.5, end: 0.75 },
        { word: 'world', start: 0.75, end: 1.0 }
    ]);
});

test('parseSRT spreads words evenly only inside a cue whose timestamps were edited', () => {
    const cues = formatter.parseSRT(
        '1\n00:00:00,000 --> 00:00:01,000\nHello world\n\n' +
        '2\n00:00:01,500 --> 00:00:02,500\nSecond line\n',
        generatedCues
    );
    assert.deepEqual(cues[0].words, generatedCues[0].words);
    assert.deepEqual(cues[1].words, [
        { word: 'Second', start: 1.5, end: 2.0 },
        { word: 'line', start: 2.0, end: 2.5 }
    ]);
});
