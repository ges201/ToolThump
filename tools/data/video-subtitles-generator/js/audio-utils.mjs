// Web Audio down-mixes stereo to mono as 0.5 * (L + R); doing it in place
// avoids a second full-length buffer and a whole OfflineAudioContext render.
export function downmixToMono(left, right) {
    for (let i = 0; i < left.length; i++) left[i] = 0.5 * (left[i] + right[i]);
    return left;
}
