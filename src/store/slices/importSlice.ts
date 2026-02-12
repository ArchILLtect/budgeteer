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
} from "./importLogic";

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

  importManifests: Record<string, unknown>;
  lastIngestionTelemetry: unknown;

  setLastIngestionTelemetry: (telemetry: unknown) => void;
  registerImportManifest: (hash: string, accountNumber: string, meta: any) => void;

  addPendingSavingsQueue: (accountNumber: string, entries: any[]) => void;
  clearPendingSavingsForAccount: (accountNumber: string) => void;
  processSavingsQueue: (entries: any[]) => void;
  processPendingSavingsForAccount: (accountNumber: string, months: string[]) => void;
  markTransactionsBudgetApplied: (accountNumber: string, months: string[]) => void;

  recordImportHistory: (entry: ImportHistoryEntry) => void;
  pruneImportHistory: (maxEntries?: number, maxAgeDays?: number) => void;
  expireOldStagedTransactions: (maxAgeDays?: number) => void;
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

type SliceCreator<T> = StateCreator<any, [], [], T>;

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
    set((state: any) => {
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
    set((state: any) => {
      if (!entries || !entries.length) return {};
      const merged = [...(state.savingsReviewQueue || []), ...entries];
      return {
        savingsReviewQueue: merged,
        isSavingsModalOpen: true,
      };
    }),

  addPendingSavingsQueue: (accountNumber, entries) =>
    set((state: any) => {
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
    set((state: any) => {
      if (!state.pendingSavingsByAccount[accountNumber]) return {};
      const next = { ...state.pendingSavingsByAccount };
      delete next[accountNumber];
      return { pendingSavingsByAccount: next };
    }),

  markTransactionsBudgetApplied: (accountNumber, months) =>
    set((state: any) => {
      const acct = state.accounts[accountNumber];
      if (!acct?.transactions) return {};
      const monthSet = months ? new Set(months) : null; // null means all
      let changed = false;
      const updated = acct.transactions.map((tx: any) => {
        if (tx.staged && !tx.budgetApplied) {
          const txMonth = tx.date?.slice(0, 7);
          if (!monthSet || monthSet.has(txMonth)) {
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
    set((state: any) => {
      const pending = state.pendingSavingsByAccount[accountNumber] || [];
      if (!pending.length) return {};
      const monthSet = months ? new Set(months) : null;
      const toQueue = monthSet ? pending.filter((e: any) => monthSet.has(e.month)) : pending;
      if (!toQueue.length) return {};
      const remaining = monthSet ? pending.filter((e: any) => !monthSet.has(e.month)) : [];
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
    set((state: any) => {
      const maxEntries = state.importHistoryMaxEntries || 30;
      return {
        importHistory: recordImportHistory(state.importHistory, entry, maxEntries),
      };
    }),

  pruneImportHistory: (maxEntries = 30, maxAgeDays = 30) =>
    set((state: any) => {
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
    set((state: any) =>
      expireOldStagedTransactions(state, maxAgeDays, Date.now())
    ),

  undoStagedImport: (accountNumber, sessionId) =>
    set((state: any) => undoStagedImport(state, accountNumber, sessionId, Date.now())),

  getImportSessionRuntime: (accountNumber, sessionId) =>
    getImportSessionRuntime(get(), accountNumber, sessionId, Date.now()),

  getAccountStagedSessionSummaries: (accountNumber) =>
    getAccountStagedSessionSummaries(get(), accountNumber, Date.now()),

  updateImportSettings: (partial) =>
    set((state: any) => {
      const changes: any = {};
      let changed = false;
      for (const k of Object.keys(partial || {})) {
        if (state[k] !== (partial as any)[k] && (partial as any)[k] !== undefined) {
          changes[k] = (partial as any)[k];
          changed = true;
        }
      }
      return changed ? changes : {};
    }),

  setShowIngestionBenchmark: (flag) => set({ showIngestionBenchmark: !!flag }),
});
