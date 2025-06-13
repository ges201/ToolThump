/**
 * Hashes a message using SHA-1.
 * @param {string} message The message to hash.
 * @returns {Promise<string>} The SHA-1 hash as a hex string.
 */
async function digestMessage(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.toUpperCase();
}

/**
 * Queries the Pwned Passwords API with a hash prefix.
 * @param {string} hashPrefix The first 5 characters of a SHA-1 hash.
 * @returns {Promise<string>} The API response text.
 */
async function queryPwnedPasswordsApi(hashPrefix) {
    const url = `https://api.pwnedpasswords.com/range/${hashPrefix}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'text/plain'
        }
    });
    if (!response.ok) {
        throw new Error(`HIBP API error: ${response.statusText}`);
    }
    return response.text();
}

/**
 * Checks if a password has been pwned according to the HIBP database.
 * @param {string} password The password to check.
 * @returns {Promise<{pwned: boolean, count: number}>} An object indicating if the password was pwned and by how much.
 */
export async function checkPasswordPwned(password) {
    try {
        const hash = await digestMessage(password);
        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5);

        const apiResponse = await queryPwnedPasswordsApi(prefix);
        const hashes = apiResponse.split('\r\n');

        for (const line of hashes) {
            const [hashSuffix, countStr] = line.split(':');
            if (hashSuffix === suffix) {
                return { pwned: true, count: parseInt(countStr, 10) };
            }
        }

        return { pwned: false, count: 0 };

    } catch (error) {
        console.error("HIBP Check Error:", error);
        throw error; // Re-throw to be caught by the caller
    }
}