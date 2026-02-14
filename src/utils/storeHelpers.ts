// Strong ingestion key builder (accountNumber|date|signedAmount|normalized desc[|bal:balance])
// Imported here to provide a gradual migration path away from the legacy key used
// for persisted historical transactions. We keep both for a stabilization window.
import { buildTxKey } from '../ingest/buildTxKey';

export const getAvailableMonths = (account: any) => {
    if (!account?.transactions?.length) return [];

    const uniqueMonths = new Set();

    account.transactions.forEach((tx: any) => {
        if (tx.date) {
            const monthKey = tx.date.slice(0, 7); // 'YYYY-MM'
            uniqueMonths.add(monthKey);
        }
    });

    return Array.from(uniqueMonths).sort((a: unknown, b: unknown) => (b as string).localeCompare(a as string)); // Descending
};

export const getMonthlyTotals = (account: any, month: string) => {
    const txs = account.transactions.filter((tx: any) => tx.date?.startsWith(month));

    const totals = {
        income: 0,
        expenses: 0,
        savings: 0,
        net: 0,
    };

    txs.forEach((tx: any) => {
        const amt = parseFloat(tx.amount) || 0;
        switch (tx.type) {
            case 'income':
                totals.income += amt;
                break;
            case 'savings':
                totals.savings += amt;
                break;
            case 'expense':
            default:
                totals.expenses += amt;
                break;
        }
    });

    totals.net = totals.income + totals.expenses - totals.savings;

    return totals;
};

// Strong key (single source of truth) -------------------------------------------------
export const getStrongTransactionKey = (tx: any, accountNumber: string) =>
    buildTxKey({ ...tx, accountNumber: tx.accountNumber || accountNumber });

export const getUniqueTransactions = (existing: any[], incoming: any[], accountNumber: string) => {
    const seen = new Set(
        existing.map((tx: any) => getStrongTransactionKey(tx, accountNumber))
    );
    return incoming.filter((tx: any) => {
        const key = getStrongTransactionKey(tx, accountNumber);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export const getSavingsKey = (tx: any) => {
    const amt = normalizeTransactionAmount(tx.amount) || 0;
    return `${tx.date}|${amt.toFixed(2)}`;
};

export const normalizeTransactionAmount = (tx: any, direct = false) => {
    const abs = Math.abs(parseFloat(direct ? tx : tx.amount) || 0);

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
