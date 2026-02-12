export type ImportHistoryEntry = {
  sessionId: string;
  accountNumber: string;
  importedAt: string; // ISO
  newCount: number;
  dupesExisting?: number;
  dupesIntraFile?: number;
  savingsCount?: number;
  hash: string;
  undoneAt?: string; // ISO
  removed?: number;
};

export type TransactionForImportLifecycle = {
  id: string;
  date?: string;
  staged?: boolean;
  budgetApplied?: boolean;
  importSessionId?: string;
  [key: string]: unknown;
};

export type AccountForImportLifecycle = {
  id?: string;
  transactions?: TransactionForImportLifecycle[];
  [key: string]: unknown;
};

export type PendingSavingsQueueEntry = {
  month?: string;
  importSessionId?: string;
  [key: string]: unknown;
};

export type ImportLifecycleState = {
  accounts: Record<string, AccountForImportLifecycle>;
  pendingSavingsByAccount: Record<string, PendingSavingsQueueEntry[]>;
  savingsReviewQueue?: unknown[];

  importHistory: ImportHistoryEntry[];
  importUndoWindowMinutes: number;
  importHistoryMaxEntries: number;
  importHistoryMaxAgeDays: number;
  stagedAutoExpireDays: number;
};

export type ImportSessionRuntime = {
  stagedNow: number;
  appliedCount: number;
  removed: number;
  canUndo: boolean;
  expired: boolean;
  status:
    | "active"
    | "expired"
    | "applied"
    | "partial-applied"
    | "undone"
    | "partial-undone";
  expiresAt: number | null;
  importedAt: string;
  newCount: number;
  savingsCount?: number;
  hash?: string;
};

export function recordImportHistory(
  existing: ImportHistoryEntry[],
  entry: ImportHistoryEntry,
  maxEntries: number
): ImportHistoryEntry[] {
  const filtered = (existing ?? []).filter((e) => e.sessionId !== entry.sessionId);
  return [entry, ...filtered].slice(0, maxEntries);
}

export function pruneImportHistory(
  existing: ImportHistoryEntry[],
  maxEntries: number,
  maxAgeDays: number,
  nowMs: number
): ImportHistoryEntry[] {
  const cutoff = nowMs - maxAgeDays * 86400000;
  const pruned = (existing ?? [])
    .filter((h) => {
      const t = Date.parse(h.importedAt);
      return Number.isFinite(t) ? t >= cutoff : true;
    })
    .slice(0, maxEntries);

  return pruned;
}

export function getImportSessionRuntime(
  state: Pick<
    ImportLifecycleState,
    "accounts" | "importHistory" | "importUndoWindowMinutes"
  >,
  accountNumber: string,
  sessionId: string,
  nowMs: number
): ImportSessionRuntime | null {
  const hist = (state.importHistory ?? []).find(
    (h) => h.sessionId === sessionId && h.accountNumber === accountNumber
  );
  if (!hist) return null;

  const acct = state.accounts?.[accountNumber];
  const transactions = acct?.transactions ?? [];

  const stagedNow = transactions.filter(
    (t) => t.importSessionId === sessionId && !!t.staged
  ).length;

  const removed = hist.removed || 0;
  const appliedCount = (hist.newCount || 0) - stagedNow - removed;

  const importedAtMs = Date.parse(hist.importedAt);
  const undoWindowMinutes = state.importUndoWindowMinutes || 30;
  const expiresAt = Number.isFinite(importedAtMs)
    ? importedAtMs + undoWindowMinutes * 60000
    : null;

  const expired = expiresAt ? nowMs > expiresAt : false;
  const canUndo = !hist.undoneAt && !expired && stagedNow > 0;

  let status: ImportSessionRuntime["status"];
  if (hist.undoneAt) {
    status =
      removed > 0 && removed < hist.newCount ? "partial-undone" : "undone";
  } else if (stagedNow > 0) {
    status = expired ? "expired" : "active";
  } else {
    status = appliedCount === hist.newCount ? "applied" : "partial-applied";
  }

  return {
    stagedNow,
    appliedCount,
    removed,
    canUndo,
    expired,
    status,
    expiresAt,
    importedAt: hist.importedAt,
    newCount: hist.newCount,
    savingsCount: hist.savingsCount,
    hash: hist.hash,
  };
}

