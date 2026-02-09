import { useEffect, useMemo, useRef } from "react";
import type { AuthUserLike } from "../types";
import { bootstrapUser } from "../services/userBootstrapService";
import { userScopedGetItem } from "../services/userScopedStorage";
//import { isSeedDemoDisabled as isSeedDemoDisabledFromPref } from "../services/seedDemoPreference";

/*
function shouldSeedDemoFromLocation(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("demo") === "1";
  } catch {
    return false;
  }
}

function shouldSeedDemoFromStorage(): boolean {
  try {
    return userScopedGetItem("seedDemo") === "1";
  } catch {
    return false;
  }
}

function shouldDisableDemoFromLocation(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("demo") === "0";
  } catch {
    return false;
  }
}

function shouldDisableDemoFromStorage(): boolean {
  // Prefer the centralized helper; keep this wrapper for compatibility.
  return isSeedDemoDisabledFromPref();
}*/

export function useBootstrapUserProfile(user?: AuthUserLike | null) {

  const didRunForUserKey = useRef<string | null>(null);

  const userKey = useMemo(() => {
    const key = user?.userId || user?.username || null;
    return key;
  }, [user?.userId, user?.username]);

  /*
  useEffect(() => {
    if (!userKey) {
      didRunForUserKey.current = null;
      return;
    }

    if (didRunForUserKey.current === userKey) return;
    didRunForUserKey.current = userKey;


    void (async () => {
      try {
        const res = await bootstrapUser({ seedDemo });
        if (res.didSeedDemo) {
          expireTaskCache();
          await refreshAll(undefined, { reason: "mutation" });
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[user bootstrap] failed", err);
        }
      }
    })();
  }, [expireTaskCache, refreshAll, userKey]);
  */
}
