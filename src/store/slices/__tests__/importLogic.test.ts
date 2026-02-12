import { describe, expect, it } from "vitest";
import {
  getImportSessionRuntime,
  recordImportHistory,
  undoStagedImport,
  type ImportHistoryEntry,
  type ImportLifecycleState,
} from "../importLogic";

function baseState(overrides?: Partial<ImportLifecycleState>): ImportLifecycleState {
  return {
    accounts: {},
    pendingSavingsByAccount: {},
    importHistory: [],
    importUndoWindowMinutes: 30,
    importHistoryMaxEntries: 30,
    importHistoryMaxAgeDays: 30,
    stagedAutoExpireDays: 30,
    ...overrides,
  };
}

describe("importLogic", () => {
  it("recordImportHistory replaces by sessionId and caps entries", () => {
    const a: ImportHistoryEntry = {
      sessionId: "s1",
      accountNumber: "1234",
      importedAt: "2026-02-12T00:00:00.000Z",
      newCount: 1,
      hash: "h1",
    };

    const b: ImportHistoryEntry = {
      sessionId: "s2",
      accountNumber: "1234",
      importedAt: "2026-02-12T01:00:00.000Z",
      newCount: 2,
      hash: "h2",
    };

    const a2: ImportHistoryEntry = {
      ...a,
      importedAt: "2026-02-12T02:00:00.000Z",
      newCount: 3,
    };

    const list1 = recordImportHistory([a], b, 30);
    expect(list1.map((x) => x.sessionId)).toEqual(["s2", "s1"]);

    const list2 = recordImportHistory(list1, a2, 30);
    expect(list2.map((x) => x.sessionId)).toEqual(["s1", "s2"]);
    expect(list2[0].newCount).toBe(3);

    const capped = recordImportHistory([a, b], { ...a2, sessionId: "s3" }, 2);
    expect(capped).toHaveLength(2);
  });

  it("undoStagedImport removes only staged tx for that session and updates history", () => {
    const now = Date.parse("2026-02-12T03:00:00.000Z");
    const importedAt = "2026-02-12T02:50:00.000Z";

    const state = baseState({
      accounts: {
        "1234": {
          transactions: [
            { id: "t1", importSessionId: "s1", staged: true },
            { id: "t2", importSessionId: "s1", staged: false },
            { id: "t3", importSessionId: "s2", staged: true },
          ],
        },
      },
      pendingSavingsByAccount: {
        "1234": [
          { importSessionId: "s1", month: "2026-02" },
          { importSessionId: "s2", month: "2026-02" },
        ],
      },
      importHistory: [
        {
          sessionId: "s1",
          accountNumber: "1234",
          importedAt,
          newCount: 2,
          hash: "h1",
        },
      ],
      importUndoWindowMinutes: 30,
    });

    const patch = undoStagedImport(state, "1234", "s1", now);
    expect(patch.accounts?.["1234"].transactions?.map((t) => t.id)).toEqual(["t2", "t3"]);
    expect(patch.pendingSavingsByAccount?.["1234"].map((e) => e.importSessionId)).toEqual(["s2"]);

    const h = (patch.importHistory ?? [])[0];
    expect(h.sessionId).toBe("s1");
    expect(h.removed).toBe(1);
    expect(typeof h.undoneAt).toBe("string");
  });

  it("getImportSessionRuntime reports active/expired/applied/undone correctly", () => {
    const importedAtMs = Date.parse("2026-02-12T00:00:00.000Z");

    const active = getImportSessionRuntime(
      {
        accounts: {
          "1234": {
            transactions: [{ id: "t1", importSessionId: "s1", staged: true }],
          },
        },
        importHistory: [
          {
            sessionId: "s1",
            accountNumber: "1234",
            importedAt: "2026-02-12T00:00:00.000Z",
            newCount: 1,
            hash: "h1",
          },
        ],
        importUndoWindowMinutes: 30,
      },
      "1234",
      "s1",
      importedAtMs + 5 * 60000
    );

    expect(active?.status).toBe("active");
    expect(active?.canUndo).toBe(true);

    const expired = getImportSessionRuntime(
      {
        accounts: {
          "1234": {
            transactions: [{ id: "t1", importSessionId: "s1", staged: true }],
          },
        },
        importHistory: [
          {
            sessionId: "s1",
            accountNumber: "1234",
            importedAt: "2026-02-12T00:00:00.000Z",
            newCount: 1,
            hash: "h1",
          },
        ],
        importUndoWindowMinutes: 30,
      },
      "1234",
      "s1",
      importedAtMs + 31 * 60000
    );

    expect(expired?.status).toBe("expired");
    expect(expired?.canUndo).toBe(false);

    const applied = getImportSessionRuntime(
      {
        accounts: {
          "1234": {
            transactions: [{ id: "t1", importSessionId: "s1", staged: false }],
          },
        },
        importHistory: [
          {
            sessionId: "s1",
            accountNumber: "1234",
            importedAt: "2026-02-12T00:00:00.000Z",
            newCount: 1,
            hash: "h1",
          },
        ],
        importUndoWindowMinutes: 30,
      },
      "1234",
      "s1",
      importedAtMs + 5 * 60000
    );

    expect(applied?.status).toBe("applied");

    const undone = getImportSessionRuntime(
      {
        accounts: {
          "1234": { transactions: [] },
        },
        importHistory: [
          {
            sessionId: "s1",
            accountNumber: "1234",
            importedAt: "2026-02-12T00:00:00.000Z",
            newCount: 1,
            undoneAt: "2026-02-12T00:10:00.000Z",
            removed: 1,
            hash: "h1",
          },
        ],
        importUndoWindowMinutes: 30,
      },
      "1234",
      "s1",
      importedAtMs + 15 * 60000
    );

    expect(undone?.status).toBe("undone");
    expect(undone?.canUndo).toBe(false);
  });
});
