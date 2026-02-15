import type { ImportSession, Transaction } from "../types";

export type CsvParseError = {
  line: number;
  message: string;
};

export type IngestionError =
  | {
      type: "parse";
      message: string;
      line?: number;
    }
  | {
      type: "normalize";
      message: string;
      line?: number;
      raw?: unknown;
    }
  | {
      type: "duplicate";
      message: string;
      line?: number;
      raw?: unknown;
      reason?: "existing" | "intra-file";
    };

export type DuplicateSample = {
  date?: string;
  amount?: number;
  desc?: string;
  reason: "existing" | "intra-file";
  line?: number;
};

export type CategorySourceCounts = Record<string, number> & {
  provided: number;
  keyword: number;
  regex: number;
  consensus: number;
  none: number;
};

export type IngestionStageTimings = {
  normalizeMs: number;
  classifyMs: number;
  inferMs: number;
  keyMs: number;
  dedupeMs: number;
  consensusMs: number;
};

export type IngestionStats = {
  newCount: number;
  dupes: number;
  dupesExisting: number;
  dupesIntraFile: number;
  hash: string;
  categorySources: CategorySourceCounts;
  importSessionId: string;
  ingestMs: number;
  processMs: number;
  stageTimings: IngestionStageTimings;
  rowsProcessed: number;
  rowsPerSec: number;
  duplicatesRatio: number;
  earlyShortCircuits: {
    existing: number;
    intraFile: number;
    total: number;
  };
};

export type AcceptedTxnPreview = {
  id?: string;
  date?: string;
  rawAmount?: number;
  amount?: number | string;
  type?: string;
  category?: string;
  description?: string;
  importSessionId?: string;
};

export type SavingsQueueEntry = {
  id?: string;
  originalTxId?: string;
  importSessionId?: string;
  date?: string;
  month?: string;
  amount: number;
  name: string;
  [key: string]: unknown;
};

export type ImportPlan = {
  session: ImportSession;

  accepted: Transaction[];
  acceptedPreview: AcceptedTxnPreview[];

  savingsQueue: SavingsQueueEntry[];
  stats: IngestionStats;

  errors: IngestionError[];
  duplicatesSample: DuplicateSample[];
};
