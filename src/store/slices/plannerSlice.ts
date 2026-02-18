import type { StateCreator } from "zustand";
import { calculateNetIncome, calculateTotalTaxes } from "../../utils/calcUtils";
import { calcActualIncomeTotal, ensureMonthlyActual } from "./plannerLogic";

const getCurrentMonthYYYYMM = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

type Expense = {
  id: string;
  name: string;
  description: string;
  amount: number;
  isSavings?: boolean;
};

type MonthlyActual = {
  actualExpenses: Expense[];
  actualTotalNetIncome: number;
  overiddenExpenseTotal?: number;
  overiddenIncomeTotal?: number;
  actualFixedIncomeSources: any[];
};

type Scenario = {
  name: string;
  incomeSources: {
    id: string;
    description?: string;
    type: "hourly" | "weekly" | "bi-weekly" | "salary";
    hourlyRate?: number;
    hoursPerWeek?: number;
    netIncome?: number;
    grossSalary?: number;
    weeklySalary?: number;
    biWeeklySalary?: number;
    state: string;
    createdAt: string;
  }[];
  expenses: Expense[];
  filingStatus: string;
  savingsMode: string;
  customSavings: number;
};

export type PlannerSlice = {
  filingStatus: string;
  incomeSources: Scenario["incomeSources"];
  scenarios: { [name: string]: Scenario };
  expenses: Expense[];
  savingsMode: string;
  customSavings: number;
  currentScenario: string;

  selectedMonth: string;
  selectedSourceId: string;

  showPlanInputs: boolean;
  showActualInputs: boolean;
  showIncomeInputs: boolean;
  showExpenseInputs: boolean;
  showSavingsLogInputs: boolean;
  showGoalInputs: boolean;
  showRecurringTXs: boolean;

  savingsGoals: any[];
  savingsLogs: Record<string, any[]>;

  monthlyPlans: Record<string, any>;
  monthlyActuals: { [month: string]: MonthlyActual };

  setShowPlanInputs: (value: any) => void;
  setShowActualInputs: (value: any) => void;
  setShowIncomeInputs: (value: any) => void;
  setShowExpenseInputs: (value: any) => void;
  setShowGoalInputs: (value: any) => void;
  setShowRecurringTXs: (value: any) => void;
  setShowSavingsLogInputs: (value: any) => void;

  setSelectedMonth: (month: any) => void;
  setFilingStatus: (value: any) => void;
  selectIncomeSource: (id: any) => void;

  setSavingsMode: (mode: any) => void;
  setCustomSavings: (value: any) => void;
  setScenario: (name: any) => void;

  resetSavingsLogs: () => void;
  resetMonthlyActuals: () => void;

  addSavingsGoal: (goal: any) => void;
  removeSavingsGoal: (id: any) => void;
  updateSavingsGoal: (id: any, newData: any) => void;

  addSavingsLog: (month: any, entry: any) => void;
  addMultipleSavingsLogs: (month: any, logs: any) => void;
  updateSavingsLog: (month: any, id: any, updates: any) => void;
  removeSavingsEntriesForGoal: (month: any, goalId: any) => void;
  getSavingsForMonth: (month: any) => number;
  resetSavingsLog: (month: any) => void;
  deleteSavingsEntry: (month: any, index: any) => void;

  saveMonthlyPlan: (month: any, planData: any) => void;
  removeMonthlyPlan: (month: any) => void;

  updateMonthlyExpenseActuals: (month: any, id: any, newData: any) => void;
  addActualExpense: (month: any, expense: any) => void;
  removeActualExpense: (month: any, id: any) => void;
  updateMonthlyActuals: (month: any, updates: any) => void;

  applyActualNameOverrides: (rules: {
    expense: { match: string; displayName: string }[];
    income: { match: string; displayName: string }[];
  }) => void;

  updateMonthlyIncomeActuals: (month: any, id: any, newData: any) => void;
  addActualIncomeSource: (month: any, expense: any) => void;
  removeActualIncomeSource: (month: any, id: any) => void;

  setActualCustomSavings: (month: any, value: any) => void;
  setOveriddenExpenseTotal: (month: any, value: any) => void;
  setOveriddenIncomeTotal: (month: any, value: any) => void;

  getTotalGrossIncome: () => number;
  getTotalNetIncome: () => { net: number; gross: number; breakdown: any };

  addIncomeSource: (source: any) => void;
  updateIncomeSource: (id: any, updates: any) => void;
  removeIncomeSource: (id: any) => void;

  addFixedIncomeSource: (source: any) => void;
  updateFixedIncomeSource: (id: any, updates: any) => void;
  removeFixedIncomeSource: (id: any) => void;

  addExpense: (expense: any) => void;
  updateExpense: (id: any, newData: any) => void;
  removeExpense: (id: any) => void;

  resetScenario: () => void;
  saveScenario: (name: any) => void;
  updateScenario: (key: any, updates: any) => void;
  loadScenario: (name: any) => void;
  deleteScenario: (name: any) => void;
};

