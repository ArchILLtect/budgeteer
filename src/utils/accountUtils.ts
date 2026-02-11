import { useBudgetStore } from '../store/budgetStore';
import { getUniqueTransactions, normalizeTransactionAmount } from './storeHelpers';
import dayjs from 'dayjs';
import { fireToast } from '../hooks/useFireToast';

type Transaction = {
    id: string;
    date: string;
    name: string;
    amount: number;
    type: 'expense' | 'income' | 'savings';
    origin?: string;
};

type ApplyOneMonthResult = {
    e: number; // new expenses applied
    i: number; // new income applied
    s: number; // new savings applied
};

type formatDateOptions = 'shortMonthAndDay' | 'shortMonth' | 'longMonth' | 'year' | 'monthNumber';

export function formatDate(dateString: string, format: formatDateOptions = 'shortMonthAndDay') {
    let newDate;

    if (format === 'shortMonthAndDay') {
        const [year, month, day] = dateString.split('-');
        const date = new Date(+year, +month - 1, +day);
        newDate = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: '2-digit',
        })
            .format(date)
            .replace(',', '-');
    } else if (format === 'shortMonth') {
        const [year, month] = dateString.split('-');
        const date = new Date(`${year}-${month}-01T12:00:00`);
        newDate = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    } else if (format === 'longMonth') {
        const [year, month] = dateString.split('-');
        const date = new Date(`${year}-${month}-01T12:00:00`);
        newDate = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
    } else if (format === 'year') {
        const [year, month] = dateString.split('-');
        const date = new Date(`${year}-${month}-01T12:00:00`);
        newDate = new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(date);
    } else if (format === 'monthNumber') {
        const parts = dateString.split('-');
        const month = parts[1];
        newDate = month;
    }
    return newDate;
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

