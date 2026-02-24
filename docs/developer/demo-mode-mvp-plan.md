# Demo Mode (MVP) — Plan + Checklist

Last updated: 2026-02-24

## Goal

Deliver a **low-friction, end-to-end demo** that runs through the **real import pipeline** and then supports the normal staging/apply/undo flow.

Key requirement: demo mode must provide a special option in **Import Account Data** that imports a **specific embedded CSV file/string** (canonical “History export” format), and then proceeds as normal.

## Guiding decisions

### 1) “Embedded CSV”, not “in-memory rows”

The demo import must pass a **CSV text/string** through the same parsing + ingestion pipeline as real imports.

- ✅ OK: import a `.csv` asset as a raw string (e.g. `?raw`) and feed it into `analyzeImport({ fileText })`.
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

- **Button:** “Load Demo CSV”
- Behavior:
  1) Loads a fixed embedded canonical History-export CSV text.
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

All seeded demo records must be clearly marked so we can clear them deterministically.

MVP: mark at least transactions and import history / manifests as demo-created.

## Implementation checklist (step-by-step)

### A. Demo CSV asset + import entrypoint

- [ ] Create a canonical demo CSV asset under `src/` (so it can be imported as raw text)
  - Example: `src/demo/demo-history.csv`
  - Must match the canonical “History export” header style used in `/samples`.
- [ ] Add a loader module that returns CSV text
  - Example: `src/demo/demoCsv.ts` with `import demoCsv from "./demo-history.csv?raw"`
- [ ] Update the Import UI demo button to use the embedded CSV text
  - Replace any in-memory `CsvRow[]` generation.
  - Run the same pipeline as normal imports:
    - parse (PapaParse)
    - normalize/classify/dedupe/directives
    - `analyzeImport({ fileText: demoCsvText, ... })`
    - `commitImportPlan(plan)`

### B. Fix demo seeding stub (bootstrap)

- [ ] Implement `seedDemoData()` in the bootstrap service
  - Use the embedded CSV text (from A) to seed via `analyzeImport({ fileText })`.
  - Commit via the same store APIs as the normal import flow.
  - Ensure seeded items are demo-marked.
- [ ] Ensure the seed gate (`seedVersion`) continues to be multi-tab safe
  - Keep the existing claim/finalize/rollback mechanism.

### C. Demo-mode flag wiring (so demo-only UI appears)

- [ ] Ensure `useDemoMode(...)` drives `useBudgetStore(...).setIsDemoUser(true|false)`
  - Centralize this in app shell/layout so individual components don’t duplicate logic.
  - Goal: components like Import UI can reliably show demo-only actions.

### D. Demo reset: “square one”

- [ ] Implement a single MVP reset action for demo identities
  - Clears demo-marked local data
  - Resets `seedVersion` to 0
  - Calls `bootstrapUser({ seedDemo: true })`
- [ ] Wire Settings UI to call the real reset implementation
  - Remove/comment-in the currently stubbed calls.

### E. Minimal samples curation (MVP)

- [ ] Add a small deterministic “golden” canonical History-export CSV under `/samples`
  - Intended for debugging ingestion and for quick manual import.
  - Keep it small (10–30 rows), deterministic, and representative.
- [ ] Update `/samples/README.md` to describe the golden file.

## Acceptance criteria (definition of done)

- [ ] In demo mode, Import Account Data → “Load Demo CSV” runs the full normal pipeline and results in:
  - an account with staged transactions
  - an import history entry
  - ability to apply/undo
- [ ] Demo seeding at login is no longer a stub and produces the same kind of dataset.
- [ ] Settings → Reset demo data returns to the initial demo state (square one).
- [ ] No additional demo “polish” features beyond the above.
