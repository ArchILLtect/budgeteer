
# Budgeteer — Architecture

Last updated: 2026-02-19

This document describes **how Budgeteer is built today** (as reflected in `src/`) and the intended direction as it evolves into a cohesive personal finance app.

Sources of truth:

- `docs/budgeteer_project_context_vision.md` (product direction)
- `docs/legacy/AMPLIFY_BACKEND_OVERVIEW.md` (Amplify/AppSync/Cognito plumbing)
- `docs/legacy/PLATFORM_SYSTEMS_OVERVIEW.md` (routing/auth/caching/store patterns used by this repo)
- The actual code under `src/`

---

## 1) System overview

Budgeteer is a **React SPA** (Vite + TypeScript) that:

- Uses **AWS Amplify Auth** (Cognito) for login/identity.
- Uses **AppSync GraphQL** via a small wrapper API layer (shared backend plumbing).
- Stores most budgeting domain state locally in a persisted **Zustand** store (today).
- Prioritizes a **CSV import → stage → apply/undo** workflow rather than direct bank connections.

High-level architecture:

```
Browser
	├─ React + Chakra UI pages/components
	├─ Zustand stores (persisted, user-scoped)
	├─ Domain/services (budgeting logic, ingestion pipeline)
	└─ API boundary (budgeteerApi) → Amplify GraphQL → AppSync → DynamoDB

Amplify/Cognito
	└─ Identity & groups/role claims

AppSync GraphQL (shared backend)
	└─ Primarily used for UserProfile + shared platform models
```

---

## 2) Repository map (important files)

Frontend entry + routing

- `src/main.tsx`: bootstraps Chakra + Router; imports Amplify config.
- `src/amplifyConfig.ts`: `Amplify.configure(...)`.
- `src/App.tsx`: route table and auth lifecycle cache guards.
- `src/layout/AppShell.tsx`: “chrome” (Header/Footer/Sidebar + `<Outlet/>`).

Auth + user-scoped caching

- `src/hooks/useAuthUser.ts`: resolves signed-in identity, listens to Hub auth events.
- `src/routes/RequireAuth.tsx`: protected route guard (with optional E2E bypass).
- `src/services/userScopedStorage.ts`: **user-scoped localStorage namespace**.
- `src/store/clearUserCaches.ts`: resets in-memory session state and clears persisted caches (dev tools).

Budgeting domain state

- `src/store/budgetStore.ts`: persisted root store composed from slice modules.
- `src/store/slices/*`: domain slice modules (planner/import/settings/accounts).
- `src/pages/PlannerPage.tsx`, `src/pages/TrackerPage.tsx`: primary budgeting views.
- `src/pages/SettingsPage.tsx`: import/staging policy settings.
- `src/pages/ImportHistoryPage.tsx`: import session history + staged/apply/undo controls.

CSV ingestion pipeline (current implementation)

- `src/ingest/analyzeImport.ts`: orchestrator (parse → normalize → classify → infer → dedupe → ImportPlan).
- Import slice `commitImportPlan(plan)`: single commit entrypoint (merge + history + savings + manifests).
- `src/ingest/parseCsv.ts`: simple in-memory CSV parse.
- `src/ingest/parseCsvStreaming.ts`: PapaParse chunked parse (Phase 5 style).
- `src/ingest/buildTxKey.ts`: “strong key” for idempotent dedupe.

Backend API boundary

- `src/amplifyClient.ts`: typed Amplify client.
- `src/api/budgeteerApi.ts`: “boring” wrapper for GraphQL calls.
- `src/api/operationsMinimal.ts`: minimal selection sets.
- `src/api/mappers.ts`: maps GraphQL shapes → UI types.

---

## 3) App bootstrap & layout composition

### 3.1 Boot order

1. `src/main.tsx` imports `src/amplifyConfig.ts` before any Amplify usage.
2. React mounts with Chakra + React Router.
3. `src/App.tsx` defines routes and wires auth lifecycle guards.

Why: calling `Amplify.configure()` early avoids subtle runtime failures when `aws-amplify/auth` or `aws-amplify/api` are invoked before configuration.

### 3.2 Layout

`AppShell` provides stable chrome:

- Header (identity display, settings link, demo badge)
- Sidebar (authenticated vs public)
- Outlet region (routes), wrapped in:
	- an error boundary
	- a Suspense fallback (for lazy-loaded chunks)
- Footer + disclosure banners

This keeps navigation consistent while route chunks load.

---

## 4) Auth, identity, and user-scoped persistence

### 4.1 Auth lifecycle

`useAuthUser()`:

- Calls `getCurrentUser()` to determine identity.
- Listens to Amplify Hub `auth` events.
- On sign-in/out: updates a **scope key** and rehydrates relevant persisted stores.

### 4.2 User-scoped localStorage namespace (critical)

Budgeteer uses a user-scoped storage pattern: persisted state is namespaced by identity to prevent cache mixing on shared devices.

Implementation: `src/services/userScopedStorage.ts`

