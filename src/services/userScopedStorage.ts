import type { PersistStorage, StorageValue } from "zustand/middleware";

export const AUTH_SCOPE_STORAGE_KEY = "budgeteer:authScope" as const;
export const STORAGE_REPAIR_NOTICE_KEY = "budgeteer:storageRepairNotice" as const;

function setStorageRepairNotice(): void {
  try {
    // Value is informational only; presence indicates we repaired storage.
    localStorage.setItem(STORAGE_REPAIR_NOTICE_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function coerceZustandStorageValue(parsed: unknown): StorageValue<unknown> | null {
  if (!parsed || typeof parsed !== "object") return null;
  const maybe = parsed as { state?: unknown; version?: unknown };
  if (!maybe.state || typeof maybe.state !== "object") return null;
  if (maybe.version !== undefined && typeof maybe.version !== "number") return null;
  return parsed as StorageValue<unknown>;
}

export function parseZustandStorageValue(raw: string): StorageValue<unknown> | null {
  return coerceZustandStorageValue(safeJsonParse(raw));
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
  return `budgeteer:u:${scope}:${baseKey}`;
}

export function userScopedGetItem(baseKey: string): string | null {
  try {
    return localStorage.getItem(makeUserScopedKey(baseKey));
  } catch {
    return null;
  }
}

export function userScopedGetItemWithScope(baseKey: string, scopeOverride: string | null): string | null {
  try {
    return localStorage.getItem(makeUserScopedKey(baseKey, scopeOverride));
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

export function userScopedSetItemWithScope(
  baseKey: string,
  value: string,
  scopeOverride: string | null,
): void {
  try {
    localStorage.setItem(makeUserScopedKey(baseKey, scopeOverride), value);
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
  const fullPrefix = `budgeteer:u:${scope}:${basePrefix}`;

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

/**
 * Create a Zustand storage adapter that scopes all keys to the current user's storage scope.
 * This allows us to use Zustand for user-specific persisted state without risking cross-user data leakage.
 * The storage adapter will automatically prefix all keys with the user's scope, and will read/write using that prefix.
 * If the user's storage scope changes (e.g. they log out and a new user logs in), the adapter will start using the new scope for all operations.
 * Note that this adapter does not automatically clear old data when the scope changes, so you may want to call `clearUserScopedKeysByPrefix` when changing users to avoid orphaned data.
 * Example usage:
 * const useStore = create(
 *   persist(rootReducer, {
 *    name: 'myStore',
 *    storage: createUserScopedZustandStorage(),
 *    partialize: (state) => ({ ... }),
 *   }
 * )
 */
export function createUserScopedZustandStorage(): PersistStorage<unknown, unknown> {
  return {
    getItem: (name: string) => {
      const baseKey = `zustand:${name}`;
      const raw = userScopedGetItem(baseKey);
      if (raw == null) return null;

      const parsed = safeJsonParse(raw);
      const coerced = coerceZustandStorageValue(parsed);
      if (!coerced) {
        // Corrupted or unexpected persisted shape: clear it so it can't repeatedly fail on startup.
        userScopedRemoveItem(baseKey);
        setStorageRepairNotice();
        return null;
      }

      return coerced;
    },
    setItem: (name: string, value: StorageValue<unknown>) => {
      userScopedSetItem(`zustand:${name}`, JSON.stringify(value));
    },
    removeItem: (name: string) => {
      userScopedRemoveItem(`zustand:${name}`);
    },
  };
}
