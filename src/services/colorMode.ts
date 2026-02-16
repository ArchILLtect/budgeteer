export type ColorMode = "light" | "dark";

const STORAGE_KEY = "budgeteer:colorMode";

function canUseDOM(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getStoredColorMode(): ColorMode | null {
  if (!canUseDOM()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : null;
  } catch {
    return null;
  }
}

export function getPreferredColorMode(): ColorMode {
  if (!canUseDOM()) return "light";
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function getInitialColorMode(): ColorMode {
  return getStoredColorMode() ?? getPreferredColorMode();
}

export function applyColorModeClass(mode: ColorMode): void {
  if (!canUseDOM()) return;

  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
}

export function setColorMode(mode: ColorMode): void {
  if (!canUseDOM()) return;
  applyColorModeClass(mode);
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function toggleColorMode(current: ColorMode): ColorMode {
  return current === "dark" ? "light" : "dark";
}

export function initColorMode(): ColorMode {
  const mode = getInitialColorMode();
  applyColorModeClass(mode);
  return mode;
}
