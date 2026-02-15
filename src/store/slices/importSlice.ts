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
  type PendingSavingsQueueEntry,
  type TransactionForImportLifecycle,
} from "./importLogic";

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
  savingsReviewQueue?: unknown[];
  isSavingsModalOpen?: boolean;
  importManifests: Record<string, ImportManifest>;

  streamingAutoLineThreshold: number;
  streamingAutoByteThreshold: number;
  showIngestionBenchmark: boolean;

  lastIngestionTelemetry: unknown;

  [key: string]: unknown;
};

export type ImportSlice = {
  pendingSavingsByAccount: ImportLifecycleState["pendingSavingsByAccount"];
  savingsReviewQueue: unknown[];
  importHistory: ImportHistoryEntry[];

  importUndoWindowMinutes: number;
  importHistoryMaxEntries: number;
  importHistoryMaxAgeDays: number;
  stagedAutoExpireDays: number;

  streamingAutoLineThreshold: number;
  streamingAutoByteThreshold: number;
  showIngestionBenchmark: boolean;

  importManifests: Record<string, ImportManifest>;
  lastIngestionTelemetry: unknown;

  setLastIngestionTelemetry: (telemetry: unknown) => void;
  registerImportManifest: (hash: string, accountNumber: string, meta?: ImportManifestMeta) => void;

  addPendingSavingsQueue: (accountNumber: string, entries: PendingSavingsQueueEntry[]) => void;
  clearPendingSavingsForAccount: (accountNumber: string) => void;
  processSavingsQueue: (entries: unknown[]) => void;
  setSavingsReviewQueue: (entries: unknown[]) => void;
  clearSavingsReviewQueue: () => void;
  processPendingSavingsForAccount: (accountNumber: string, months: string[]) => void;
  markTransactionsBudgetApplied: (accountNumber: string, months: string[]) => void;

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

  importUndoWindowMinutes: 30,
  importHistoryMaxEntries: 30,
  importHistoryMaxAgeDays: 30,
  stagedAutoExpireDays: 30,

  streamingAutoLineThreshold: 3000,
  streamingAutoByteThreshold: 500_000,
  showIngestionBenchmark: false,

  importManifests: {},
  lastIngestionTelemetry: null,

  setLastIngestionTelemetry: (telemetry) => set(() => ({ lastIngestionTelemetry: telemetry })),

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
