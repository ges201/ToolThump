export class SRTFormatter {
    convertToSRT(output) {
        if (!output || !output.chunks) return '';
        return output.chunks.map((chunk, index) => {
            const start = this.formatTimestamp(chunk.timestamp[0]);
            const end = this.formatTimestamp(chunk.timestamp[1]);
            return `${index + 1}\n${start} --> ${end}\n${chunk.text.trim()}\n`;
        }).join('\n');
    }

    formatTimestamp(seconds) {
        const s = seconds || 0;
        const date = new Date(s * 1000);
        const hh = String(Math.floor(s / 3600)).padStart(2, '0');
        const mm = String(date.getUTCMinutes()).padStart(2, '0');
        const ss = String(date.getUTCSeconds()).padStart(2, '0');
        const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
        return `${hh}:${mm}:${ss},${ms}`;
    }
}
