import { useUpdatesStore } from "./updatesStore";
import { useLocalSettingsStore } from "./localSettingsStore";
import { useBudgetStore } from "./budgetStore";
import { clearUserUIInMemoryCache } from "../services/authService";
import { useUserUICacheStore } from "../services/userUICacheStore";
import { clearUserScopedKeysByPrefix, userScopedRemoveItem } from "../services/userScopedStorage";
import { DEMO_MODE_OPT_IN_KEY } from "../services/demoModeOptIn";
import { DEMO_TOUR_SEEN_KEY } from "../services/demoTour";
import { SEED_DEMO_PREF_KEY } from "../services/seedDemoPreference";
import { WELCOME_MODAL_PREF_KEY } from "../services/welcomeModalPreference";

let resetInProgress = false;
let lastResetAtMs = 0;

export function resetUserSessionState(): void {
  // Idempotency guard: multiple sign-out paths (Hub event + manual cleanup, StrictMode, etc.)
  // can call this back-to-back.
  if (resetInProgress) return;
  const now = Date.now();
  if (now - lastResetAtMs < 250) return;
  resetInProgress = true;

  const updatesState = useUpdatesStore.getState() as unknown as { resetAll?: () => void; clearAll?: () => void };
  if (typeof updatesState.resetAll === "function") updatesState.resetAll();
  else updatesState.clearAll?.();

  // Clear module-level authService caches so a user switch doesn't show stale metadata.
  clearUserUIInMemoryCache();

  lastResetAtMs = now;
  resetInProgress = false;
}

export async function clearCurrentUserPersistedCaches(): Promise<void> {
  // Clear storage for current scope (per-user) and then reset in-memory state.
  try {
    await Promise.all([
      useUpdatesStore.persist.clearStorage(),
      useLocalSettingsStore.persist.clearStorage(),
      useBudgetStore.persist.clearStorage(),
      useUserUICacheStore.persist.clearStorage(),
    ]);

    // Clear per-user localStorage keys that are not part of a zustand store.
    clearUserScopedKeysByPrefix("tip:");
    userScopedRemoveItem(DEMO_MODE_OPT_IN_KEY);
    userScopedRemoveItem(DEMO_TOUR_SEEN_KEY);
    userScopedRemoveItem(SEED_DEMO_PREF_KEY);
    userScopedRemoveItem(WELCOME_MODAL_PREF_KEY);
    userScopedRemoveItem("welcomeModalLastShownAtMs");
  } catch {
    // ignore
  } finally {
    resetUserSessionState();
  }
}
