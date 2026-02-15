# Budgeteer — Milestones

Last updated: 2026-02-14

This file turns the roadmap phases into concrete milestones.

Source:
- `docs/ROADMAP.md`

---

## Milestone 0 — Baseline stability (Done)

Status: Done

Acceptance (from roadmap):
- Production build is clean
- Architecture doc exists and reflects current system

---

## Milestone 1 — Product surface coherence (Tighten main app)

Status: Done

Goal:
- Make the app read like Budgeteer end-to-end.

Scope:
- Copy cleanup (titles, empty states)
- Storage key consistency (`budgeteer:*` namespace)
- Auth redirects land on Budgeteer routes (planner/home)

Acceptance:
- Users can click through Planner/Tracker/Accounts/Imports/Settings without seeing misaligned terminology
- Sidebar links match routes
- Switching users does not leak persisted state

### Milestone 1 checklist

Use this as the running “ship list” for Milestone 1. Keep it honest and concrete—each item should be verifiable in the UI.

**A) Click-through + routes**
- [x] Routes in `src/App.tsx` match sidebar/header links (no dead links)
- [x] Public routes behave correctly (Home/About/Planner/Tracker/Settings/Login)
- [x] Protected routes behave correctly (Accounts/Imports/Profile, and Dev in DEV only)
- [x] Auth redirect after login lands on a Budgeteer route (not legacy)
- [x] 404/unknown routes land on a sensible Budgeteer page

**B) Copy + terminology**
- [x] Planner copy reads as Budgeteer (titles, buttons, empty states)
- [x] Tracker copy reads as Budgeteer (titles, buttons, empty states)
- [x] Accounts + Imports copy reads as Budgeteer (titles, buttons, empty states)
- [x] Settings copy reads as Budgeteer (titles, sections, helper text)
- [x] Remove/rename any leftover non-Budgeteer terminology in the UI

**C) Storage + user switching (no state leakage)**
- [x] All persisted keys follow `budgeteer:*` and user-scoped keys use the `budgeteer:u:<scope>:` prefix
- [x] Main persisted budget state is user-scoped (no shared `budgeteer:budgetStore` across users)
- [x] Switching users does not reuse the previous user’s budget data (budget store resets when a new user has no persisted budget state)
- [x] Switching users does not reuse the previous user’s cached UI metadata
- [x] Switching users does not reuse the previous user’s local settings / tips / demo preferences
- [x] “Clear caches”/reset pathways are discoverable and work as expected
- [x] “Clear caches” clears user-scoped persisted stores + tip/demo/welcome prefs

**D) Regression guardrails**
- [x] No console warnings/errors during normal navigation
- [x] `npm run check` stays green for Milestone 1 changes

**Milestone 1 manual test script (quick)**
- [x] Sign in as User A → visit Planner/Tracker/Accounts/Imports/Settings → sign out
- [x] Sign in as User B → repeat → confirm no User A state is visible

---

## Milestone 2 — Domain boundaries and type hardening

Status: Planned

Goal:
- Reduce risk by making budgeting logic easier to change.

Scope:
- Split monolithic store into slice modules (planner/import/settings first; accounts later)
- Add types at ingestion and transaction boundaries
- Add high-value tests for staging/apply/undo transitions

Acceptance:
- Fewer implicit/widened types in critical paths
- Tests cover strong key and import lifecycle

### Milestone 2 checklist

**A) Store boundaries (reduce coupling)**
- [x] Identify the domain slices and their public APIs (planner/import/settings/accounts)
- [x] Implement slice modules under `src/store/` while keeping a single persisted store (keep behavior identical)
- [x] Ensure cross-slice dependencies are explicit (no hidden `getState()` reach-throughs)
- [x] Keep persistence rules intentional (`partialize` boundaries stay correct)
- [x] Update imports/call-sites to use the new slice exports (no dead code)

Progress notes:
- [x] Extract Import lifecycle into `src/store/slices/importSlice.ts` + `importLogic.ts`
- [x] Extract Planner domain into `src/store/slices/plannerSlice.ts`
- [x] Extract Settings/UI shell state into `src/store/slices/settingsSlice.ts`
- [x] Extract Accounts + mappings into `src/store/slices/accountsSlice.ts`
- [x] Audit and remove non-UI `useBudgetStore.getState()` reach-throughs (remaining usages are component-level async flows)

