import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

import type { AuthUserLike } from "../types";
import { resetUserSessionState } from "../store/clearUserCaches";
import { setUserStorageScopeKey, userScopedGetItem } from "../services/userScopedStorage";
import { useUserUICacheStore } from "../services/userUICacheStore";
import { useBudgetStore } from "../store/budgetStore";
import { useLocalSettingsStore } from "../store/localSettingsStore";
import { useUpdatesStore } from "../store/updatesStore";
//import { clearDemoSessionActive } from "../services/demoSession";

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

    // If we're switching to a *new* signed-in user who has never persisted a given store yet,
    // Zustand's `rehydrate()` can merge `null` into the existing in-memory state, leaving
    // the previous user's data visible until a full page refresh.
    //
    // Fix: when a scope changes and there's no persisted state for that scope, reset
    // the in-memory store back to its initial defaults *before* rehydration.
    if (authKey && authKey !== lastAppliedScopeKeyRef.current) {
      const resetStoreIfMissing = (persistName: string, store: any) => {
        const hasPersisted = userScopedGetItem(`zustand:${persistName}`) != null;
        if (hasPersisted) return;

        try {
          const initial = store?.getInitialState?.();
          if (initial) {
            store.setState(initial, true);
          }
        } catch {
          // ignore
        }
      };

      resetStoreIfMissing("budgeteer:budgetStore", useBudgetStore);
      resetStoreIfMissing("budgeteer:user", useUserUICacheStore);
      resetStoreIfMissing("budgeteer:localSettings", useLocalSettingsStore);
      resetStoreIfMissing("budgeteer:updates", useUpdatesStore);
    }

    // IMPORTANT:
    // - On sign-in / scope switches, do NOT reset persisted user-scoped stores here.
    //   Doing so can overwrite the newly-selected scope with defaults before rehydrate.
    // - On sign-out, we do reset in-memory state so the UI doesn't retain authed data.
    if (!authKey) {
      // Clear any authed state from in-memory stores so signed-out screens (or the next
      // login) can't briefly show previous-user data.
      try {
        const initial = (useBudgetStore as any).getInitialState?.();
        if (initial) {
          useBudgetStore.setState(initial, true);
        } else {
          useBudgetStore.setState({
            user: null,
            isDemoUser: false,
            accounts: {},
            accountMappings: {},
            pendingSavingsByAccount: {},
            savingsReviewQueue: [],
            importHistory: [],
            importManifests: {},
            monthlyPlans: {},
            monthlyActuals: {},
            savingsLogs: {},
            lastIngestionTelemetry: null,
            sessionExpired: false,
            hasInitialized: false,
            isSavingsModalOpen: false,
            isConfirmModalOpen: false,
            isLoadingModalOpen: false,
            isProgressOpen: false,
            resolveSavingsPromise: null,
          } as any);
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
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
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
    } catch (err) {
      if (isNotSignedInError(err)) {
        // Ensure signed-out sessions do not keep using a previous user's scope.
        applyScope(null);
        setUser(null);
      } else {
        // Non-auth errors shouldn't brick the app; treat as signed out but log in DEV.
        applyScope(null);
        setUser(null);
        if (import.meta.env.DEV) {
          console.warn("[auth] failed to resolve current user", err);
        }
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
        // "open on login (not refresh)" based on a signed-out -> signed-in transition.
        void refresh();
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
