import { describe, expect, it } from "vitest";
import { calcActualIncomeTotal, ensureMonthlyActual } from "../plannerLogic";

describe("plannerLogic", () => {
  it("calcActualIncomeTotal sums amounts and rounds to cents", () => {
    expect(calcActualIncomeTotal([{ amount: 1 }, { amount: 2.005 }, { amount: "3.1" }])).toBe(6.11);
    expect(calcActualIncomeTotal([{ amount: -1.234 }])).toBe(-1.23);
    expect(calcActualIncomeTotal(undefined)).toBe(0);
  });

  it("ensureMonthlyActual normalizes missing or malformed fields", () => {
    expect(ensureMonthlyActual(undefined)).toEqual({
      actualExpenses: [],
      actualTotalNetIncome: 0,
      actualFixedIncomeSources: [],
    });

    const normalized = ensureMonthlyActual({
      actualExpenses: "nope",
      actualTotalNetIncome: "12.3",
      actualFixedIncomeSources: [{ amount: 5 }],
    });

    expect(normalized.actualExpenses).toEqual([]);
    expect(normalized.actualTotalNetIncome).toBe(12.3);
    expect(normalized.actualFixedIncomeSources).toHaveLength(1);
  });
});
