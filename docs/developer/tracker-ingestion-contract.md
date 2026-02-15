# Tracker-Facing Ingestion Contract

Last Updated: 2026-02-14

This document defines the **ingestion outputs and invariants** that the Tracker depends on.

Goals:
- Make ingestion outputs stable and testable so Tracker work doesn’t thrash.
- Keep ingestion **privacy-aware** and compatible with safe CSV imports.
- Preserve the existing strong-key / dedupe approach as the single source of truth.

Non-goals:
- UI redesign.
- Backend schema decisions beyond what is needed to define stable boundaries.
- Tier B (raw provenance) persistence to backend (explicitly post-MVP only).

---

## 1) Data Tiers (MVP policy)

Tier A (MVP, cloud-syncable):
- Canonical transactions (Tracker-essential fields)
- Import session metadata (hash/importedAt/counts/dupe counts/error summaries)

Tier B (post-MVP only):
- Raw provenance such as raw CSV files or full original row objects.

Policy:
- **No Tier B persistence at all until post-MVP.**

---

## 2) Canonical Transaction Shape (post-normalization)

A normalized transaction must be suitable for:
- spend/income aggregation
- category/type reporting
- deterministic dedupe/idempotency via strong key

Required or strongly expected fields:
- `id: string`
- `accountNumber: string`
- `date: string` formatted as `YYYY-MM-DD`
- `rawAmount: number` (signed)
- `amount?: number` (absolute; optional convenience)
- `description: string` (normalized)
- `category?: string`
- `type?: TransactionType`
- `strongKey` (or `key`) computed via `buildTxKey(...)`

Provenance (Tier A-safe):
- `origin?: "csv" | ...`
- `importSessionId?: string`
- `importedAt?: string` (ISO)
- `staged?: boolean`
- `budgetApplied?: boolean`

Raw provenance (Tier B):
- `original` row blobs or raw CSV text are **not** persisted to backend in MVP.

---

## 3) Strong Key / Dedupe Contract (Non-negotiable)

Single source of truth:
- `buildTxKey(tx)` in `src/ingest/buildTxKey.ts`

Canonical format:
- `accountNumber|YYYY-MM-DD|signedAmount|normalized description[|bal:balance]`

Invariants:
- Deterministic: same canonical fields => same key.
- Idempotent: re-importing the same data must not create additional accepted transactions.
- Balance strengthening is optional and must not be required.

---

## 4) Parsing + Normalization Invariants

- Dates normalize to `YYYY-MM-DD` or the row is rejected with a structured error.
- Amount parsing supports common bank-export formats (e.g. `($6.50)` => `-6.50`).
- `rawAmount` must be finite.
- `description` must be non-empty after normalization.

---

## 5) Import Lifecycle Semantics (Staging / Apply / Undo)

Definitions:
- **Staged**: imported and visible, but not yet “finalized” into budgeting/tracker flows.
- **Applied**: the app has committed the session/months into the user’s ongoing tracking/budget view.

Minimum fields required for lifecycle:
- `importSessionId` on every imported transaction
- `staged: true` immediately after import commit
- `budgetApplied: false` immediately after import commit

Undo:
- Undo operates at the session level and is guarded by `importUndoWindowMinutes`.

Apply:
- Apply-to-budget must be able to operate session-scoped when applying a specific session.

---

## 6) ImportPlan Boundary (Milestone 4A)

Ingestion analysis produces a serializable plan:
- `analyzeImport(props) -> ImportPlan`

ImportPlan requirements:
- Serializable (`structuredClone`-able): no functions/closures.
- Includes session metadata, accepted transactions, stats, and structured errors.

Commit is a single store entrypoint:
- `commitImportPlan(plan: ImportPlan)`
  - merges transactions
  - records import session history
  - queues pending savings
  - records ingestion telemetry

---

## 7) Settings That Must Map Cleanly

These settings affect parsing strategy or retention/lifecycle behavior. They must remain meaningful as ingestion evolves:
- `streamingAutoLineThreshold`, `streamingAutoByteThreshold` (parsing strategy only)
- `importHistoryMaxEntries`, `importHistoryMaxAgeDays` (retention only)
- `stagedAutoExpireDays` (staging lifecycle only)
- `importUndoWindowMinutes` (undo eligibility only)

---

## 8) Post-MVP (Explicitly Deferred)

- Tier B persistence (raw CSV / full original rows) to backend
- Diagnostic “share raw import” workflows
- Archive/restore of original imports
