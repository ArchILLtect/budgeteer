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

describe("pending savings clearing", () => {
  it("clearPendingSavingsForAccountMonths removes only selected months and does not queue modal", () => {
    const store = makeTestStore();

    store.setState({
      pendingSavingsByAccount: {
        "1234": [
          { id: "p1", importSessionId: "s1", month: "2025-08" },
          { id: "p2", importSessionId: "s1", month: "2025-09" },
          { id: "p3", importSessionId: "s2", month: "2025-08" },
        ],
      },
      savingsReviewQueue: [],
      isSavingsModalOpen: false,
    } as any);

    store.getState().clearPendingSavingsForAccountMonths("1234", ["2025-08"]);

    expect(store.getState().pendingSavingsByAccount["1234"]).toEqual([
      { id: "p2", importSessionId: "s1", month: "2025-09" },
    ]);
    expect(store.getState().savingsReviewQueue).toEqual([]);
    expect(store.getState().isSavingsModalOpen).toBe(false);

    // idempotent
    store.getState().clearPendingSavingsForAccountMonths("1234", ["2025-08"]);
    expect(store.getState().pendingSavingsByAccount["1234"]).toEqual([
      { id: "p2", importSessionId: "s1", month: "2025-09" },
    ]);
  });
});
