import { describe, expect, it, vi } from "vitest";
import { hydrateAccountsAndTransactions } from "../cloudPullService";
import type { CloudPullSnapshot } from "../cloudSyncApi";

describe("cloudPullService", () => {
  it("clears accounts then hydrates accounts + tx grouped by account", () => {
    const target = {
      clearAllAccounts: vi.fn(),
      addOrUpdateAccount: vi.fn(),
      addTransactionsToAccount: vi.fn(),
    };

    const snapshot: CloudPullSnapshot = {
      accounts: [
        { accountNumber: "123", label: "Checking", institution: "Bank" },
        { accountNumber: "456", label: null, institution: null },
      ],
      transactions: [
        {
          id: "t1",
          accountNumber: "123",
          date: "2026-02-01",
          description: "Coffee",
          rawAmount: -5,
          name: null,
          note: null,
          category: null,
          importSessionId: null,
          staged: false,
          budgetApplied: false,
        },
        {
          id: "t2",
          accountNumber: "456",
          date: "2026-02-02",
          description: "Paycheck",
          rawAmount: 100,
          name: "Paycheck",
          note: null,
          category: null,
          importSessionId: null,
          staged: false,
          budgetApplied: false,
        },
      ],
    };

    hydrateAccountsAndTransactions(target, snapshot);

    expect(target.clearAllAccounts).toHaveBeenCalledTimes(1);
    expect(target.addOrUpdateAccount).toHaveBeenCalledTimes(2);
    expect(target.addTransactionsToAccount).toHaveBeenCalledTimes(2);

    expect(target.addTransactionsToAccount).toHaveBeenCalledWith("123", expect.any(Array));
    expect(target.addTransactionsToAccount).toHaveBeenCalledWith("456", expect.any(Array));
  });

  it("ignores items missing accountNumber", () => {
    const target = {
      clearAllAccounts: vi.fn(),
      addOrUpdateAccount: vi.fn(),
      addTransactionsToAccount: vi.fn(),
    };

    const snapshot = {
      accounts: [{ accountNumber: "", label: "x", institution: "y" }],
      transactions: [{ id: "t", accountNumber: "", date: "2026-02-01", description: "x", rawAmount: 1 }],
    } as unknown as CloudPullSnapshot;

    hydrateAccountsAndTransactions(target, snapshot);

    expect(target.addOrUpdateAccount).toHaveBeenCalledTimes(0);
    expect(target.addTransactionsToAccount).toHaveBeenCalledTimes(0);
  });
});
