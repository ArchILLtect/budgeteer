import { describe, expect, it, vi } from "vitest";
import { applyOneMonth } from "../accountUtils";

type MonthlyActuals = {
  actualExpenses: any[];
  actualFixedIncomeSources: any[];
  actualTotalNetIncome: number;
  customSavings: number;
};

describe("applyOneMonth", () => {
  it("defaults to known-vendor-only extraction (else sanitized raw)", async () => {
    // applyOneMonth yields using requestAnimationFrame; stub for test.
    const raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    (globalThis as any).requestAnimationFrame = raf;

    const state: any = {
      monthlyActuals: {} as Record<string, MonthlyActuals | undefined>,
      savingsLogs: {},
    };

    const storeApi: any = {
      getState: () => ({
        ...state,
        updateMonthlyActuals: (monthKey: string, patch: Partial<MonthlyActuals>) => {
          state.monthlyActuals[monthKey] = { ...state.monthlyActuals[monthKey], ...patch };
        },
        addActualExpense: (monthKey: string, tx: any) => {
          const existing = state.monthlyActuals[monthKey];
          if (!existing) throw new Error("month missing");
          existing.actualExpenses = existing.actualExpenses.concat({ ...tx, id: tx.id ?? "x" });
        },
      }),
      setState: (partial: any) => {
        const next = typeof partial === "function" ? partial(storeApi.getState()) : partial;
        Object.assign(state, next);
      },
    };

    const acct = {
      accountNumber: "1111",
      transactions: [
        {
          id: "t1",
          date: "2025-08-01",
          type: "expense" as const,
          amount: -12.34,
          name: "(import-derived nonsense)",
          description: "DEBITCARD 8331:PURCHASE aws.amazon.co WA 08/01/25 Amazon web services",
        },
      ],
    };

    await applyOneMonth(storeApi, "2025-08", acct, false);

    const added = state.monthlyActuals["2025-08"]?.actualExpenses ?? [];
    expect(added).toHaveLength(1);
    expect(String(added[0].name ?? "").trim().length).toBeGreaterThan(0);
    // Default behavior should *not* trust imported tx.name when a description exists.
    expect(added[0].name).not.toBe("(import-derived nonsense)");
    // Known vendor match (aws) should win.
    expect(added[0].name).toBe("aws");
  });

  it("can enable heuristic extraction for all expenses", async () => {
    const raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    (globalThis as any).requestAnimationFrame = raf;

    const state: any = {
      monthlyActuals: {},
      savingsLogs: {},
    };

    const storeApi: any = {
      getState: () => ({
        ...state,
        updateMonthlyActuals: (monthKey: string, patch: Partial<MonthlyActuals>) => {
          state.monthlyActuals[monthKey] = { ...state.monthlyActuals[monthKey], ...patch };
        },
        addActualExpense: (monthKey: string, tx: any) => {
          const existing = state.monthlyActuals[monthKey];
          if (!existing) throw new Error("month missing");
          existing.actualExpenses = existing.actualExpenses.concat({ ...tx, id: tx.id ?? "x" });
        },
      }),
      setState: (partial: any) => {
        const next = typeof partial === "function" ? partial(storeApi.getState()) : partial;
        Object.assign(state, next);
      },
    };

    const acct = {
      accountNumber: "1111",
      transactions: [
        {
          id: "t1",
          date: "2025-08-01",
          type: "expense" as const,
          amount: -12.34,
          name: "(import-derived nonsense)",
          description: "Debitcard 8331:purchase 07/28/25 amazon.com/bill wa",
        },
      ],
    };

    // OFF: no known-vendor match, so we keep the sanitized raw string.
    await applyOneMonth(storeApi, "2025-08", acct, false, null, {
      alwaysExtractVendorName: false,
      knownVendors: [],
    });
    const offAdded = state.monthlyActuals["2025-08"]?.actualExpenses ?? [];
    expect(offAdded).toHaveLength(1);
    expect(offAdded[0].name).toBe("Debitcard 8331:purchase 07/28/25 amazon.com/bill wa");

    // ON: enable heuristics to extract a vendor-ish snippet after the date.
    const state2: any = { monthlyActuals: {}, savingsLogs: {} };
    const storeApi2: any = {
      getState: () => ({
        ...state2,
        updateMonthlyActuals: (monthKey: string, patch: Partial<MonthlyActuals>) => {
          state2.monthlyActuals[monthKey] = { ...state2.monthlyActuals[monthKey], ...patch };
        },
        addActualExpense: (monthKey: string, tx: any) => {
          const existing = state2.monthlyActuals[monthKey];
          if (!existing) throw new Error("month missing");
          existing.actualExpenses = existing.actualExpenses.concat({ ...tx, id: tx.id ?? "x" });
        },
      }),
      setState: (partial: any) => {
        const next = typeof partial === "function" ? partial(storeApi2.getState()) : partial;
        Object.assign(state2, next);
      },
    };

    await applyOneMonth(storeApi2, "2025-08", acct, false, null, {
      alwaysExtractVendorName: true,
      knownVendors: [],
    });
    const onAdded = state2.monthlyActuals["2025-08"]?.actualExpenses ?? [];
    expect(onAdded).toHaveLength(1);
    expect(onAdded[0].name).toBe("amazon.com/bill wa");
  });

  it("applies exact-match name overrides (expenses + income descriptions)", async () => {
    const raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    (globalThis as any).requestAnimationFrame = raf;

    const state: any = {
      monthlyActuals: {} as Record<string, MonthlyActuals | undefined>,
      savingsLogs: {},
    };

    const storeApi: any = {
      getState: () => ({
        ...state,
        updateMonthlyActuals: (monthKey: string, patch: Partial<MonthlyActuals>) => {
          state.monthlyActuals[monthKey] = { ...state.monthlyActuals[monthKey], ...patch };
        },
        addActualExpense: (monthKey: string, tx: any) => {
          const existing = state.monthlyActuals[monthKey];
          if (!existing) throw new Error("month missing");
          existing.actualExpenses = existing.actualExpenses.concat({ ...tx, id: tx.id ?? "x" });
        },
      }),
      setState: (partial: any) => {
        const next = typeof partial === "function" ? partial(storeApi.getState()) : partial;
        Object.assign(state, next);
      },
    };

    const acct = {
      accountNumber: "1111",
      transactions: [
        {
          id: "e1",
          date: "2025-08-01",
          type: "expense" as const,
          amount: -12.34,
          description: "DEBITCARD 8331:PURCHASE aws.amazon.co WA 08/01/25 Amazon web services",
        },
        {
          id: "i1",
          date: "2025-08-02",
          type: "income" as const,
          amount: 1000,
          description: "Paycheck",
        },
      ],
    };

    await applyOneMonth(storeApi, "2025-08", acct, false, null, {
      expenseNameOverrides: [{ match: "aws", displayName: "Amazon Web Services" }],
      incomeNameOverrides: [{ match: "Paycheck", displayName: "Work" }],
    });

    const actual = state.monthlyActuals["2025-08"]; 
    const expenses = actual?.actualExpenses ?? [];
    const income = actual?.actualFixedIncomeSources ?? [];

    expect(expenses).toHaveLength(1);
    expect(expenses[0].name).toBe("Amazon Web Services");
    expect(income).toHaveLength(1);
    expect(income[0].description).toBe("Work");
  });
});
