import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createUserScopedZustandStorage } from "../services/userScopedStorage";

export const LOCAL_SETTINGS_STORE_VERSION = 4 as const;

export type SidebarWidthPreset = "small" | "medium" | "large";

export type DefaultViewRoute = "/" | "/planner" | "/tracker";

export type DefaultLandingRoute = "/" | "/planner" | "/tracker" | "/accounts" | "/imports" | "/profile" | "/settings";

export type NameOverrideRule = {
  match: string;
  displayName: string;
};

export type LocalSettingsState = {
  dueSoonWindowDays: number;
  sidebarWidthPreset: SidebarWidthPreset;
  defaultViewRoute: DefaultViewRoute;
  defaultLandingRoute: DefaultLandingRoute;

  applyAlwaysExtractVendorName: boolean;

  expenseNameOverrides: NameOverrideRule[];
  incomeNameOverrides: NameOverrideRule[];

  setDueSoonWindowDays: (days: number) => void;
  setSidebarWidthPreset: (preset: SidebarWidthPreset) => void;
  setDefaultViewRoute: (route: DefaultViewRoute) => void;
  setDefaultLandingRoute: (route: DefaultLandingRoute) => void;

  setApplyAlwaysExtractVendorName: (enabled: boolean) => void;

  setExpenseNameOverrides: (rules: NameOverrideRule[]) => void;
  setIncomeNameOverrides: (rules: NameOverrideRule[]) => void;
};

function normalizeBoolean(value: unknown, defaultValue: boolean): boolean {
  return value === true ? true : value === false ? false : defaultValue;
}

function normalizeDisplayText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNameOverrideRules(value: unknown): NameOverrideRule[] {
  const arr = Array.isArray(value) ? value : [];
  const out: NameOverrideRule[] = [];

  for (const item of arr) {
    const match = normalizeDisplayText((item as any)?.match);
    const displayName = normalizeDisplayText((item as any)?.displayName);
    if (!match || !displayName) continue;
    out.push({ match, displayName });
  }

  return out;
}

function normalizeDueSoonDays(days: number): number {
  return Math.max(1, Math.min(30, Math.floor(days || 0) || 3));
}

function normalizeSidebarWidthPreset(value: unknown): SidebarWidthPreset {
  return value === "small" || value === "medium" || value === "large" ? value : "small";
}

function normalizeDefaultViewRoute(value: unknown): DefaultViewRoute {
  return value === "/" || value === "/planner" || value === "/tracker" ? value : "/";
}

function normalizeDefaultLandingRoute(value: unknown): DefaultLandingRoute {
  return value === "/" ||
    value === "/planner" ||
    value === "/tracker" ||
    value === "/accounts" ||
    value === "/imports" ||
    value === "/profile" ||
    value === "/settings"
    ? value
    : "/";
}
const DEFAULT_DUE_SOON_DAYS = 3;
const DEFAULT_SIDEBAR_WIDTH_PRESET: SidebarWidthPreset = "small";
const DEFAULT_DEFAULT_VIEW_ROUTE: DefaultViewRoute = "/";
const DEFAULT_DEFAULT_LANDING_ROUTE: DefaultLandingRoute = "/";
const DEFAULT_APPLY_ALWAYS_EXTRACT_VENDOR_NAME = false;
const DEFAULT_EXPENSE_NAME_OVERRIDES: NameOverrideRule[] = [];
const DEFAULT_INCOME_NAME_OVERRIDES: NameOverrideRule[] = [];

