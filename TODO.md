<!-- {root}/TODO.md -->

# TODO

This file is the **current backlog for Budgeteer** (initial cleanup + docs + stability).

Actionable TODOs must use one of:

- `TODO`(P1) ... `TODO`(P5) — prioritized work
- `TODO`(continual) — ongoing hygiene

---

## Index

- [Open Backlog](#open-backlog)
  - [`TODO`(continual)](#continual)
  - [`TODO`(P1)](#p1)
  - [`TODO`(P2)](#p2)
  - [`TODO`(P3)](#p3)
  - [`TODO`(P4)](#p4)
  - [`TODO`(P5)](#p5)
  - [stretch](#stretch)
  - [postmvp](#postmvp)
- [Commit Plan (batching ~120 changes)](#commit-plan)
- [Archive (implemented / completed)](#archive)

---

<a id="open-backlog"></a>
## Open Backlog

<a id="continual"></a>
### TODO(continual)

- [ ] TODO(continual): Keep `npm run build` green; fix regressions immediately
- [ ] TODO(continual): Remove dead code paths during feature work (don’t let leftovers accumulate)
- [ ] TODO(continual): Prefer user-scoped storage keys for any persisted UI state

<a id="p1"></a>
### TODO(P1)

- [x] TODO(P1): Naming cleanup — align UI copy to Budgeteer
- [x] TODO(P1): Routing cleanup — align defaults to actual Budgeteer routes
- [x] TODO(P1): Storage cleanup — align localStorage keys to `budgeteer:*`
- [x] TODO(P1): Rename misnamed exports/symbols
- [x] TODO(P1): Update README + contributing docs (see “Docs” P1 below)

UI bugfixes (P1):

- [x] TODO(P1): Planner — fix “Include savings in …” radio button not working
- [ ] TODO(P1): Tracker — fix “Total Override” checkbox not working
- [ ] TODO(P1): Imports/Apply — after Savings Review modal completes, fire toast “Savings transactions linked” (later: include counts); ensure it happens for both Accounts “Apply to Budget” and Import History “Apply”

Income Details (Tracker) (P1):

- [ ] TODO(P1): Tracker — income delete confirmation alert copy: don’t call it an “expense”, include the income source name, and fire success/error toast appropriately
- [ ] TODO(P1): Tracker — updating/adding income sources should update “Monthly Income” total at top of card (currently only impacts “Actual Net Income” stat)
- [ ] TODO(P1): Tracker — clarify stat bar layout above “<year> Summary”; fix duplicate “Total Saved” and “Leftover” stats (ensure intended count and uniqueness)

Savings Goals (Tracker) (P1):

- [ ] TODO(P1): Tracker — savings goal card display: fix incorrect/missing info rendering
- [ ] TODO(P1): Tracker — savings goal edit: clicking “Edit” should only open the selected item (not all edit panels)
- [ ] TODO(P1): Tracker — savings goal save: toast fires but changes are not persisted; fix persistence and refresh behavior
- [ ] TODO(P1): Tracker — savings goal delete: toast fires but item is not removed; fix deletion and refresh behavior

Runtime console errors (P1):

- [ ] TODO(P1): Tracker — fix duplicate React key warning `same key, NaN` from SavingsGoalsTracker list rendering (ensure stable, unique keys)
- [ ] TODO(P1): Tracker — fix Chakra `Progress` error: value receives `[object Object],[object Object]` and exceeds max 100 (ensure numeric value and correct max)
- [ ] TODO(P1): Settings — fix controlled/uncontrolled input warning: text input has both `value` and `defaultValue`

Copy/branding (P1):

- [x] TODO(P1): Update HomePage copy/content to match Budgeteer
- [x] TODO(P1): Update AboutPage copy/content to match Budgeteer

Docs (P1):

- [x] TODO(P1): Update README.md for Budgeteer (current is from older app)
  - What the app is (planner-first, CSV import, staging/apply/undo)
  - Local dev instructions
  - Link to architecture docs (`docs/developer/README.md` and docs overview)
  - Mention `/samples` folder and sample CSVs
- [x] TODO(P1): Update CONTRIBUTING.md for Budgeteer
  - dev workflow, branches/PR expectations
  - how to run tests/lint/build
  - conventions for dates/month keys, transaction strong keys
- [x] TODO(P1): Replace README banner with a Budgeteer version
  - new file: `docs/assets/readme-banner.svg`
  - ensure README references it
- [ ] TODO(P1): Ensure `/samples` is documented and curated
  - describe each sample file
  - keep a small, deterministic “golden” CSV for ingestion tests/debug
- [ ] TODO(P1): Define backend models: Account, Transaction, ImportSession (Transaction identity must be deterministic via strongKey)
  - document in `docs/developer/README.md` or similar
  - ensure frontend models align with backend expectations
  - consider adding TypeScript types/interfaces for these models in `src/types` and using them at ingestion boundaries
- [ ] TODO(P1): Document auth flows and user-scoped persistence in architecture docs
  - how `useAuthUser()` works, how it triggers rehydration of user-scoped stores
  - the user-scoped storage key format and rationale
  - any implications for development/testing (e.g. how to clear state, how to test multiple users)
  - consider adding a diagram to illustrate the auth lifecycle and storage scoping
- [ ] TODO(P1): Document the transaction import flow (staging, apply, undo) in architecture docs
  - how import sessions are modeled, how transactions are tagged with `importSessionId`
  - the user experience around staging/apply/undo
  - any edge cases or important details (e.g. time window for undo, how duplicates are prevented)
  - consider adding a flow diagram to illustrate the import process and state transitions
- [ ] TODO(P1): Document the budgeting model and core domain concepts in architecture docs
  - scenarios, monthly plans/actuals, savings goals/logs, accounts/transactions
  - how these concepts are represented in the store and how they relate to each other
  - any important calculations or business logic (e.g. how the planner computes summaries)
  - consider adding a diagram to illustrate the budgeting model and relationships between concepts
- [ ] TODO(P1): Document the decision to use a shared Amplify Gen 1 backend with AppSync GraphQL API
  - rationale for the decision (reuse backend services, decoupled frontend)
  - what resources are shared (user pool, GraphQL API) and what is separate (frontend codebase, auth handling, local persistence)
  - any implications for development or future plans (e.g. if we want to migrate to Gen 2 in the future, how would that work?)
- [ ] TODO(P1): Document the user personas and target users for Budgeteer in the architecture or roadmap docs
  - budget planner, spreadsheet migrator, developer/reviewer
  - how these personas influenced design decisions and feature prioritization
  - any plans for future features that might target additional personas (e.g. multi-user collaboration for households)
- [ ] TODO(P1): Document the non-goals for Budgeteer in the architecture or roadmap docs
  - Plaid/bank credential linking, automated “magic” budgeting, crypto/investing/net-worth features, multi-user household collaboration
  - rationale for excluding these features (out of scope, future possibility, etc.)
  - how we might approach these features in the future if we decide to pursue them
- [ ] TODO(P1): Document the product and engineering goals for Budgeteer in the architecture or roadmap docs
  - planning-first budgeting, safe imports, clarity, privacy-by-design, showcase-quality engineering
  - how these goals influenced design and implementation decisions
  - any trade-offs or challenges we faced in trying to achieve these goals
- [ ] TODO(P1): Ensure the architecture doc reflects the current system accurately
  - review and update sections on auth, persistence, budgeting model, transaction importing, etc. to match the current implementation
  - remove any outdated references to non-Budgeteer concepts
  - ensure the doc is clear and comprehensive for new developers joining the project
  
<a id="p2"></a>
### TODO(P2)

## Review needed — possible intentional identifiers

- [ ] REVIEW: Amplify-generated auth/API identifiers still include `taskmaster` (do not rename unless you are rebuilding/updating the Amplify backend config)
  - [amplify/team-provider-info.json](amplify/team-provider-info.json#L4-L14)
  - [src/aws-exports.js](src/aws-exports.js#L33)
  - [src/amplifyconfiguration.json](src/amplifyconfiguration.json#L30)
  - [src/services/demoAuthService.ts](src/services/demoAuthService.ts#L30)
- [ ] TODO(P2): Audit Amplify API naming that uses `taskmasterAuth`
  - document if it must remain for backend compatibility, otherwise rename
- [ ] TODO(P2): Consolidate storage keys and events under a single namespace
  - prefer `budgeteer:*` for global keys
  - prefer `budgeteer:u:${scope}:...` for scoped keys
- [x] TODO(P2): Remove/replace non-Budgeteer-branded assets (e.g. title SVG)

<a id="p3"></a>
### TODO(P3)

- [ ] TODO(P3): Clean up migration leftovers in settings and “platform” pages
  - eliminate UI that only exists to support unrelated scaffolding flows
- [ ] TODO(P3): Reduce store surface area (without tackling `any` yet)
  - separate UI-only flags from budgeting domain state
  - ensure persist `partialize` is correct and minimal

Type hardening follow-ups (deferred until Milestone 4A is browser-testable):

- [ ] TODO(P3): Type the root persisted store wiring in `src/store/budgetStore.ts`
  - define a single RootStore type (slice composition)
  - remove `set/get/store/state: any` in the persist wrapper
- [ ] TODO(P3): Replace remaining `any` in `src/store/slices/plannerSlice.ts` (planner domain models + setters)
  - keep scope tight; don’t attempt to type unrelated UI
- [ ] TODO(P3): Tighten ingestion internal/output shapes (`analyzeImport` + `ImportPlan`)
  - replace `existingTxns: any[]` with domain `Transaction[]`
  - remove `parsedRows?: any` and `norm: any` by introducing narrow row/normalized-row types
- [ ] TODO(P3): Defer non-core `any` cleanup in utilities until after core ingestion work ships
  - `src/utils/analysisUtils.ts`, `src/utils/calcUtils.ts`, `src/utils/demoUtils.ts`

<a id="p4"></a>
### TODO(P4)

- [ ] TODO(P4): Decide what remains local-only vs syncs to backend (document in docs)

<a id="p5"></a>
### TODO(P5)

- [ ] TODO(P5): Re-evaluate cloud sync strategy after core UX is coherent

---

<a id="commit-plan"></a>
## Commit Plan (batching ~120 changes)

Goal: land a clean, reviewable history by grouping commits by intent.

- [ ] TODO(P1): Commit 1 — Docs foundation
  - README/CONTRIBUTING updates, banner SVG, samples documentation
- [ ] TODO(P1): Commit 2 — Route + copy cleanup
  - redirects, sidebar items, page headings, welcome/about/dev copy
- [ ] TODO(P1): Commit 3 — Storage namespace migration
  - key rename + migration path + test plan notes
- [ ] TODO(P1): Commit 4 — Follow-up hygiene
  - remove dead assets, rename hooks/symbols, delete unused services

Notes:

- Keep each commit buildable (`npm run build`).
- Prefer mechanical renames in their own commit.
- Avoid mixing functional changes with copy/rename where possible.

---

<a id="snowball"></a>

- [ ] TODO(P1): Add stable client device identity (deviceId in localStorage) for presence + sync lock ownership
- [ ] TODO(P1): Add missing error handling around auth and storage access (try/catch + user-friendly messages)
- [ ] TODO(P1): Ensure settings changes take effect immediately (e.g. theme toggle should update UI without reload)
- [ ] TODO(P1): Add a “golden” sample CSV for testing/debugging
- [ ] TODO(P1): Implement Presence heartbeat + UI indicator (green/red) in app header
- [ ] TODO(P1): Implement SyncLock (TTL mutex) for sync-only operations; block “Sync now” when lock held
- [ ] TODO(P1): Add manual “Sync now” button that acquires SyncLock and runs pull/push
- [ ] TODO(P1): Implement read-only pull: fetch cloud Accounts/Transactions and hydrate Zustand safely
- [ ] TODO(P1): Implement outbox queue (local) for idempotent sync writes + retry
- [ ] TODO(P1): Wire Import Transactions + Sync Accounts apply flow to enqueue backend writes (ImportSession + Transactions) under SyncLock
- [ ] TODO(P1): Enforce backend idempotency: strongKey-derived Transaction ID (re-import safe)

- [ ] TODO(P2): Add ImportSession cloud status transitions (STAGED/APPLIED/UNDONE/EXPIRED) and mirror to UI import history
- [ ] TODO(P2): Add “initial upload” migration path: push existing local accounts/txns to cloud (one-time) with dedupe
- [ ] TODO(P2): Add basic conflict protection: detect remote newer data and warn before overwriting local
- [ ] TODO(P2): Add incremental pull (by updatedAt) to avoid downloading everything each sync
- [ ] TODO(P2): Add sync telemetry panel (last sync time, counts pushed/pulled, last error)

- [ ] TODO(P3): Move persisted data from localStorage blob to IndexedDB (optional) for scalability (transactions can get large)
- [ ] TODO(P3): Add manual repair tools: edit tx, split tx, mark duplicate/merge
- [ ] TODO(P3): Add transfer pairing helper UI (optional) for savings/transfer edge cases
- [ ] TODO(P3): Add backend models for savings + planner/tracker domains (SavingsGoals, SavingsLogs, MonthlyPlans, MonthlyActuals)
- [ ] TODO(P3): Migrate savings review queue outcomes to persist in cloud

- [ ] TODO(P4): Add background auto-sync (when online + idle) while still keeping manual Sync button
- [ ] TODO(P4): Add stronger per-field merge rules (avoid overwriting user-edited fields during re-import)
- [ ] TODO(P4): Add role-based household management (invite, revoke) if needed



---

<a id="stretch"></a>
- [ ] TODO(stretch): Add true offline mode UX (sync badge + queued ops count + retry controls)
- [ ] TODO(stretch): Add fine-grained conflict UI (pick local vs remote per field)
- [ ] TODO(stretch): Add automated backups/export (cloud snapshot export)
---

<a id="postmvp"></a>
- [ ] TODO(postmvp): Evaluate double-entry ledger redesign only if transfer/reconciliation bugs dominate
- [ ] TODO(postmvp): Add OFX import + cloud sync integration
- [ ] TODO(postmvp): Add Plaid-based syncing (replace stub in src/utils/plaidService.js)
- [ ] TODO(postmvp): (Optional) Add Tier B (raw provenance) persistence for diagnostic/archive purposes
  - MUST be opt-in and explicit; default remains Tier A-only cloud sync
  - define retention/TTL + access policy; avoid shipping raw bank exports by default
---

<a id="archive"></a>
## Archive (implemented / completed)

### Platform / Foundations

- [x] `TODO`(P1): Decide Amplify Gen 2 vs Gen 1 (AppSync GraphQL) and record decision in docs/migration-plan.md
  - Decision: This app uses an Amplify Gen 1 backend with AppSync GraphQL API. Some backend resource identifiers still contain `taskmaster` naming (see the REVIEW items above); treat those as infrastructure identifiers unless/until you intentionally rebuild/rename the backend configuration. Budgeteer’s UI code is separate and focuses on budgeting features, with local persistence + GraphQL used primarily for UserProfile bootstrapping.
    
    This allows us to reuse backend services while keeping the new app decoupled and focused on budgeting features.

- [x] `TODO`(P1): Add Amplify backend with Cognito auth (Nick + Jr users, shared household access)
    - Amplify Gen 1 backend added with Cognito user pool and AppSync GraphQL API.
    - UserProfile table created in DynamoDB for storing user profiles.
    - Budgeteer can create users in the shared user pool and call existing GraphQL endpoints for user profile management.

---

### UI / Frontend

---

### CSV ingestion + core budgeting flows

---

- [x] TODO(P2): Import History “Apply selected session” must be session-scoped (do not apply other sessions in same month)
  - add session-scoped store APIs (apply + pending savings) and wire Import History to use them
  - add regression tests for overlapping sessions
  - tracking doc: `docs/developer/ingestion-plan.md`

- [x] TODO(P3): Full ingestion refactor — ImportPlan + commit (done)
  - `analyzeImport(...) -> ImportPlan` (serializable plan; no function-valued patches)
  - `commitImportPlan(plan)` is the single store commit boundary for import UIs
  - tests cover analyze/commit determinism + idempotency
  - tracking doc: `docs/developer/ingestion-plan.md`

- [x] TODO(P4): Proposed ingestion upgrades (done)
  - enable PapaParse worker mode for streaming parse (large files)
  - add streaming backpressure/yielding for classify/infer stages
  - add memory/perf guardrails for huge imports
  - improve error panel scalability (render cap + export warning)

### UX polish + clarity

---

### Sync and backend alignment

---

### Demo Mode + UserProfile seeding (MVP-critical)

---

### Settings + onboarding blob strategy (light MVP)

---

### Testing & Quality

---

### Routing & Navigation