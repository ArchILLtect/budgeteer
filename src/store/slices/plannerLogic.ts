export type MonthlyActualLike = {
  actualExpenses: unknown[];
  actualTotalNetIncome: number;
  actualFixedIncomeSources: Array<{ amount?: unknown } & Record<string, unknown>>;
  overiddenExpenseTotal?: unknown;
  overiddenIncomeTotal?: unknown;
};

function roundToCents(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function calcActualIncomeTotal(
  actualFixedIncomeSources: MonthlyActualLike["actualFixedIncomeSources"] | undefined
): number {
  if (!Array.isArray(actualFixedIncomeSources)) return 0;
  return roundToCents(
    actualFixedIncomeSources.reduce((sum, source) => sum + (Number(source?.amount) || 0), 0)
  );
}

export function ensureMonthlyActual(existing?: unknown): MonthlyActualLike {
  if (existing && typeof existing === "object") {
    const e = existing as Record<string, unknown>;
    return {
      actualExpenses: Array.isArray(e.actualExpenses) ? (e.actualExpenses as unknown[]) : [],
      actualTotalNetIncome: Number(e.actualTotalNetIncome) || 0,
      actualFixedIncomeSources: Array.isArray(e.actualFixedIncomeSources)
        ? (e.actualFixedIncomeSources as MonthlyActualLike["actualFixedIncomeSources"])
        : [],
      overiddenExpenseTotal: e.overiddenExpenseTotal,
      overiddenIncomeTotal: e.overiddenIncomeTotal,
    };
  }

  return {
    actualExpenses: [],
    actualTotalNetIncome: 0,
    actualFixedIncomeSources: [],
  };
}
