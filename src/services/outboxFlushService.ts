import { useOutboxStore } from "../store/outboxStore";
import type { OutboxItem } from "../store/outboxLogic";

export type OutboxExecutor = (item: OutboxItem) => Promise<void>;

export type FlushOutboxResult = {
  attempted: number;
  succeeded: number;
  failed: number;
};

// Flushes ready items sequentially.
// Intentionally simple: retries/backoff are handled by the store's failure recording.
export async function flushOutbox(execute: OutboxExecutor, opts?: { limit?: number }): Promise<FlushOutboxResult> {
  const limit = Math.max(1, Math.floor(opts?.limit ?? 25));

  let attempted = 0;
  let succeeded = 0;
  let failed = 0;

  const store = useOutboxStore;

  const ready = store.getState().pickReady({ limit });
  for (const item of ready) {
    attempted += 1;
    store.getState().recordAttempt(item.id);

    try {
      await execute(item);
      store.getState().recordSuccess(item.id);
      succeeded += 1;
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Outbox item failed.";
      store.getState().recordFailure(item.id, message);
      failed += 1;
    }
  }

  return { attempted, succeeded, failed };
}
