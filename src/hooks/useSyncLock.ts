import { useMemo, useSyncExternalStore } from "react";
import { syncLockService, type SyncLockRecord } from "../services/syncLockService";

export function useSyncLockRaw(): string {
  return useSyncExternalStore(syncLockService.subscribe, syncLockService.getSnapshotRaw, syncLockService.getSnapshotRaw);
}

export function useSyncLock(): SyncLockRecord | null {
  const raw = useSyncLockRaw();
  return useMemo(() => {
    if (!raw) return null;
    // Use the service's parser/expiry handling by reading via getLock.
    // This ensures we don't keep stale/expired locks around.
    return syncLockService.getLock();
  }, [raw]);
}
