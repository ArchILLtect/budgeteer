import { getCurrentUser } from "aws-amplify/auth";

import { budgeteerApi } from "../api/budgeteerApi";
import { useAccountMappingsStore } from "../store/accountMappingsStore";
import { useBudgetStore } from "../store/budgetStore";
import { useTxStrongKeyOverridesStore } from "../store/txStrongKeyOverridesStore";
import { useUpdatesStore } from "../store/updatesStore";
import { useUserUICacheStore } from "./userUICacheStore";

function errorToMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Unknown error";
}

export type ClearDemoDataResult = Record<string, never>;

export type AddDemoDataResult = Record<string, never>;

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

// Removes locally stored sample/demo data for this user on this device.
// Note: In MVP we do not track per-record "demo" ownership, so this clears the local stores
// that hold budget/import/planner state rather than selectively deleting demo-marked rows.
export async function clearDemoDataOnly(): Promise<ClearDemoDataResult> {
  // Requires auth.
  await getCurrentUser();

  await Promise.all([
    clearAndResetStore(useBudgetStore),
    clearAndResetStore(useUpdatesStore),
    clearAndResetStore(useUserUICacheStore),
    clearAndResetStore(useAccountMappingsStore),
    clearAndResetStore(useTxStrongKeyOverridesStore),
  ]);

  // Reset the seed gate so sample/demo seeding can run again if the user re-enables it later.
  const current = await getCurrentUser();
  const profileId = current.userId;
  try {
    await budgeteerApi.updateUserProfile({ id: profileId, seedVersion: 0, seededAt: null });
  } catch (err) {
    throw new Error(`Failed to reset seed version: ${errorToMessage(err)}`);
  }

  return {};
}

/* For future use when we want a "full reset" that wipes all data (demo and non-demo) for the user.
// This is more destructive and should be used with caution, but can be helpful during development
// or if a user wants to start fresh.
function clampCount(n: number, max: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.floor(n)));
}
*/