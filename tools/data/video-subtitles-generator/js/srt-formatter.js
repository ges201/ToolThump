export class SRTFormatter {
    convertToSRT(output) {
        if (!output || !output.chunks) return '';

        const lines = [];
        let currentLine = { text: '', start: null, end: null };

        // Subtitle grouping rules (Tweak these if you want shorter/longer captions)
        const MAX_CHARS = 80;        // Max characters per subtitle block
        const MAX_DURATION = 4.0;    // Max seconds a subtitle stays on screen
        const MAX_PAUSE = 1.0;       // Start a new subtitle if there's a > 1 second pause

        for (const chunk of output.chunks) {
            const chunkStart = chunk.timestamp[0];
            // Sometimes the very last word lacks an end timestamp, fallback to +0.5s
            const chunkEnd = chunk.timestamp[1] !== null ? chunk.timestamp[1] : chunkStart + 0.5;
            const chunkText = chunk.text;

            // Initialize the first word of a new line
            if (currentLine.start === null) {
                currentLine.start = chunkStart;
                currentLine.end = chunkEnd;
                currentLine.text = chunkText;
                continue;
            }

            const duration = chunkEnd - currentLine.start;
            const pause = chunkStart - currentLine.end;
            const futureLength = currentLine.text.length + chunkText.length;
            
            // Look for end-of-sentence punctuation to naturally break the subtitle
            const endsWithPunctuation = /[.!?]$/.test(currentLine.text.trim());

            // Check if we should split and start a new subtitle block
            if (
                duration > MAX_DURATION || 
                futureLength > MAX_CHARS || 
                pause > MAX_PAUSE || 
                endsWithPunctuation
            ) {
                // Save current line
                lines.push({ ...currentLine });
                
                // Start a new line
                currentLine = {
                    start: chunkStart,
                    end: chunkEnd,
                    text: chunkText.trimStart() // Remove leading space on new line
                };
            } else {
                // Append word to current line
                currentLine.text += chunkText;
                currentLine.end = chunkEnd;
            }
        }

        // Push the final remaining line
        if (currentLine.start !== null) {
            lines.push(currentLine);
        }

        // Format into standard SRT string
        return lines.map((line, index) => {
            const start = this.formatTimestamp(line.start);
            const end = this.formatTimestamp(line.end);
            return `${index + 1}\n${start} --> ${end}\n${line.text.trim()}\n`;
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