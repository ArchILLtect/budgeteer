import { getUniqueTransactions, normalizeTransactionAmount } from './storeHelpers';
import dayjs from 'dayjs';
import { fireToast } from '../hooks/useFireToast';
import type { TxKeyInput } from '../ingest/buildTxKey';
import type { SavingsReviewEntry } from "../types/savingsReview";

type Transaction = TxKeyInput & {
    id?: string;
    name?: string;
    type?: 'expense' | 'income' | 'savings';
    origin?: string;
    importSessionId?: string;
};

type ApplyOneMonthResult = {
    e: number; // new expenses applied
    i: number; // new income applied
    s: number; // new savings applied
    reviewEntries?: SavingsReviewEntry[];
};

type ApplyOneMonthProgress = {
    advance?: (delta: number) => void;
};

type SavingsLogEntry = {
    goalId: string | null;
    date: string;
    amount: number;
    name?: string;
    id: string;
    createdAt?: string;
    importSessionId?: string;
};

type ActualExpenseInState = TxKeyInput & {
    id: string;
    name: string;
    description: string;
    amount: number;
};

type ActualIncomeSourceInState = TxKeyInput & {
    id: string;
    amount: number;
    description?: string;
    createdAt?: string;
};

type MonthlyActuals = {
    actualExpenses: ActualExpenseInState[];
    actualFixedIncomeSources: ActualIncomeSourceInState[];
    actualTotalNetIncome: number;
    customSavings?: number;
};

type BudgetStoreStateForApply = {
    monthlyActuals: Record<string, MonthlyActuals | undefined>;
    savingsLogs: Record<string, SavingsLogEntry[] | undefined>;

    updateMonthlyActuals: (monthKey: string, patch: Partial<MonthlyActuals>) => void;
    addActualExpense: (
        monthKey: string,
        expense: TxKeyInput & {
            name: string;
            amount: number;
            id?: string;
            description?: string;
        }
    ) => void;
};

type BudgetStoreLike<State> = {
    getState: () => State;
    setState: {
        (
            partial:
                | State
                | Partial<State>
                | ((state: State) => State | Partial<State>),
            replace?: false
        ): unknown;
        (state: State | ((state: State) => State), replace: true): unknown;
    };
};

type VendorExtractOptions = {
    knownVendors?: string[];
    vendorAliases?: Record<string, string>;
    enableHeuristics?: boolean;
};

function getDefaultKnownVendors(): string[] {
    return [
        'prime video',
        'netlify',
        'bluehost',
        'openai',
        'aws',
        'patreon',
        'crunchyroll',
        'walgreens',
        'wal-mart',
        'wal-sams',
        'woodmans',
        'credit one bank',
        'capital petroleum',
        'cenex',
        'grubhub',
    ];
}

function matchKnownVendor(raw: string, options?: Pick<VendorExtractOptions, 'knownVendors' | 'vendorAliases'>): string | null {
    const knownVendors = options?.knownVendors ?? getDefaultKnownVendors();
    const vendorAliases = options?.vendorAliases;
    const lowered = raw.toLowerCase();

    for (const vendor of knownVendors) {
        if (lowered.includes(vendor)) return vendorAliases?.[vendor] ?? vendor;
    }

    return null;
}

function extractVendorHeuristicOnly(raw: string): string {
    const lowered = raw.toLowerCase();

    const dateMatch = lowered.match(/\d{2}\/\d{2}\/\d{2}/); // mm/dd/yy
    if (dateMatch) {
        const split = lowered.split(dateMatch[0]);
        if (split[1]) return split[1].trim().split(/\s+/).slice(0, 3).join(' ');
    }

    return lowered.slice(0, 32);
}

export function formatMonthToYYYYMM(monthAbbreviation: string, year: number) {
    const monthMap = {
        Jan: '01',
        Feb: '02',
        Mar: '03',
        Apr: '04',
        May: '05',
        Jun: '06',
        Jul: '07',
        Aug: '08',
        Sep: '09',
        Oct: '10',
        Nov: '11',
        Dec: '12',
    } as { [key: string]: string };

    const monthNumber = monthMap[monthAbbreviation];

    if (!monthNumber) {
        return 'Invalid month abbreviation';
    }

    // Ensure year is a four-digit number
    const formattedYear = String(year).padStart(4, '0');

    return `${formattedYear}-${monthNumber}`;
}

