import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

import type { AuthUserLike } from "../types";
import { resetUserSessionState } from "../store/clearUserCaches";
import { setUserStorageScopeKey, userScopedGetItem } from "../services/userScopedStorage";
import { requestOpenWelcomeModal } from "../services/welcomeModalPreference";
import { useUserUICacheStore } from "../services/userUICacheStore";
import { useBudgetStore } from "../store/budgetStore";
import { useLocalSettingsStore } from "../store/localSettingsStore";
import { useUpdatesStore } from "../store/updatesStore";
import { useOutboxStore } from "../store/outboxStore";
import { recordAuthTiming } from "../services/perfLogger";
//import { clearDemoSessionActive } from "../services/demoSession";

type StoreWithOptionalInitial = {
  getInitialState?: () => unknown;
  setState?: (state: unknown, replace?: boolean) => void;
};

function tryResetStoreToInitial(store: unknown): void {
  if (store == null) return;
  if (typeof store !== "function" && typeof store !== "object") return;

  const maybe = store as StoreWithOptionalInitial;
  const initial = typeof maybe.getInitialState === "function" ? maybe.getInitialState() : null;
  if (initial == null) return;
  if (typeof maybe.setState !== "function") return;

  maybe.setState(initial, true);
}

function isNotSignedInError(err: unknown): boolean {
  const name = typeof err === "object" && err !== null && "name" in err ? String((err as { name: unknown }).name) : "";
  return (
    name === "UserUnAuthenticatedException" ||
    name === "NotAuthorizedException" ||
    name === "NotAuthenticatedException" ||
    name === "NoCurrentUser"
  );
}

