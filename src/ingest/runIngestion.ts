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

import { parseCsv } from './parseCsv';
import { normalizeRow } from './normalizeRow';
import { classifyTx } from './classifyTx';
import { buildTxKey } from './buildTxKey';
import { buildPatch } from './buildPatch';
import { shortFileHash } from './fileHash';
import {
    createCategoryContext,
    inferCategoryPerTx,
    applyConsensusCategories,
} from './inferCategory';

type RunIngestionProps = {
    fileText?: string;
    parsedRows?: any;
    accountNumber: string;
    existingTxns: any[]; // Replace with actual transaction type
    registerManifest?: (hash: string, accountNumber: string) => void; // optional callback for manifest registration
};

export async function runIngestion({
    fileText,
    parsedRows: externalParsedRows,
    accountNumber,
    existingTxns,
    registerManifest,
}: RunIngestionProps) {
    const tStart =
        typeof performance !== 'undefined' && performance.now
            ? performance.now()
            : Date.now();
    // Generate a session id for this import (used to tag new transactions for potential undo)
    const importSessionId =
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : 'imp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const errors = [];
    const existingKeys = new Set(
        existingTxns
            .map((t) => {
                try {
                    return buildTxKey(t);
                } catch {
                    return null;
                }
            })
            .filter(Boolean)
    );

    const seenFile = new Set();
    // Allow caller to supply pre-parsed rows (Phase 5 streaming path)
    // Support externalParsedRows being either an array of row objects OR an object { rows, errors } (new parseCsv signature)
    let parsedRowsContainer;
    if (externalParsedRows) {
        if (Array.isArray(externalParsedRows)) {
            parsedRowsContainer = { rows: externalParsedRows, errors: [] };
        } else if (externalParsedRows.rows) {
            parsedRowsContainer = {
                rows: externalParsedRows.rows,
                errors: externalParsedRows.errors || [],
            };
        } else {
            parsedRowsContainer = { rows: [], errors: [] };
        }
    } else {
        parsedRowsContainer = parseCsv(fileText || '');
        if (Array.isArray(parsedRowsContainer)) {
            // backward compatibility (older parseCsv returned array)
            parsedRowsContainer = { rows: parsedRowsContainer, errors: [] };
        }
    }
    const parsedRows = parsedRowsContainer.rows || [];
    const parseErrors = parsedRowsContainer.errors || [];
    const accepted = [];
    const duplicatesSample = [];
    let dupesExisting = 0;
    let dupesIntraFile = 0;
    const categorySourceCounts: Record<string, number> = {
        provided: 0,
        keyword: 0,
        regex: 0,
        consensus: 0,
        none: 0,
    };

    // NEW: category inference context
    const catCtx = createCategoryContext();

    // Cap duplicate error entries to avoid extreme memory use on huge files dominated by dupes
    const DUP_ERROR_CAP = 500;
    let duplicateErrorCount = 0;
    // Surface parse errors first
    for (const pe of parseErrors.slice(0, 1000)) {
        errors.push({ type: 'parse', message: pe.message, line: pe.line });
    }

    // Stage timing accumulators (deeper timing granularity)
    let tNorm = 0,
        tClassify = 0,
        tInfer = 0,
        tKey = 0,
        tDedupe = 0,
        tConsensus = 0;

    // Early dedupe short-circuit counters (when enabled)
    const ENABLE_EARLY_DEDUPE_SHORT_CIRCUIT = true;
    let earlyDupesExisting = 0;
    let earlyDupesIntra = 0;

    const tLoopStart =
        typeof performance !== 'undefined' && performance.now
            ? performance.now()
            : Date.now();
    for (const raw of parsedRows) {
        const tRowStart =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        // STEP 1: Normalize
        let norm: any;
        try {
            norm = normalizeRow(raw);
        } catch (e: any) {
            errors.push({
                type: 'normalize',
                raw,
                message: e?.message || 'Normalization error',
                line: raw?.__line,
            });
            continue;
        }
        if (!norm) continue; // silently skip blank/ignored rows
        norm.accountNumber = accountNumber;

        const tAfterNorm =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        tNorm += tAfterNorm - tRowStart;

        // EARLY DEDUPE SHORT-CIRCUIT
        // Build key early (before classify/infer) to skip further work for duplicates
        let earlyKey;
        // (removed unused tEarlyKeyStart timing var)
        try {
            earlyKey = buildTxKey(norm);
        } catch (e: any) {
            errors.push({
                type: 'normalize',
                raw,
                message: 'Key build failed: ' + (e?.message || 'Unknown error'),
                line: raw?.__line,
            });
            continue;
        }
        const tEarlyKeyEnd =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        // For early key path we attribute time to key stage only if we later short-circuit *or* we will rebuild key later.
        // We'll add this time now; for accepted rows we will also rebuild & add key timing again (small overhead, keeps semantics consistent).
        tKey += tEarlyKeyEnd - tAfterNorm; // treat as key time relative to prior stage (norm)

        if (ENABLE_EARLY_DEDUPE_SHORT_CIRCUIT) {
            if (existingKeys.has(earlyKey)) {
                dupesExisting++;
                earlyDupesExisting++;
                if (duplicatesSample.length < 10) {
                    duplicatesSample.push({
                        date: norm.date,
                        amount: norm.rawAmount,
                        desc: norm.description,
                        reason: 'existing',
                        line: raw.__line,
                    });
                }
                if (duplicateErrorCount < DUP_ERROR_CAP) {
                    errors.push({
                        type: 'duplicate',
                        raw,
                        message: 'Duplicate (existing)',
                        line: raw?.__line,
                        reason: 'existing',
                    });
                    duplicateErrorCount++;
                }
                // Dedupe timing for short-circuit
                const tAfterShortDup =
                    typeof performance !== 'undefined' && performance.now
                        ? performance.now()
                        : Date.now();
                tDedupe += tAfterShortDup - tEarlyKeyEnd;
                continue;
            }
            if (seenFile.has(earlyKey)) {
                dupesIntraFile++;
                earlyDupesIntra++;
                if (duplicatesSample.length < 10) {
                    duplicatesSample.push({
                        date: norm.date,
                        amount: norm.rawAmount,
                        desc: norm.description,
                        reason: 'intra-file',
                        line: raw.__line,
                    });
                }
                if (duplicateErrorCount < DUP_ERROR_CAP) {
                    errors.push({
                        type: 'duplicate',
                        raw,
                        message: 'Duplicate (intra-file)',
                        line: raw?.__line,
                        reason: 'intra-file',
                    });
                    duplicateErrorCount++;
                }
                const tAfterShortDup =
                    typeof performance !== 'undefined' && performance.now
                        ? performance.now()
                        : Date.now();
                tDedupe += tAfterShortDup - tEarlyKeyEnd;
                continue;
            }
        }
        // Mark key seen (for intra-file detection of later rows)
        seenFile.add(earlyKey);

        // STEP 2: Classification (executed only for non-short-circuited rows)
        const tBeforeClassify =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        try {
            norm = classifyTx(norm);
        } catch (e: any) {
            errors.push({
                type: 'normalize',
                raw,
                message: 'Classification failed: ' + (e?.message || 'Unknown error'),
                line: raw?.__line,
            });
            continue;
        }
        const tAfterClassify =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        tClassify += tAfterClassify - tBeforeClassify;

        // STEP 3: Per‑transaction category inference
        try {
            norm = inferCategoryPerTx(norm, catCtx);
        } catch (e: any) {
            errors.push({
                type: 'normalize',
                raw,
                message: 'Category inference failed: ' + (e?.message || 'Unknown error'),
                line: raw?.__line,
            });
            continue;
        }
        const tAfterInfer =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        tInfer += tAfterInfer - tAfterClassify;

        // STEP 4: (Re)build key post-inference for consistent stage timing semantics
        let key;
        // (removed unused tReKeyStart timing var)
        try {
            key = buildTxKey(norm);
        } catch (e: any) {
            errors.push({
                type: 'normalize',
                raw,
                message: 'Key build failed: ' + (e?.message || 'Unknown error'),
                line: raw?.__line,
            });
            continue;
        }
        const tReKeyEnd =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        tKey += tReKeyEnd - tAfterInfer; // add time for second key build (accepted rows)
        const tDedupeStart = tReKeyEnd; // dedupe time for accepted rows is negligible post early filter; still measure as near-zero
        const tAfterDedupe =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        tDedupe += tAfterDedupe - tDedupeStart;

        // STEP 5: Accept (staged)
        accepted.push({
            ...norm,
            key,
            importSessionId,
            staged: true,
            budgetApplied: false,
        });
    }

    // SECOND PASS: vendor consensus for unlabeled
    const tConsensusStart =
        typeof performance !== 'undefined' && performance.now
            ? performance.now()
            : Date.now();
    applyConsensusCategories(accepted, catCtx);
    const tConsensusEnd =
        typeof performance !== 'undefined' && performance.now
            ? performance.now()
            : Date.now();
    tConsensus += tConsensusEnd - tConsensusStart;

    const tLoopEnd =
        typeof performance !== 'undefined' && performance.now
            ? performance.now()
            : Date.now();
    const processMs = +(tLoopEnd - tLoopStart).toFixed(2); // covers normalization + classify + inference + dedupe loop

    // Telemetry: count category sources (after consensus so 'consensus' overwrites)
    for (const tx of accepted) {
        const src = tx._catSource || 'none';
        if (categorySourceCounts[src] !== undefined) {
            categorySourceCounts[src] += 1;
        } else {
            categorySourceCounts.none += 1;
        }
    }

    // Remove internal telemetry fields before patch persistence
    for (let i = 0; i < accepted.length; i++) {
        if (accepted[i]._catSource) {
            const next: any = { ...(accepted[i] as any) };
            delete next._catSource;
            accepted[i] = next;
        }
    }

    // Build savings queue entries (Phase 4)
    // Heuristic filter for internal/intra-account transfers to skip review queue
    const INTERNAL_TRANSFER_PATTERNS = [
        /internal transfer/i,
        /xfer to checking/i,
        /xfer to savings/i,
        /transfer to checking/i,
        /transfer to savings/i,
        /online transfer/i,
        /xfer .* acct/i,
    ];
    function isInternalTransfer(desc = '') {
        return INTERNAL_TRANSFER_PATTERNS.some((re) => re.test(desc));
    }

    // Savings queue now deferred: still collect, but UI will enqueue only after user applies staged txns to budget
    const savingsQueue = accepted
        .filter((t) => t.type === 'savings')
        .filter((t) => !isInternalTransfer(t.description || ''))
        .map((t) => ({
            id: t.id, // queue entry id (same as txn id for now)
            originalTxId: t.id,
            importSessionId: t.importSessionId,
            date: t.date,
            month: t.date?.slice(0, 7),
            amount: Math.abs(
                typeof t.rawAmount === 'number'
                    ? t.rawAmount
                    : typeof t.amount === 'number'
                    ? t.amount
                    : Number(t.amount) || 0
            ),
            name: t.description?.slice(0, 80) || 'Savings Transfer',
        }));

    const patch = buildPatch(accountNumber, existingTxns, accepted);
    const rawForHash =
        fileText ||
        (externalParsedRows ? JSON.stringify(externalParsedRows.slice(0, 1000)) : '');
    const hash = await shortFileHash(rawForHash);

    if (registerManifest) {
        try {
            registerManifest(hash, accountNumber);
        } catch {
            // Swallow manifest registration issues (non-critical)
        }
    }

    const tEnd =
        typeof performance !== 'undefined' && performance.now
            ? performance.now()
            : Date.now();
    const ingestMs = +(tEnd - tStart).toFixed(2);

    return {
        patch,
        savingsQueue,
        stats: {
            newCount: accepted.length,
            dupes: dupesExisting + dupesIntraFile,
            dupesExisting,
            dupesIntraFile,
            hash,
            categorySources: categorySourceCounts,
            importSessionId,
            ingestMs,
            processMs,
            stageTimings: {
                normalizeMs: +tNorm.toFixed(2),
                classifyMs: +tClassify.toFixed(2),
                inferMs: +tInfer.toFixed(2),
                keyMs: +tKey.toFixed(2),
                dedupeMs: +tDedupe.toFixed(2),
                consensusMs: +tConsensus.toFixed(2),
            },
            rowsProcessed: parsedRows.length,
            rowsPerSec: parsedRows.length
                ? +(parsedRows.length / (ingestMs / 1000 || 1)).toFixed(2)
                : 0,
            duplicatesRatio:
                dupesExisting + dupesIntraFile + accepted.length
                    ? +(
                          ((dupesExisting + dupesIntraFile) /
                              (dupesExisting + dupesIntraFile + accepted.length)) *
                          100
                      ).toFixed(2)
                    : 0,
            earlyShortCircuits: {
                existing: earlyDupesExisting,
                intraFile: earlyDupesIntra,
                total: earlyDupesExisting + earlyDupesIntra,
            },
        },
        duplicatesSample,
        // Provide lightweight list of accepted (for confirmation UI)
        acceptedTxns: accepted.map((t) => ({
            id: t.id,
            date: t.date,
            rawAmount: t.rawAmount,
            amount: t.amount,
            type: t.type,
            category: t.category,
            description: t.description,
            importSessionId: t.importSessionId,
        })),
        errors,
        importSessionId,
    };
}