export function getAccountStagedSessionSummaries(
  state: Pick<ImportLifecycleState, "accounts" | "importHistory" | "importUndoWindowMinutes">,
  accountNumber: string,
  nowMs: number
): Array<{ sessionId: string; count: number } & Partial<ImportSessionRuntime>> {
  const acct = state.accounts?.[accountNumber];
  const txns = acct?.transactions ?? [];
  if (!txns.length) return [];

  const bySession = new Map<string, number>();
  for (const tx of txns) {
    if (tx.staged && tx.importSessionId) {
      bySession.set(tx.importSessionId, (bySession.get(tx.importSessionId) || 0) + 1);
    }
  }

  return Array.from(bySession.entries())
    .map(([sessionId, count]) => {
      const r = getImportSessionRuntime(state, accountNumber, sessionId, nowMs);
      return { sessionId, count, ...(r ?? {}) };
    })
    .sort((a, b) => (b.importedAt || "").localeCompare(a.importedAt || ""));
}

export function undoStagedImport(
  state: Pick<
    ImportLifecycleState,
    | "accounts"
    | "pendingSavingsByAccount"
    | "importHistory"
    | "importUndoWindowMinutes"
  >,
  accountNumber: string,
  sessionId: string,
  nowMs: number
): Partial<ImportLifecycleState> {
  const acct = state.accounts?.[accountNumber];
  const transactions = acct?.transactions;
  if (!transactions) return {};

  const hist = (state.importHistory ?? []).find(
    (h) => h.sessionId === sessionId && h.accountNumber === accountNumber
  );
  if (!hist) return {};
  if (hist.undoneAt) return {};

  const windowMs = (state.importUndoWindowMinutes || 30) * 60000;
  const importedTime = Date.parse(hist.importedAt);
  if (Number.isFinite(importedTime) && nowMs - importedTime > windowMs) {
    return {};
  }

  let removed = 0;
  const remainingTx = transactions.filter((tx) => {
    const match = tx.importSessionId === sessionId && !!tx.staged;
    if (match) removed += 1;
    return !match;
  });

  if (!removed) return {};

  const pending = state.pendingSavingsByAccount?.[accountNumber] || [];
  const remainingPending = pending.filter((e) => e.importSessionId !== sessionId);

  const importHistory = (state.importHistory ?? []).map((h) =>
    h.sessionId === sessionId && h.accountNumber === accountNumber && !h.undoneAt
      ? { ...h, undoneAt: new Date(nowMs).toISOString(), removed }
      : h
  );

  return {
    accounts: {
      ...state.accounts,
      [accountNumber]: { ...acct, transactions: remainingTx },
    },
    pendingSavingsByAccount: {
      ...state.pendingSavingsByAccount,
      [accountNumber]: remainingPending,
    },
    importHistory,
  };
}

export function expireOldStagedTransactions(
  state: Pick<
    ImportLifecycleState,
    "accounts" | "importHistory" | "stagedAutoExpireDays"
  >,
  maxAgeDays: number,
  nowMs: number
): Partial<ImportLifecycleState> {
  const effectiveDays = state.stagedAutoExpireDays || maxAgeDays;
  const cutoff = nowMs - effectiveDays * 86400000;

  let changed = false;
  const accounts = { ...state.accounts };

  for (const acctNum of Object.keys(accounts)) {
    const acct = accounts[acctNum];
    const txns = acct?.transactions;
    if (!txns) continue;

    let acctChanged = false;
    const nextTxns = txns.map((tx) => {
      if (tx.staged && !tx.budgetApplied) {
        const hist = (state.importHistory ?? []).find(
          (h) => h.sessionId === tx.importSessionId
        );
        if (hist) {
          const t = Date.parse(hist.importedAt);
          if (Number.isFinite(t) && t < cutoff) {
            changed = true;
            acctChanged = true;
            return {
              ...tx,
              staged: false,
              budgetApplied: true,
              autoApplied: true,
            };
          }
        }
      }
      return tx;
    });

    if (acctChanged) {
      accounts[acctNum] = { ...acct, transactions: nextTxns };
    }
  }

  return changed ? { accounts } : {};
}
