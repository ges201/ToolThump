
function urlEncode(str) {
    return encodeURIComponent(str);
}

function urlDecode(str) {
    try {
        return decodeURIComponent(str);
    } catch (error) {
        console.error('URL Decode Error:', error);
        throw new Error('Invalid input for URL decoding.');
    }
}
