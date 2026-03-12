import { idbGetItem, idbRemoveItem, idbSetItem } from "./indexedDbKeyValue";

export const TESTER_MODE_ENABLED_KEY = "budgeteer:testerModeEnabled:v1" as const;
export const TESTER_MODE_CHANGED_EVENT = "budgeteer:testerModeChanged" as const;

function emitChange(): void {
  try {
    window.dispatchEvent(new Event(TESTER_MODE_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

export function shouldEnableTesterModeFromSearch(search: string): boolean {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    const raw = params.get("tester") ?? params.get("testerMode") ?? params.get("invite");
    if (!raw) return false;
    const v = raw.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  } catch {
    return false;
  }
}

export async function isTesterModeEnabled(): Promise<boolean> {
  try {
    return (await idbGetItem(TESTER_MODE_ENABLED_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setTesterModeEnabled(enabled: boolean): Promise<void> {
  try {
    await idbSetItem(TESTER_MODE_ENABLED_KEY, enabled ? "1" : "0");
  } finally {
    emitChange();
  }
}

export async function clearTesterModeEnabled(): Promise<void> {
  try {
    await idbRemoveItem(TESTER_MODE_ENABLED_KEY);
  } finally {
    emitChange();
  }
}

export function onTesterModeChange(cb: () => void): () => void {
  const handler = () => cb();
  try {
    window.addEventListener(TESTER_MODE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(TESTER_MODE_CHANGED_EVENT, handler);
  } catch {
    return () => {
      // ignore
    };
  }
}
