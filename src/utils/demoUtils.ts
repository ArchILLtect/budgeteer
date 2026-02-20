import dayjs from 'dayjs';
import { nanoid } from 'nanoid';

export function seedDemoState(set: (fn: () => unknown) => void) {
    const today = dayjs();
    const selectedMonth = today.format('YYYY-MM');

    const demoAccount = {
        id: nanoid(),
        name: 'Demo Checking',
        source: 'csv',
        importedAt: new Date().toISOString(),
        transactions: [
            {
                id: nanoid(),
                date: selectedMonth + '-05',
                description: 'Coffee Shop',
                amount: -4.75,
                type: 'expense',
                category: 'Food & Drink',
            },
            {
                id: nanoid(),
                date: selectedMonth + '-10',
                description: 'Freelance Project',
                amount: 1200,
                type: 'income',
                category: 'Work',
            },
            {
                id: nanoid(),
                date: selectedMonth + '-15',
                description: 'Transfer to Savings',
                amount: -300,
                type: 'savings',
                category: 'Transfer',
            },
        ],
    };

    /* TODO: Set as scenario instead of plan
    const demoPlan = {
        netIncome: 1200,
        totalExpenses: 500,
        totalSavings: 300,
        estLeftover: 400,
        createdAt: new Date().toISOString(),
        scenarioName: 'Demo Plan',
    };*/

    set(() => ({
        selectedMonth,
        syncedAccounts: [demoAccount],
        savingsGoals: [{ id: 'yearly', name: 'Yearly Savings Goal', amount: 10000 }],
    }));
}
