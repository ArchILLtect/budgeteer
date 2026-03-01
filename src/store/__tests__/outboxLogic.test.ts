import { describe, expect, it } from "vitest";
import {
  computeBackoffMs,
  enqueueOutboxItem,
  pickReadyItems,
  pruneOutbox,
  recordFailure,
  recordSuccess,
  type OutboxItem,
} from "../outboxLogic";

function baseItem(overrides?: Partial<OutboxItem>): OutboxItem {
  const nowMs = 1_000;
  return {
    id: "ob_1",
    kind: "test",
    dedupeKey: "k1",
    payload: { a: 1 },
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    attemptCount: 0,
    nextAttemptAtMs: null,
    lastError: null,
    status: "pending",
    ...overrides,
  };
}

describe("outboxLogic", () => {
  it("computeBackoffMs grows and caps", () => {
    expect(computeBackoffMs(1)).toBe(2000);
    expect(computeBackoffMs(2)).toBe(4000);
    expect(computeBackoffMs(3)).toBe(8000);
    expect(computeBackoffMs(100)).toBeLessThanOrEqual(5 * 60_000);
  });

  it("enqueueOutboxItem dedupes by dedupeKey", () => {
    const now1 = 10_000;
    const now2 = 20_000;

    const r1 = enqueueOutboxItem([], { kind: "a", dedupeKey: "k", payload: { n: 1 }, nowMs: now1 });
    expect(r1.items).toHaveLength(1);

    const r2 = enqueueOutboxItem(r1.items, { kind: "a", dedupeKey: "k", payload: { n: 2 }, nowMs: now2 });
    expect(r2.items).toHaveLength(1);
    expect(r2.items[0]!.payload).toEqual({ n: 2 });
    expect(r2.items[0]!.createdAtMs).toBe(now1);
  });

  it("pickReadyItems respects nextAttemptAtMs", () => {
    const items: OutboxItem[] = [
      baseItem({ id: "a", nextAttemptAtMs: null }),
      baseItem({ id: "b", nextAttemptAtMs: 2000 }),
      baseItem({ id: "c", nextAttemptAtMs: 5000 }),
    ];

    const readyAt3s = pickReadyItems(items, 3000, 10).map((x) => x.id);
    expect(readyAt3s).toEqual(["a", "b"]);
  });

  it("recordFailure schedules retry and eventually marks dead", () => {
    const now = 10_000;
    const state = { items: [baseItem({ id: "x" })], maxItems: 50, maxAttempts: 3 };

    const after1 = recordFailure(state, "x", now, "nope");
    expect(after1[0]!.attemptCount).toBe(1);
    expect(after1[0]!.nextAttemptAtMs).toBe(now + 2000);
    expect(after1[0]!.status).toBe("pending");

    const after2 = recordFailure({ ...state, items: after1 }, "x", now + 1, "nope2");
    expect(after2[0]!.attemptCount).toBe(2);
    expect(after2[0]!.status).toBe("pending");

    const after3 = recordFailure({ ...state, items: after2 }, "x", now + 2, "nope3");
    expect(after3[0]!.attemptCount).toBe(3);
    expect(after3[0]!.status).toBe("dead");
    expect(after3[0]!.nextAttemptAtMs).toBe(null);
  });

  it("pruneOutbox keeps pending before dead", () => {
    const items: OutboxItem[] = [
      baseItem({ id: "dead1", status: "dead" }),
      baseItem({ id: "p1", status: "pending" }),
      baseItem({ id: "p2", status: "pending" }),
      baseItem({ id: "dead2", status: "dead" }),
    ];

    const pruned = pruneOutbox({ items, maxItems: 2, maxAttempts: 8 });
    expect(pruned.map((x) => x.id)).toEqual(["p1", "p2"]);
  });

  it("recordSuccess removes item", () => {
    const items: OutboxItem[] = [baseItem({ id: "a" }), baseItem({ id: "b" })];
    const next = recordSuccess(items, "a");
    expect(next.map((x) => x.id)).toEqual(["b"]);
  });
});