export function formatToYYYYMM(monthNumber: number, yearNumber: number) {
    const date = new Date(yearNumber, monthNumber - 1); // Month is 0-indexed in Date object

    const yearPart = date.getFullYear();
    const monthPart = date.getMonth() + 1; // Convert back to 1-indexed month

    const formattedMonth = String(monthPart).padStart(2, '0');

    return `${yearPart}-${formattedMonth}`;
}

export function extractVendorDescription(raw: string, options?: VendorExtractOptions) {
    const knownVendors = options?.knownVendors ?? getDefaultKnownVendors();
    const vendorAliases = options?.vendorAliases;
    const enableHeuristics = options?.enableHeuristics ?? true;
    const lowered = raw.toLowerCase();

    // Return a known vendor if matched
    for (const vendor of knownVendors) {
        if (lowered.includes(vendor)) return vendorAliases?.[vendor] ?? vendor;
    }

    // If heuristics are disabled, just return the (normalized) description.
    if (!enableHeuristics) return lowered.trim();

    // Fallback: get last part after date
    const dateMatch = lowered.match(/\d{2}\/\d{2}\/\d{2}/); // mm/dd/yy
    if (dateMatch) {
        const split = lowered.split(dateMatch[0]);
        if (split[1]) return split[1].trim().split(/\s+/).slice(0, 3).join(' ');
    }

    return lowered.slice(0, 32); // safe fallback
}

function normalizeDisplayText(value: unknown) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function clampDisplayText(value: string, maxLen: number) {
    if (!value) return '';
    if (value.length <= maxLen) return value;
    return value.slice(0, maxLen).trim();
}

type ExpenseNameOptions = {
    // Default: false. When true, always extract a vendor-like name (known vendor match + heuristics).
    // When false, only known vendor matches are extracted and everything else uses sanitized raw description.
    alwaysExtractVendorName?: boolean;
    // Future: user-configurable known vendor matching + display aliases.
    knownVendors?: string[];
    vendorAliases?: Record<string, string>;
    rawMaxLen?: number;

    expenseNameOverrides?: { match: string; displayName: string }[];
    incomeNameOverrides?: { match: string; displayName: string }[];
};

function getNonEmptyExpenseName(tx: Transaction, options?: ExpenseNameOptions) {
    const rawDesc = normalizeDisplayText(tx.description);
    const rawName = normalizeDisplayText(tx.name);
    const rawPreferred = rawDesc || rawName;
    if (!rawPreferred) return '(no description)';

    const known = matchKnownVendor(rawPreferred, {
        knownVendors: options?.knownVendors,
        vendorAliases: options?.vendorAliases,
    });
    if (known) {
        const base = normalizeDisplayText(known);
        return applyExactNameOverrides(base, options?.expenseNameOverrides);
    }

    if (options?.alwaysExtractVendorName) {
        const extracted = normalizeDisplayText(extractVendorHeuristicOnly(rawPreferred));
        const base = extracted || '(no description)';
        return applyExactNameOverrides(base, options?.expenseNameOverrides);
    }

    const maxLen = options?.rawMaxLen ?? 80;
    const base = clampDisplayText(rawPreferred, maxLen) || '(no description)';
    return applyExactNameOverrides(base, options?.expenseNameOverrides);
}

function applyExactNameOverrides(value: string, rules: { match: string; displayName: string }[] | undefined) {
    const current = normalizeDisplayText(value);
    if (!current) return value;
    const list = Array.isArray(rules) ? rules : [];
    for (const r of list) {
        const match = normalizeDisplayText(r?.match);
        if (!match) continue;
        if (current === match) {
            const next = normalizeDisplayText(r?.displayName);
            return next || current;
        }
    }
    return current;
}

