import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createUserScopedZustandStorage } from "../services/userScopedStorage";

export const TX_STRONG_KEY_OVERRIDES_STORE_VERSION = 1 as const;

export type TxStrongKeyOverride = {
  name?: string | null;
  note?: string | null;
  updatedAt: string; // ISO
};

export type TxStrongKeyOverridesState = {
  overridesByKey: Record<string, TxStrongKeyOverride | undefined>;

  upsertOverride: (key: string, patch: { name?: string | null; note?: string | null }) => void;
  removeOverride: (key: string) => void;
  clearAllOverrides: () => void;
};

function normalizeStorageKey(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeDisplayText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeOptionalText(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const s = normalizeDisplayText(value);
  return s ? s : null;
}

function coerceOverride(value: unknown): TxStrongKeyOverride | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<TxStrongKeyOverride>;

  const updatedAt = typeof v.updatedAt === "string" && v.updatedAt.trim() ? v.updatedAt : new Date(0).toISOString();

  const name = normalizeOptionalText(v.name);
  const note = normalizeOptionalText(v.note);

  return {
    updatedAt,
    ...(name !== undefined ? { name } : null),
    ...(note !== undefined ? { note } : null),
  };
}

function coerceOverridesByKey(value: unknown): Record<string, TxStrongKeyOverride | undefined> {
  if (!value || typeof value !== "object") return {};
  const rec = value as Record<string, unknown>;
  const out: Record<string, TxStrongKeyOverride | undefined> = {};

  for (const [rawKey, rawOverride] of Object.entries(rec)) {
    const key = normalizeStorageKey(rawKey);
    if (!key) continue;
    const override = coerceOverride(rawOverride);
    if (!override) continue;
    out[key] = override;
  }

  return out;
}

export const useTxStrongKeyOverridesStore = create<TxStrongKeyOverridesState>()(
  persist(
    (set) => ({
      overridesByKey: {},

      upsertOverride: (key, patch) => {
        const normalizedKey = normalizeStorageKey(key);
        if (!normalizedKey) return;

        const name = normalizeOptionalText(patch.name);
        const note = normalizeOptionalText(patch.note);
        const updatedAt = new Date().toISOString();

        set((state) => {
          const current = state.overridesByKey[normalizedKey];
          const next: TxStrongKeyOverride = {
            updatedAt,
            ...(current?.name !== undefined ? { name: current.name } : null),
            ...(current?.note !== undefined ? { note: current.note } : null),
            ...(name !== undefined ? { name } : null),
            ...(note !== undefined ? { note } : null),
          };

          return {
            overridesByKey: {
              ...state.overridesByKey,
              [normalizedKey]: next,
            },
          };
        });
      },

      removeOverride: (key) => {
        const normalizedKey = normalizeStorageKey(key);
        if (!normalizedKey) return;

        set((state) => {
          if (!state.overridesByKey[normalizedKey]) return {};
          const next = { ...state.overridesByKey };
          delete next[normalizedKey];
          return { overridesByKey: next };
        });
      },

      clearAllOverrides: () => set({ overridesByKey: {} }),
    }),
    {
      name: "budgeteer:txStrongKeyOverrides",
      version: TX_STRONG_KEY_OVERRIDES_STORE_VERSION,
      migrate: (persistedState) => {
        const s = persistedState as Partial<TxStrongKeyOverridesState> | undefined;
        return {
          overridesByKey: coerceOverridesByKey(s?.overridesByKey),
        } satisfies Pick<TxStrongKeyOverridesState, "overridesByKey">;
      },
      storage: createUserScopedZustandStorage(),
      partialize: (s) => ({
        overridesByKey: s.overridesByKey,
      }),
    }
  )
);

// IMPORTANT: keep selectors primitive/function-returning.
export function useTxStrongKeyOverridesByKey(): TxStrongKeyOverridesState["overridesByKey"] {
  return useTxStrongKeyOverridesStore((s) => s.overridesByKey);
}

export function useUpsertTxStrongKeyOverride(): TxStrongKeyOverridesState["upsertOverride"] {
  return useTxStrongKeyOverridesStore((s) => s.upsertOverride);
}

export function useRemoveTxStrongKeyOverride(): TxStrongKeyOverridesState["removeOverride"] {
  return useTxStrongKeyOverridesStore((s) => s.removeOverride);
}

export function useClearAllTxStrongKeyOverrides(): TxStrongKeyOverridesState["clearAllOverrides"] {
  return useTxStrongKeyOverridesStore((s) => s.clearAllOverrides);
}
