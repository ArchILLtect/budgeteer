# Budgeteer — Data Model

Last updated: 2026-02-19

This document describes the **data domains and shapes** Budgeteer uses today, plus the key conventions (dates, amounts, transaction identity) that make imports safe and deterministic.

This repo currently uses a hybrid model:

- **Backend (AppSync GraphQL)**: used for shared platform models (notably `UserProfile`).
- **Frontend local domain state (Zustand + localStorage)**: used for budgeting/planning/tracking/accounts/import lifecycle.

Where relevant, this doc calls out **Current** vs **Planned** fields.

---

## 1) Global conventions

### 1.1 Date formats

- Day: `YYYY-MM-DD`
- Month key: `YYYY-MM`

### 1.2 Amounts

Transactions track both:

- `rawAmount`: signed number (income positive, expense negative)
- `amount`: absolute number (used for display/summing)

This split is critical to:
- correct classification
- stable idempotent dedupe keys

### 1.3 Transaction identity (strong key)

A *single canonical* “strong key” is used for deterministic dedupe and idempotent re-imports.

Current implementation in code:
- `src/ingest/buildTxKey.ts`

Canonical shape (current):

```
accountNumber | YYYY-MM-DD | signedAmount | normalizedDescription [| bal:balance]
```

Notes:
- `balance` is optional and only included when available to reduce collisions.
- Description normalization is intentionally conservative to avoid false matches.

Planned evolution (privacy-aware):
- Replace `accountNumber` with an opaque account identifier/fingerprint (see `docs/ingestion-architecture.md`).

---

## 2) Backend model(s) (AppSync)

### 2.1 `UserProfile`

Source of truth:
- GraphQL schema under `amplify/backend/.../schema.graphql` (shared backend)

Used by:
- bootstrap/onboarding
- demo seeding gates
- user display and settings blobs

Important fields mentioned in legacy docs:
- `id` (primary key)
- `owner` (Cognito `sub`, owner-based auth)
- `email`, `displayName`
- `seedVersion`, `seededAt`
- `settingsVersion`, `settings` (JSON)

Notes:
- Owner-based auth is enforced server-side and reinforced client-side (client strips `owner` from update inputs).

See:
- `docs/legacy/AMPLIFY_BACKEND_OVERVIEW.md`

---

## 3) Frontend domain state (Zustand)

Primary store:
- `src/store/budgetStore.ts`

Note:
- The budget store is a single persisted store composed from slice modules under `src/store/slices/*`.

Persistence model:
- The budgeting domain store is persisted to localStorage.
- Some transient UI/session flags are intentionally not persisted.

### 3.1 Planner domain

Planner concepts (as reflected in store + UI):

- Income sources (multiple)
- Expenses (monthly)
- Filing/tax selections (net income estimation)
- Savings mode (none / percent / custom)
- Scenarios (“what-if” snapshots)

### 3.2 Monthly plans and monthly actuals

Budgeteer separates:

- **Planned** values for a month
- **Actual** values (derived from applied transactions, plus manual adjustments)

Monthly keys are stored under `YYYY-MM`.

### 3.3 Accounts & transactions

Accounts are logical containers for imported transactions.

Typical account fields (current):
- `accountNumber` (string key; also used in strong key)
- `label` (user-friendly name)
- `institution` (string)
- `transactions: Transaction[]`

Transaction fields (current ingestion pipeline):
- `id` (UUID)
- `date` (`YYYY-MM-DD`)
- `description`
- `amount` (absolute)
- `rawAmount` (signed)
- `type`: `income | expense | savings`
- `category` (optional)

Import lifecycle fields (staging/undo/apply):
- `importSessionId` (UUID)
- `staged: boolean`
- `budgetApplied: boolean`
- (Optional/varies) `origin` (e.g., which import pathway created it)

### 3.4 Import sessions, history, and policies

Budgeteer models imports as sessions:

- Each import produces an `importSessionId`.
- New transactions are staged.
- Users can apply staged transactions to monthly actuals.
- Undo is time-limited via a configurable window.

Related store data includes:
- import history entries (per session)
- per-account session summaries
- retention/pruning policies for history and staged entries

### 3.5 Savings goals and savings logs

Two related domains:

- `savingsGoals`: user-defined targets
- `savingsLogs[YYYY-MM]`: month-keyed log entries

Additional scoping fields (current):

- Savings logs created from imported transactions should carry `importSessionId` so a session can be cleared safely without touching unrelated logs.
- Savings goals created during savings review may carry `createdFromImportSessionId` so “clear session” can remove goals created by that session (only if unreferenced elsewhere).

Savings queue behavior:
- Ingestion collects savings-like transactions into a `savingsQueue`.
- Review/linking to goals is deferred until “Apply to Budget”.

Savings review queue entries (current):
- UI/store uses a shared shape (`SavingsReviewEntry`) with required fields:
	- `id`, `date` (`YYYY-MM-DD`), `month` (`YYYY-MM`), `name`, `amount`
- Optional metadata commonly present:
	- `importSessionId` (session scoping)
	- `originalTxId` (link back to the source transaction when available)

See:
- `docs/developer/category-rules-and-savings-queue.md`

---

## 4) Planned privacy-aware account model (not fully implemented)

The ingestion architecture doc proposes:

- `accountId` (UUID)
- `accountFingerprint` (opaque deterministic hash/HMAC)
- `accountLast4` (display-only)

and guarantees:
- raw account numbers are never persisted.

See:
- `docs/ingestion-architecture.md`

---

## 5) Data retention expectations (local-first)

Current stance (from vision + roadmap):
- Prefer local-first budgeting data.
- Be explicit about what is stored, where, and why.
- Avoid storing raw CSV files or unnecessary sensitive identifiers.

For planned sync, see:
- `docs/developer/migration-plan.md`
