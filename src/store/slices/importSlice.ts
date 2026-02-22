import type { StateCreator } from "zustand";
import {
  expireOldStagedTransactions,
  getAccountStagedSessionSummaries,
  getImportSessionRuntime,
  pruneImportHistory,
  recordImportHistory,
  undoStagedImport,
  type ImportHistoryEntry,
  type ImportLifecycleState,
  type ImportSessionRuntime,
  type AccountForImportLifecycle,
  type PendingSavingsQueueEntry,
  type TransactionForImportLifecycle,
} from "./importLogic";
import { buildTxKey } from "../../ingest/buildTxKey";
import type { ImportPlan } from "../../ingest/importPlan";
import { normalizeTransactionAmount } from "../../utils/storeHelpers";
import type { SavingsReviewEntry } from "../../types/savingsReview";
import type { IngestionMetrics } from "../../types/ingestionMetrics";

type ImportManifestMeta = {
  size?: number;
  sampleName?: string;
  newCount?: number;
  dupes?: number;
};

type ImportManifest = {
  firstImportedAt: string;
  size: number;
  sampleName: string;
  accounts: Record<
    string,
    {
      importedAt: string;
      newCount: number;
      dupes: number;
    }
  >;
};

export type LastIngestionTelemetry = {
  at: string;
  accountNumber: string;
  hash?: string;
  newCount: number;
  dupesExisting?: number;
  dupesIntraFile?: number;
  categorySources?: Record<string, number>;
};

type ImportSliceStoreState = Pick<
  ImportLifecycleState,
  | "accounts"
  | "pendingSavingsByAccount"
  | "importHistory"
  | "importUndoWindowMinutes"
  | "importHistoryMaxEntries"
  | "importHistoryMaxAgeDays"
  | "stagedAutoExpireDays"
> & {
  savingsReviewQueue?: SavingsReviewEntry[];
  isSavingsModalOpen?: boolean;
  importManifests: Record<string, ImportManifest>;
  budgetAppliedAtByMonth: Record<string, string>;

  streamingAutoLineThreshold: number;
  streamingAutoByteThreshold: number;
  showIngestionBenchmark: boolean;

  lastIngestionBenchmarkMetrics: IngestionMetrics | null;
  lastIngestionBenchmarkSessionId: string | null;

  lastIngestionTelemetry: LastIngestionTelemetry | null;

  [key: string]: unknown;
};

export type ImportSlice = {
  pendingSavingsByAccount: ImportLifecycleState["pendingSavingsByAccount"];
  savingsReviewQueue: SavingsReviewEntry[];
  importHistory: ImportHistoryEntry[];
  budgetAppliedAtByMonth: Record<string, string>;

  importUndoWindowMinutes: number;
  importHistoryMaxEntries: number;
  importHistoryMaxAgeDays: number;
  stagedAutoExpireDays: number;

  streamingAutoLineThreshold: number;
  streamingAutoByteThreshold: number;
  showIngestionBenchmark: boolean;

  lastIngestionBenchmarkMetrics: IngestionMetrics | null;
  lastIngestionBenchmarkSessionId: string | null;

  importManifests: Record<string, ImportManifest>;
  lastIngestionTelemetry: LastIngestionTelemetry | null;

  setLastIngestionTelemetry: (telemetry: LastIngestionTelemetry | null) => void;
  setLastIngestionBenchmark: (metrics: IngestionMetrics | null, sessionId?: string | null) => void;
  clearAllImportData: () => void;
  registerImportManifest: (hash: string, accountNumber: string, meta?: ImportManifestMeta) => void;

  commitImportPlan: (plan: ImportPlan) => void;

  addPendingSavingsQueue: (accountNumber: string, entries: PendingSavingsQueueEntry[]) => void;
  clearPendingSavingsForAccount: (accountNumber: string) => void;
  processSavingsQueue: (entries: SavingsReviewEntry[]) => void;
  setSavingsReviewQueue: (entries: SavingsReviewEntry[]) => void;
  clearSavingsReviewQueue: () => void;
  processPendingSavingsForAccount: (accountNumber: string, months: string[]) => void;
  clearPendingSavingsForAccountMonths: (accountNumber: string, months: string[]) => void;
  markTransactionsBudgetApplied: (accountNumber: string, months: string[]) => void;
  recordBudgetAppliedAt: (months: string[], appliedAtIso?: string) => void;

  processPendingSavingsForImportSession: (
    accountNumber: string,
    sessionId: string,
    months: string[]
  ) => void;
  markImportSessionBudgetApplied: (
    accountNumber: string,
    sessionId: string,
    months: string[]
  ) => void;

  recordImportHistory: (entry: ImportHistoryEntry) => void;
  pruneImportHistory: (maxEntries?: number, maxAgeDays?: number) => void;
  expireOldStagedTransactions: (maxAgeDays?: number) => void;
  runImportMaintenance: () => void;
  undoStagedImport: (accountNumber: string, sessionId: string) => void;

  clearImportSessionEverywhere: (accountNumber: string, sessionId: string) => void;

  getImportSessionRuntime: (
    accountNumber: string,
    sessionId: string
  ) => ImportSessionRuntime | null;
  getAccountStagedSessionSummaries: (accountNumber: string) => Array<
    { sessionId: string; count: number } & Partial<ImportSessionRuntime>
  >;

  updateImportSettings: (partial: Record<string, unknown>) => void;
  setShowIngestionBenchmark: (flag: boolean) => void;
};

