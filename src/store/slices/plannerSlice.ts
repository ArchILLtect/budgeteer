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
  importSessionId?: string;
};

export type IncomeSourceType = "hourly" | "weekly" | "bi-weekly" | "salary";

export type IncomeSource = {
  id: string;
  description?: string;
  type: IncomeSourceType;
  hourlyRate?: number;
  hoursPerWeek?: number;
  netIncome?: number;
  grossSalary?: number;
  weeklySalary?: number;
  biWeeklySalary?: number;
  state: string;
  createdAt: string;
};

export type ActualFixedIncomeSource = {
  id: string;
  // User-facing label. If omitted, UI should display `description`.
  name?: string | null;
  description?: string;
  amount: number;
  importSessionId?: string;
  createdAt?: string;
};

export type SavingsGoal = {
  id: string;
  name: string;
  target?: number;
  createdAt?: string;
  createdFromImportSessionId?: string;
};

export type SavingsLogEntry = {
  id: string;
  goalId: string | null;
  amount: number;
  date: string;
  name?: string;
  createdAt?: string;
  importSessionId?: string;
};

export type MonthlyPlan = {
  id: string;
  createdAt: string;
  scenarioName?: string;
  incomeSources?: IncomeSource[];
  expenses?: Expense[];
  savingsMode?: string;
  customSavings?: number;
  netIncome?: number;
  savingsPercent?: number;
  totalSavings?: number;
  totalExpenses?: number;
  estLeftover?: number;
};

type MonthlyActual = {
  actualExpenses: Expense[];
  actualTotalNetIncome: number;
  overiddenExpenseTotal?: number;
  overiddenIncomeTotal?: number;
  actualFixedIncomeSources: ActualFixedIncomeSource[];
  actualSavings?: number;
  savingsMode?: string;
  customSavings?: number;
};

export type Scenario = {
  name: string;
  incomeSources: IncomeSource[];
  expenses: Expense[];
  filingStatus: string;
  savingsMode: string;
  customSavings: number;
};

