// SHA-256 hashing utility (browser + Node fallback)
// Returns hex string; shortFileHash trims for display.
export async function sha256Hex(text: string): Promise<string> {
    const enc = new TextEncoder().encode(text);
    // Browser Web Crypto
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', enc);
        return [...new Uint8Array(digest)]
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }
    // Node fallback (tests)
    //const { createHash } = await import('crypto');
    //return createHash('sha256').update(enc).digest('hex');
    return 'node-sha256-placeholder'; // TODO(P2) Placeholder for Node environment without crypto import
}

export async function shortFileHash(text: string, length = 16): Promise<string> {
    const full = await sha256Hex(text);
    return full.slice(0, length);
}
