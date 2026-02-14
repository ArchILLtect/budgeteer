import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";

import { createAccountsSlice } from "../accountsSlice";
import { createImportSlice } from "../importSlice";

function makeTestStore() {
  return createStore<any>()((set, get, api) => ({
    ...createAccountsSlice(set as any, get as any, api as any),
    ...createImportSlice(set as any, get as any, api as any),
  }));
}

describe("Import session-scoped apply (regression)", () => {
  it("applying one session in a month does not apply other sessions in that same month", () => {
    const store = makeTestStore();

    const accountNumber = "1234";
    const s1 = "s1";
    const s2 = "s2";

    store.setState({
      accounts: {
        [accountNumber]: {
          id: "acct-1",
          transactions: [
            // Two different sessions, same month
            { id: "s1-feb", date: "2026-02-03", importSessionId: s1, staged: true, budgetApplied: false },
            { id: "s2-feb", date: "2026-02-05", importSessionId: s2, staged: true, budgetApplied: false },
            // s1 also has another month staged
            { id: "s1-mar", date: "2026-03-02", importSessionId: s1, staged: true, budgetApplied: false },
          ],
        },
      },
    });

    store.getState().markImportSessionBudgetApplied(accountNumber, s1, ["2026-02"]);

    const txns = store.getState().accounts[accountNumber].transactions;
    expect(txns.find((t: any) => t.id === "s1-feb")).toMatchObject({ staged: false, budgetApplied: true });

    // Other session in same month remains staged.
    expect(txns.find((t: any) => t.id === "s2-feb")).toMatchObject({ staged: true, budgetApplied: false });

    // Other month in the same session remains staged (month-scoped apply).
    expect(txns.find((t: any) => t.id === "s1-mar")).toMatchObject({ staged: true, budgetApplied: false });
  });

  it("processing pending savings for one session+month does not enqueue other sessions", () => {
    const store = makeTestStore();

    const accountNumber = "1234";
    const s1 = "s1";
    const s2 = "s2";

    store.setState({
      pendingSavingsByAccount: {
        [accountNumber]: [
          { importSessionId: s1, month: "2026-02", id: "p1" },
          { importSessionId: s2, month: "2026-02", id: "p2" },
          { importSessionId: s1, month: "2026-03", id: "p3" },
        ],
      },
      savingsReviewQueue: [],
    });

    store.getState().processPendingSavingsForImportSession(accountNumber, s1, ["2026-02"]);

    expect(store.getState().savingsReviewQueue).toEqual([{ importSessionId: s1, month: "2026-02", id: "p1" }]);

    // Only s1/Feb removed from pending.
    expect(store.getState().pendingSavingsByAccount[accountNumber]).toEqual([
      { importSessionId: s2, month: "2026-02", id: "p2" },
      { importSessionId: s1, month: "2026-03", id: "p3" },
    ]);
  });
});
