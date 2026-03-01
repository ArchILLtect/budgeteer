export type OutboxItemStatus = "pending" | "dead";

export type OutboxItem = {
  id: string;
  kind: string;
  dedupeKey: string;
  payload: unknown;

  createdAtMs: number;
  updatedAtMs: number;

  attemptCount: number;
  nextAttemptAtMs: number | null;
  lastError: string | null;
  status: OutboxItemStatus;
};

export type OutboxStateLike = {
  items: OutboxItem[];
  maxItems: number;
  maxAttempts: number;
};

export function computeBackoffMs(attemptCount: number): number {
  // attemptCount is 1-based after a failure is recorded.
  const baseMs = 2_000;
  const capMs = 5 * 60_000;
  const exp = Math.min(10, Math.max(0, attemptCount - 1));
  const ms = baseMs * Math.pow(2, exp);
  return Math.min(capMs, Math.floor(ms));
}

export function isReady(item: OutboxItem, nowMs: number): boolean {
  if (item.status !== "pending") return false;
  if (item.nextAttemptAtMs == null) return true;
  return item.nextAttemptAtMs <= nowMs;
}

export function pickReadyItems(items: OutboxItem[], nowMs: number, limit: number): OutboxItem[] {
  const ready = items.filter((it) => isReady(it, nowMs));
  return ready.slice(0, Math.max(0, limit));
}

function makeId(nowMs: number): string {
  // Deterministic-ish unique ID without external deps.
  return `ob_${nowMs.toString(16)}_${Math.random().toString(16).slice(2)}`;
}

export function enqueueOutboxItem(
  items: OutboxItem[],
  input: {
    kind: string;
    dedupeKey: string;
    payload: unknown;
    nowMs: number;
    preferReplace?: boolean;
  }
): { items: OutboxItem[]; item: OutboxItem } {
  const nowMs = input.nowMs;
  const existingIdx = items.findIndex((x) => x.dedupeKey === input.dedupeKey);

  const nextItem: OutboxItem = {
    id: existingIdx >= 0 ? items[existingIdx]!.id : makeId(nowMs),
    kind: input.kind,
    dedupeKey: input.dedupeKey,
    payload: input.payload,
    createdAtMs: existingIdx >= 0 ? items[existingIdx]!.createdAtMs : nowMs,
    updatedAtMs: nowMs,
    attemptCount: existingIdx >= 0 ? items[existingIdx]!.attemptCount : 0,
    nextAttemptAtMs: existingIdx >= 0 ? items[existingIdx]!.nextAttemptAtMs : null,
    lastError: existingIdx >= 0 ? items[existingIdx]!.lastError : null,
    status: "pending",
  };

  if (existingIdx >= 0) {
    const existing = items[existingIdx]!;
    // If the payload hasn't changed, avoid creating churn.
    const samePayload = JSON.stringify(existing.payload) === JSON.stringify(nextItem.payload);
    if (samePayload && !input.preferReplace) {
      return { items, item: existing };
    }

    const next = items.slice();
    next[existingIdx] = nextItem;
    return { items: next, item: nextItem };
  }

  // New items are unshifted so the newest are attempted first.
  return { items: [nextItem, ...items], item: nextItem };
}

export function recordAttempt(items: OutboxItem[], id: string, nowMs: number): OutboxItem[] {
  const idx = items.findIndex((x) => x.id === id);
  if (idx < 0) return items;
  const prev = items[idx]!;
  const next: OutboxItem = { ...prev, updatedAtMs: nowMs };
  const out = items.slice();
  out[idx] = next;
  return out;
}

export function recordSuccess(items: OutboxItem[], id: string): OutboxItem[] {
  return items.filter((x) => x.id !== id);
}

export function recordFailure(
  state: OutboxStateLike,
  id: string,
  nowMs: number,
  message: string
): OutboxItem[] {
  const idx = state.items.findIndex((x) => x.id === id);
  if (idx < 0) return state.items;

  const prev = state.items[idx]!;
  const nextAttemptCount = (prev.attemptCount ?? 0) + 1;

  if (nextAttemptCount >= state.maxAttempts) {
    const dead: OutboxItem = {
      ...prev,
      status: "dead",
      attemptCount: nextAttemptCount,
      lastError: message,
      nextAttemptAtMs: null,
      updatedAtMs: nowMs,
    };
    const out = state.items.slice();
    out[idx] = dead;
    return out;
  }

  const next: OutboxItem = {
    ...prev,
    status: "pending",
    attemptCount: nextAttemptCount,
    lastError: message,
    nextAttemptAtMs: nowMs + computeBackoffMs(nextAttemptCount),
    updatedAtMs: nowMs,
  };

  const out = state.items.slice();
  out[idx] = next;
  return out;
}

export function pruneOutbox(state: OutboxStateLike): OutboxItem[] {
  const maxItems = Math.max(0, Math.floor(state.maxItems || 0) || 0);
  if (maxItems <= 0) return [];

  // Prefer keeping pending items over dead ones.
  const pending = state.items.filter((x) => x.status === "pending");
  const dead = state.items.filter((x) => x.status !== "pending");

  const next = [...pending, ...dead];
  return next.slice(0, maxItems);
}
