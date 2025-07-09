
function base64Encode(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
        console.error('Base64 Encode Error:', error);
        throw new Error('Invalid input for Base64 encoding.');
    }
}

function base64Decode(str) {
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (error) {
        console.error('Base64 Decode Error:', error);
        throw new Error('Invalid input for Base64 decoding.');
    }
}
