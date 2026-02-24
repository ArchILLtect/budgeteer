import { describe, expect, it, vi } from "vitest";
import { applyOneMonth } from "../accountUtils";

type TestTransaction = {
  id: string;
  date: string;
  type: "expense" | "income" | "savings";
  amount: number;
  description?: string;
  name?: string;
};

type TestActualExpense = {
  id: string;
  name: string;
  description: string;
  amount: number;
  [key: string]: unknown;
};

type TestActualIncomeSource = {
  id: string;
  amount: number;
  name?: string | null;
  description?: string;
  createdAt?: string;
  [key: string]: unknown;
};

type TestMonthlyActuals = {
  actualExpenses: TestActualExpense[];
  actualFixedIncomeSources: TestActualIncomeSource[];
  actualTotalNetIncome: number;
  customSavings?: number;
};

type SavingsLogEntry = {
  id: string;
  goalId: string | null;
  amount: number;
  date: string;
  name?: string;
  createdAt?: string;
  importSessionId?: string;
};

type TestStoreData = {
  monthlyActuals: Record<string, TestMonthlyActuals | undefined>;
  savingsLogs: Record<string, SavingsLogEntry[] | undefined>;
};

type TestStoreState = TestStoreData & {
  updateMonthlyActuals: (monthKey: string, patch: Partial<TestMonthlyActuals>) => void;
  addActualExpense: (
    monthKey: string,
    tx: {
      id?: string;
      name: string;
      description?: string;
      amount: number;
      [key: string]: unknown;
    }
  ) => void;
};

type SetState<State> = {
  (partial: State | Partial<State> | ((state: State) => State | Partial<State>), replace?: false): unknown;
  (state: State | ((state: State) => State), replace: true): unknown;
};

type StoreApi<State> = {
  getState: () => State;
  setState: SetState<State>;
};

function installRafStub() {
  const raf = vi.fn((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  const g = globalThis as typeof globalThis & { requestAnimationFrame?: (cb: FrameRequestCallback) => number };
  g.requestAnimationFrame = raf;
  return raf;
}

function makeTestStoreApi(initial?: Partial<TestStoreData>): { state: TestStoreData; storeApi: StoreApi<TestStoreState> } {
  const state: TestStoreData = {
    monthlyActuals: {},
    savingsLogs: {},
    ...initial,
  };

  const storeApi: StoreApi<TestStoreState> = {
    getState: () => ({
      ...state,
      updateMonthlyActuals: (monthKey: string, patch: Partial<TestMonthlyActuals>) => {
        state.monthlyActuals[monthKey] = {
          ...state.monthlyActuals[monthKey],
          ...patch,
        } as TestMonthlyActuals;
      },
      addActualExpense: (monthKey: string, tx) => {
        const existing = state.monthlyActuals[monthKey];
        if (!existing) throw new Error("month missing");
        existing.actualExpenses = existing.actualExpenses.concat({
          ...tx,
          id: tx.id ?? "x",
          description: tx.description ?? "",
        });
      },
    }),
    setState: ((partial: unknown) => {
      const next =
        typeof partial === "function"
          ? (partial as (s: TestStoreState) => Partial<TestStoreState> | TestStoreState)(storeApi.getState())
          : (partial as Partial<TestStoreState>);
      Object.assign(state, next);
    }) as SetState<TestStoreState>,
  };

  return { state, storeApi };
}

describe("applyOneMonth", () => {
  it("defaults to known-vendor-only extraction (else sanitized raw)", async () => {
    // applyOneMonth yields using requestAnimationFrame; stub for test.
    installRafStub();
    const { state, storeApi } = makeTestStoreApi();

    const acct: { accountNumber: string; transactions: TestTransaction[] } = {
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
    installRafStub();
    const { state, storeApi } = makeTestStoreApi();

    const acct: { accountNumber: string; transactions: TestTransaction[] } = {
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
    const { state: state2, storeApi: storeApi2 } = makeTestStoreApi();

    await applyOneMonth(storeApi2, "2025-08", acct, false, null, {
      alwaysExtractVendorName: true,
      knownVendors: [],
    });
    const onAdded = state2.monthlyActuals["2025-08"]?.actualExpenses ?? [];
    expect(onAdded).toHaveLength(1);
    expect(onAdded[0].name).toBe("amazon.com/bill wa");
  });

  it("applies exact-match name overrides (expenses + income descriptions)", async () => {
    installRafStub();
    const { state, storeApi } = makeTestStoreApi();

    const acct: { accountNumber: string; transactions: TestTransaction[] } = {
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
    expect(income[0].description).toBe("Paycheck");
    expect(income[0].name).toBe("Work");
  });
});
