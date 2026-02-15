import type { Transaction } from "../types";

import { buildPatch } from "./buildPatch";
import { buildTxKey } from "./buildTxKey";
import { classifyTx } from "./classifyTx";
import { shortFileHash } from "./fileHash";
import {
  applyConsensusCategories,
  createCategoryContext,
  inferCategoryPerTx,
} from "./inferCategory";
import type {
  DuplicateSample,
  ImportPlan,
  IngestionError,
  IngestionStats,
  SavingsQueueEntry,
} from "./importPlan";
import { parseCsv } from "./parseCsv";
import type { CsvParseError } from "./parseCsv";
import { normalizeRow } from "./normalizeRow";

export type AnalyzeImportProps = {
  fileText?: string;
  parsedRows?: unknown;

  accountNumber: string;
  existingTxns: Transaction[];

  // Optional overrides for determinism in tests.
  sessionId?: string;
  importedAt?: string;
  now?: () => number;
};

function defaultNow(): number {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function defaultSessionId(): string {
  return typeof crypto !== "undefined" && (crypto as Crypto).randomUUID
    ? (crypto as Crypto).randomUUID()
    : "imp-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

type ParsedRowsContainer = { rows: unknown[]; errors: CsvParseError[] };

function coerceParsedRowsContainer(fileText: string, externalParsedRows?: unknown): ParsedRowsContainer {
  if (externalParsedRows) {
    if (Array.isArray(externalParsedRows)) {
      return { rows: externalParsedRows, errors: [] };
    }

    const maybe = externalParsedRows as { rows?: unknown[]; errors?: CsvParseError[] };
    if (Array.isArray(maybe.rows)) {
      return {
        rows: maybe.rows,
        errors: Array.isArray(maybe.errors) ? maybe.errors : [],
      };
    }

    return { rows: [], errors: [] };
  }

  const parsed = parseCsv(fileText);
  if (Array.isArray(parsed)) {
    // Backward compatibility: older parseCsv returned an array.
    return { rows: parsed as unknown[], errors: [] };
  }

  return {
    rows: Array.isArray(parsed.rows) ? parsed.rows : [],
    errors: Array.isArray(parsed.errors) ? parsed.errors : [],
  };
}

function computeHashInput(fileText: string | undefined, externalParsedRows?: unknown): string {
  if (fileText) return fileText;

  if (externalParsedRows) {
    if (Array.isArray(externalParsedRows)) {
      return JSON.stringify(externalParsedRows.slice(0, 1000));
    }
    const maybe = externalParsedRows as { rows?: unknown[] };
    if (Array.isArray(maybe.rows)) {
      return JSON.stringify(maybe.rows.slice(0, 1000));
    }
  }

  return "";
}

function isInternalTransfer(desc = ""): boolean {
  const INTERNAL_TRANSFER_PATTERNS = [
    /internal transfer/i,
    /xfer to checking/i,
    /xfer to savings/i,
    /transfer to checking/i,
    /transfer to savings/i,
    /online transfer/i,
    /xfer .* acct/i,
  ];
  return INTERNAL_TRANSFER_PATTERNS.some((re) => re.test(desc));
}

export async function analyzeImport({
  fileText,
  parsedRows: externalParsedRows,
  accountNumber,
  existingTxns,
  sessionId,
  importedAt,
  now,
}: AnalyzeImportProps): Promise<ImportPlan> {
  const nowMs = now ?? defaultNow;

  const tStart = nowMs();
  const importSessionId = sessionId ?? defaultSessionId();
  const importedAtIso = importedAt ?? new Date().toISOString();

  const errors: IngestionError[] = [];

  const existingKeys = new Set(
    existingTxns
      .map((t) => {
        try {
          return buildTxKey(t);
        } catch {
          return null;
        }
      })
      .filter((k): k is string => typeof k === "string" && k.length > 0)
  );

  const parsedRowsContainer = coerceParsedRowsContainer(fileText || "", externalParsedRows);
  const parsedRows = parsedRowsContainer.rows;
  const parseErrors = parsedRowsContainer.errors;

  // Surface parse errors first
  for (const pe of parseErrors.slice(0, 1000)) {
    errors.push({ type: "parse", message: pe.message, line: pe.line });
  }

  const accepted: Transaction[] = [];
  const duplicatesSample: DuplicateSample[] = [];

  let dupesExisting = 0;
  let dupesIntraFile = 0;

  const categorySourceCounts = {
    provided: 0,
    keyword: 0,
    regex: 0,
    consensus: 0,
    none: 0,
  };

  const catCtx = createCategoryContext();

  // Cap duplicate error entries to avoid extreme memory use on huge files dominated by dupes
  const DUP_ERROR_CAP = 500;
  let duplicateErrorCount = 0;

  // Stage timing accumulators
  let tNorm = 0,
    tClassify = 0,
    tInfer = 0,
    tKey = 0,
    tDedupe = 0,
    tConsensus = 0;

  const ENABLE_EARLY_DEDUPE_SHORT_CIRCUIT = true;
  let earlyDupesExisting = 0;
  let earlyDupesIntra = 0;

  const seenFile = new Set<string>();

  const tLoopStart = nowMs();
  for (const raw of parsedRows) {
    const tRowStart = nowMs();

    // STEP 1: Normalize
    let norm: Transaction | null;
    try {
      norm = normalizeRow(raw);
    } catch (e) {
      const err = e as { message?: string };
      errors.push({
        type: "normalize",
        raw,
        message: err?.message || "Normalization error",
        line: (raw as { __line?: number })?.__line,
      });
      continue;
    }
    if (!norm) continue;

    norm.accountNumber = accountNumber;

    const tAfterNorm = nowMs();
    tNorm += tAfterNorm - tRowStart;

    // EARLY DEDUPE SHORT-CIRCUIT: build key early (before classify/infer)
    let earlyKey: string;
    try {
      earlyKey = buildTxKey(norm);
    } catch (e) {
      const err = e as { message?: string };
      errors.push({
        type: "normalize",
        raw,
        message: "Key build failed: " + (err?.message || "Unknown error"),
        line: (raw as { __line?: number })?.__line,
      });
      continue;
    }

    const tEarlyKeyEnd = nowMs();
    tKey += tEarlyKeyEnd - tAfterNorm;

    if (ENABLE_EARLY_DEDUPE_SHORT_CIRCUIT) {
      if (existingKeys.has(earlyKey)) {
        dupesExisting++;
        earlyDupesExisting++;

        if (duplicatesSample.length < 10) {
          duplicatesSample.push({
            date: norm.date,
            amount: typeof norm.rawAmount === "number" ? norm.rawAmount : undefined,
            desc: norm.description,
            reason: "existing",
            line: (raw as { __line?: number })?.__line,
          });
        }

        if (duplicateErrorCount < DUP_ERROR_CAP) {
          errors.push({
            type: "duplicate",
            raw,
            message: "Duplicate (existing)",
            line: (raw as { __line?: number })?.__line,
            reason: "existing",
          });
          duplicateErrorCount++;
        }

        const tAfterShortDup = nowMs();
        tDedupe += tAfterShortDup - tEarlyKeyEnd;
        continue;
      }

      if (seenFile.has(earlyKey)) {
        dupesIntraFile++;
        earlyDupesIntra++;

        if (duplicatesSample.length < 10) {
          duplicatesSample.push({
            date: norm.date,
            amount: typeof norm.rawAmount === "number" ? norm.rawAmount : undefined,
            desc: norm.description,
            reason: "intra-file",
            line: (raw as { __line?: number })?.__line,
          });
        }

        if (duplicateErrorCount < DUP_ERROR_CAP) {
          errors.push({
            type: "duplicate",
            raw,
            message: "Duplicate (intra-file)",
            line: (raw as { __line?: number })?.__line,
            reason: "intra-file",
          });
          duplicateErrorCount++;
        }

        const tAfterShortDup = nowMs();
        tDedupe += tAfterShortDup - tEarlyKeyEnd;
        continue;
      }
    }

    seenFile.add(earlyKey);

    // STEP 2: Classification
    const tBeforeClassify = nowMs();
    try {
      norm = classifyTx(norm) as Transaction;
    } catch (e) {
      const err = e as { message?: string };
      errors.push({
        type: "normalize",
        raw,
        message: "Classification failed: " + (err?.message || "Unknown error"),
        line: (raw as { __line?: number })?.__line,
      });
      continue;
    }

    const tAfterClassify = nowMs();
    tClassify += tAfterClassify - tBeforeClassify;

    // STEP 3: Per‑transaction category inference
    try {
      norm = inferCategoryPerTx(norm, catCtx) as Transaction;
    } catch (e) {
      const err = e as { message?: string };
      errors.push({
        type: "normalize",
        raw,
        message: "Category inference failed: " + (err?.message || "Unknown error"),
        line: (raw as { __line?: number })?.__line,
      });
      continue;
    }

    const tAfterInfer = nowMs();
    tInfer += tAfterInfer - tAfterClassify;

    // STEP 4: (Re)build key post-inference
    let key: string;
    try {
      key = buildTxKey(norm);
    } catch (e) {
      const err = e as { message?: string };
      errors.push({
        type: "normalize",
        raw,
        message: "Key build failed: " + (err?.message || "Unknown error"),
        line: (raw as { __line?: number })?.__line,
      });
      continue;
    }

    const tReKeyEnd = nowMs();
    tKey += tReKeyEnd - tAfterInfer;

    const tDedupeStart = tReKeyEnd;
    const tAfterDedupe = nowMs();
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
  const tConsensusStart = nowMs();
  applyConsensusCategories(accepted as unknown[], catCtx);
  const tConsensusEnd = nowMs();
  tConsensus += tConsensusEnd - tConsensusStart;

  const tLoopEnd = nowMs();
  const processMs = +(tLoopEnd - tLoopStart).toFixed(2);

  // Telemetry: count category sources
  type CategorySourceKey = keyof typeof categorySourceCounts;
  for (const tx of accepted as Array<Transaction & { _catSource?: string }>) {
    const src = (tx._catSource || "none") as string;
    if (src in categorySourceCounts) {
      categorySourceCounts[src as CategorySourceKey] += 1;
    } else {
      categorySourceCounts.none += 1;
    }
  }

  // Remove internal telemetry fields before patch persistence
  for (let i = 0; i < accepted.length; i++) {
    const maybe = accepted[i] as Transaction & { _catSource?: string };
    if (maybe._catSource) {
      const next = { ...maybe } as Record<string, unknown>;
      delete next._catSource;
      accepted[i] = next as Transaction;
    }
  }

  const savingsQueue: SavingsQueueEntry[] = accepted
    .filter((t) => t.type === "savings")
    .filter((t) => !isInternalTransfer(t.description || ""))
    .map((t) => ({
      id: t.id,
      originalTxId: t.id,
      importSessionId: t.importSessionId,
      date: t.date,
      month: t.date?.slice(0, 7),
      amount: Math.abs(
        typeof t.rawAmount === "number"
          ? t.rawAmount
          : typeof t.amount === "number"
            ? t.amount
            : Number(t.amount) || 0
      ),
      name: t.description?.slice(0, 80) || "Savings Transfer",
    }));

  const rawForHash = computeHashInput(fileText, externalParsedRows);
  const hash = await shortFileHash(rawForHash);

  const tEnd = nowMs();
  const ingestMs = +(tEnd - tStart).toFixed(2);

  const categorySources = categorySourceCounts;

  const stats: IngestionStats = {
    newCount: accepted.length,
    dupes: dupesExisting + dupesIntraFile,
    dupesExisting,
    dupesIntraFile,
    hash,
    categorySources,
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
  };

  const acceptedPreview = accepted.map((t) => ({
    id: t.id,
    date: t.date,
    rawAmount: t.rawAmount,
    amount: t.amount,
    type: t.type,
    category: t.category,
    description: t.description,
    importSessionId: t.importSessionId,
  }));

  return {
    session: {
      sessionId: importSessionId,
      accountNumber,
      importedAt: importedAtIso,
      hash,
      newCount: accepted.length,
    },
    accepted,
    acceptedPreview,
    savingsQueue,
    stats,
    errors,
    duplicatesSample,
  };
}

// Convenience: derive the existing patch closure from an ImportPlan.
// This is intentionally separate from the plan so ImportPlan stays serializable.
export function buildPatchFromPlan(plan: ImportPlan, existingTxns: Transaction[]) {
  return buildPatch(plan.session.accountNumber, existingTxns, plan.accepted);
}
