/**
 * Provides a cryptographically secure random number between 0 (inclusive) and 1 (exclusive),
 * similar to Math.random() but using the Web Crypto API.
 */
export function getSecureRandom(): number {
    const array = new Uint32Array(1);

    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(array);
        return array[0] / (0xffffffff + 1);
    }

    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
        globalThis.crypto.getRandomValues(array);
        return array[0] / (0xffffffff + 1);
    }

    // Fallback to Math.random only if Crypto API is completely unavailable
    return Math.random();
}
