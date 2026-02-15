# Ingestion Architecture (Proposed – Privacy‑Aware)

Last Updated: 2026-02-14

Note: This document describes a proposed privacy-aware variant (account fingerprinting / opaque account IDs). The current implemented ingestion pipeline is documented in `docs/developer/ingestion-architecture.md`, and the next planned refactor is tracked in `docs/developer/ingestion-plan.md`.

This document describes a **proposed** CSV ingestion/import pipeline, updated to support
**privacy‑aware account identification** while preserving deterministic behavior, idempotency,
and existing UX guarantees.

This proposal replaces raw `accountNumber` usage with a **one‑way account fingerprint model**
suitable for cloud sync and long‑term storage.

---

## 1) What Ingestion Does

Ingestion turns a CSV (or parsed rows) into:

- a deterministic set of **accepted transactions** (new, non‑duplicate)
- a **patch function** that merges those transactions atomically
- structured **stats + telemetry** (timings, dupes, inference sources)
- structured **errors** (parse / normalize / duplicate)
- a **savingsQueue** for savings‑type transactions (deferred until “Apply to Budget”)

The ingestion orchestrator is:

- **Pure** (no store or backend access)
- **Idempotent** (re‑importing the same data yields 0 new transactions)
- **Privacy‑aware** (never persists raw account numbers)

---

## 2) Account Identification Model (Key Change)

### Goals

- Detect the *same account* across repeated imports
- Avoid persisting raw account numbers
- Preserve automatic linking (no extra UX burden)

### Account Fingerprint

At ingest time:

```
accountFingerprint = HMAC_SHA256(accountNumber, ACCOUNT_FINGERPRINT_SECRET)
```

Stored values:

- `accountId` (UUID, primary key)
- `accountFingerprint` (opaque, deterministic, non‑reversible)
- `accountLast4` (display only)
- `accountType` (CK / SV / CC)
- `institution` (optional)
- `nickname` (user‑editable)

Target guarantee (once implemented): **raw account numbers are never persisted.**

### Import Matching Rules

On each import:

1. Compute `accountFingerprint`
2. If fingerprint matches an existing account → auto‑link
3. If multiple candidates exist (rare edge case):
   - prompt user to confirm or create new account
4. If no match → create new account record

---

## 3) Primary Entry Points

### UI Entry Points

- Import Transactions (single account)
  - `src/components/ui/ImportTransactionsModal.tsx`
- Sync Accounts (multi‑account CSV)
  - `src/components/ui/SyncAccountsModal.tsx`

Both flows:

1. Parse or stream‑parse CSV rows
2. Derive account metadata (fingerprint, last4, type)
3. Call the pure orchestrator (`analyzeImport`) to produce an `ImportPlan`
4. Show dry‑run preview (counts / telemetry / errors)
5. On confirm:
  - commit the plan via `commitImportPlan(plan)`
   - enqueue backend sync (planned)
6. Record import history + defer savings review

---

## 4) Core Orchestrator

### `src/ingest/analyzeImport.ts`

**Inputs**

- `parsedRows`
- `accountId`
- `existingTransactions` (for dedupe)

**Outputs**

- `ImportPlan` (serializable):
  - `accepted` (staged)
  - `savingsQueue`
  - `stats`
  - `errors`

> The orchestrator does **not** mutate the store.
> Store mutation happens only via the Import slice commit action.

---

## 5) Pipeline Stages

### 1. Parse

- `parseCsv.ts`
- `parseCsvStreaming.ts` (progress + abort)

### 2. Normalize

- `normalizeRow.ts`
- Enforces:
  - Date shape: `YYYY-MM-DD`
  - Signed amount parsing
  - Raw vs absolute amount separation

### 3. Early Dedupe Short‑Circuit

- Build strong key early
- Skip classification + inference for duplicates

### 4. Classify

- `classifyTx.ts`
- Produces: `income | expense | savings`

### 5. Category Inference (2‑Pass)

- Immediate keyword / provided category inference
- Vendor‑root consensus pass for unlabeled transactions
- `inferCategory.ts`
- `categoryRules.ts`

### 6. Strong Transaction Key

**Canonical dedupe primitive**

```
accountId | YYYY-MM-DD | signedAmount | normalizedDescription [| bal:balance]
```

Defined in:
- `buildTxKey.ts`

Re‑importing identical data must always result in:
```
stats.newCount === 0
```

### 7. Patch Build

- `buildPatch.ts`
- Produces a function compatible with `useBudgetStore.setState(patch)`

---

## 6) Staging / Undo / Apply‑To‑Budget

On apply, accepted transactions are written as:

- `staged: true`
- `budgetApplied: false`
- `importSessionId: <uuid>`

Store‑managed metadata:

- `importHistory`
- Undo:
  - `undoStagedImport(accountId, sessionId)`
- Apply‑to‑budget:
  - `markTransactionsBudgetApplied(accountId, months)`

### Savings Behavior

- Savings‑type transactions are collected into `savingsQueue`
- Review is deferred until **Apply‑To‑Budget**

---

## 7) Privacy & Data Handling Guarantees

- Raw CSV files are **never persisted**
- Raw account numbers exist **only in memory during parsing**
- All long‑term identifiers are opaque (`accountId`, fingerprint)
- localStorage caching contains **derived data only**

Explicit MVP policy:
- No backend persistence of raw provenance (“Tier B”) until post-MVP. This includes full original CSV rows and any stored copy of the uploaded CSV.

Optional future enhancement:
- “Privacy Mode” to truncate or sanitize merchant descriptions

---

## 8) Testing & Benchmarking

### Unit Tests

- `normalizeRow.test.ts`
- `buildTxKey.test.ts`
- `categoryInference.test.ts`
- `fingerprintUtils.test.ts`

### Benchmark Tooling

- `IngestionBenchmark.tsx`
- Measures throughput, dedupe ratios, and inference costs

---

## 9) Cloud Sync Integration (Planned)

When adding Amplify‑native cloud sync:

- `runIngestion` remains pure
- Strong transaction key remains canonical idempotency primitive
- Import apply flow:
  1. Apply patch locally (fast UX)
  2. Create `ImportSession`
  3. Batch create transactions
  4. Use TTL‑based sync lock to prevent multi‑device collision

---

## 10) Design Principles (Non‑Negotiable)

- Deterministic
- Idempotent
- Privacy‑first
- UX‑preserving
- Backend‑agnostic ingestion core