export function useAuthUser(): {
  user: AuthUserLike | null;
  loading: boolean;
  signedIn: boolean;
  signOutWithCleanup: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [user, setUser] = useState<AuthUserLike | null>(null);
  const [loading, setLoading] = useState(true);
  const lastAppliedScopeKeyRef = useRef<string | null>(null);
  const lastWelcomeLoginRequestAtRef = useRef(0);

  const signedIn = useMemo(() => Boolean(user?.userId || user?.username), [user?.userId, user?.username]);

  const applyScope = useCallback((authKey: string | null) => {
    // Demo sessions are global (not user-scoped). Clear them on sign-out so they can't
    // accidentally affect the next user on a shared browser.
    if (!authKey) {
      //clearDemoSessionActive(); TODO(P4): Add this back when we have a demo session to clear
    }

    // Persist the last known signed-in identity so user-scoped storage reads are correct
    // even before auth resolves on the next page load.
    setUserStorageScopeKey(authKey);

    const hasPersistedForCurrentScope = (persistName: string): boolean => {
      try {
        return userScopedGetItem(`zustand:${persistName}`) != null;
      } catch {
        return false;
      }
    };

    // If we're switching to a *new* signed-in user who has never persisted a given store yet,
    // Zustand's `rehydrate()` can merge `null` into the existing in-memory state, leaving
    // the previous user's data visible until a full page refresh.
    //
    // Fix: when a scope changes and there's no persisted state for that scope, reset
    // the in-memory store back to its initial defaults *before* rehydration.
    if (authKey && authKey !== lastAppliedScopeKeyRef.current) {
      const resetStoreIfMissing = (persistName: string, store: unknown) => {
        const hasPersisted = userScopedGetItem(`zustand:${persistName}`) != null;
        if (hasPersisted) return;

        tryResetStoreToInitial(store);
      };

      resetStoreIfMissing("budgeteer:budgetStore", useBudgetStore);
      resetStoreIfMissing("budgeteer:user", useUserUICacheStore);
      resetStoreIfMissing("budgeteer:localSettings", useLocalSettingsStore);
      resetStoreIfMissing("budgeteer:updates", useUpdatesStore);
      resetStoreIfMissing("budgeteer:outbox", useOutboxStore);
    }

    // IMPORTANT:
    // - On sign-in / scope switches, do NOT reset persisted user-scoped stores here.
    //   Doing so can overwrite the newly-selected scope with defaults before rehydrate.
    // - On sign-out, we do reset in-memory state so the UI doesn't retain authed data.
    if (!authKey) {
      // NOTE:
      // When signed out, the current scope becomes `anonymous`.
      // If anonymous has persisted state (e.g. demo mode used without auth), resetting the
      // store here would immediately overwrite that persisted state with defaults before
      // we get a chance to rehydrate.
      const hasAnonymousBudget = hasPersistedForCurrentScope("budgeteer:budgetStore");

      // Clear authed state from in-memory stores so signed-out screens (or the next
      // login) can't briefly show previous-user data.
      try {
        // Prefer a full replace with Zustand's initial state.
        // If the runtime store doesn't expose it (unexpected), skip the reset rather than
        // risking a stale/partial hard-coded default.
        if (!hasAnonymousBudget) {
          tryResetStoreToInitial(useBudgetStore);
        }
      } catch {
        // ignore
      }

      resetUserSessionState();
    }

    lastAppliedScopeKeyRef.current = authKey;

    // Rehydrate persisted stores against the *current* scope.
    try {
      // void <store>.persist.rehydrate();
      void useUserUICacheStore.persist.rehydrate();
      const budgetRehydrate = useBudgetStore.persist.rehydrate();
      void Promise.resolve(budgetRehydrate)
        .then(() => {
          try {
            useBudgetStore.getState().runImportMaintenance?.();
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // ignore
        });
      void useLocalSettingsStore.persist.rehydrate();
      void useUpdatesStore.persist.rehydrate();
      void useOutboxStore.persist.rehydrate();
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    const startedAt = performance.now();
    setLoading(true);
    try {
      const current = await getCurrentUser();
      const nextUser = { username: current.username, userId: current.userId };

      const nextKey = nextUser.userId || nextUser.username || null;
      const prevKey = lastAppliedScopeKeyRef.current;
      if (nextKey !== prevKey) {
        applyScope(nextKey);
      }

      setUser(nextUser);
      recordAuthTiming({ name: "auth:refresh", durationMs: performance.now() - startedAt, ok: true });
    } catch (err) {
      if (isNotSignedInError(err)) {
        // Ensure signed-out sessions do not keep using a previous user's scope.
        applyScope(null);
        setUser(null);
        recordAuthTiming({ name: "auth:refresh", durationMs: performance.now() - startedAt, ok: true, message: "signed-out" });
      } else {
        // Transient/non-auth errors (network hiccups, CPU pressure, etc.) should not
        // force a scope flip to anonymous. Keep the last known user/scope and log in DEV.
        if (import.meta.env.DEV) {
          console.warn("[auth] failed to resolve current user", err);
        }
        recordAuthTiming({
          name: "auth:refresh",
          durationMs: performance.now() - startedAt,
          ok: false,
          message: "refresh-failed",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [applyScope]);

  const signOutWithCleanup = useCallback(async () => {
    try {
      await amplifySignOut();
    } finally {
      // Reset current session state but keep per-user persisted caches intact.
      applyScope(null);
      setUser(null);
    }
  }, [applyScope]);

  useEffect(() => {
    void refresh();

    const cancel = Hub.listen("auth", ({ payload }) => {
      const evt = String((payload as { event?: unknown } | undefined)?.event ?? "");
      if (evt === "signIn" || evt === "signedIn") {
        // Resolve auth + apply scope; the WelcomeModal itself will handle
        // "open on login (not refresh)" via this explicit login event.
        void refresh().finally(() => {
          const now = Date.now();
          // Some environments emit both `signIn` and `signedIn` for one login.
          // Dedup so we don't re-open the modal twice.
          if (now - lastWelcomeLoginRequestAtRef.current < 2000) return;
          lastWelcomeLoginRequestAtRef.current = now;
          requestOpenWelcomeModal("login");
        });
      }
      if (evt === "signOut" || evt === "signedOut") {
        // Cache cleanup is handled by signOutWithCleanup or the global listener.
        applyScope(null);
        setUser(null);
      }
    });

    return () => {
      cancel();
    };
  }, [applyScope, refresh]);

  return { user, loading, signedIn, signOutWithCleanup, refresh };
}
