import { makeUserScopedKey, userScopedGetItem, userScopedRemoveItem, userScopedSetItem } from "./userScopedStorage";

export type SyncLockRecord = {
  token: string;
  ownerDeviceId: string;
  acquiredAtMs: number;
  expiresAtMs: number;
};

const SYNC_LOCK_BASE_KEY = "syncLock" as const;

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function makeToken(): string {
  const cryptoObj = typeof crypto !== "undefined" ? crypto : null;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  return `tok-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function coerceRecord(parsed: unknown): SyncLockRecord | null {
  if (!parsed || typeof parsed !== "object") return null;
  const v = parsed as Partial<SyncLockRecord>;
  if (typeof v.token !== "string" || !v.token) return null;
  if (typeof v.ownerDeviceId !== "string" || !v.ownerDeviceId) return null;
  if (typeof v.acquiredAtMs !== "number" || !Number.isFinite(v.acquiredAtMs)) return null;
  if (typeof v.expiresAtMs !== "number" || !Number.isFinite(v.expiresAtMs)) return null;
  return {
    token: v.token,
    ownerDeviceId: v.ownerDeviceId,
    acquiredAtMs: v.acquiredAtMs,
    expiresAtMs: v.expiresAtMs,
  };
}

function isExpired(lock: SyncLockRecord, nowMs: number): boolean {
  return nowMs >= lock.expiresAtMs;
}

function readRaw(): string | null {
  return userScopedGetItem(SYNC_LOCK_BASE_KEY);
}

function writeRaw(raw: string): void {
  userScopedSetItem(SYNC_LOCK_BASE_KEY, raw);
}

function clearRaw(): void {
  userScopedRemoveItem(SYNC_LOCK_BASE_KEY);
}

const listeners = new Set<() => void>();

function notify(): void {
  for (const l of Array.from(listeners)) {
    try {
      l();
    } catch {
      // ignore
    }
  }
}

function currentScopedKey(): string {
  return makeUserScopedKey(SYNC_LOCK_BASE_KEY);
}

export const syncLockService = {
  subscribe(onStoreChange: () => void): () => void {
    listeners.add(onStoreChange);

    const keyAtSubscribe = currentScopedKey();
    const onStorage = (e: StorageEvent) => {
      // Only fire when the lock key for the *current scope* changes.
      if (e.key && e.key === keyAtSubscribe) {
        onStoreChange();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(onStoreChange);
      window.removeEventListener("storage", onStorage);
    };
  },

  getSnapshotRaw(): string {
    return readRaw() ?? "";
  },

  getLock(nowMs: number = Date.now()): SyncLockRecord | null {
    const raw = readRaw();
    if (!raw) return null;

    const parsed = safeJsonParse(raw);
    const coerced = coerceRecord(parsed);
    if (!coerced) {
      // Corrupted/unexpected shape: clear so it can't keep breaking behavior.
      clearRaw();
      notify();
      return null;
    }

    if (isExpired(coerced, nowMs)) {
      clearRaw();
      notify();
      return null;
    }

    return coerced;
  },

  tryAcquire(opts: { ownerDeviceId: string; ttlMs: number; nowMs?: number }):
    | { ok: true; lock: SyncLockRecord }
    | { ok: false; heldBy: SyncLockRecord } {
    const nowMs = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();
    const ttlMs = Math.max(5_000, Math.floor(opts.ttlMs));

    const existing = this.getLock(nowMs);
    if (existing && existing.ownerDeviceId !== opts.ownerDeviceId) {
      return { ok: false, heldBy: existing };
    }

    const next: SyncLockRecord = {
      token: existing?.token ?? makeToken(),
      ownerDeviceId: opts.ownerDeviceId,
      acquiredAtMs: existing?.acquiredAtMs ?? nowMs,
      expiresAtMs: nowMs + ttlMs,
    };

    writeRaw(JSON.stringify(next));
    notify();
    return { ok: true, lock: next };
  },

  release(opts: { token: string; ownerDeviceId: string }): boolean {
    const existing = this.getLock();
    if (!existing) return false;

    if (existing.token !== opts.token) return false;
    if (existing.ownerDeviceId !== opts.ownerDeviceId) return false;

    clearRaw();
    notify();
    return true;
  },

  // Convenience for UI gating.
  isHeldByOther(opts: { ownerDeviceId: string; nowMs?: number }): boolean {
    const lock = this.getLock(typeof opts.nowMs === "number" ? opts.nowMs : Date.now());
    return Boolean(lock && lock.ownerDeviceId !== opts.ownerDeviceId);
  },
};
