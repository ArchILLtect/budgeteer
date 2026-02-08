import type { PersistStorage, StorageValue } from "zustand/middleware";

export const AUTH_SCOPE_STORAGE_KEY = "taskmaster:authScope" as const;

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readPersistedAuthScopeKey(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_SCOPE_STORAGE_KEY);
    if (!raw) return null;
    const v = raw.trim();
    return v ? v : null;
  } catch {
    return null;
  }
}

export function getUserStorageScopeKey(): string | null {
  return readPersistedAuthScopeKey();
}

export function setUserStorageScopeKey(scope: string | null): void {
  try {
    if (!scope) {
      localStorage.removeItem(AUTH_SCOPE_STORAGE_KEY);
      return;
    }

    const trimmed = scope.trim();
    if (!trimmed) {
      localStorage.removeItem(AUTH_SCOPE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(AUTH_SCOPE_STORAGE_KEY, trimmed);
  } catch {
    // ignore
  }
}

export function makeUserScopedKey(baseKey: string, scopeOverride?: string | null): string {
  const scope = scopeOverride ?? getUserStorageScopeKey() ?? "anonymous";
  // Keep a consistent prefix so we can clear a whole category later (e.g. tips).
  return `taskmaster:u:${scope}:${baseKey}`;
}

export function userScopedGetItem(baseKey: string): string | null {
  try {
    return localStorage.getItem(makeUserScopedKey(baseKey));
  } catch {
    return null;
  }
}

export function userScopedSetItem(baseKey: string, value: string): void {
  try {
    localStorage.setItem(makeUserScopedKey(baseKey), value);
  } catch {
    // ignore
  }
}

export function userScopedRemoveItem(baseKey: string): void {
  try {
    localStorage.removeItem(makeUserScopedKey(baseKey));
  } catch {
    // ignore
  }
}

export function clearUserScopedKeysByPrefix(basePrefix: string): void {
  const scope = getUserStorageScopeKey() ?? "anonymous";
  const fullPrefix = `taskmaster:u:${scope}:${basePrefix}`;

  try {
    // Iterate backwards to avoid index shifting issues.
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(fullPrefix)) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}

export function createUserScopedZustandStorage(): PersistStorage<unknown, unknown> {
  return {
    getItem: (name: string) => {
      const raw = userScopedGetItem(`zustand:${name}`);
      if (raw == null) return null;
      return safeJsonParse(raw) as StorageValue<unknown>;
    },
    setItem: (name: string, value: StorageValue<unknown>) => {
      userScopedSetItem(`zustand:${name}`, JSON.stringify(value));
    },
    removeItem: (name: string) => {
      userScopedRemoveItem(`zustand:${name}`);
    },
  };
}
