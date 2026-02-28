import { useEffect, useRef } from "react";
import { budgeteerApi } from "../api/budgeteerApi";
import { errorToMessage } from "../utils/appUtils";
import { usePresenceStore } from "../store/presenceStore";

export type PresenceHeartbeatOptions = {
  enabled: boolean;
  userId: string | null;
  intervalMs?: number;
};

export function usePresenceHeartbeat(opts: PresenceHeartbeatOptions) {
  const { enabled, userId, intervalMs = 30000 } = opts;

  const recordAttempt = usePresenceStore((s) => s.recordAttempt);
  const recordOk = usePresenceStore((s) => s.recordOk);
  const recordFailure = usePresenceStore((s) => s.recordFailure);
  const setOffline = usePresenceStore((s) => s.setOffline);
  const reset = usePresenceStore((s) => s.reset);

  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId) {
      runningRef.current = false;
      reset();
      return;
    }

    runningRef.current = true;

    const checkOnce = async () => {
      if (!runningRef.current) return;

      recordAttempt();

      // Fast-path: if the browser reports offline, reflect it immediately.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setOffline("Browser is offline");
        return;
      }

      try {
        // Lightweight authenticated GraphQL query. We don't care about the payload,
        // just whether the API is reachable with current credentials.
        await budgeteerApi.getUserProfile(userId);
        if (!runningRef.current) return;
        recordOk();
      } catch (err: unknown) {
        if (!runningRef.current) return;
        recordFailure(errorToMessage(err));
      }
    };

    const onOnline = () => {
      void checkOnce();
    };

    const onOffline = () => {
      setOffline("Browser is offline");
    };

    void checkOnce();

    const id = window.setInterval(() => {
      void checkOnce();
    }, Math.max(5000, intervalMs));

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      runningRef.current = false;
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [enabled, intervalMs, recordAttempt, recordFailure, recordOk, reset, setOffline, userId]);
}
