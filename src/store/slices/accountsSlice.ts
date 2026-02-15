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
  setAccountMapping: (accountNumber: string, mapping: AccountMapping) => void;
  removeAccount: (accountNumber: string) => void;
};

type SliceCreator<T> = StateCreator<any, [], [], T>;

export const createAccountsSlice: SliceCreator<AccountsSlice> = (set) => ({
  accountMappings: {},
  accounts: {},

  clearAllAccounts: () => set(() => ({ accounts: {} })),

  clearAllAccountMappings: () => set(() => ({ accountMappings: {} })),

  addOrUpdateAccount: (accountNumber, data) =>
    set((state: AccountsSlice) => ({
      accounts: {
        ...state.accounts,
        [accountNumber]: {
          ...(state.accounts[accountNumber] || {}),
          ...data,
        },
      },
    })),

  addTransactionsToAccount: (accountNumber, transactions) =>
    set((state: AccountsSlice) => {
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

  setAccountMapping: (accountNumber, mapping) =>
    set((state: AccountsSlice) => ({
      accountMappings: {
        ...state.accountMappings,
        [accountNumber]: mapping,
      },
    })),

  removeAccount: (accountNumber) =>
    set((state: AccountsSlice) => {
      const updated = { ...state.accounts };
      delete updated[accountNumber];
      return { accounts: updated };
    }),
});
