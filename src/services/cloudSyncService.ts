import { budgeteerApi } from "../api/budgeteerApi";
import { getOrCreateDeviceId } from "./deviceIdentity";
import { syncLockService } from "./syncLockService";

export type SyncNowResult =
  | { ok: true }
  | { ok: false; reason: "no-device" | "locked" | "error"; message: string };

// NOTE:
// This is an intentionally small, safe first step toward cloud sync.
// Today it syncs only the UserProfile (lastSeenAt/lastDeviceId + a read probe).
// As Accounts/Transactions cloud models land, this function becomes the orchestrator
// for pull/push + outbox.
export async function runSyncNow(profileId: string): Promise<SyncNowResult> {
  const deviceId = getOrCreateDeviceId();
  if (!deviceId) {
    return { ok: false, reason: "no-device", message: "Unable to access local storage for device identity." };
  }

  const acquired = syncLockService.tryAcquire({ ownerDeviceId: deviceId, ttlMs: 60_000 });
  if (!acquired.ok) {
    return {
      ok: false,
      reason: "locked",
      message: "Sync is already running in another tab/device.",
    };
  }

  try {
    const nowIso = new Date().toISOString();

    // Pull probe (auth + API reachability).
    await budgeteerApi.getUserProfile(profileId);

    // Push a minimal "last seen" marker.
    await budgeteerApi.updateUserProfile({ id: profileId, lastSeenAt: nowIso, lastDeviceId: deviceId });

    return { ok: true };
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Sync failed.";
    return { ok: false, reason: "error", message };
  } finally {
    syncLockService.release({ token: acquired.lock.token, ownerDeviceId: deviceId });
  }
}
