import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";

import { analyzeImport } from "../analyzeImport";
import { createAccountsSlice } from "../../store/slices/accountsSlice";
import { createImportSlice } from "../../store/slices/importSlice";
import type { AccountsSlice } from "../../store/slices/accountsSlice";
import type { ImportSlice } from "../../store/slices/importSlice";

function makeTestStore() {
  return createStore<AccountsSlice & ImportSlice>()((set, get, api) => ({
    ...createAccountsSlice(set, get, api),
    ...createImportSlice(set, get, api),
  }));
}

function makeDeterministicNow() {
  let t = 0;
  return () => {
    t += 1;
    return t;
  };
}

function installDeterministicCrypto() {
  const original = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;

  let i = 0;
  const randomUUID = () => {
    i += 1;
    return `uuid-${i}`;
  };

  const nextCrypto = {
    ...(original || ({} as Crypto)),
    randomUUID,
  } as Crypto;

  Object.defineProperty(globalThis, "crypto", {
    value: nextCrypto,
    configurable: true,
  });

  return () => {
    Object.defineProperty(globalThis, "crypto", {
      value: original,
      configurable: true,
    });
  };
}

describe("analyzeImport", () => {
  let restoreCrypto: (() => void) | null = null;

  beforeEach(() => {
    restoreCrypto = installDeterministicCrypto();
  });

  afterEach(() => {
    restoreCrypto?.();
    restoreCrypto = null;
  });

  it("returns a serializable ImportPlan (no functions)", async () => {
    const now = makeDeterministicNow();

    const csv = [
      "date,description,amount",
      "2026-02-01,Paycheck,100.00",
      "2026-02-02,Groceries,-20.50",
    ].join("\n");

    const plan = await analyzeImport({
      fileText: csv,
      accountNumber: "1234",
      existingTxns: [],
      sessionId: "s1",
      importedAt: "2026-02-14T00:00:00.000Z",
      now,
    });

    expect(plan.session.sessionId).toBe("s1");
    expect(plan.stats.importSessionId).toBe("s1");

    // ImportPlan should be cloneable/serializable (no functions).
    expect(() => structuredClone(plan)).not.toThrow();
    expect((plan as Record<string, unknown>).patch).toBeUndefined();
  });

  it("commitImportPlan(plan) stages accepted transactions and records history", async () => {
    const now = makeDeterministicNow();

    const csv = [
      "date,description,amount",
      "2026-02-01,Paycheck,100.00",
      "2026-02-02,Groceries,-20.50",
    ].join("\n");

    const store = makeTestStore();
    store.setState({
      accounts: {
        "1234": {
          id: "acct-1",
          transactions: [],
        },
      },
      importHistory: [],
      pendingSavingsByAccount: {},
      importManifests: {},
    });

    const plan = await analyzeImport({
      fileText: csv,
      accountNumber: "1234",
      existingTxns: [],
      sessionId: "s1",
      importedAt: "2026-02-14T00:00:00.000Z",
      now,
    });

    store.getState().commitImportPlan(plan);

    expect(store.getState().importHistory.some((h) => h.sessionId === "s1")).toBe(true);
    expect(store.getState().importManifests?.[plan.stats.hash]).toBeTruthy();

    const txns = store.getState().accounts["1234"].transactions ?? [];
    expect(txns).toHaveLength(plan.accepted.length);
    for (const t of txns) {
      expect(t).toMatchObject({ importSessionId: "s1", staged: true, budgetApplied: false });
    }
  });
});