type SliceCreator<T> = StateCreator<any, [], [], T>;

export const createPlannerSlice: SliceCreator<PlannerSlice> = (set, get) => {
  const currentMonth = getCurrentMonthYYYYMM();

  return {
    filingStatus: "headOfHousehold",
    incomeSources: [
      {
        id: "primary",
        description: "Primary Job",
        type: "hourly",
        hourlyRate: 25,
        hoursPerWeek: 40,
        netIncome: 39000,
        grossSalary: 52000,
        weeklySalary: 1000,
        biWeeklySalary: 2000,
        state: "WI",
        createdAt: new Date().toISOString(),
      },
    ] as Scenario["incomeSources"],

    scenarios: {
      Main: {
        name: "Main",
        incomeSources: [
          {
            id: "primary",
            description: "Primary Job",
            type: "hourly",
            hourlyRate: 25,
            hoursPerWeek: 40,
            netIncome: 39000,
            grossSalary: 0,
            state: "WI",
            createdAt: new Date().toISOString(),
          },
        ],
        expenses: [{ id: "rent", name: "Rent", description: "Rent", amount: 0 }],
        customSavings: 0,
        savingsMode: "20",
        filingStatus: "single",
      } as Scenario,
      College: {
        name: "College",
        incomeSources: [
          {
            id: "primary",
            description: "Primary Job",
            type: "hourly",
            hourlyRate: 25,
            hoursPerWeek: 20,
            netIncome: 19500,
            grossSalary: 52000,
            state: "WI",
            createdAt: new Date().toISOString(),
          },
        ],
        expenses: [{ id: "rent", name: "Rent", description: "Rent", amount: 1000 }],
        filingStatus: "single",
        customSavings: 0,
        savingsMode: "10",
      } as Scenario,
    } as { [name: string]: Scenario },

    expenses: [
      { id: "rent", name: "Rent", description: "Rent", amount: 1600 },
      { id: "groceries", name: "Groceries", description: "Groceries", amount: 400 },
      { id: "phone", name: "Phone", description: "Phone", amount: 100 },
    ] as Expense[],

    savingsMode: "none",
    customSavings: 0,
    currentScenario: "Main",

    selectedMonth: currentMonth,
    selectedSourceId: "primary",

    showPlanInputs: false,
    showActualInputs: false,
    showIncomeInputs: false,
    showExpenseInputs: true,
    showSavingsLogInputs: true,
    showGoalInputs: true,
    showRecurringTXs: false,

    savingsGoals: [{ id: "yearly", name: "Yearly Savings Goal", target: 10000 }],
    savingsLogs: {},

    monthlyPlans: {},
    monthlyActuals: {} as { [month: string]: MonthlyActual },

    setShowPlanInputs: (value) => set(() => ({ showPlanInputs: value })),
    setShowActualInputs: (value) => set(() => ({ showActualInputs: value })),
    setShowIncomeInputs: (value) => set(() => ({ showIncomeInputs: value })),
    setShowExpenseInputs: (value) => set(() => ({ showExpenseInputs: value })),
    setShowGoalInputs: (value) => set(() => ({ showGoalInputs: value })),
    setShowRecurringTXs: (value) => set(() => ({ showRecurringTXs: value })),
    setShowSavingsLogInputs: (value) => set(() => ({ showSavingsLogInputs: value })),

    setSelectedMonth: (month) => set(() => ({ selectedMonth: month })),
    setFilingStatus: (value) => set(() => ({ filingStatus: value })),
    resetSavingsLogs: () => set(() => ({ savingsLogs: {} })),
    resetMonthlyActuals: () => set(() => ({ monthlyActuals: {} })),
    selectIncomeSource: (id) => set(() => ({ selectedSourceId: id })),
    setSavingsMode: (mode) => set(() => ({ savingsMode: mode })),
    setCustomSavings: (value) => set(() => ({ customSavings: value })),
    setScenario: (name) => set({ currentScenario: name }),

    addSavingsGoal: (goal) =>
      set((state: any) => {
        const newGoal = {
          id: goal.id || crypto.randomUUID(),
          ...goal,
          createdAt: new Date().toISOString(),
        };
        const updated = [...state.savingsGoals, newGoal];
        return { savingsGoals: updated };
      }),

    removeSavingsGoal: (id) =>
      set((state: any) => {
        const updated = state.savingsGoals.filter((e: any) => e.id !== id);
        return { savingsGoals: updated };
      }),

    updateSavingsGoal: (id, newData) =>
      set((state: any) => {
        const updated = state.savingsGoals.map((e: any) =>
          e.id === id ? { ...e, ...newData } : e
        );
        return { savingsGoals: updated };
      }),

    addSavingsLog: (month, entry) =>
      set((state: any) => {
        const logs = state.savingsLogs[month] || [];
        const newEntry = {
          id: entry.id || crypto.randomUUID(),
          createdAt: entry.createdAt || new Date().toISOString(),
          ...entry,
        };
        return {
          savingsLogs: {
            ...state.savingsLogs,
            [month]: [...logs, newEntry],
          },
        };
      }),

    addMultipleSavingsLogs: (month, logs) =>
      set((state: any) => {
        const current = state.savingsLogs[month] || [];
        return {
          savingsLogs: {
            ...state.savingsLogs,
            [month]: [...current, ...logs],
          },
        };
      }),

    updateSavingsLog: (month, id, updates) =>
      set((state: any) => {
        const logs = state.savingsLogs[month] || [];
        const updatedLogs = logs.map((e: any) => (e.id === id ? { ...e, ...updates } : e));
        return {
          savingsLogs: { ...state.savingsLogs, [month]: updatedLogs },
        };
      }),

    removeSavingsEntriesForGoal: (month, goalId) =>
      set((state: any) => {
        const logs = state.savingsLogs[month] || [];
        const nextLogs = logs.filter((e: any) => (e?.goalId ?? "yearly") !== goalId);

        const nextSavingsLogs = { ...state.savingsLogs };
        if (nextLogs.length === 0) {
          delete nextSavingsLogs[month];
        } else {
          nextSavingsLogs[month] = nextLogs;
        }

        return { savingsLogs: nextSavingsLogs };
      }),

    getSavingsForMonth: (month) => {
      const { savingsLogs } = get() as any;
      const logs = savingsLogs[month] || [];
      return logs.reduce((sum: number, e: any) => sum + e.amount, 0);
    },

    saveMonthlyPlan: (month, planData) =>
      set((state: any) => {
        const newPlan = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...planData,
        };

        const existingActual = state.monthlyActuals[month];

        const newActual =
          existingActual ??
          ({
            actualTotalNetIncome: +planData.netIncome?.toFixed(2) || 0,
            actualExpenses: JSON.parse(JSON.stringify(planData.expenses || [])),
            actualFixedIncomeSources: JSON.parse(
              JSON.stringify([
                {
                  id: "main",
                  description: "Main (Plan)",
                  amount: +planData.netIncome?.toFixed(2) || 0,
                },
              ])
            ),
            savingsMode: planData.savingsMode,
            customSavings: planData.customSavings,
          } as any);

        return {
          monthlyPlans: {
            ...state.monthlyPlans,
            [month]: newPlan,
          },
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: newActual,
          },
        };
      }),

    removeMonthlyPlan: (month) =>
      set((state: any) => {
        const updatedPlans = { ...state.monthlyPlans };
        delete updatedPlans[month];

        const updatedActuals = { ...state.monthlyActuals };
        delete updatedActuals[month];

        return {
          monthlyPlans: updatedPlans,
          monthlyActuals: updatedActuals,
        };
      }),

    updateMonthlyExpenseActuals: (month, id, newData) =>
      set((state: any) => {
        const existing = state.monthlyActuals[month];
        if (!existing || !Array.isArray(existing.actualExpenses)) return {};

        const updatedExpenses = existing.actualExpenses.map((e: any) =>
          e.id === id ? { ...e, ...newData } : e
        );

        return {
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: {
              ...existing,
              actualExpenses: updatedExpenses,
            },
          },
        };
      }),

    addActualExpense: (month, expense) =>
      set((state: any) => {
        const newExpense = {
          ...expense,
          id: expense.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const existing = state.monthlyActuals[month];
        const updated = [...existing.actualExpenses, newExpense];
        return {
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: {
              ...existing,
              actualExpenses: updated,
            },
          },
        };
      }),

    removeActualExpense: (month, id) =>
      set((state: any) => {
        const existing = state.monthlyActuals[month];
        const updated = existing.actualExpenses.filter((e: any) => e.id !== id);
        return {
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: {
              ...existing,
              actualExpenses: updated,
            },
          },
        };
      }),

    updateMonthlyActuals: (month, updates) =>
      set((state: any) => ({
        monthlyActuals: {
          ...state.monthlyActuals,
          [month]: {
            ...state.monthlyActuals[month],
            ...updates,
          },
        },
      })),

    applyActualNameOverrides: (rules) =>
      set((state: any) => {
        const expenseRules = Array.isArray(rules?.expense) ? rules.expense : [];
        const incomeRules = Array.isArray(rules?.income) ? rules.income : [];

        const normalize = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
        const applyExact = (value: unknown, ruleList: { match: string; displayName: string }[]) => {
          const current = normalize(value);
          if (!current) return current;
          for (const r of ruleList) {
            const match = normalize(r?.match);
            if (!match) continue;
            if (current === match) return normalize(r?.displayName);
          }
          return current;
        };

        const nextMonthlyActuals: Record<string, any> = { ...state.monthlyActuals };
        let changed = false;

        for (const [monthKey, actual] of Object.entries(nextMonthlyActuals)) {
          if (!actual) continue;

          const existing = ensureMonthlyActual(actual as any);
          const nextExpenses = (existing.actualExpenses || []).map((e: any) => {
            const nextName = applyExact(e?.name, expenseRules);
            return nextName && nextName !== e?.name ? { ...e, name: nextName } : e;
          });

          const nextIncome = (existing.actualFixedIncomeSources || []).map((src: any) => {
            const nextDesc = applyExact(src?.description, incomeRules);
            return nextDesc && nextDesc !== src?.description ? { ...src, description: nextDesc } : src;
          });

          if (nextExpenses !== existing.actualExpenses || nextIncome !== existing.actualFixedIncomeSources) {
            // Only mark changed if something inside changed.
            const expensesChanged = nextExpenses.some((e: any, idx: number) => e !== existing.actualExpenses?.[idx]);
            const incomeChanged = nextIncome.some((s: any, idx: number) => s !== existing.actualFixedIncomeSources?.[idx]);
            if (expensesChanged || incomeChanged) {
              changed = true;
              nextMonthlyActuals[monthKey] = {
                ...existing,
                actualExpenses: nextExpenses,
                actualFixedIncomeSources: nextIncome,
              };
            }
          }
        }

        return changed ? { monthlyActuals: nextMonthlyActuals } : {};
      }),

    updateMonthlyIncomeActuals: (month, id, newData) =>
      set((state: any) => {
        const existing = ensureMonthlyActual(state.monthlyActuals[month]);
        const updatedIncomeSources = existing.actualFixedIncomeSources.map((e: any) =>
          e.id === id ? { ...e, ...newData } : e
        );

        const actualTotalNetIncome = calcActualIncomeTotal(updatedIncomeSources);

        return {
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: {
              ...existing,
              actualFixedIncomeSources: updatedIncomeSources,
              actualTotalNetIncome,
            },
          },
        };
      }),

    addActualIncomeSource: (month, expense) =>
      set((state: any) => {
        const newExpense = {
          ...expense,
          id: expense.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const existing = ensureMonthlyActual(state.monthlyActuals[month]);
        const updated = [...existing.actualFixedIncomeSources, newExpense];
        const actualTotalNetIncome = calcActualIncomeTotal(updated);
        return {
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: {
              ...existing,
              actualFixedIncomeSources: updated,
              actualTotalNetIncome,
            },
          },
        };
      }),

    removeActualIncomeSource: (month, id) =>
      set((state: any) => {
        const existing = ensureMonthlyActual(state.monthlyActuals[month]);
        const updated = existing.actualFixedIncomeSources.filter((e: any) => e.id !== id);
        const actualTotalNetIncome = calcActualIncomeTotal(updated);
        return {
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: {
              ...existing,
              actualFixedIncomeSources: updated,
              actualTotalNetIncome,
            },
          },
        };
      }),

    setActualCustomSavings: (month, value) =>
      set((state: any) => ({
        monthlyActuals: {
          ...state.monthlyActuals,
          [month]: {
            ...state.monthlyActuals[month],
            customSavings: value,
          },
        },
      })),

    setOveriddenExpenseTotal: (month, value) =>
      set((state: any) => {
        const existing = ensureMonthlyActual(state.monthlyActuals[month]);
        return {
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: {
              ...existing,
              overiddenExpenseTotal: value >= 1 ? value : 0,
            },
          },
        };
      }),

    setOveriddenIncomeTotal: (month, value) =>
      set((state: any) => {
        const existing = ensureMonthlyActual(state.monthlyActuals[month]);
        return {
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: {
              ...existing,
              overiddenIncomeTotal: value >= 1 ? value : 0,
            },
          },
        };
      }),

    resetSavingsLog: (month) =>
      set((state: any) => {
        const newLogs = { ...state.savingsLogs };
        delete newLogs[month];
        return { savingsLogs: newLogs };
      }),

    deleteSavingsEntry: (month, index) =>
      set((state: any) => {
        const logs = state.savingsLogs[month] || [];
        return {
          savingsLogs: {
            ...state.savingsLogs,
            [month]: logs.filter((_: any, i: any) => i !== index),
          },
        };
      }),

    getTotalGrossIncome: () => {
      const { incomeSources } = get() as any;
      if (!Array.isArray(incomeSources)) return 0;
      return calculateNetIncome(incomeSources);
    },

    getTotalNetIncome: () => {
      const totalGross = (get() as any).getTotalGrossIncome() as number;
      const filingStatus = (get() as any).filingStatus as string;
      const taxes = calculateTotalTaxes(totalGross, filingStatus);
      return {
        net: totalGross - taxes.total,
        gross: totalGross,
        breakdown: taxes,
      };
    },

    addIncomeSource: (source) =>
      set((state: any) => {
        const newSource = {
          ...source,
          id: source.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const updated = [...state.incomeSources, newSource];
        return {
          incomeSources: updated,
          scenarios: {
            ...state.scenarios,
            [state.currentScenario]: {
              ...state.scenarios[state.currentScenario],
              incomeSources: updated,
            },
          },
        };
      }),

    updateIncomeSource: (id, updates) =>
      set((state: any) => {
        const updated = state.incomeSources.map((s: any) => (s.id === id ? { ...s, ...updates } : s));
        return {
          incomeSources: updated,
          scenarios: {
            ...state.scenarios,
            [state.currentScenario]: {
              ...state.scenarios[state.currentScenario],
              incomeSources: updated,
            },
          },
        };
      }),

    removeIncomeSource: (id) =>
      set((state: any) => {
        const updated = state.incomeSources.filter((s: any) => s.id !== id);
        return {
          incomeSources: updated,
          selectedSourceId: state.selectedSourceId === id ? updated[0]?.id || null : state.selectedSourceId,
          scenarios: {
            ...state.scenarios,
            [state.currentScenario]: {
              ...state.scenarios[state.currentScenario],
              incomeSources: updated,
            },
          },
        };
      }),

    addFixedIncomeSource: (source) =>
      set((state: any) => {
        const newSource = {
          ...source,
          id: source.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const updated = [...state.incomeSources, newSource];
        return {
          incomeSources: updated,
          scenarios: {
            ...state.scenarios,
            [state.currentScenario]: {
              ...state.scenarios[state.currentScenario],
              incomeSources: updated,
            },
          },
        };
      }),

    updateFixedIncomeSource: (id, updates) =>
      set((state: any) => {
        const updated = state.incomeSources.map((s: any) => (s.id === id ? { ...s, ...updates } : s));
        return {
          incomeSources: updated,
          scenarios: {
            ...state.scenarios,
            [state.currentScenario]: {
              ...state.scenarios[state.currentScenario],
              incomeSources: updated,
            },
          },
        };
      }),

    removeFixedIncomeSource: (id) =>
      set((state: any) => {
        const updated = state.incomeSources.filter((s: any) => s.id !== id);
        return {
          incomeSources: updated,
          selectedSourceId: state.selectedSourceId === id ? updated[0]?.id || null : state.selectedSourceId,
          scenarios: {
            ...state.scenarios,
            [state.currentScenario]: {
              ...state.scenarios[state.currentScenario],
              incomeSources: updated,
            },
          },
        };
      }),

    addExpense: (expense) =>
      set((state: any) => {
        const newExpense = {
          ...expense,
          id: expense.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const updated = [...state.expenses, newExpense];
        return {
          expenses: updated,
          scenarios: {
            ...state.scenarios,
            [state.currentScenario]: {
              ...state.scenarios[state.currentScenario],
              expenses: updated,
            },
          },
        };
      }),

    updateExpense: (id, newData) =>
      set((state: any) => {
        const updated = state.expenses.map((e: any) => (e.id === id ? { ...e, ...newData } : e));
        return {
          expenses: updated,
          scenarios: {
            ...state.scenarios,
            [state.currentScenario]: {
              ...state.scenarios[state.currentScenario],
              expenses: updated,
            },
          },
        };
      }),

    removeExpense: (id) =>
      set((state: any) => {
        const updated = state.expenses.filter((e: any) => e.id !== id);
        return {
          expenses: updated,
          scenarios: {
            ...state.scenarios,
            [state.currentScenario]: {
              ...state.scenarios[state.currentScenario],
              expenses: updated,
            },
          },
        };
      }),

    resetScenario: () =>
      set({
        incomeSources: [
          {
            id: "primary",
            description: "Primary Job",
            type: "hourly",
            hourlyRate: 25,
            hoursPerWeek: 40,
            grossSalary: 0,
            weeklySalary: 1000,
            biWeeklySalary: 2000,
            state: "WI",
            createdAt: new Date().toISOString(),
          },
        ],
        selectedSourceId: "primary",
        expenses: [{ id: "rent", name: "Rent", description: "Rent", amount: 0 }],
        savingsMode: "none",
        customSavings: 0,
        filingStatus: "headOfHousehold",
      }),

    saveScenario: (name) =>
      set((state: any) => ({
        scenarios: {
          ...state.scenarios,
          [name]: {
            name,
            incomeSources: JSON.parse(JSON.stringify(state.incomeSources)),
            expenses: JSON.parse(JSON.stringify(state.expenses)),
            savingsMode: state.savingsMode,
            customSavings: state.customSavings,
            showIncomeInputs: true,
            filingStatus: state.filingStatus,
          },
        },
        currentScenario: name,
      })),

    updateScenario: (key, updates) =>
      set((state: any) => ({
        scenarios: {
          ...state.scenarios,
          [key]: {
            ...state.scenarios[key],
            ...updates,
          },
        },
      })),

    loadScenario: (name) =>
      set((state: any) => {
        const scenario = state.scenarios[name];
        return scenario
          ? {
              incomeSources: JSON.parse(JSON.stringify(scenario.incomeSources)),
              expenses: JSON.parse(JSON.stringify(scenario.expenses)),
              savingsMode: scenario.savingsMode || "none",
              customSavings: scenario.customSavings || 0,
              currentScenario: name,
              filingStatus: scenario.filingStatus,
              showIncomeInputs: false,
            }
          : {};
      }),

    deleteScenario: (name) =>
      set((state: any) => {
        const updated = { ...state.scenarios };
        delete updated[name];

        const isCurrent = state.currentScenario === name;
        const fallback = Object.keys(updated)[0] || "Main";

        return {
          scenarios: updated,
          ...(isCurrent && updated[fallback]
            ? {
                currentScenario: fallback,
                incomeSources: JSON.parse(JSON.stringify(updated[fallback].incomeSources)),
                expenses: JSON.parse(JSON.stringify(updated[fallback].expenses)),
                savingsMode: updated[fallback].savingsMode || "none",
                customSavings: updated[fallback].customSavings || 0,
                filingStatus: updated[fallback].filingStatus,
              }
            : {}),
        };
      }),
  };
};