export type PlannerSlice = {
  filingStatus: string;
  incomeSources: IncomeSource[];
  scenarios: { [name: string]: Scenario };
  expenses: Expense[];
  savingsMode: string;
  customSavings: number;
  currentScenario: string;

  selectedMonth: string;
  selectedSourceId: string | null;

  showPlanInputs: boolean;
  showActualInputs: boolean;
  showIncomeInputs: boolean;
  showExpenseInputs: boolean;
  showSavingsLogInputs: boolean;
  showGoalInputs: boolean;
  showRecurringTXs: boolean;

  savingsGoals: SavingsGoal[];
  savingsLogs: Record<string, SavingsLogEntry[]>;

  monthlyPlans: Record<string, MonthlyPlan>;
  monthlyActuals: { [month: string]: MonthlyActual };

  setShowPlanInputs: (value: boolean) => void;
  setShowActualInputs: (value: boolean) => void;
  setShowIncomeInputs: (value: boolean) => void;
  setShowExpenseInputs: (value: boolean) => void;
  setShowGoalInputs: (value: boolean) => void;
  setShowRecurringTXs: (value: boolean) => void;
  setShowSavingsLogInputs: (value: boolean) => void;

  setSelectedMonth: (month: string) => void;
  setFilingStatus: (value: string) => void;
  selectIncomeSource: (id: string) => void;

  setSavingsMode: (mode: string) => void;
  setCustomSavings: (value: number) => void;
  setScenario: (name: string) => void;

  resetSavingsLogs: () => void;
  resetMonthlyActuals: () => void;

  addSavingsGoal: (goal: Omit<SavingsGoal, "id"> & { id?: string }) => void;
  removeSavingsGoal: (id: string) => void;
  updateSavingsGoal: (id: string, newData: Partial<SavingsGoal>) => void;

  addSavingsLog: (month: string, entry: Omit<SavingsLogEntry, "id"> & { id?: string }) => void;
  addMultipleSavingsLogs: (month: string, logs: SavingsLogEntry[]) => void;
  updateSavingsLog: (month: string, id: string, updates: Partial<SavingsLogEntry>) => void;
  removeSavingsEntriesForGoal: (month: string, goalId: string) => void;
  getSavingsForMonth: (month: string) => number;
  resetSavingsLog: (month: string) => void;
  deleteSavingsEntry: (month: string, index: number) => void;

  saveMonthlyPlan: (month: string, planData: Omit<MonthlyPlan, "id" | "createdAt"> & { netIncome?: number; expenses?: Expense[] }) => void;
  removeMonthlyPlan: (month: string) => void;

  updateMonthlyExpenseActuals: (month: string, id: string, newData: Partial<Expense>) => void;
  addActualExpense: (month: string, expense: Omit<Expense, "id" | "description"> & Partial<Pick<Expense, "id" | "description">>) => void;
  removeActualExpense: (month: string, id: string) => void;
  updateMonthlyActuals: (month: string, updates: Partial<MonthlyActual>) => void;

  applyActualNameOverrides: (rules: {
    expense: { match: string; displayName: string }[];
    income: { match: string; displayName: string }[];
  }) => void;

  updateMonthlyIncomeActuals: (month: string, id: string, newData: Partial<ActualFixedIncomeSource>) => void;
  addActualIncomeSource: (month: string, incomeSource: Omit<ActualFixedIncomeSource, "id"> & { id?: string }) => void;
  removeActualIncomeSource: (month: string, id: string) => void;

  setActualCustomSavings: (month: string, value: number) => void;
  setOveriddenExpenseTotal: (month: string, value: number) => void;
  setOveriddenIncomeTotal: (month: string, value: number) => void;

  getTotalGrossIncome: () => number;
  getTotalNetIncome: () => { net: number; gross: number; breakdown: ReturnType<typeof calculateTotalTaxes> };

  addIncomeSource: (source: Omit<IncomeSource, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  updateIncomeSource: (id: string, updates: Partial<IncomeSource>) => void;
  removeIncomeSource: (id: string) => void;

  addFixedIncomeSource: (source: Omit<IncomeSource, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
  updateFixedIncomeSource: (id: string, updates: Partial<IncomeSource>) => void;
  removeFixedIncomeSource: (id: string) => void;

  addExpense: (expense: Omit<Expense, "id" | "description"> & Partial<Pick<Expense, "id" | "description">>) => void;
  updateExpense: (id: string, newData: Partial<Expense>) => void;
  removeExpense: (id: string) => void;

  resetScenario: () => void;
  saveScenario: (name: string) => void;
  updateScenario: (key: string, updates: Partial<Scenario>) => void;
  loadScenario: (name: string) => void;
  deleteScenario: (name: string) => void;
};

type PlannerSliceStoreState = PlannerSlice & {
  [key: string]: unknown;
};

type SliceCreator<T> = StateCreator<PlannerSliceStoreState, [], [], T>;

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
    ],

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
    monthlyActuals: {},

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
      set((state: PlannerSlice) => {
        const newGoal = {
          id: goal.id || crypto.randomUUID(),
          ...goal,
          createdAt: new Date().toISOString(),
        };
        const updated = [...state.savingsGoals, newGoal];
        return { savingsGoals: updated };
      }),

    removeSavingsGoal: (id) =>
      set((state: PlannerSlice) => {
        const updated = state.savingsGoals.filter((g) => g.id !== id);
        return { savingsGoals: updated };
      }),

    updateSavingsGoal: (id, newData) =>
      set((state: PlannerSlice) => {
        const updated = state.savingsGoals.map((g) =>
          g.id === id ? { ...g, ...newData } : g
        );
        return { savingsGoals: updated };
      }),

    addSavingsLog: (month, entry) =>
      set((state: PlannerSlice) => {
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
      set((state: PlannerSlice) => {
        const current = state.savingsLogs[month] || [];
        return {
          savingsLogs: {
            ...state.savingsLogs,
            [month]: [...current, ...logs],
          },
        };
      }),

    updateSavingsLog: (month, id, updates) =>
      set((state: PlannerSlice) => {
        const logs = state.savingsLogs[month] || [];
        const updatedLogs = logs.map((e) => (e.id === id ? { ...e, ...updates } : e));
        return {
          savingsLogs: { ...state.savingsLogs, [month]: updatedLogs },
        };
      }),

    removeSavingsEntriesForGoal: (month, goalId) =>
      set((state: PlannerSlice) => {
        const logs = state.savingsLogs[month] || [];
        const nextLogs = logs.filter((e) => (e?.goalId ?? "yearly") !== goalId);

        const nextSavingsLogs = { ...state.savingsLogs };
        if (nextLogs.length === 0) {
          delete nextSavingsLogs[month];
        } else {
          nextSavingsLogs[month] = nextLogs;
        }

        return { savingsLogs: nextSavingsLogs };
      }),

    getSavingsForMonth: (month) => {
      const { savingsLogs } = get();
      const logs = savingsLogs[month] || [];
      return logs.reduce((sum, e) => sum + e.amount, 0);
    },

    saveMonthlyPlan: (month, planData) =>
      set((state: PlannerSlice) => {
        const newPlan = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...planData,
        };

        const existingActual = state.monthlyActuals[month];

        const newActual: MonthlyActual =
          existingActual ??
          {
            actualTotalNetIncome: +Number(planData.netIncome ?? 0).toFixed(2) || 0,
            actualExpenses: JSON.parse(JSON.stringify(planData.expenses || [])),
            actualFixedIncomeSources: [
              {
                id: "main",
                description: "Main (Plan)",
                amount: +Number(planData.netIncome ?? 0).toFixed(2) || 0,
              },
            ],
            savingsMode: planData.savingsMode,
            customSavings: planData.customSavings,
          };

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
      set((state: PlannerSlice) => {
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
      set((state: PlannerSlice) => {
        const existing = state.monthlyActuals[month];
        if (!existing || !Array.isArray(existing.actualExpenses)) return {};

        const updatedExpenses = existing.actualExpenses.map((e) =>
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
      set((state: PlannerSlice) => {
        const newExpense = {
          ...expense,
          description: expense.description ?? "",
          id: expense.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const rawExisting = state.monthlyActuals[month];
        const normalized = ensureMonthlyActual<Expense, ActualFixedIncomeSource>(rawExisting);
        const existing: MonthlyActual = { ...(rawExisting ?? {}), ...normalized };
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
      set((state: PlannerSlice) => {
        const rawExisting = state.monthlyActuals[month];
        const normalized = ensureMonthlyActual<Expense, ActualFixedIncomeSource>(rawExisting);
        const existing: MonthlyActual = { ...(rawExisting ?? {}), ...normalized };
        const updated = existing.actualExpenses.filter((e) => e.id !== id);
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
      set((state: PlannerSlice) => ({
        monthlyActuals: {
          ...state.monthlyActuals,
          [month]: {
            ...state.monthlyActuals[month],
            ...updates,
          },
        },
      })),

    applyActualNameOverrides: (rules) =>
      set((state: PlannerSlice) => {
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

        const nextMonthlyActuals: Record<string, MonthlyActual> = { ...state.monthlyActuals };
        let changed = false;

        for (const [monthKey, actual] of Object.entries(nextMonthlyActuals)) {
          if (!actual) continue;

          const normalized = ensureMonthlyActual<Expense, ActualFixedIncomeSource>(actual);
          const existing: MonthlyActual = { ...actual, ...normalized };

          const nextExpenses = existing.actualExpenses.map((e) => {
            const nextName = applyExact(e?.name, expenseRules);
            return nextName && nextName !== e?.name ? { ...e, name: nextName } : e;
          });

          const nextIncome = existing.actualFixedIncomeSources.map((src) => {
            // Preserve raw `description` and apply overrides into `name`.
            const base = normalize(src?.name ?? src?.description);
            if (!base) return src;

            const nextName = applyExact(base, incomeRules);
            return nextName && nextName !== base ? { ...src, name: nextName } : src;
          });

          if (nextExpenses !== existing.actualExpenses || nextIncome !== existing.actualFixedIncomeSources) {
            // Only mark changed if something inside changed.
            const expensesChanged = nextExpenses.some((e, idx) => e !== existing.actualExpenses?.[idx]);
            const incomeChanged = nextIncome.some((s, idx) => s !== existing.actualFixedIncomeSources?.[idx]);
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
      set((state: PlannerSlice) => {
        const rawExisting = state.monthlyActuals[month];
        const normalized = ensureMonthlyActual<Expense, ActualFixedIncomeSource>(rawExisting);
        const existing: MonthlyActual = { ...(rawExisting ?? {}), ...normalized };

        const updatedIncomeSources = existing.actualFixedIncomeSources.map((e) =>
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
      set((state: PlannerSlice) => {
        const newIncomeSource: ActualFixedIncomeSource = {
          ...(expense as Omit<ActualFixedIncomeSource, "id"> & { id?: string }),
          id: expense.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const rawExisting = state.monthlyActuals[month];
        const normalized = ensureMonthlyActual<Expense, ActualFixedIncomeSource>(rawExisting);
        const existing: MonthlyActual = { ...(rawExisting ?? {}), ...normalized };

        const updated = [...existing.actualFixedIncomeSources, newIncomeSource];
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
      set((state: PlannerSlice) => {
        const rawExisting = state.monthlyActuals[month];
        const normalized = ensureMonthlyActual<Expense, ActualFixedIncomeSource>(rawExisting);
        const existing: MonthlyActual = { ...(rawExisting ?? {}), ...normalized };

        const updated = existing.actualFixedIncomeSources.filter((e) => e.id !== id);
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
      set((state: PlannerSlice) => {
        const rawExisting = state.monthlyActuals[month];
        const normalized = ensureMonthlyActual<Expense, ActualFixedIncomeSource>(rawExisting);
        const existing: MonthlyActual = { ...(rawExisting ?? {}), ...normalized };
        return {
          monthlyActuals: {
            ...state.monthlyActuals,
            [month]: {
              ...existing,
              customSavings: value,
            },
          },
        };
      }),

    setOveriddenExpenseTotal: (month, value) =>
      set((state: PlannerSlice) => {
        const rawExisting = state.monthlyActuals[month];
        const normalized = ensureMonthlyActual<Expense, ActualFixedIncomeSource>(rawExisting);
        const existing: MonthlyActual = { ...(rawExisting ?? {}), ...normalized };
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
      set((state: PlannerSlice) => {
        const rawExisting = state.monthlyActuals[month];
        const normalized = ensureMonthlyActual<Expense, ActualFixedIncomeSource>(rawExisting);
        const existing: MonthlyActual = { ...(rawExisting ?? {}), ...normalized };
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
      set((state: PlannerSlice) => {
        const newLogs = { ...state.savingsLogs };
        delete newLogs[month];
        return { savingsLogs: newLogs };
      }),

    deleteSavingsEntry: (month, index) =>
      set((state: PlannerSlice) => {
        const logs = state.savingsLogs[month] || [];
        return {
          savingsLogs: {
            ...state.savingsLogs,
            [month]: logs.filter((_, i) => i !== index),
          },
        };
      }),

    getTotalGrossIncome: () => {
      const { incomeSources } = get();
      if (!Array.isArray(incomeSources)) return 0;
      return calculateNetIncome(incomeSources);
    },

    getTotalNetIncome: () => {
      const totalGross = get().getTotalGrossIncome();
      const filingStatus = get().filingStatus;
      const taxes = calculateTotalTaxes(totalGross, filingStatus);
      return {
        net: totalGross - taxes.total,
        gross: totalGross,
        breakdown: taxes,
      };
    },

    addIncomeSource: (source) =>
      set((state: PlannerSlice) => {
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
      set((state: PlannerSlice) => {
        const updated = state.incomeSources.map((s) => (s.id === id ? { ...s, ...updates } : s));
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
      set((state: PlannerSlice) => {
        const updated = state.incomeSources.filter((s) => s.id !== id);
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
      set((state: PlannerSlice) => {
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
      set((state: PlannerSlice) => {
        const updated = state.incomeSources.map((s) => (s.id === id ? { ...s, ...updates } : s));
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
      set((state: PlannerSlice) => {
        const updated = state.incomeSources.filter((s) => s.id !== id);
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
      set((state: PlannerSlice) => {
        const newExpense = {
          ...expense,
          id: expense.id || crypto.randomUUID(),
          description: expense.description ?? expense.name,
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
      set((state: PlannerSlice) => {
        const updated = state.expenses.map((e) => (e.id === id ? { ...e, ...newData } : e));
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
      set((state: PlannerSlice) => {
        const updated = state.expenses.filter((e) => e.id !== id);
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
      set((state: PlannerSlice) => ({
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
      set((state: PlannerSlice) => ({
        scenarios: {
          ...state.scenarios,
          [key]: {
            ...state.scenarios[key],
            ...updates,
          },
        },
      })),

    loadScenario: (name) =>
      set((state: PlannerSlice) => {
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
      set((state: PlannerSlice) => {
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
