export const DEVICE_ID_STORAGE_KEY = "budgeteer:deviceId" as const;

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function makeDeviceId(): string {
  // Prefer cryptographically-strong IDs when available.
  const cryptoObj = typeof crypto !== "undefined" ? crypto : null;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }

  // Fallback: timestamp + random.
  const rand = Math.random().toString(16).slice(2);
  return `dev-${Date.now().toString(16)}-${rand}`;
}

export function getDeviceId(): string | null {
  const raw = safeGetItem(DEVICE_ID_STORAGE_KEY);
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

export function getOrCreateDeviceId(): string | null {
  const existing = getDeviceId();
  if (existing) return existing;

  const id = makeDeviceId();
  safeSetItem(DEVICE_ID_STORAGE_KEY, id);
  return id;
}
