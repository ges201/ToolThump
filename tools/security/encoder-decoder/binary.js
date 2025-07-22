
function binaryEncode(text) {
    return text.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join(' ');
}

function binaryDecode(binary) {
    // Remove any non-binary characters (like spaces) and ensure the string length is a multiple of 8
    const cleanBinary = binary.replace(/[^01]/g, '');
    if (cleanBinary.length % 8 !== 0) {
        throw new Error("Invalid binary string length. Must be a multiple of 8.");
    }

    let text = '';
    for (let i = 0; i < cleanBinary.length; i += 8) {
        const byte = cleanBinary.substr(i, 8);
        text += String.fromCharCode(parseInt(byte, 2));
    }
    return text;
}
