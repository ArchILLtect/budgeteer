/**
 * Phase 1 ingestion orchestrator (pure, side-effect free).
 * Input:
 *  - fileText: CSV file contents (string)
 *  - accountNumber: target account id
 *  - existingTxns: current transactions array for that account
 *
 * Output:
 * {
 *   patch: (state) => partialState,  // function suitable for useBudgetStore.setState
 *   savingsQueue: [],               // placeholder (Phase 4)
 *   stats: { newCount, dupes },
 *   errors: []                      // placeholder for Phase 6 richer errors
 * }
 *
 * Usage example (NOT executed here):
 * const { patch, stats } = runIngestion({ fileText, accountNumber, existingTxns });
 * useBudgetStore.setState(patch);
 */

import { buildPatch } from './buildPatch';
import type { Transaction } from "../types";
import { analyzeImport } from "./analyzeImport";

type RunIngestionProps = {
    fileText?: string;
    parsedRows?: unknown;
    accountNumber: string;
    existingTxns: Transaction[];
    registerManifest?: (hash: string, accountNumber: string) => void; // optional callback for manifest registration

    // Optional overrides for determinism in tests.
    sessionId?: string;
    importedAt?: string;
    now?: () => number;
};

export async function runIngestion({
    fileText,
    parsedRows: externalParsedRows,
    accountNumber,
    existingTxns,
    registerManifest,
    sessionId,
    importedAt,
    now,
}: RunIngestionProps) {
    const plan = await analyzeImport({
        fileText,
        parsedRows: externalParsedRows,
        accountNumber,
        existingTxns,
        sessionId,
        importedAt,
        now,
    });

    if (registerManifest) {
        try {
            registerManifest(plan.stats.hash, accountNumber);
        } catch {
            // Swallow manifest registration issues (non-critical)
        }
    }

    const patch = buildPatch(accountNumber, existingTxns, plan.accepted);

    return {
        patch,
        savingsQueue: plan.savingsQueue,
        stats: plan.stats,
        duplicatesSample: plan.duplicatesSample,
        acceptedTxns: plan.acceptedPreview,
        errors: plan.errors,
        importSessionId: plan.session.sessionId,
    };
}
