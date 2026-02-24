import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createUserScopedZustandStorage } from "../services/userScopedStorage";
import type { AccountMapping } from "../types";

export const ACCOUNT_MAPPINGS_STORE_VERSION = 1 as const;

export type AccountMappingsState = {
  accountMappings: Record<string, AccountMapping>;

  setAccountMapping: (accountNumber: string, mapping: AccountMapping) => void;
  removeAccountMapping: (accountNumber: string) => void;
  clearAllAccountMappings: () => void;
};

function normalizeStorageKey(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeDisplayText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function coerceAccountMapping(value: unknown): AccountMapping | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<AccountMapping>;

  const label = normalizeDisplayText(v.label);
  const institution = normalizeDisplayText(v.institution);
  if (!label || !institution) return null;

  return { label, institution };
}

function coerceAccountMappings(value: unknown): Record<string, AccountMapping> {
  if (!value || typeof value !== "object") return {};
  const rec = value as Record<string, unknown>;
  const out: Record<string, AccountMapping> = {};

  for (const [rawKey, rawValue] of Object.entries(rec)) {
    const key = normalizeStorageKey(rawKey);
    if (!key) continue;
    const mapping = coerceAccountMapping(rawValue);
    if (!mapping) continue;
    out[key] = mapping;
  }

  return out;
}

export const useAccountMappingsStore = create<AccountMappingsState>()(
  persist(
    (set) => ({
      accountMappings: {},

      setAccountMapping: (accountNumber, mapping) => {
        const key = normalizeStorageKey(accountNumber);
        if (!key) return;

        const next = coerceAccountMapping(mapping);
        if (!next) return;

        set((state) => ({
          accountMappings: {
            ...state.accountMappings,
            [key]: next,
          },
        }));
      },

      removeAccountMapping: (accountNumber) => {
        const key = normalizeStorageKey(accountNumber);
        if (!key) return;

        set((state) => {
          if (!state.accountMappings[key]) return {};
          const next = { ...state.accountMappings };
          delete next[key];
          return { accountMappings: next };
        });
      },

      clearAllAccountMappings: () => set({ accountMappings: {} }),
    }),
    {
      name: "budgeteer:accountMappings",
      version: ACCOUNT_MAPPINGS_STORE_VERSION,
      migrate: (persistedState) => {
        const s = persistedState as Partial<AccountMappingsState> | undefined;
        return {
          accountMappings: coerceAccountMappings(s?.accountMappings),
        } satisfies Pick<AccountMappingsState, "accountMappings">;
      },
      storage: createUserScopedZustandStorage(),
      partialize: (s) => ({
        accountMappings: s.accountMappings,
      }),
    }
  )
);

// IMPORTANT: keep selectors primitive/function-returning.
export function useAccountMappings(): AccountMappingsState["accountMappings"] {
  return useAccountMappingsStore((s) => s.accountMappings);
}

export function useSetAccountMapping(): AccountMappingsState["setAccountMapping"] {
  return useAccountMappingsStore((s) => s.setAccountMapping);
}

export function useClearAllAccountMappings(): AccountMappingsState["clearAllAccountMappings"] {
  return useAccountMappingsStore((s) => s.clearAllAccountMappings);
}