- `AUTH_SCOPE_STORAGE_KEY = "budgeteer:authScope"`
- User-scoped key format: `budgeteer:u:<scope>:<baseKey>`
- Zustand persist adapter: `createUserScopedZustandStorage()`

Storage keys are namespaced under `budgeteer:*`.

---

## 5) Domain state: budgeting model (current)

The budgeting feature set is implemented as a **single persisted root store** in `src/store/budgetStore.ts`, composed from slice modules under `src/store/slices/`.

Core concepts reflected in the store:

- **Scenarios**: income sources + expenses + filing status + savings mode.
- **Monthly plans**: planned view for a month.
- **Monthly actuals**: actual expenses and income sources.
- **Savings goals & logs**: goal definitions and month-keyed entries.
- **Accounts**: accountNumber-keyed containers with transaction arrays.

Persistence:

- The store is persisted to localStorage (`budgeteer:budgetStore`) with a `partialize` that omits transient UI flags.
- Storage is user-scoped via the `createUserScopedZustandStorage()` adapter.

Current slice modules:

- `src/store/slices/importSlice.ts` (+ pure helpers in `importLogic.ts`)
- `src/store/slices/plannerSlice.ts` (+ pure helpers in `plannerLogic.ts`)
- `src/store/slices/settingsSlice.ts`
- `src/store/slices/accountsSlice.ts`

Design intent:

- Keep UI declarative; keep business logic in store actions and domain helpers.
- Prefer deterministic, explainable calculations (planner first).

---

## 6) Transaction importing: staging, undo, and history

Budgeteer models imports as **sessions**:

- New transactions from an import are tagged with an `importSessionId`.
- Transactions are initially **staged**.
- Users can **apply** staged transactions to the budget (month-level apply).
- Users can **undo** a staged import within a time window.

Current implementation locations:

- Import session runtime/status computation: `useBudgetStore.getImportSessionRuntime()`.
- Import history UI: `src/pages/ImportHistoryPage.tsx`.
- Import policy settings: `src/pages/SettingsPage.tsx`.

Undo semantics (current):

- Undo removes only transactions that are still staged for that session.
- Undo is time-bounded (`importUndoWindowMinutes`).
- Import history is pruned by age/size thresholds.

Auto-expire semantics (current):

- Staged transactions can be auto-applied after `stagedAutoExpireDays`.

Clear semantics (current):

- Import sessions can be permanently cleared from Import History.
- Clearing a session removes:
	- imported transactions for that session from the account
	- pending savings entries for that session
	- tracker artifacts derived from applying those transactions (monthly actuals + savings logs)
	- any savings goals that were created during savings review for that session (only if not referenced by other remaining logs)

---

## 7) Ingestion pipeline architecture (current)

The ingestion pipeline is designed as a multi-phase, testable path:

1. Parse CSV (simple `parseCsv` or streaming `streamParseCsv`).
2. Normalize rows into a consistent internal transaction shape.
3. Classify transactions (income/expense/savings).
4. Infer categories (keyword/regex/consensus-style heuristics).
5. Build a strong, deterministic key (`buildTxKey`).
6. Dedupe against existing + intra-file keys.
7. Produce a state patch and import stats.

Key properties:

- Idempotency: re-importing produces no duplicates.
- Determinism: same input → same classification/keying.
- “Early dedupe short-circuit” to avoid expensive work on duplicates.

Note: ingestion is an active area but not the immediate focus of the “tighten the main app” phase.

---

## 8) Backend usage (today) vs target

Today:

- Budgeteer uses a **shared Amplify/AppSync backend** primarily for identity + user profile plumbing.
- Most budgeting domain data is local (Zustand persisted state).

Target direction (subject to roadmap):

- Move durable domain data (accounts, transactions, plans) to a dedicated Budgeteer GraphQL model set, while keeping privacy constraints.
- Preserve CSV-first workflows; avoid bank credential handling.
- Keep API wrapper boundaries (`budgeteerApi`) so UI never speaks GraphQL directly.

---

## 9) Privacy & security principles (implementation notes)

Aligned with the vision doc:

- No bank credential collection.
- Import only what the user provides.
- Avoid persisting raw identifiers where possible (account mapping should prefer user-controlled labels + derived identifiers).
- Owner-based access control is enforced server-side (AppSync auth rules) and reinforced client-side (API wrapper strips `owner` from updates).

---

## 10) Known issues / tech debt (tracked in ROADMAP)

-- ~~Many “any” types in older/rapidly-evolving areas.~~ (addressed 2026-02-19: core paths typed; remaining loose edges use `unknown` at boundaries)
-- ~~`budgetStore` is currently a monolith; it should be modularized (planner vs accounts vs import lifecycle).~~ (done 2026-02-19: slice modules under `src/store/slices/*`)
-- Some ingestion/UI boundaries still treat parsed CSV rows as `unknown` until validated/normalized.
-- Demo mode wiring exists but is still evolving.

