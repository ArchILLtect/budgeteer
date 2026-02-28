# Demo Mode (MVP) — Plan + Checklist

Last updated: 2026-02-27

## Goal

Deliver a **low-friction, end-to-end demo** that runs through the **real import pipeline** and then supports the normal staging/apply/undo flow.

Key requirement: demo mode must provide a special option in **Import Account Data** that imports a **specific CSV file/string** (canonical “History export” format), and then proceeds as normal.

Also required: users must be able to choose which demo dataset size to import (**Tiny / Medium / Large**).

## Guiding decisions

### 1) “Demo CSV asset”, not “in-memory rows”

The demo import must pass a **CSV text/string** through the same parsing + ingestion pipeline as real imports.

- ✅ OK: fetch a real `.csv` file from app assets (e.g. `public/demo/*.csv`) and parse it with PapaParse.
- ✅ OK: import a `.csv` asset as a raw string (e.g. `?raw`) and feed it into the normal flow.
- ✅ OK: store a canonical CSV string constant in code.
- ❌ Not OK: synthesize a `CsvRow[]` and skip parsing.

### 2) Clear vs Reset demo data

For MVP, treat “clear demo data” as “reset to square one”.

- **Reset demo** = clear demo-marked local data + reset the seed gate + reseed the initial dataset.
- A separate “Clear demo data (no reseed)” action is optional and deferred until we have a clear need.

Rationale: the primary demo expectation is “get me back to the starting demo experience”, not advanced data-management semantics.

## Scope (MVP)

### In scope

- A dedicated **Demo CSV import** entrypoint in Import UI.
- Demo seeding is implemented (no longer a stub) and produces meaningful data in:
  - Accounts + Transactions
  - Import history
  - Staging/apply/undo flow
- Demo reset returns the demo dataset to the initial state.

### Out of scope (explicit non-goals for MVP)

- Multi-account demo bundles.
- Fancy edge-cases (proposal-heavy demos, corruption cases, huge perf demos).
- Backend-driven demo dataset management (demo clears/resets operate locally for now).

## UX requirements

### Import Account Data

Add a demo-only action (visible when demo mode is active):

- **Picker:** Tiny / Medium / Large
- **Button:** “Load Demo CSV”
- Behavior:
  1) Loads the selected dataset’s canonical History-export CSV text (Tiny/Medium/Large).
  2) Runs the exact normal parse + ingest flow (same code paths as file upload).
  3) Produces the same outputs as a real import: staged txns, import history entry, etc.

### Settings (demo identity)

For demo identities, provide one MVP action:

- **Reset demo data** (returns to square one)

If “Clear demo data” exists, it should either:
- be removed/hidden for MVP, or
- behave identically to reset until we explicitly split semantics.

## Data semantics

### “Demo Mode” vs “Sample data”

- **Demo identity / demo session**: a real “demo user/session” concept.
- **Sample data**: demo-marked seeded data that may exist for non-demo identities too.

### Demo-marking

Originally intended: mark seeded demo records so we can clear them deterministically.

MVP update (2026-02-24): we treat demo reset as **"square one"** for demo identities by clearing the current user's local persisted state, so per-record demo-marking is **deferred**.

## Implementation checklist (step-by-step)

### A. Demo CSV asset + import entrypoint

- [x] ~~Provide three canonical demo CSV datasets: Tiny / Medium / Large~~ (done 2026-02-24)
  - Must match the canonical “History export” header style used in `/samples`.
  - Prefer runtime assets under `public/demo/` to avoid bundling large CSV strings into JS.
    - Example: `public/demo/demo-tiny.csv`, `public/demo/demo-medium.csv`, `public/demo/demo-large.csv`
- [x] ~~Update the Import UI demo action to load the selected CSV text and run the normal flow~~ (done 2026-02-24)
  - Replace any in-memory `CsvRow[]` generation.
  - Run the same pipeline as normal imports:
    - parse (PapaParse)
    - normalize/classify/dedupe/directives
    - `analyzeImport({ fileText: demoCsvText, ... })`
    - `commitImportPlan(plan)`

### B. Fix demo seeding stub (bootstrap)

- [x] ~~Implement `seedDemoData()` in the bootstrap service~~ (done 2026-02-24)
  - Uses a real demo CSV asset and seeds via `analyzeImport(...)` + `commitImportPlan(plan)`.
  - Note: per-record demo-marking deferred (see Demo-marking section).
- [x] ~~Ensure the seed gate (`seedVersion`) continues to be multi-tab safe~~ (already implemented)
  - Claim/finalize/rollback mechanism retained.

### C. Demo-mode flag wiring (so demo-only UI appears)

- [x] ~~Ensure `useDemoMode(...)` drives `useBudgetStore(...).setIsDemoUser(true|false)`~~ (done 2026-02-24)
  - Centralized in app shell/layout so Import UI can reliably show demo-only actions.

### D. Demo reset: “square one”

- [x] ~~Implement a single MVP reset action for demo identities~~ (done 2026-02-24)
  - Clears current user's local persisted state ("square one")
  - Resets `seedVersion` to 0
  - Calls `bootstrapUser({ seedDemo: true })`
- [x] ~~Wire Settings UI to call the real reset implementation~~ (done 2026-02-24)

### E. Minimal samples curation (MVP)

- [x] ~~Add a small deterministic “golden” canonical History-export CSV under `/samples`~~ (done 2026-02-27)
  - `samples/History_Showcase_Tiny.csv` (canonical History-export format; 10–30 rows)
- [x] ~~Update `/samples/README.md` to describe the golden file.~~ (done 2026-02-27)

## Acceptance criteria (definition of done)

- [x] ~~In demo mode, Import Account Data → “Load Demo CSV” runs the full normal pipeline and results in:~~ (done 2026-02-24)
  - an account with staged transactions
  - an import history entry
  - ability to apply/undo
- [x] ~~Demo seeding at login is no longer a stub and produces the same kind of dataset.~~ (done 2026-02-24)
- [x] ~~Settings → Reset demo data returns to the initial demo state (square one).~~ (done 2026-02-24)
- [x] No additional demo “polish” features beyond the above.
