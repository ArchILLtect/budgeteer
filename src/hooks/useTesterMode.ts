import { useCallback, useEffect, useState } from "react";
import {
  isTesterModeEnabled,
  onTesterModeChange,
  setTesterModeEnabled,
} from "../services/testerMode";

export function useTesterModeEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const next = await isTesterModeEnabled();
      if (!cancelled) setEnabled(next);
    };

    void refresh();
    const unsub = onTesterModeChange(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return enabled;
}

export function useSetTesterModeEnabled(): (enabled: boolean) => void {
  return useCallback((enabled: boolean) => {
    void setTesterModeEnabled(enabled);
  }, []);
}
