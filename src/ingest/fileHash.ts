// SHA-256 hashing utility (browser + Node fallback)
// Returns hex string; shortFileHash trims for display.
export async function sha256Hex(text: string): Promise<string> {
    const enc = new TextEncoder().encode(text);
    const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    if (!cryptoObj?.subtle) {
        throw new Error("sha256Hex requires WebCrypto (crypto.subtle) support.");
    }
    const digest = await cryptoObj.subtle.digest('SHA-256', enc);
    return [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function shortFileHash(text: string, length = 16): Promise<string> {
    const full = await sha256Hex(text);
    return full.slice(0, length);
}
