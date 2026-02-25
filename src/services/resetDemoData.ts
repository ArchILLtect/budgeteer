import { getCurrentUser } from "aws-amplify/auth";

import { budgeteerApi } from "../api/budgeteerApi";
import { bootstrapUser } from "./userBootstrapService";
import { useUpdatesStore } from "../store/updatesStore";
import { useBudgetStore } from "../store/budgetStore";
import { useLocalSettingsStore } from "../store/localSettingsStore";
import { useUserUICacheStore } from "./userUICacheStore";
import { clearUserScopedKeysByPrefix, userScopedRemoveItem } from "./userScopedStorage";
import { DEMO_MODE_OPT_IN_KEY } from "./demoModeOptIn";
import { DEMO_TOUR_SEEN_KEY } from "./demoTour";
import { SEED_DEMO_PREF_KEY } from "./seedDemoPreference";
import { WELCOME_MODAL_PREF_KEY } from "./welcomeModalPreference";

function errorToMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Unknown error";
}

type StoreWithPersist = {
  getInitialState: () => any;
  setState: (...args: any[]) => any;
  persist?: {
    clearStorage?: () => void | Promise<void>;
  };
};

async function clearAndResetStore(store: StoreWithPersist): Promise<void> {
  try {
    await store.persist?.clearStorage?.();
  } catch {
    // ignore
  }

  try {
    store.setState(store.getInitialState(), true);
  } catch {
    // ignore
  }
}


export async function resetDemoData(): Promise<void> {
  // Requires auth; keep this helper strict so callers can surface a clear message.
  await getCurrentUser();

  // MVP semantics: "reset to square one".
  // Clear persisted per-user state and reset in-memory stores so the UI updates immediately.
  await Promise.all([
    clearAndResetStore(useUpdatesStore),
    clearAndResetStore(useLocalSettingsStore),
    clearAndResetStore(useBudgetStore),
    clearAndResetStore(useUserUICacheStore),
  ]);

  // Clear per-user localStorage keys that are not part of a zustand store.
  try {
    clearUserScopedKeysByPrefix("tip:");
    userScopedRemoveItem(DEMO_MODE_OPT_IN_KEY);
    userScopedRemoveItem(DEMO_TOUR_SEEN_KEY);
    userScopedRemoveItem(SEED_DEMO_PREF_KEY);
    userScopedRemoveItem(WELCOME_MODAL_PREF_KEY);
    userScopedRemoveItem("welcomeModalLastShownAtMs");
  } catch {
    // ignore
  }

  // 4) Reset seed gate so demo seed can run again.
  // NOTE: We rely on bootstrapUser() to claim + seed safely (multi-tab safe).
  const current = await getCurrentUser();
  const profileId = current.userId;
  try {
    await budgeteerApi.updateUserProfile({ id: profileId, seedVersion: 0, seededAt: null });
  } catch (err) {
    throw new Error(`Failed to reset seed version: ${errorToMessage(err)}`);
  }

  // 5) Re-seed demo dataset
  await bootstrapUser({ seedDemo: true });

  // 6) Clear updates again so seed events don't flood the feed
  await clearAndResetStore(useUpdatesStore);
}