export function extractVendorDescription(raw: string) {
    const knownVendors = [
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
    const lowered = raw.toLowerCase();

    // Return a known vendor if matched
    for (const vendor of knownVendors) {
        if (lowered.includes(vendor)) return vendor;
    }

    // Fallback: get last part after date
    const dateMatch = lowered.match(/\d{2}\/\d{2}\/\d{2}/); // mm/dd/yy
    if (dateMatch) {
        const split = lowered.split(dateMatch[0]);
        if (split[1]) return split[1].trim().split(/\s+/).slice(0, 3).join(' ');
    }

    return lowered.slice(0, 32); // safe fallback
}

export function getUniqueOrigins(txs: Transaction[]) {
    const unique = new Set();
    txs.forEach((tx) => {
        if (tx.origin) {
            unique.add(tx.origin);
        }
    });
    return Array.from(unique).sort((a: any, b: unknown) => a.localeCompare(b));
}
/*
export const applyOneMonth = async (
    monthKey,
    acct,
    showToast = true,
    ignoreBeforeDate = null
) => {
    const store = useBudgetStore.getState();

    // Ensure the month exists in monthlyActuals
    if (!store.monthlyActuals[monthKey]) {
        useBudgetStore.setState((state) => ({
            monthlyActuals: {
                ...state.monthlyActuals,
                [monthKey]: {
                    actualExpenses: [],
                    actualFixedIncomeSources: [],
                    actualTotalNetIncome: 0,
                    customSavings: 0,
                },
            },
        }));
    }

    const existing = store.monthlyActuals[monthKey] || {};
    const expenses = existing.actualExpenses || [];
    const income = (existing.actualFixedIncomeSources || []).filter(
        (i) => i.id !== 'main'
    );
    const savings = store.savingsLogs[monthKey] || [];

    const monthRows = acct.transactions.filter((tx) => tx.date?.startsWith(monthKey));

    const newExpenses = getUniqueTransactions(
        expenses,
        monthRows.filter((tx) => tx.type === 'expense')
    );

    const newIncome = getUniqueTransactions(
        income,
        monthRows.filter((tx) => tx.type === 'income')
    );

    const combinedIncome = [...income, ...newIncome];
    const newTotalNetIncome = combinedIncome.reduce(
        (sum, tx) => sum + normalizeTransactionAmount(tx),
        0
    );

    useBudgetStore.getState().updateMonthlyActuals(monthKey, {
        actualFixedIncomeSources: combinedIncome,
        actualTotalNetIncome: newTotalNetIncome,
    });

    const newSavings = getUniqueTransactions(
        savings,
        monthRows.filter((tx) => tx.type === 'savings'),
        getSavingsKey
    );

    newExpenses.forEach((e) =>
        store.addActualExpense(monthKey, { ...e, amount: normalizeTransactionAmount(e) })
    );

    if (newSavings.length > 0) {
        let reviewEntries = newSavings.map((s) => ({
            id: s.id,
            date: s.date,
            name: s.name,
            amount: normalizeTransactionAmount(s),
            month: monthKey,
        }));

        if (ignoreBeforeDate) {
            const cutoff = dayjs(ignoreBeforeDate);
            const [toIgnore, toKeep] = partition(reviewEntries, (entry) =>
                dayjs(entry.date).isBefore(cutoff, 'day')
            );

            // Group logs by month
            const logsByMonth = {};
            toIgnore.forEach((entry) => {
                console.log(entry);
                if (!logsByMonth[entry.month]) logsByMonth[entry.month] = [];
                logsByMonth[entry.month].push({
                    goalId: null,
                    date: entry.date,
                    amount: entry.amount,
                    name: entry.name,
                });
            });

            // Single update per month
            Object.entries(logsByMonth).forEach(([month, logs]) => {
                store.addMultipleSavingsLogs(month, logs);
            });

            await new Promise(requestAnimationFrame);

            reviewEntries = toKeep;

            if (reviewEntries.length === 0)
                return {
                    e: newExpenses.length,
                    i: newIncome.length,
                    s: newSavings.length,
                };
        }

        // Set the queue and open modal
        store.setSavingsReviewQueue(reviewEntries);
        // Open modal for manual review
        store.setSavingsModalOpen(true);

        // Return a Promise that resolves only after modal confirm
        await new Promise((resolve) => {
            useBudgetStore.setState({ resolveSavingsPromise: resolve });
        });
    }

    if (showToast) {
        toast({
            title: 'Budget updated',
            description: `Applied ${newExpenses.length} expenses, ${newIncome.length} income, ${newSavings.length} savings`,
            status: 'success',
            duration: 3000,
        });
    }

    return { e: newExpenses.length, i: newIncome.length, s: newSavings.length };
};*/
/*
export const applyOneMonth2 = async (
    monthKey,
    acct,
    showToast = true,
    ignoreBeforeDate = null
) => {
    const store = useBudgetStore.getState();

    // Ensure month exists
    if (!store.monthlyActuals[monthKey]) {
        useBudgetStore.setState((state) => ({
            monthlyActuals: {
                ...state.monthlyActuals,
                [monthKey]: {
                    actualExpenses: [],
                    actualFixedIncomeSources: [],
                    actualTotalNetIncome: 0,
                    customSavings: 0,
                },
            },
        }));
    }

    const existing = store.monthlyActuals[monthKey] || {};
    const expenses = existing.actualExpenses || [];
    const income = (existing.actualFixedIncomeSources || []).filter(
        (i) => i.id !== 'main'
    );
    const savings = store.savingsLogs[monthKey] || [];

    // Filter rows for this month
    const monthRows = acct.transactions.filter((tx) => tx.date?.startsWith(monthKey));

    let newExpenses = [];
    let newIncome = [];
    let newSavings = [];

    // Process in chunks to avoid blocking
    const chunkSize = 500;
    for (let i = 0; i < monthRows.length; i += chunkSize) {
        const chunk = monthRows.slice(i, i + chunkSize);

        newExpenses.push(
            ...getUniqueTransactions(
                expenses,
                chunk.filter((tx) => tx.type === 'expense')
            )
        );

        newIncome.push(
            ...getUniqueTransactions(
                income,
                chunk.filter((tx) => tx.type === 'income')
            )
        );

        newSavings.push(
            ...getUniqueTransactions(
                savings,
                chunk.filter((tx) => tx.type === 'savings'),
                getSavingsKey
            )
        );

        // Let the browser catch up
        await new Promise(requestAnimationFrame);
    }

    const combinedIncome = [...income, ...newIncome];
    const newTotalNetIncome = combinedIncome.reduce(
        (sum, tx) => sum + normalizeTransactionAmount(tx),
        0
    );

    store.updateMonthlyActuals(monthKey, {
        actualFixedIncomeSources: combinedIncome,
        actualTotalNetIncome: newTotalNetIncome,
    });

    // Add expenses
    newExpenses.forEach((e) =>
        store.addActualExpense(monthKey, { ...e, amount: normalizeTransactionAmount(e) })
    );

    // Savings handling
    if (newSavings.length > 0) {
        let reviewEntries = newSavings.map((s) => ({
            id: s.id,
            date: s.date,
            name: s.name,
            amount: normalizeTransactionAmount(s),
            month: monthKey,
        }));

        if (ignoreBeforeDate) {
            const cutoff = dayjs(ignoreBeforeDate);
            const [toIgnore, toKeep] = partition(reviewEntries, (entry) =>
                dayjs(entry.date).isBefore(cutoff, 'day')
            );

            // Batch ignored entries by month
            const logsByMonth = {};
            toIgnore.forEach((entry) => {
                if (!logsByMonth[entry.month]) logsByMonth[entry.month] = [];
                logsByMonth[entry.month].push({
                    goalId: null,
                    date: entry.date,
                    amount: entry.amount,
                    name: entry.name,
                });
            });

            Object.entries(logsByMonth).forEach(([month, logs]) => {
                store.addMultipleSavingsLogs(month, logs);
            });

            reviewEntries = toKeep;

            if (reviewEntries.length === 0) {
                return {
                    e: newExpenses.length,
                    i: newIncome.length,
                    s: newSavings.length,
                };
            }
        }

        // Open modal and wait for user to review/link savings logs
        if (typeof store.awaitSavingsLink === 'function') {
            await store.awaitSavingsLink(reviewEntries);
        } else {
            // Fallback: directly resolve without blocking if action missing
            // to avoid hanging the apply flow in unexpected states
            useBudgetStore.setState({
                savingsReviewQueue: reviewEntries,
                isSavingsModalOpen: true,
            });
        }
    }

    if (showToast) {
        toast({
            title: 'Budget updated',
            description: `Applied ${newExpenses.length} expenses, ${newIncome.length} income, ${newSavings.length} savings`,
            status: 'success',
            duration: 3000,
        });
    }

    return { e: newExpenses.length, i: newIncome.length, s: newSavings.length };
};
*/
export const applyOneMonth = async (
    monthKey: string,
    acct: { accountNumber: string; transactions: Transaction[] },
    showToast = true,
    ignoreBeforeDate = null
): Promise<ApplyOneMonthResult> => {
    const store = useBudgetStore.getState() as any;

    // Ensure month exists
    if (!store.monthlyActuals[monthKey]) {
        useBudgetStore.setState((state: any) => ({
            monthlyActuals: {
                ...state.monthlyActuals,
                [monthKey]: {
                    actualExpenses: [],
                    actualFixedIncomeSources: [],
                    actualTotalNetIncome: 0,
                    customSavings: 0,
                },
            },
        }));
    }

    const existing = store.monthlyActuals[monthKey] || {};
    const expenses = existing.actualExpenses || [];
    const income = (existing.actualFixedIncomeSources || []).filter(
        (i: Transaction) => i.id !== 'main'
    );
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

        // Let the browser catch up
        await new Promise(requestAnimationFrame);
    }

    const combinedIncome = [...income, ...newIncome];
    const newTotalNetIncome = combinedIncome.reduce(
        (sum, tx) => sum + normalizeTransactionAmount(tx),
        0
    );

    store.updateMonthlyActuals(monthKey, {
        actualFixedIncomeSources: combinedIncome,
        actualTotalNetIncome: newTotalNetIncome,
    });

    // Add expenses
    newExpenses.forEach((e) =>
        store.addActualExpense(monthKey, { ...e, amount: normalizeTransactionAmount(e) })
    );

    // Savings handling
    if (newSavings.length > 0) {
        let reviewEntries = newSavings.map((s) => ({
            id: s.id,
            date: s.date,
            name: s.name,
            amount: normalizeTransactionAmount(s),
            month: monthKey,
        }));

        if (ignoreBeforeDate) {
            const cutoff = dayjs(ignoreBeforeDate);
            const [toIgnore, toKeep] = partition(reviewEntries, (entry: any) =>
                dayjs(entry.date).isBefore(cutoff, 'day')
            );

            // Group logs by month
            const logsByMonth: { [key: string]: any[] } = {};
            toIgnore.forEach((entry: any) => {
                (logsByMonth[entry.month] ||= []).push({
                    goalId: null,
                    date: entry.date,
                    amount: entry.amount,
                    name: entry.name,
                    id: entry.id || crypto.randomUUID(),
                    createdAt: entry.createdAt || new Date().toISOString(),
                });
            });

            // 🔻 SINGLE Zustand update for all months
            if (Object.keys(logsByMonth).length) {
                useBudgetStore.setState((state: any) => {
                    const next = { ...state.savingsLogs };
                    for (const [month, logs] of Object.entries(logsByMonth)) {
                        const current = next[month] || [];
                        next[month] = current.concat(logs);
                    }
                    return { savingsLogs: next };
                });
            }

            reviewEntries = toKeep;

            // Yield to UI so the browser can paint/respond
            await new Promise(requestAnimationFrame);

            if (reviewEntries.length === 0) {
                return {
                    e: newExpenses.length,
                    i: newIncome.length,
                    s: newSavings.length,
                };
            }
        }

        store.setSavingsReviewQueue(reviewEntries);
        store.setSavingsModalOpen(true);

        await new Promise((resolve: any) => {
            useBudgetStore.setState({ resolveSavingsPromise: resolve });
        });
    }

    if (showToast) {
        fireToast(
          "success",
          'Budget updated',
          `Applied ${newExpenses.length} expenses, ${newIncome.length} income, ${newSavings.length} savings`
        );
    }

    return { e: newExpenses.length, i: newIncome.length, s: newSavings.length } as ApplyOneMonthResult;
};

const partition = (array: any[], predicate: (elem: any) => boolean) => {
    return array.reduce(
        ([pass, fail], elem) =>
            predicate(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]],
        [[], []]
    );
};

// Utility to organize the data (maybe move to helpers later)
export function groupTransactions(transactions: Transaction[]) {
    const grouped: { [year: number]: { [month: string]: Transaction[] } } = {};

    transactions.forEach((tx) => {
        const date = new Date(tx.date);
        const year = date.getFullYear();
        const month = date.toLocaleString('default', { month: 'long' });

        if (!grouped[year]) grouped[year] = {};
        if (!grouped[year][month]) grouped[year][month] = [];
        grouped[year][month].push(tx);
    });

    return grouped;
}
