function hexEncode(str) {
    try {
        let hex = '';
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            const hexValue = charCode.toString(16);
            hex += hexValue.padStart(2, '0');
        }
        return hex;
    } catch (error) {
        console.error('Hex Encode Error:', error);
        throw new Error('Invalid input for Hex encoding.');
    }
}

function hexDecode(hexStr) {
    try {
        const cleanHexStr = hexStr.replace(/\s+/g, '');
        if (cleanHexStr.length % 2 !== 0) {
            throw new Error('Invalid hex string: Must have an even number of characters.');
        }
        let str = '';
        for (let i = 0; i < cleanHexStr.length; i += 2) {
            const hexPair = cleanHexStr.substr(i, 2);
            const charCode = parseInt(hexPair, 16);
            if (isNaN(charCode)) {
                 throw new Error(`Invalid hex pair found: '${hexPair}'`);
            }
            str += String.fromCharCode(charCode);
        }
        return str;
    } catch (error) {
        console.error('Hex Decode Error:', error);
        if (error.message.startsWith('Invalid hex string')) {
            throw error;
        }
        throw new Error('Invalid input for Hex decoding.');
    }
}
