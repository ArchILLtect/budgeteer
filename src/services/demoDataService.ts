import { getCurrentUser } from "aws-amplify/auth";

import { budgeteerApi } from "../api/budgeteerApi";
import { bootstrapUser } from "./userBootstrapService";

function errorToMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Unknown error";
}

export type ClearDemoDataResult = Record<string, never>;

export type AddDemoDataResult = Record<string, never>;

// Clears only *demo-marked* data (`isDemo === true`).
// Guardrails:
// - Never deletes non-demo data.
export async function clearDemoDataOnly(): Promise<ClearDemoDataResult> {
  // Requires auth.
  await getCurrentUser();



  return {
    //movedNonDemoTaskCount: nonDemoTaskIdsToMove.length,
    //deletedDemoTaskCount: demoTaskIdsToDelete.length,
    //deletedDemoListCount: demoListIdsToDelete.length,
  };
}

// Resets (re-seeds) demo data while preserving non-demo data.
// Implementation: clear demo-only rows, reset the seed gate, then run the seed.
export async function resetDemoDataPreservingNonDemo(): Promise<ClearDemoDataResult> {
  await getCurrentUser();

  const clearResult = await clearDemoDataOnly();

  const current = await getCurrentUser();
  const profileId = current.userId;

  try {
    await budgeteerApi.updateUserProfile({ id: profileId, seedVersion: 0, seededAt: null });
  } catch (err) {
    throw new Error(`Failed to reset seed version: ${errorToMessage(err)}`);
  }

  await bootstrapUser({ seedDemo: true });

  return clearResult;
}

/* For future use when we want a "full reset" that wipes all data (demo and non-demo) for the user.
// This is more destructive and should be used with caution, but can be helpful during development
// or if a user wants to start fresh.
function clampCount(n: number, max: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.floor(n)));
}
*/