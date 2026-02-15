# Ingestion / Import Plan (Next Refactor)

Last Updated: 2026-02-14

This document captures the planned improvements to the import/ingestion lifecycle so we can safely ship incremental correctness fixes now (Milestone 2) while keeping a clear path to a larger refactor later.

Scope of this plan:
- The **80/20 correctness fix**: make Apply-to-Budget and pending savings processing **session-scoped** when the user is operating on a specific import session.
- The **full refactor**: introduce an explicit **ImportPlan + commit** boundary so ingestion produces a serializable plan instead of a patch closure.

Non-goals (for now):
- Any UI redesign beyond wiring existing screens to correct semantics.
- Account fingerprinting / cloud sync changes (tracked separately; see `migration-plan.md`).
- Persisting raw provenance (“Tier B”) such as raw CSV files or full original rows to the backend. This is explicitly deferred until post-MVP.

---

## 1) Current Flow (Baseline)

- UI parses CSV (or streams) and calls `analyzeImport(...)`.
- `analyzeImport` returns an `ImportPlan` (serializable):
  - `accepted` (staged transactions)
  - preview-friendly `acceptedPreview`
  - `savingsQueue`
  - `errors` + `stats` + `session`
- UI commits via the store action `commitImportPlan(plan)`.
- Store records `importHistory`, updates import manifests, and queues savings entries to be reviewed after Apply-to-Budget.

Key properties we want to preserve:
- Determinism + idempotency via strong key (`buildTxKey`).
- Staging model: imported txns start as `staged: true`, `budgetApplied: false`, and are tagged with `importSessionId`.
- Undo model remains session-scoped and time-window guarded.

---

## 2) Known Correctness Gap (Worth Fixing Now)

Today, Import History operates on **selected sessions**, but the store’s apply helper is **month-scoped**.

Example failure mode:
- Import session `s1` and `s2` both have staged txns in month `2026-02`.
- User selects `s1` in Import History and clicks Apply.
- UI computes months for `s1` and calls `markTransactionsBudgetApplied(accountNumber, ["2026-02"])`.
- Store applies **all staged txns in Feb**, including those from `s2`.

This violates the user’s intent (“apply just the selected session”) and makes apply/undo reasoning brittle.

---

## 3) 80/20 Fix (Milestone 2): Session-Scoped Apply + Savings Processing

### 3.1 API additions (store)

Add session-scoped actions in the Import slice:

- `markImportSessionBudgetApplied(accountNumber: string, sessionId: string, months: string[])`
  - Marks only txns that match BOTH:
    - `tx.importSessionId === sessionId`
    - `tx.staged === true && tx.budgetApplied === false`
    - `tx.date.slice(0, 7) ∈ months`

- `processPendingSavingsForImportSession(accountNumber: string, sessionId: string, months: string[])`
  - Moves only pending savings entries matching BOTH:
    - `entry.importSessionId === sessionId`
    - `entry.month ∈ months`
  - Keeps the rest pending.

Keep the existing month-scoped APIs for other UX paths:
- `markTransactionsBudgetApplied(accountNumber, months)` remains for “apply everything staged in these months” flows.
- `processPendingSavingsForAccount(accountNumber, months)` remains.

### 3.2 UI wiring change

- Update Import History page to use the session-scoped functions when applying selected sessions.

### 3.3 Test coverage

Add regression tests for overlapping sessions:
- Two sessions staged in the same month.
- Applying `s1` must not affect `s2` staged txns.
- Savings queue processing must likewise remain session-scoped.

Acceptance criteria:
- Apply Selected in Import History is session-correct.
- No behavior change for Apply-to-Budget flows that are intentionally month-scoped.

---

## 4) Full Refactor (Later): ImportPlan + Commit

The purpose of this refactor is to make ingestion produce a **serializable plan** (data), not a patch closure, and to create a single store entry point that commits that plan.

### 4.1 Target structure

Introduce a new pure function:

- `analyzeImport(props) -> ImportPlan`

Where `ImportPlan` includes:
- `session: { sessionId, accountNumber, importedAt, hash, counts, telemetry }`
- `acceptedTxns: Transaction[]` (already staged/tagged with sessionId)
- `savingsQueue: SavingsQueueEntry[]`
- `errors: IngestionError[]`
- `stats: IngestionStats`

Then commit via the store:

- `commitImportPlan(plan: ImportPlan)`
  - merges transactions into the account
  - records import history
  - queues pending savings
  - stores last ingestion telemetry

### 4.2 Why this is worth it

- Removes hidden coupling via patch closures.
- Makes “dry run” and “commit” boundaries explicit and testable.
- Enables future features (without redesign):
  - persisting import plans
  - exporting/importing plans for debugging
  - backend outbox enqueue (cloud sync) using plan data

### 4.3 Migration approach (incremental)

1. Add `analyzeImport` alongside `runIngestion`.
2. Implement `commitImportPlan` and route one UI entry point to it.
3. Once stable, simplify/replace `runIngestion` to return `ImportPlan` (or become a thin wrapper).

Acceptance criteria:
- Same UX as today for import preview + confirm.
- Store commits via one explicit action (no `setState(patch)` from UI).
- Tests cover “analyze vs commit” determinism and idempotency.

---

## 5) Related Docs

- Current ingestion architecture: `docs/developer/ingestion-architecture.md`
- Historical refactor log: `docs/legacy/ingestion-refactor-plan.md`
- Cloud sync alignment: `docs/developer/migration-plan.md`

## 6) Deferred Follow-ups (After ImportPlan is Browser-Testable)

We are intentionally pausing broader TypeScript type-hardening until the ImportPlan + commit flow exists and can be manually tested end-to-end in the browser.

Tracked follow-ups live in `TODO.md` (Type hardening follow-ups) and include:
- typing the root persisted store wiring (`src/store/budgetStore.ts`)
- tightening `runIngestion` internal/output shapes (or replacing it with `analyzeImport`)
- reducing remaining `any` clusters in planner domain code
