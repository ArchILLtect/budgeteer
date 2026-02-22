export type IngestionMetrics = {
  ingestMs: number;
  parseMs: number;
  processMs: number;
  totalMs: number;
  rowsProcessed: number;
  rowsPerSec: number;
  duplicatesRatio: number;
  stageTimings?: {
    normalizeMs: number;
    classifyMs: number;
    inferMs: number;
    keyMs: number;
    dedupeMs: number;
    consensusMs: number;
  };
  earlyShortCircuits?: {
    total: number;
    byStage: { [stage: string]: number };
  };
};
