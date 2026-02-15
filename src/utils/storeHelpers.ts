// Strong ingestion key builder (accountNumber|date|signedAmount|normalized desc[|bal:balance])
// Imported here to provide a gradual migration path away from the legacy key used
// for persisted historical transactions. We keep both for a stabilization window.
import { buildTxKey, type TxKeyInput } from '../ingest/buildTxKey';

import type { BudgetMonthKey, TransactionType } from '../types';

type TxLike = TxKeyInput & {
    type?: TransactionType;
};

type AccountLike = {
    transactions?: TxLike[];
    [key: string]: unknown;
};

type MonthlyTotals = {
    income: number;
    expenses: number;
    savings: number;
    net: number;
};

export const getAvailableMonths = (account: AccountLike): BudgetMonthKey[] => {
    if (!account?.transactions?.length) return [];

    const uniqueMonths = new Set<BudgetMonthKey>();

    account.transactions.forEach((tx) => {
        if (tx.date) {
            const monthKey = tx.date.slice(0, 7) as BudgetMonthKey; // 'YYYY-MM'
            uniqueMonths.add(monthKey);
        }
    });

    return Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a)); // Descending
};

export const getMonthlyTotals = (account: AccountLike, month: BudgetMonthKey): MonthlyTotals => {
    const txs = (account.transactions ?? []).filter((tx) => tx.date?.startsWith(month));

    const totals: MonthlyTotals = {
        income: 0,
        expenses: 0,
        savings: 0,
        net: 0,
    };

    txs.forEach((tx) => {
        // Prefer signed `rawAmount` if present. Many UI surfaces store/display `amount` as absolute,
        // so relying on `amount` alone can incorrectly treat expenses as positive.
        const base =
            typeof tx.rawAmount === 'number'
                ? tx.rawAmount
                : typeof tx.amount === 'number'
                  ? tx.amount
                  : parseFloat(String(tx.amount ?? 0)) || 0;

        // Normalize by type so totals have consistent sign semantics:
        // - income: positive
        // - expense: negative
        // - savings: tracked as positive magnitude (and subtracted from net)
        const signedByType =
            tx.type === 'income'
                ? Math.abs(base)
                : tx.type === 'savings'
                  ? Math.abs(base)
                  : -Math.abs(base);

        switch (tx.type) {
            case 'income':
                totals.income += signedByType;
                break;
            case 'savings':
                totals.savings += signedByType;
                break;
            case 'expense':
            default:
                totals.expenses += signedByType;
                break;
        }
    });

    totals.net = totals.income + totals.expenses - totals.savings;

    return totals;
};

// Strong key (single source of truth) -------------------------------------------------
export const getStrongTransactionKey = (tx: TxLike, accountNumber: string) =>
    buildTxKey({ ...tx, accountNumber: tx.accountNumber || accountNumber });

export const getUniqueTransactions = <TExisting extends TxLike, TIncoming extends TxLike>(
    existing: TExisting[],
    incoming: TIncoming[],
    accountNumber: string
): TIncoming[] => {
    const seen = new Set(
        existing.map((tx) => getStrongTransactionKey(tx, accountNumber))
    );
    return incoming.filter((tx) => {
        const key = getStrongTransactionKey(tx, accountNumber);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export const getSavingsKey = (tx: Pick<TxLike, 'date' | 'amount'>) => {
    const amt = normalizeTransactionAmount(tx.amount) || 0;
    return `${tx.date}|${amt.toFixed(2)}`;
};

export const normalizeTransactionAmount = (
    txOrAmount: { amount?: number | string } | number | string | null | undefined,
    direct = false
) => {
    const raw = direct
        ? txOrAmount
        : typeof txOrAmount === 'object' && txOrAmount !== null
          ? txOrAmount.amount
          : txOrAmount;

    const abs = Math.abs(typeof raw === 'number' ? raw : parseFloat(String(raw ?? 0)) || 0);

    return abs;
};

// syncedAccountData shape:
/**
 * {
 *   type: 'csv',
 *   fileName: string,
 *   importedAt: ISOString,
 *   rows: Array<{
 *     id: string,
 *     date: string (YYYY-MM-DD),
 *     description: string,
 *     amount: number,
 *     type: 'income' | 'expense' | 'savings',
 *     category?: string
 *   }>
 * }
 */

// transaction shape:
/**
 * {
 *   id: 'generated-id',        // crypto.randomUUID()
 *   sourceAccountId: 'acct-123',
 *   date: '2025-08-03',
 *   description: 'Walmart Grocery',
 *   amount: 89.12,
 *   type: 'expense',           // or 'income', 'savings'
 *   category: 'groceries'
 * }
 */