**B) Type hardening (critical paths first)**
- [x] Define core domain types: `Account`, `Transaction`, `ImportSession`, `BudgetMonthKey`
- [x] Replace `any` in import/staging/apply/undo codepaths with concrete types
- [x] Make transaction identity/strong-key inputs typed and explicit
- [x] ~~Tighten ingestion outputs (`runIngestion` return shape) where UI consumes it~~ (done: removed legacy wrapper; UI commits via `commitImportPlan(plan)`)

Progress notes:
- We are intentionally pausing broader type hardening here to avoid “type the entire app” churn.
- Remaining `any` hotspots are mostly:
	- Root store wiring in `src/store/budgetStore.ts` (set/get/store + persist typing)
	- Planner domain slice (`src/store/slices/plannerSlice.ts`) and supporting planner UI models
	- Ingestion orchestrator `src/ingest/analyzeImport.ts` (core path typed; non-core callers may still have `any` at UI edges)
	- Non-core utilities (`src/utils/analysisUtils.ts`, `src/utils/calcUtils.ts`, `src/utils/demoUtils.ts`)
- Plan: revisit once Milestone 4A (ImportPlan + commit) is implemented and at least manually testable in-browser.

**C) Tests (high-value regression coverage)**
- [x] Add/expand unit tests for staged import → apply to budget → undo flows
- [x] Add tests for import history retention/pruning behavior (if present)
- [x] Add tests for cross-slice invariants (e.g., applying staged updates monthly actuals deterministically)
- [x] Fix Import History “Apply selected session” to be session-scoped (do not apply other sessions’ staged txns)
- [x] Add regression tests for overlapping sessions in the same month (apply/undo/savings stay session-correct)

**D) Docs + verification**
- [x] Update `docs/ARCHITECTURE.md` to reflect the new store slice layout
- [x] Update `docs/DATA_MODEL.md` if any domain types are formalized/renamed
- [x] `npm run check` stays green throughout Milestone 2

**E) Stretch goals (optional / later)**
- [ ] Evaluate splitting slice modules into separate persisted stores once domains are stable

---

## Milestone 3 — Planner/Tracker UX polish

Status: Planned

Goal:
- Planner and Tracker feel complete for real use.

Scope:
- Validation and constraints
- Clear planned vs actual presentation
- Better empty states and explanations

Acceptance:
- Planner can be used standalone
- Tracker explains numbers and sources

---

## Milestone 4 — CSV ingestion enhancements

Status: Planned (intentionally later)

Goal:
- Improve ingestion correctness, transparency, and performance.

Scope:
- Better staged import review tooling
- Category inference UX improvements
- Performance tuning (streaming thresholds, chunking)

Acceptance:
- Users can explain what happened after an import
- Large imports are reliable

### Milestone 4 checklist

**A) ImportPlan + commit boundary**
- [x] ~~Implement `analyzeImport(...) -> ImportPlan` (serializable plan, no patch closures)~~ (done)
- [x] ~~Implement `commitImportPlan(plan)` store action (single entrypoint to merge + record history + queue savings)~~ (done)
- [x] ~~Migrate import UIs to commit via store action (no `useBudgetStore.setState(patch)` from components)~~ (done: ImportTransactionsModal + SyncAccountsModal)
- [x] ~~Add deterministic unit tests for analyze vs commit (idempotency, error surfaces, and plan stability)~~ (done: `analyzeImport` tests + commit boundary test)
- [ ] After ImportPlan is manually testable in-browser, complete the deferred type-hardening follow-ups in `TODO.md` (root store typing, planner `any` cluster)

**B) Proposed ingestion upgrades (from plan)**
- [ ] Streaming parse worker mode (PapaParse worker) for large files
- [ ] Backpressure/batching for classification/inference in streaming mode (reduce main-thread jank)
- [ ] Memory profiling notes + guardrails for huge imports
- [ ] Error panel scalability improvements (virtualization / export guardrails)

---

## Milestone 5 — Backend alignment (Optional)

Status: Deferred / TBD

Goal:
- Decide what should sync server-side without compromising privacy.

Notes:
- This milestone is intentionally gated by privacy constraints and data model decisions.

Acceptance:
- Data ownership model is explicit and documented
- Any sync does not compromise privacy goals