export const useLocalSettingsStore = create<LocalSettingsState>()(
  persist(
    (set) => ({
      dueSoonWindowDays: DEFAULT_DUE_SOON_DAYS,
      sidebarWidthPreset: DEFAULT_SIDEBAR_WIDTH_PRESET,
      defaultViewRoute: DEFAULT_DEFAULT_VIEW_ROUTE,
      defaultLandingRoute: DEFAULT_DEFAULT_LANDING_ROUTE,

      applyAlwaysExtractVendorName: DEFAULT_APPLY_ALWAYS_EXTRACT_VENDOR_NAME,

      expenseNameOverrides: DEFAULT_EXPENSE_NAME_OVERRIDES,
      incomeNameOverrides: DEFAULT_INCOME_NAME_OVERRIDES,

      setDueSoonWindowDays: (days) => {
        set({ dueSoonWindowDays: normalizeDueSoonDays(days) });
      },

      setSidebarWidthPreset: (preset) => {
        set({ sidebarWidthPreset: normalizeSidebarWidthPreset(preset) });
      },

      setDefaultViewRoute: (route) => {
        set({ defaultViewRoute: normalizeDefaultViewRoute(route) });
      },

      setDefaultLandingRoute: (route) => {
        set({ defaultLandingRoute: normalizeDefaultLandingRoute(route) });
      },

      setApplyAlwaysExtractVendorName: (enabled) => {
        set({ applyAlwaysExtractVendorName: normalizeBoolean(enabled, DEFAULT_APPLY_ALWAYS_EXTRACT_VENDOR_NAME) });
      },

      setExpenseNameOverrides: (rules) => {
        set({ expenseNameOverrides: normalizeNameOverrideRules(rules) });
      },

      setIncomeNameOverrides: (rules) => {
        set({ incomeNameOverrides: normalizeNameOverrideRules(rules) });
      },
    }),
    {
      name: "budgeteer:localSettings",
      version: LOCAL_SETTINGS_STORE_VERSION,
      migrate: (persistedState) => {
        const s = persistedState as Partial<LocalSettingsState> | undefined;
        return {
          dueSoonWindowDays: normalizeDueSoonDays(s?.dueSoonWindowDays ?? DEFAULT_DUE_SOON_DAYS),
          sidebarWidthPreset: normalizeSidebarWidthPreset(s?.sidebarWidthPreset ?? DEFAULT_SIDEBAR_WIDTH_PRESET),
          defaultViewRoute: normalizeDefaultViewRoute(s?.defaultViewRoute ?? DEFAULT_DEFAULT_VIEW_ROUTE),
          defaultLandingRoute: normalizeDefaultLandingRoute(s?.defaultLandingRoute ?? DEFAULT_DEFAULT_LANDING_ROUTE),
          applyAlwaysExtractVendorName: normalizeBoolean(
            s?.applyAlwaysExtractVendorName,
            DEFAULT_APPLY_ALWAYS_EXTRACT_VENDOR_NAME
          ),

          expenseNameOverrides: normalizeNameOverrideRules(s?.expenseNameOverrides ?? DEFAULT_EXPENSE_NAME_OVERRIDES),
          incomeNameOverrides: normalizeNameOverrideRules(s?.incomeNameOverrides ?? DEFAULT_INCOME_NAME_OVERRIDES),
        } satisfies Pick<
          LocalSettingsState,
          "dueSoonWindowDays" |
            "sidebarWidthPreset" |
            "defaultViewRoute" |
            "defaultLandingRoute" |
            "applyAlwaysExtractVendorName" |
            "expenseNameOverrides" |
            "incomeNameOverrides"
        >;
      },
      storage: createUserScopedZustandStorage(),
      partialize: (s) => ({
        dueSoonWindowDays: s.dueSoonWindowDays,
        sidebarWidthPreset: s.sidebarWidthPreset,
        defaultViewRoute: s.defaultViewRoute,
        defaultLandingRoute: s.defaultLandingRoute,
        applyAlwaysExtractVendorName: s.applyAlwaysExtractVendorName,
        expenseNameOverrides: s.expenseNameOverrides,
        incomeNameOverrides: s.incomeNameOverrides,
      }),
    }
  )
);

// IMPORTANT: keep selectors primitive/function-returning.
// Returning new object literals here can trigger infinite render loops under React strict/dev.
export function useDueSoonWindowDays(): number {
  return useLocalSettingsStore((s) => s.dueSoonWindowDays);
}

export function useSetDueSoonWindowDays(): LocalSettingsState["setDueSoonWindowDays"] {
  return useLocalSettingsStore((s) => s.setDueSoonWindowDays);
}

export function useSidebarWidthPreset(): SidebarWidthPreset {
  return useLocalSettingsStore((s) => s.sidebarWidthPreset);
}

export function useSetSidebarWidthPreset(): LocalSettingsState["setSidebarWidthPreset"] {
  return useLocalSettingsStore((s) => s.setSidebarWidthPreset);
}

export function useDefaultViewRoute(): DefaultViewRoute {
  return useLocalSettingsStore((s) => s.defaultViewRoute);
}

export function useSetDefaultViewRoute(): LocalSettingsState["setDefaultViewRoute"] {
  return useLocalSettingsStore((s) => s.setDefaultViewRoute);
}

export function useDefaultLandingRoute(): DefaultLandingRoute {
  return useLocalSettingsStore((s) => s.defaultLandingRoute);
}

export function useSetDefaultLandingRoute(): LocalSettingsState["setDefaultLandingRoute"] {
  return useLocalSettingsStore((s) => s.setDefaultLandingRoute);
}

export function useApplyAlwaysExtractVendorName(): boolean {
  return useLocalSettingsStore((s) => s.applyAlwaysExtractVendorName);
}

export function useSetApplyAlwaysExtractVendorName(): LocalSettingsState["setApplyAlwaysExtractVendorName"] {
  return useLocalSettingsStore((s) => s.setApplyAlwaysExtractVendorName);
}

export function useExpenseNameOverrides(): NameOverrideRule[] {
  return useLocalSettingsStore((s) => s.expenseNameOverrides);
}

export function useSetExpenseNameOverrides(): LocalSettingsState["setExpenseNameOverrides"] {
  return useLocalSettingsStore((s) => s.setExpenseNameOverrides);
}

export function useIncomeNameOverrides(): NameOverrideRule[] {
  return useLocalSettingsStore((s) => s.incomeNameOverrides);
}

export function useSetIncomeNameOverrides(): LocalSettingsState["setIncomeNameOverrides"] {
  return useLocalSettingsStore((s) => s.setIncomeNameOverrides);
}