type SliceCreator<T> = StateCreator<ImportSliceStoreState, [], [], T>;

export const createImportSlice: SliceCreator<ImportSlice> = (set, get) => ({
  pendingSavingsByAccount: {},
  savingsReviewQueue: [],
  importHistory: [],
  budgetAppliedAtByMonth: {},

  importUndoWindowMinutes: 30,
  importHistoryMaxEntries: 30,
  importHistoryMaxAgeDays: 30,
  stagedAutoExpireDays: 30,

  streamingAutoLineThreshold: 3000,
  streamingAutoByteThreshold: 500_000,
  showIngestionBenchmark: false,

  lastIngestionBenchmarkMetrics: null,
  lastIngestionBenchmarkSessionId: null,

  importManifests: {},
  lastIngestionTelemetry: null,

  setLastIngestionTelemetry: (telemetry) => set(() => ({ lastIngestionTelemetry: telemetry })),

  setLastIngestionBenchmark: (metrics, sessionId) =>
    set(() => ({
      lastIngestionBenchmarkMetrics: metrics ?? null,
      lastIngestionBenchmarkSessionId: sessionId ? String(sessionId) : null,
    })),

  clearAllImportData: () =>
    set(() => ({
      pendingSavingsByAccount: {},
      savingsReviewQueue: [],
      importHistory: [],
      importManifests: {},
      lastIngestionTelemetry: null,
      budgetAppliedAtByMonth: {},
      lastIngestionBenchmarkMetrics: null,
      lastIngestionBenchmarkSessionId: null,
    })),

  registerImportManifest: (hash, accountNumber, meta) =>
    set((state) => {
      const existing = state.importManifests[hash] || {
        firstImportedAt: new Date().toISOString(),
        accounts: {},
        size: meta?.size || 0,
        sampleName: meta?.sampleName || "",
      };
      return {
        importManifests: {
          ...state.importManifests,
          [hash]: {
            ...existing,
            accounts: {
              ...existing.accounts,
              [accountNumber]: {
                importedAt: new Date().toISOString(),
                newCount: meta?.newCount ?? 0,
                dupes: meta?.dupes ?? 0,
              },
            },
          },
        },
      };
    }),

  commitImportPlan: (plan) =>
    set((state) => {
      const sessionId = String(plan.session?.sessionId || "");
      const accountNumber = String(plan.session?.accountNumber || "");
      const importedAt = String(plan.session?.importedAt || new Date().toISOString());
      const stats = plan.stats;
      const hash = String(stats?.hash || plan.session?.hash || "");

      if (!sessionId || !accountNumber) return {};

      const alreadyRecorded = (state.importHistory || []).some(
        (h) => h.sessionId === sessionId && h.accountNumber === accountNumber
      );
      if (alreadyRecorded) return {};

      const accepted: TransactionForImportLifecycle[] = Array.isArray(plan?.accepted)
        ? (plan.accepted as TransactionForImportLifecycle[])
        : [];
      if (!accepted.length) {
        // Still record the session metadata for audit if desired.
        const entry: ImportHistoryEntry = {
          sessionId,
          accountNumber,
          importedAt,
          newCount: 0,
          dupesExisting: stats?.dupesExisting,
          dupesIntraFile: stats?.dupesIntraFile,
          savingsCount: Array.isArray(plan?.savingsQueue) ? plan.savingsQueue.length : 0,
          hash,
        };

        const maxEntries = state.importHistoryMaxEntries || 30;
        const maxAgeDays = state.importHistoryMaxAgeDays || 30;
        const withEntry = recordImportHistory(state.importHistory, entry, maxEntries);
        const pruned = pruneImportHistory(withEntry, maxEntries, maxAgeDays, Date.now());
        return {
          importHistory: pruned,
        };
      }

      // Merge into the account's transactions, de-duping again at commit time
      // so retry/double-clicks can't double-insert.
      const acct: AccountForImportLifecycle | undefined = state.accounts?.[accountNumber];
      const existingTxns: TransactionForImportLifecycle[] = (acct?.transactions ?? []) as TransactionForImportLifecycle[];

      const existingKeys = new Set<string>();
      for (const t of existingTxns) {
        try {
          const k = buildTxKey(t);
          if (k) existingKeys.add(k);
        } catch {
          // ignore
        }
      }

      const toAdd: TransactionForImportLifecycle[] = [];
      for (const t of accepted) {
        try {
          const k = typeof t?.key === "string" && t.key ? t.key : buildTxKey(t);
          if (!k || existingKeys.has(k)) continue;
          existingKeys.add(k);
          toAdd.push(t);
        } catch {
          // If keying fails, skip commit rather than risk duping.
          continue;
        }
      }

      const merged = [...existingTxns, ...toAdd].sort((a, b) =>
        String(a?.date || "").localeCompare(String(b?.date || ""))
      );

      // Bootstrap account metadata similar to buildPatch.
      const firstOrig = (
        toAdd.find((t): t is TransactionForImportLifecycle & { original?: Record<string, unknown> } => {
          const orig = (t as { original?: unknown }).original;
          return !!orig && typeof orig === "object";
        })?.original || {}
      ) as Record<string, unknown>;
      const inferredType =
        String(firstOrig?.AccountType || firstOrig?.accountType || "")
          .trim()
          .toLowerCase() || "checking";

      const baseNew = {
        accountNumber,
        label: accountNumber,
        type: inferredType,
        transactions: [],
      };

      const nextAccount = acct
        ? {
            ...baseNew,
            ...acct,
            transactions: merged,
          }
        : {
            ...baseNew,
            transactions: merged,
          };

      // Record audit entry
      const entry: ImportHistoryEntry = {
        sessionId,
        accountNumber,
        importedAt,
        newCount: toAdd.length,
        dupesExisting: stats?.dupesExisting,
        dupesIntraFile: stats?.dupesIntraFile,
        savingsCount: Array.isArray(plan?.savingsQueue) ? plan.savingsQueue.length : 0,
        hash,
      };

      const maxEntries = state.importHistoryMaxEntries || 30;
      const maxAgeDays = state.importHistoryMaxAgeDays || 30;
      const withEntry = recordImportHistory(state.importHistory, entry, maxEntries);
      const pruned = pruneImportHistory(withEntry, maxEntries, maxAgeDays, Date.now());

      // Queue pending savings (deferred until apply)
      const savings: PendingSavingsQueueEntry[] = Array.isArray(plan?.savingsQueue)
        ? (plan.savingsQueue as Array<Record<string, unknown>>).map((s) => {
            const rawId = typeof s.id === "string" ? s.id : "";
            const rawDate = typeof s.date === "string" ? s.date : "";
            const rawMonth = typeof s.month === "string" ? s.month : (rawDate ? rawDate.slice(0, 7) : "");

            return {
              ...s,
              id: rawId || crypto.randomUUID(),
              date: rawDate,
              month: rawMonth,
              name: typeof s.name === "string" ? s.name : "",
              amount: typeof s.amount === "number" ? s.amount : Number(s.amount) || 0,
            };
          })
        : [];
      const currentPending = (state.pendingSavingsByAccount?.[accountNumber] || []) as PendingSavingsQueueEntry[];
      const pendingSavingsByAccount = savings.length
        ? {
            ...state.pendingSavingsByAccount,
            [accountNumber]: currentPending.concat(savings),
          }
        : state.pendingSavingsByAccount;

      // Update import manifest for dedupe warnings
      const importManifests = (() => {
        if (!hash) return state.importManifests;
        const existing = state.importManifests[hash] || {
          firstImportedAt: importedAt,
          accounts: {},
          size: 0,
          sampleName: "",
        };
        return {
          ...state.importManifests,
          [hash]: {
            ...existing,
            firstImportedAt: existing.firstImportedAt || importedAt,
            accounts: {
              ...existing.accounts,
              [accountNumber]: {
                importedAt,
                newCount: toAdd.length,
                dupes: stats?.dupes ?? 0,
              },
            },
          },
        };
      })();

      // Snapshot latest ingestion telemetry
      const lastIngestionTelemetry: LastIngestionTelemetry = {
        at: new Date().toISOString(),
        accountNumber,
        hash,
        newCount: stats?.newCount ?? toAdd.length,
        dupesExisting: stats?.dupesExisting,
        dupesIntraFile: stats?.dupesIntraFile,
        categorySources: stats?.categorySources,
      };

      return {
        accounts: {
          ...state.accounts,
          [accountNumber]: nextAccount,
        },
        importHistory: pruned,
        pendingSavingsByAccount,
        importManifests,
        lastIngestionTelemetry,
      };
    }),

  processSavingsQueue: (entries) =>
    set((state) => {
      if (!entries || !entries.length) return {};
      const merged = [...(state.savingsReviewQueue || []), ...entries];
      return {
        savingsReviewQueue: merged,
        isSavingsModalOpen: true,
      };
    }),

  setSavingsReviewQueue: (entries) =>
    set(() => ({ savingsReviewQueue: Array.isArray(entries) ? entries : [] })),

  clearSavingsReviewQueue: () => set(() => ({ savingsReviewQueue: [] })),

  addPendingSavingsQueue: (accountNumber, entries) =>
    set((state) => {
      if (!entries || !entries.length) return {};
      const current = state.pendingSavingsByAccount[accountNumber] || [];
      return {
        pendingSavingsByAccount: {
          ...state.pendingSavingsByAccount,
          [accountNumber]: current.concat(entries),
        },
      };
    }),

  clearPendingSavingsForAccount: (accountNumber) =>
    set((state) => {
      if (!state.pendingSavingsByAccount[accountNumber]) return {};
      const next = { ...state.pendingSavingsByAccount };
      delete next[accountNumber];
      return { pendingSavingsByAccount: next };
    }),

  markTransactionsBudgetApplied: (accountNumber, months) =>
    set((state) => {
      const acct = state.accounts[accountNumber];
      if (!acct?.transactions) return {};
      const monthSet = months ? new Set(months) : null; // null means all
      let changed = false;
      const updated = (acct.transactions as TransactionForImportLifecycle[]).map((tx) => {
        if (tx.staged && !tx.budgetApplied) {
          const txMonth = tx.date?.slice(0, 7);
          if (!monthSet || (txMonth ? monthSet.has(txMonth) : false)) {
            changed = true;
            return { ...tx, staged: false, budgetApplied: true };
          }
        }
        return tx;
      });
      if (!changed) return {};
      return {
        accounts: {
          ...state.accounts,
          [accountNumber]: { ...acct, transactions: updated },
        },
      };
    }),

  recordBudgetAppliedAt: (months, appliedAtIso) =>
    set((state) => {
      const safeMonths = Array.isArray(months) ? months.filter(Boolean) : [];
      if (!safeMonths.length) return {};

      const at = appliedAtIso || new Date().toISOString();
      const prev = state.budgetAppliedAtByMonth || {};
      let changed = false;
      const next: Record<string, string> = { ...prev };

      for (const m of safeMonths) {
        if (next[m] !== at) {
          next[m] = at;
          changed = true;
        }
      }

      if (!changed) return {};
      return { budgetAppliedAtByMonth: next };
    }),

  markImportSessionBudgetApplied: (accountNumber, sessionId, months) =>
    set((state) => {
      const acct = state.accounts[accountNumber];
      if (!acct?.transactions) return {};
      if (!sessionId) return {};
      const monthSet = months ? new Set(months) : null; // null means all
      let changed = false;
      const updated = (acct.transactions as TransactionForImportLifecycle[]).map((tx) => {
        if (tx.importSessionId !== sessionId) return tx;
        if (tx.staged && !tx.budgetApplied) {
          const txMonth = tx.date?.slice(0, 7);
          if (!monthSet || (txMonth ? monthSet.has(txMonth) : false)) {
            changed = true;
            return { ...tx, staged: false, budgetApplied: true };
          }
        }
        return tx;
      });
      if (!changed) return {};
      return {
        accounts: {
          ...state.accounts,
          [accountNumber]: { ...acct, transactions: updated },
        },
      };
    }),

  processPendingSavingsForAccount: (accountNumber, months) =>
    set((state) => {
      const pending = (state.pendingSavingsByAccount[accountNumber] || []) as PendingSavingsQueueEntry[];
      if (!pending.length) return {};
      const monthSet = months ? new Set(months) : null;
      const toQueue = monthSet
        ? pending.filter((e) => (e.month ? monthSet.has(e.month) : false))
        : pending;
      if (!toQueue.length) return {};
      const remaining = monthSet
        ? pending.filter((e) => (e.month ? !monthSet.has(e.month) : true))
        : [];
      return {
        pendingSavingsByAccount: {
          ...state.pendingSavingsByAccount,
          [accountNumber]: remaining,
        },
        savingsReviewQueue: [
          ...(state.savingsReviewQueue || []),
          ...toQueue,
        ],
        isSavingsModalOpen: true,
      };
    }),

  clearPendingSavingsForAccountMonths: (accountNumber, months) =>
    set((state) => {
      const pending = (state.pendingSavingsByAccount?.[accountNumber] || []) as PendingSavingsQueueEntry[];
      if (!pending.length) return {};
      const monthSet = months && months.length ? new Set(months) : null;
      if (!monthSet) return {};

      const remaining = pending.filter((e) => {
        const m = e.month;
        return m ? !monthSet.has(m) : true;
      });

      if (remaining.length === pending.length) return {};

      return {
        pendingSavingsByAccount: {
          ...state.pendingSavingsByAccount,
          [accountNumber]: remaining,
        },
      };
    }),

  processPendingSavingsForImportSession: (accountNumber, sessionId, months) =>
    set((state) => {
      if (!sessionId) return {};
      const pending = (state.pendingSavingsByAccount[accountNumber] || []) as PendingSavingsQueueEntry[];
      if (!pending.length) return {};
      const monthSet = months ? new Set(months) : null;
      const toQueue = pending.filter((e) => {
        if (e.importSessionId !== sessionId) return false;
        if (!monthSet) return true;
        return e.month ? monthSet.has(e.month) : false;
      });
      if (!toQueue.length) return {};
      const remaining = pending.filter((e) => {
        if (e.importSessionId !== sessionId) return true;
        if (!monthSet) return false;
        return e.month ? !monthSet.has(e.month) : true;
      });
      return {
        pendingSavingsByAccount: {
          ...state.pendingSavingsByAccount,
          [accountNumber]: remaining,
        },
        savingsReviewQueue: [
          ...(state.savingsReviewQueue || []),
          ...toQueue,
        ],
        isSavingsModalOpen: true,
      };
    }),

  recordImportHistory: (entry) =>
    set((state) => {
      const maxEntries = state.importHistoryMaxEntries || 30;
      const withEntry = recordImportHistory(state.importHistory, entry, maxEntries);
      const maxAgeDays = state.importHistoryMaxAgeDays || 30;
      return {
        importHistory: pruneImportHistory(withEntry, maxEntries, maxAgeDays, Date.now()),
      };
    }),

  pruneImportHistory: (maxEntries = 30, maxAgeDays = 30) =>
    set((state) => {
      const effectiveMaxEntries = state.importHistoryMaxEntries || maxEntries;
      const effectiveMaxAgeDays = state.importHistoryMaxAgeDays || maxAgeDays;
      const pruned = pruneImportHistory(
        state.importHistory,
        effectiveMaxEntries,
        effectiveMaxAgeDays,
        Date.now()
      );
      if (pruned.length === state.importHistory.length) return {};
      return { importHistory: pruned };
    }),

  expireOldStagedTransactions: (maxAgeDays = 30) =>
    set((state) =>
      expireOldStagedTransactions(state, maxAgeDays, Date.now())
    ),

  runImportMaintenance: () =>
    set((state) => {
      const maxEntries = state.importHistoryMaxEntries || 30;
      const maxAgeDays = state.importHistoryMaxAgeDays || 30;
      const pruned = pruneImportHistory(state.importHistory, maxEntries, maxAgeDays, Date.now());
      const historyPatch = pruned.length === state.importHistory.length ? {} : { importHistory: pruned };

      const expirePatch = expireOldStagedTransactions(state, state.stagedAutoExpireDays || 30, Date.now());
      return { ...historyPatch, ...expirePatch };
    }),

  undoStagedImport: (accountNumber, sessionId) =>
    set((state) => undoStagedImport(state, accountNumber, sessionId, Date.now())),

  clearImportSessionEverywhere: (accountNumber, sessionId) =>
    set((state) => {
      if (!accountNumber || !sessionId) return {};

      type MonthlyActualLike = {
        actualExpenses?: Array<{ importSessionId?: string } & Record<string, unknown>>;
        actualFixedIncomeSources?: Array<
          { id?: string; amount?: number | string; importSessionId?: string } & Record<string, unknown>
        >;
        actualTotalNetIncome?: number;
        [key: string]: unknown;
      };

      type MonthlyActualsMap = Record<string, MonthlyActualLike>;

      type SavingsLogEntryLike = {
        importSessionId?: string;
        goalId?: string;
        [key: string]: unknown;
      };

      type SavingsLogsMap = Record<string, SavingsLogEntryLike[]>;

      type SavingsGoalLike = {
        id?: string;
        createdFromImportSessionId?: string;
        [key: string]: unknown;
      };

      const patch: Partial<ImportSliceStoreState> & {
        monthlyActuals?: MonthlyActualsMap;
        savingsLogs?: SavingsLogsMap;
        savingsGoals?: SavingsGoalLike[];
        savingsReviewQueue?: SavingsReviewEntry[];
      } = {};

      // 1) Remove imported transactions for this session from the account.
      const acct = state.accounts?.[accountNumber];
      if (acct?.transactions && Array.isArray(acct.transactions)) {
        const before = acct.transactions.length;
        const remaining = (acct.transactions as TransactionForImportLifecycle[]).filter(
          (tx) => tx?.importSessionId !== sessionId
        );
        if (remaining.length !== before) {
          patch.accounts = {
            ...state.accounts,
            [accountNumber]: {
              ...acct,
              transactions: remaining,
            },
          };
        }
      }

      // 2) Remove import history row.
      if (Array.isArray(state.importHistory) && state.importHistory.length) {
        const nextHistory = state.importHistory.filter(
          (h) => !(h?.sessionId === sessionId && h?.accountNumber === accountNumber)
        );
        if (nextHistory.length !== state.importHistory.length) {
          patch.importHistory = nextHistory;
        }
      }

      // 3) Remove pending savings entries for this session.
      const pendingForAcct = state.pendingSavingsByAccount?.[accountNumber];
      if (Array.isArray(pendingForAcct) && pendingForAcct.length) {
        const remaining = (pendingForAcct as PendingSavingsQueueEntry[]).filter(
          (e) => e?.importSessionId !== sessionId
        );
        if (remaining.length !== pendingForAcct.length) {
          const nextPendingByAccount = { ...(state.pendingSavingsByAccount || {}) };
          if (remaining.length === 0) {
            delete nextPendingByAccount[accountNumber];
          } else {
            nextPendingByAccount[accountNumber] = remaining;
          }
          patch.pendingSavingsByAccount = nextPendingByAccount;
        }
      }

      // 4) Clear tracker-derived actuals (monthlyActuals) tagged with this session.
      if (state.monthlyActuals && typeof state.monthlyActuals === "object") {
        const monthlyActuals = state.monthlyActuals as MonthlyActualsMap;
        const nextMonthlyActuals: MonthlyActualsMap = { ...monthlyActuals };
        let changed = false;

        for (const [month, actual] of Object.entries(monthlyActuals)) {
          if (!actual || typeof actual !== "object") continue;

          let monthChanged = false;
          const nextActual = { ...actual };

          if (Array.isArray(actual.actualExpenses)) {
            const before = actual.actualExpenses.length;
            const remaining = actual.actualExpenses.filter((e) => e?.importSessionId !== sessionId);
            if (remaining.length !== before) {
              nextActual.actualExpenses = remaining;
              monthChanged = true;
            }
          }

          if (Array.isArray(actual.actualFixedIncomeSources)) {
            const before = actual.actualFixedIncomeSources.length;
            const remaining = actual.actualFixedIncomeSources.filter((e) => e?.importSessionId !== sessionId);
            if (remaining.length !== before) {
              nextActual.actualFixedIncomeSources = remaining;
              // Keep totals consistent after removing imported income sources.
              const total = remaining
                .filter((t) => String(t?.id || "") !== "main")
                .reduce((sum, t) => sum + normalizeTransactionAmount(t), 0);
              nextActual.actualTotalNetIncome = total;
              monthChanged = true;
            }
          }

          if (monthChanged) {
            nextMonthlyActuals[month] = nextActual;
            changed = true;
          }
        }

        if (changed) {
          patch.monthlyActuals = nextMonthlyActuals;
        }
      }

      // 5) Clear savings logs tagged with this session.
      if (state.savingsLogs && typeof state.savingsLogs === "object") {
        const savingsLogs = state.savingsLogs as SavingsLogsMap;
        const nextSavingsLogs: SavingsLogsMap = { ...savingsLogs };
        let changed = false;

        for (const [month, logs] of Object.entries(savingsLogs)) {
          if (!Array.isArray(logs) || logs.length === 0) continue;
          const remaining = logs.filter((e) => e?.importSessionId !== sessionId);
          if (remaining.length !== logs.length) {
            changed = true;
            if (remaining.length === 0) delete nextSavingsLogs[month];
            else nextSavingsLogs[month] = remaining;
          }
        }

        if (changed) {
          patch.savingsLogs = nextSavingsLogs;
        }
      }

      // 5b) Remove savings goals created by this session, but only if nothing still references them.
      if (Array.isArray(state.savingsGoals) && state.savingsGoals.length) {
        // Build a set of goalIds still referenced wherever.
        const referencedGoalIds = new Set<string>();
        const logsByMonth: SavingsLogsMap | undefined = patch.savingsLogs ?? (state.savingsLogs as SavingsLogsMap | undefined);
        if (logsByMonth && typeof logsByMonth === "object") {
          for (const logs of Object.values(logsByMonth)) {
            if (!Array.isArray(logs)) continue;
            for (const e of logs) {
              if (e?.goalId) referencedGoalIds.add(String(e.goalId));
            }
          }
        }

        const nextGoals = (state.savingsGoals as SavingsGoalLike[]).filter((g) => {
          const createdFrom = g?.createdFromImportSessionId;
          if (createdFrom !== sessionId) return true;
          const goalId = g?.id;
          // Only remove if it's no longer referenced.
          return goalId ? referencedGoalIds.has(String(goalId)) : true;
        });

        if (nextGoals.length !== state.savingsGoals.length) {
          patch.savingsGoals = nextGoals;
        }
      }

      // 6) If a savings-review modal queue exists, remove entries for this session.
      if (Array.isArray(state.savingsReviewQueue) && state.savingsReviewQueue.length) {
        const remaining = state.savingsReviewQueue.filter((e) => e?.importSessionId !== sessionId);
        if (remaining.length !== state.savingsReviewQueue.length) {
          patch.savingsReviewQueue = remaining;
          if (remaining.length === 0 && state.isSavingsModalOpen) {
            patch.isSavingsModalOpen = false;
          }
        }
      }

      return patch;
    }),

  getImportSessionRuntime: (accountNumber, sessionId) =>
    getImportSessionRuntime(get(), accountNumber, sessionId, Date.now()),

  getAccountStagedSessionSummaries: (accountNumber) =>
    getAccountStagedSessionSummaries(get(), accountNumber, Date.now()),

  updateImportSettings: (partial) =>
    set((state) => {
      const changes: Record<string, unknown> = {};
      let changed = false;
      for (const k of Object.keys(partial || {})) {
        const nextValue = (partial as Record<string, unknown>)[k];
        if (state[k] !== nextValue && nextValue !== undefined) {
          changes[k] = nextValue;
          changed = true;
        }
      }
      return changed ? changes : {};
    }),

  setShowIngestionBenchmark: (flag) => set({ showIngestionBenchmark: !!flag }),
});
