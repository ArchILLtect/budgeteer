import type { StateCreator } from "zustand";

import { buildTxKey } from "../../ingest/buildTxKey";
import type { TxKeyInput } from "../../ingest/buildTxKey";
import type { Account, AccountMapping, Transaction } from "../../types";

const getStrongTransactionKey = (tx: TxKeyInput, accountNumber: string) =>
  buildTxKey({ ...tx, accountNumber: tx.accountNumber ?? accountNumber });

export type AccountsSlice = {
  accountMappings: { [accountNumber: string]: AccountMapping };
  accounts: { [accountNumber: string]: Account };

  clearAllAccounts: () => void;
  clearAllAccountMappings: () => void;
  addOrUpdateAccount: (accountNumber: string, data: Partial<Account>) => void;
  addTransactionsToAccount: (accountNumber: string, transactions: Transaction[]) => void;
  patchTransactionByStrongKey: (
    accountNumber: string,
    strongKey: string,
    patch: { name?: string | null; note?: string | null }
  ) => void;
  setAccountMapping: (accountNumber: string, mapping: AccountMapping) => void;
  removeAccount: (accountNumber: string) => void;
};

type AccountsSliceStoreState = AccountsSlice & {
  [key: string]: unknown;
};

type SliceCreator<T> = StateCreator<AccountsSliceStoreState, [], [], T>;

function normalizeOptionalText(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const s = String(value).replace(/\s+/g, " ").trim();
  return s ? s : null;
}

export const createAccountsSlice: SliceCreator<AccountsSlice> = (set) => ({
  accountMappings: {},
  accounts: {},

  clearAllAccounts: () => set(() => ({ accounts: {} })),

  clearAllAccountMappings: () => set(() => ({ accountMappings: {} })),

  addOrUpdateAccount: (accountNumber, data) =>
    set((state) => ({
      accounts: {
        ...state.accounts,
        [accountNumber]: {
          ...(state.accounts[accountNumber] || {}),
          ...data,
        },
      },
    })),

  addTransactionsToAccount: (accountNumber, transactions) =>
    set((state) => {
      const existing: Transaction[] = state.accounts[accountNumber]?.transactions ?? [];
      const seen = new Set(existing.map((t) => getStrongTransactionKey(t, accountNumber)));
      const newTxs: Transaction[] = [];

      for (const tx of transactions) {
        const key = getStrongTransactionKey(tx, accountNumber);
        if (!seen.has(key)) {
          seen.add(key);
          newTxs.push({
            ...tx,
            accountNumber: tx.accountNumber ?? accountNumber,
          });
        }
      }

      const updated = [...existing, ...newTxs].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

      return {
        accounts: {
          ...state.accounts,
          [accountNumber]: {
            ...(state.accounts[accountNumber] || {}),
            transactions: updated,
          },
        },
      };
    }),

  patchTransactionByStrongKey: (accountNumber, strongKey, patch) =>
    set((state) => {
      const acct = state.accounts[accountNumber];
      const existing: Transaction[] = acct?.transactions ?? [];
      if (!existing.length) return {};

      const key = String(strongKey ?? "").trim();
      if (!key) return {};

      const name = normalizeOptionalText(patch?.name);
      const note = normalizeOptionalText(patch?.note);

      let changed = false;
      const updated = existing.map((tx) => {
        const txKey = typeof (tx as { key?: unknown }).key === "string" && (tx as { key?: string }).key
          ? (tx as { key: string }).key
          : getStrongTransactionKey(tx, accountNumber);

        if (txKey !== key) return tx;

        const next: Transaction = { ...tx };
        if (name !== undefined) next.name = name;
        if (note !== undefined) next.note = note;
        changed = true;
        return next;
      });

      if (!changed) return {};
      return {
        accounts: {
          ...state.accounts,
          [accountNumber]: { ...acct, transactions: updated },
        },
      };
    }),

  setAccountMapping: (accountNumber, mapping) =>
    set((state) => ({
      accountMappings: {
        ...state.accountMappings,
        [accountNumber]: mapping,
      },
    })),

  removeAccount: (accountNumber) =>
    set((state) => {
      const updated = { ...state.accounts };
      delete updated[accountNumber];
      return { accounts: updated };
    }),
});