function getNonEmptyIncomeDescription(tx: Transaction, options?: ExpenseNameOptions) {
    const raw = normalizeDisplayText(tx.description) || normalizeDisplayText(tx.name);
    if (!raw) return '(no description)';
    const maxLen = options?.rawMaxLen ?? 80;
    const base = clampDisplayText(raw, maxLen) || '(no description)';
    return applyExactNameOverrides(base, options?.incomeNameOverrides);
}

export function getUniqueOrigins<T extends { origin?: string }>(txs: T[]) {
    const unique = new Set<string>();
    txs.forEach((tx) => {
        if (tx.origin) {
            unique.add(tx.origin);
        }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
}
export const applyOneMonth = async <State extends BudgetStoreStateForApply>(
    budgetStore: BudgetStoreLike<State>,
    monthKey: string,
    acct: { accountNumber: string; transactions: Transaction[] },
    showToast = true,
    ignoreBeforeDate: string | null = null,
    options?: ExpenseNameOptions,
    progress?: ApplyOneMonthProgress
): Promise<ApplyOneMonthResult> => {
    const store = budgetStore.getState();
    let savingsReviewEntries: SavingsReviewEntry[] = [];

    // Ensure month exists
    if (!store.monthlyActuals[monthKey]) {
        budgetStore.setState(
            (state) =>
                ({
                    monthlyActuals: {
                        ...state.monthlyActuals,
                        [monthKey]: {
                            actualExpenses: [],
                            actualFixedIncomeSources: [],
                            actualTotalNetIncome: 0,
                            customSavings: 0,
                        },
                    },
                }) as Partial<State>
        );
    }

    const existing =
        store.monthlyActuals[monthKey] ??
        ({
            actualExpenses: [],
            actualFixedIncomeSources: [],
            actualTotalNetIncome: 0,
            customSavings: 0,
        } satisfies MonthlyActuals);
    const expenses = existing.actualExpenses || [];
    const income = (existing.actualFixedIncomeSources || []).filter((i) => i.id !== 'main');
    const savings = store.savingsLogs[monthKey] || [];

    // Filter rows for this month
    const monthRows = acct.transactions.filter((tx) => tx.date?.startsWith(monthKey));

    const newExpenses: Transaction[] = [];
    const newIncome: Transaction[] = [];
    const newSavings: Transaction[] = [];

    // Process in chunks to avoid blocking
    const chunkSize = 500;
    for (let i = 0; i < monthRows.length; i += chunkSize) {
        const chunk = monthRows.slice(i, i + chunkSize);

        newExpenses.push(
            ...getUniqueTransactions(
                expenses,
                chunk.filter((tx: Transaction) => tx.type === 'expense'),
                acct.accountNumber
            )
        );

        newIncome.push(
            ...getUniqueTransactions(
                income,
                chunk.filter((tx: Transaction) => tx.type === 'income'),
                acct.accountNumber
            )
        );

        newSavings.push(
            ...getUniqueTransactions(
                savings,
                chunk.filter((tx: Transaction) => tx.type === 'savings'),
                acct.accountNumber
            )
        );

        progress?.advance?.(chunk.length);

        // Let the browser catch up
        await new Promise(requestAnimationFrame);
    }

    const combinedIncome = [...income, ...newIncome];
    const combinedIncomeWithOverrides: ActualIncomeSourceInState[] = combinedIncome.map((src) => ({
        ...src,
        id: src.id || crypto.randomUUID(),
        amount: normalizeTransactionAmount(src),
        description: getNonEmptyIncomeDescription(src, options),
    }));
    const newTotalNetIncome = combinedIncomeWithOverrides.reduce((sum, tx) => sum + tx.amount, 0);

    store.updateMonthlyActuals(monthKey, {
        actualFixedIncomeSources: combinedIncomeWithOverrides,
        actualTotalNetIncome: newTotalNetIncome,
    });

    // Treat income/savings as part of the "write" phase for progress.
    // The caller can set total to roughly 2x monthRows.length (scan + write).
    let writePhaseAdvanced = 0;
    if (newIncome.length > 0) {
        writePhaseAdvanced += newIncome.length;
        progress?.advance?.(newIncome.length);
        await new Promise(requestAnimationFrame);
    }

    // Add expenses (chunked) to avoid blocking, and keep progress moving.
    const writeChunkSize = 200;
    for (let i = 0; i < newExpenses.length; i += writeChunkSize) {
        const chunk = newExpenses.slice(i, i + writeChunkSize);
        for (const e of chunk) {
            store.addActualExpense(monthKey, {
                ...e,
                name: getNonEmptyExpenseName(e, options),
                amount: normalizeTransactionAmount(e),
            });
        }

        writePhaseAdvanced += chunk.length;
        progress?.advance?.(chunk.length);
        await new Promise(requestAnimationFrame);
    }

    // Savings handling
    if (newSavings.length > 0) {
        writePhaseAdvanced += newSavings.length;
        progress?.advance?.(newSavings.length);
        await new Promise(requestAnimationFrame);

        let reviewEntries: SavingsReviewEntry[] = newSavings.map((s) => ({
            id: s.id || crypto.randomUUID(),
            date: s.date || '',
            name: s.name || s.description || '',
            amount: normalizeTransactionAmount(s),
            month: monthKey,
            importSessionId: s.importSessionId,
        }));

        if (ignoreBeforeDate) {
            const cutoff = dayjs(ignoreBeforeDate);
            const [toIgnore, toKeep] = partition(reviewEntries, (entry) =>
                dayjs(entry.date).isBefore(cutoff, 'day')
            );

            // Group logs by month
            const logsByMonth: Record<string, SavingsLogEntry[]> = {};
            toIgnore.forEach((entry) => {
                (logsByMonth[entry.month] ||= []).push({
                    goalId: null,
                    date: entry.date,
                    amount: entry.amount,
                    name: entry.name,
                    id: entry.id || crypto.randomUUID(),
                    createdAt: entry.createdAt || new Date().toISOString(),
                    importSessionId: entry.importSessionId,
                });
            });

            // 🔻 SINGLE Zustand update for all months
            if (Object.keys(logsByMonth).length) {
                budgetStore.setState((state) => {
                    const next = { ...state.savingsLogs } as Record<string, SavingsLogEntry[]>;
                    for (const [month, logs] of Object.entries(logsByMonth)) {
                        const current = next[month] || [];
                        next[month] = current.concat(logs);
                    }
                    return { savingsLogs: next } as Partial<State>;
                });
            }

            reviewEntries = toKeep;

            // Yield to UI so the browser can paint/respond
            await new Promise(requestAnimationFrame);

            if (reviewEntries.length === 0) {
                savingsReviewEntries = [];
            } else {
                savingsReviewEntries = reviewEntries;
            }
        } else {
            savingsReviewEntries = reviewEntries;
        }
    }

    // If the caller sets total to ~2x monthRows.length, make sure we
    // fully consume the "write" phase even when de-dupe reduced counts.
    const writePhaseRemaining = monthRows.length - writePhaseAdvanced;
    if (writePhaseRemaining > 0) {
        progress?.advance?.(writePhaseRemaining);
        await new Promise(requestAnimationFrame);
    }

    if (showToast) {
        fireToast(
          "success",
          'Budget updated',
          `Applied ${newExpenses.length} expenses, ${newIncome.length} income, ${newSavings.length} savings`
        );
    }

    return {
        e: newExpenses.length,
        i: newIncome.length,
        s: newSavings.length,
        reviewEntries: savingsReviewEntries,
    };
};

const partition = <T>(array: T[], predicate: (elem: T) => boolean): [T[], T[]] =>
    array.reduce<[T[], T[]]>(
        ([pass, fail], elem) =>
            predicate(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]],
        [[], []]
    );

// Utility to organize the data (maybe move to helpers later)
export function groupTransactions(transactions: Transaction[]) {
    const grouped: { [year: number]: { [month: string]: Transaction[] } } = {};

    transactions.forEach((tx) => {
        if (!tx.date) return;
        const date = new Date(tx.date);
        const year = date.getFullYear();
        const month = date.toLocaleString('default', { month: 'long' });

        if (!grouped[year]) grouped[year] = {};
        if (!grouped[year][month]) grouped[year][month] = [];
        grouped[year][month].push(tx);
    });

    return grouped;
}
