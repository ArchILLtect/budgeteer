import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createUserScopedZustandStorage } from "../services/userScopedStorage";
import { createImportSlice } from "./slices/importSlice";
import { createPlannerSlice, type PlannerSlice } from "./slices/plannerSlice";
import { createSettingsSlice } from "./slices/settingsSlice";
import { createAccountsSlice } from "./slices/accountsSlice";
import type { ImportSlice } from "./slices/importSlice";
import type { SettingsSlice } from "./slices/settingsSlice";
import type { AccountsSlice } from "./slices/accountsSlice";

type Origin = "csv" | "ofx" | "plaid" | "manual";

export type BudgetStoreState = ImportSlice &
    PlannerSlice &
    SettingsSlice &
    AccountsSlice & {
        ORIGIN_COLOR_MAP: Record<Origin, string>;
        updateRecurring?: (id: string, updates: { amount: number }) => void;
        removeRecurring?: (id: string) => void;
    };

// TODO: Allow users to change overtime threshold and tax rates

export const useBudgetStore = create<BudgetStoreState>()(
    persist(
        (set, get, store) => ({
            ...createImportSlice(set, get, store),
            ...createPlannerSlice(set, get, store),
            ...createSettingsSlice(set, get, store),
            ...createAccountsSlice(set, get, store),
            ORIGIN_COLOR_MAP: {
                csv: "purple",
                ofx: "green",
                plaid: "red",
                manual: "blue",
            },
        }),

        {
            name: "budgeteer:budgetStore", // key in localStorage
            storage: createUserScopedZustandStorage(),
            partialize: (state) => {
                // Intentionally strip transient flags and UI modal/progress from persistence
                const clone: Partial<BudgetStoreState> = { ...state };
                delete clone.sessionExpired;
                delete clone.hasInitialized;
                delete clone.isSavingsModalOpen;
                delete clone.savingsReviewQueue;
                delete clone.resolveSavingsPromise;
                delete clone.isConfirmModalOpen;
                delete clone.isLoadingModalOpen;
                delete clone.isProgressOpen;
                delete clone.progressHeader;
                delete clone.progressCount;
                delete clone.progressTotal;
                delete clone.loadingHeader;
                delete clone.showIngestionBenchmark; // dev-only toggle not persisted
                delete clone.lastIngestionBenchmarkMetrics;
                delete clone.lastIngestionBenchmarkSessionId;
                // importHistory is retained for audit/undo
                return clone;
            },
        }
    )
);
