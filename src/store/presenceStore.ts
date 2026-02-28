import { create } from "zustand";

export type PresenceStatus = "unknown" | "online" | "offline";

export type PresenceState = {
  status: PresenceStatus;
  lastAttemptAtMs: number | null;
  lastOkAtMs: number | null;
  lastError: string | null;
  consecutiveFailures: number;

  recordAttempt: () => void;
  recordOk: () => void;
  recordFailure: (message: string) => void;
  setOffline: (message?: string) => void;
  reset: () => void;
};

export const usePresenceStore = create<PresenceState>()((set) => ({
  status: "unknown",
  lastAttemptAtMs: null,
  lastOkAtMs: null,
  lastError: null,
  consecutiveFailures: 0,

  recordAttempt: () => set({ lastAttemptAtMs: Date.now() }),

  recordOk: () =>
    set({
      status: "online",
      lastOkAtMs: Date.now(),
      lastError: null,
      consecutiveFailures: 0,
    }),

  recordFailure: (message: string) =>
    set((prev) => {
      const nextFailures = (prev.consecutiveFailures ?? 0) + 1;
      // Avoid flapping on a single transient failure.
      const shouldShowOffline = nextFailures >= 2;
      return {
        status: shouldShowOffline ? "offline" : prev.status,
        lastError: message,
        consecutiveFailures: nextFailures,
      };
    }),

  setOffline: (message) =>
    set({
      status: "offline",
      lastError: message ?? null,
      consecutiveFailures: Math.max(2, 0),
    }),

  reset: () =>
    set({
      status: "unknown",
      lastAttemptAtMs: null,
      lastOkAtMs: null,
      lastError: null,
      consecutiveFailures: 0,
    }),
}));
