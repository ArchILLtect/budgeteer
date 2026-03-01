import type { CloudPullSnapshot } from "./cloudSyncApi";

export type BudgetHydrationTarget = {
  clearAllAccounts: () => void;
  addOrUpdateAccount: (accountNumber: string, data: { label?: string | null; institution?: string | null; transactions?: unknown[] }) => void;
  addTransactionsToAccount: (accountNumber: string, transactions: unknown[]) => void;
};

function normalizeOptionalText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s ? s : null;
}

export function hydrateAccountsAndTransactions(target: BudgetHydrationTarget, snapshot: CloudPullSnapshot): void {
  // Simple, safe MVP semantics:
  // - Clear local accounts first.
  // - Recreate accounts.
  // - Add transactions, relying on existing strong-key dedupe in the store.
  target.clearAllAccounts();

  const accounts = Array.isArray(snapshot.accounts) ? snapshot.accounts : [];
  for (const acct of accounts) {
    const accountNumber = String(acct?.accountNumber ?? "").trim();
    if (!accountNumber) continue;

    target.addOrUpdateAccount(accountNumber, {
      label: normalizeOptionalText(acct?.label),
      institution: normalizeOptionalText(acct?.institution),
      transactions: [],
    });
  }

  const txs = Array.isArray(snapshot.transactions) ? snapshot.transactions : [];
  const byAccount = new Map<string, unknown[]>();

  for (const tx of txs) {
    const accountNumber = String((tx as { accountNumber?: unknown })?.accountNumber ?? "").trim();
    if (!accountNumber) continue;

    const list = byAccount.get(accountNumber) ?? [];
    list.push(tx);
    byAccount.set(accountNumber, list);
  }

  for (const [accountNumber, list] of byAccount.entries()) {
    target.addTransactionsToAccount(accountNumber, list);
  }
}
