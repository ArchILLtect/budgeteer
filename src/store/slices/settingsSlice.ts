import type { StateCreator } from "zustand";
import type { SavingsReviewEntry } from "../../types/savingsReview";

export type SettingsSlice = {
  currentPage: string;
  user: unknown | null;
  sessionExpired: boolean;
  hasInitialized: boolean;
  isDemoUser: boolean;

  isSavingsModalOpen: boolean;
  resolveSavingsPromise: ((result: unknown) => void) | null;

  isLoadingModalOpen: boolean;
  loadingHeader: string;

  isConfirmModalOpen: boolean;

  confirmModalConfig: {
    title: string;
    message: string;
    acceptLabel?: string;
    cancelLabel?: string;
    acceptColorPalette?: string;
    isDanger?: boolean;
    initialFocus?: "accept" | "cancel" | "none";
    enterKeyAction?: "accept" | "cancel" | "none";
    onAccept?: (() => void) | null;
    onCancel?: (() => void) | null;
  } | null;

  isProgressOpen: boolean;
  progressHeader: string;
  progressCount: number;
  progressTotal: number;

  isLoading: boolean;

  setIsLoading: (val: boolean) => void;

  awaitSavingsLink: (entries: SavingsReviewEntry[]) => Promise<unknown>;
  resolveSavingsLink: (result: unknown) => void;

  openProgress: (header: string, total: number) => void;
  updateProgress: (count: number) => void;
  closeProgress: () => void;

  openLoading: (header: string) => void;
  closeLoading: () => void;

  setConfirmModalOpen: (open: boolean) => void;
  openConfirmModal: (config: NonNullable<SettingsSlice["confirmModalConfig"]>) => void;
  closeConfirmModal: () => void;
  setSavingsModalOpen: (open: boolean) => void;

  setSessionExpired: (value: boolean) => void;
  setHasInitialized: (value: boolean) => void;
  setCurrentPage: (page: string) => void;
  setUser: (user: unknown | null) => void;
  setIsDemoUser: (val: boolean) => void;
};

type SettingsSliceStoreState = SettingsSlice & {
  savingsReviewQueue?: SavingsReviewEntry[];
  [key: string]: unknown;
};

type SliceCreator<T> = StateCreator<SettingsSliceStoreState, [], [], T>;

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set, get) => ({
  currentPage: "planner",
  user: null,
  sessionExpired: false,
  hasInitialized: false,
  isDemoUser: false,

  isSavingsModalOpen: false,
  resolveSavingsPromise: null,

  isLoadingModalOpen: false,
  loadingHeader: "",

  isConfirmModalOpen: false,
  confirmModalConfig: null,

  isProgressOpen: false,
  progressHeader: "",
  progressCount: 0,
  progressTotal: 0,

  isLoading: false,
  setIsLoading: (val) => set({ isLoading: val }),

  awaitSavingsLink: (entries) => {
    // enqueue and open modal, then return a promise resolved by resolveSavingsLink
    set({ savingsReviewQueue: entries, isSavingsModalOpen: true });
    return new Promise<unknown>((resolve) => {
      set({ resolveSavingsPromise: resolve });
    });
  },

  resolveSavingsLink: (result) => {
    const resolver = get().resolveSavingsPromise;
    if (typeof resolver === "function") {
      try {
        resolver(result);
      } catch {
        // noop
      }
    }
    set({
      resolveSavingsPromise: null,
      isSavingsModalOpen: false,
      savingsReviewQueue: [],
    });
  },

  openProgress: (header, total) =>
    set({
      isProgressOpen: true,
      progressHeader: header,
      progressCount: 0,
      progressTotal: total,
    }),

  updateProgress: (count) => set({ progressCount: count }),

  closeProgress: () =>
    set({
      isProgressOpen: false,
      progressHeader: "",
      progressCount: 0,
      progressTotal: 0,
    }),

  openLoading: (header) =>
    set({
      isLoadingModalOpen: true,
      loadingHeader: header,
    }),

  closeLoading: () =>
    set({
      isLoadingModalOpen: false,
      loadingHeader: "",
    }),

  // Legacy API: used by SavingsReviewModal to open the cancel-confirm.
  // This intentionally clears any custom config so ConfirmModal falls back to legacy behavior.
  setConfirmModalOpen: (open) => set({ isConfirmModalOpen: open, confirmModalConfig: null }),

  openConfirmModal: (config) =>
    set({
      isConfirmModalOpen: true,
      confirmModalConfig: config,
    }),

  closeConfirmModal: () => set({ isConfirmModalOpen: false, confirmModalConfig: null }),
  setSavingsModalOpen: (open) => set({ isSavingsModalOpen: open }),

  setSessionExpired: (value) => set({ sessionExpired: value }),
  setHasInitialized: (value) => set({ hasInitialized: value }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setUser: (user) => set({ user }),
  setIsDemoUser: (val) => set({ isDemoUser: val }),
});
