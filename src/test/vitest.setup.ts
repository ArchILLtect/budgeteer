import { webcrypto } from "node:crypto";

// Vitest runs in Node, and depending on the Node version / runner settings,
// `globalThis.crypto.subtle` may not be present. Our app code prefers WebCrypto.
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  try {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      configurable: true,
      writable: true,
    });
  } catch {
    // Last resort: attempt assignment.
    // @ts-expect-error - Node's WebCrypto matches the browser WebCrypto shape.
    globalThis.crypto = webcrypto;
  }
}
