import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createUserScopedZustandStorage } from "../services/userScopedStorage";

import {
  enqueueOutboxItem,
  pickReadyItems,
  pruneOutbox,
  recordAttempt,
  recordFailure,
  recordSuccess,
  type OutboxItem,
} from "./outboxLogic";

export const OUTBOX_STORE_VERSION = 1 as const;

export type OutboxState = {
  items: OutboxItem[];

  maxItems: number;
  maxAttempts: number;

  enqueue: (input: { kind: string; dedupeKey: string; payload: unknown; preferReplace?: boolean }) => OutboxItem;
  remove: (id: string) => void;
  clear: () => void;

  pickReady: (opts?: { limit?: number; nowMs?: number }) => OutboxItem[];

  recordAttempt: (id: string) => void;
  recordSuccess: (id: string) => void;
  recordFailure: (id: string, message: string) => void;

  prune: () => void;
};

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set, get) => ({
      items: [],

      maxItems: 500,
      maxAttempts: 8,

      enqueue: (input) => {
        const nowMs = Date.now();
        const res = enqueueOutboxItem(get().items, {
          kind: input.kind,
          dedupeKey: input.dedupeKey,
          payload: input.payload,
          nowMs,
          preferReplace: input.preferReplace,
        });
        set({ items: pruneOutbox({ items: res.items, maxItems: get().maxItems, maxAttempts: get().maxAttempts }) });
        return res.item;
      },

      remove: (id) => {
        set({ items: get().items.filter((x) => x.id !== id) });
      },

      clear: () => {
        set({ items: [] });
      },

      pickReady: (opts) => {
        const nowMs = typeof opts?.nowMs === "number" ? opts.nowMs : Date.now();
        const limit = Math.max(1, Math.floor(opts?.limit ?? 25));
        return pickReadyItems(get().items, nowMs, limit);
      },

      recordAttempt: (id) => {
        set({ items: recordAttempt(get().items, id, Date.now()) });
      },

      recordSuccess: (id) => {
        set({ items: recordSuccess(get().items, id) });
      },

      recordFailure: (id, message) => {
        const nowMs = Date.now();
        const state = get();
        const nextItems = recordFailure(
          { items: state.items, maxItems: state.maxItems, maxAttempts: state.maxAttempts },
          id,
          nowMs,
          message
        );
        set({ items: nextItems });
      },

      prune: () => {
        const state = get();
        set({ items: pruneOutbox({ items: state.items, maxItems: state.maxItems, maxAttempts: state.maxAttempts }) });
      },
    }),
    {
      name: "budgeteer:outbox",
      storage: createUserScopedZustandStorage(),
      version: OUTBOX_STORE_VERSION,
      partialize: (state) => ({
        items: state.items,
        maxItems: state.maxItems,
        maxAttempts: state.maxAttempts,
      }),
    }
  )
);
