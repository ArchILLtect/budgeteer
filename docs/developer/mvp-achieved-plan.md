# Budgeteer — MVP Achieved Plan (Checklist)

Last updated: 2026-02-24

This document answers:

- **What is left** before we can reasonably call Budgeteer “MVP achieved” (as a planning-first, CSV-import budgeting app).
- A concrete **plan + checklist** to get there.

Scope source-of-truth:

- Product requirements: `docs/PRD.md`
- Roadmap + milestones: `docs/ROADMAP.md`, `docs/MILESTONES.md`
- Demo Mode MVP checklist: `docs/developer/demo-mode-mvp-plan.md`
- Current backlog: `TODO.md`

---

## What “MVP achieved” means (definition of done)

MVP is achieved when all items in **A–D** are true.

### A) Core user journeys are solid (PRD Journeys A/B/C)

- [ ] **Journey A (Plan a month):** User can create a scenario, enter income/expenses/savings, and save a month plan.
- [ ] **Journey B (Import safely):** User can import a CSV, see staged results + import history, and use apply/undo safely.
- [ ] **Journey C (Track vs plan):** Tracker shows monthly actuals and makes planned vs actual comparison explicit.

Verification:

- [ ] Manual click-through: Planner → Accounts → Imports → Import History → Apply/Undo → Tracker (no confusing copy, no console errors).

### B) Demo mode is credible (portfolio feature)

- [ ] Demo seeding + demo CSV import are real end-to-end (no stubs).
- [ ] Demo reset returns to “square one”.

Verification:

- [ ] In demo mode: Import Account Data → Load Demo CSV (Tiny) results in staged txns + import session + apply/undo works.
- [ ] Settings → Reset demo data returns the demo dataset to the initial state.

### C) MVP-quality non-functional guardrails are met (PRD §7)

- [ ] `npm run check` is green.
- [ ] **Accessibility basics:** keyboard navigation works for primary flows; form controls are labeled; “skip to content” exists.
- [ ] **Startup resilience:** corrupted user-scoped localStorage cannot brick app startup (detect + clear + user-friendly message).

### D) Debuggability is “good enough” for MVP

- [ ] `/samples` includes a tiny deterministic **golden canonical History-export CSV** for ingestion debugging.
- [ ] `/samples/README.md` documents the golden file.

---

## What’s already done (so we don’t redo work)

Use `docs/MILESTONES.md` as the authoritative status record. As of 2026-02-24:

- Milestone 0–4 are marked done.
- Demo Mode MVP items A–D are done; only item E remains.

---

## MVP blockers (what’s left)

These are the *minimum* remaining tasks to confidently say “MVP achieved”, based on PRD requirements + current TODOs.

### 1) Minimal samples curation (MVP)

Source: `docs/developer/demo-mode-mvp-plan.md` → “E. Minimal samples curation (MVP)”

- [ ] Add a small deterministic “golden” canonical History-export CSV under `/samples`
  - Keep it small (10–30 rows), deterministic, representative
  - Intended for debugging ingestion and quick manual import
- [ ] Update `/samples/README.md` to describe the golden file

Related backlog item:

- `TODO.md`: `TODO(P1): Demo Mode (MVP) — E. Minimal samples curation`

### 2) Imports/Apply toast after Savings Review modal

Source: `TODO.md`

- [ ] `TODO(P1): Imports/Apply — after Savings Review modal completes, fire toast “Savings transactions linked” (later: include counts); ensure it happens for both Accounts “Apply to Budget” and Import History “Apply”`

Acceptance:

- [ ] After completing Savings Review, a success toast fires reliably from both entry points.

### 3) Accessibility basics (MVP quality)

Source: `TODO.md` + PRD §7 (Accessibility)

- [ ] `TODO(P2): Accessibility pass — add/verify “skip to content”, basic keyboard navigation, and labeled form controls`

Acceptance:

- [ ] A visible “Skip to content” link exists and works.
- [ ] Primary flows are keyboard-usable (Planner inputs, import/apply, Tracker navigation, Settings).
- [ ] Forms are labeled for screen readers (no unlabeled inputs in primary flows).

### 4) Startup resilience (MVP quality)

Source: `TODO.md` + PRD §7 (Reliability)

- [ ] `TODO(P2): Startup resilience — ensure corrupted user-scoped localStorage can’t brick app startup (detect/clear + user-friendly message)`

Acceptance:

- [ ] If the persisted budget store JSON is corrupted, the app:
  - clears the corrupted key(s)
  - shows a clear message (toast/banner)
  - continues to render (fresh state)

---

## Execution plan (recommended order)

Keep each step small and shippable. For each step: update `TODO.md` checkboxes and run `npm run check`.

1) **Samples curation**
   - Add the golden CSV and update `/samples/README.md`.
   - Verify it imports and produces stable, predictable results.

2) **Savings Review completion toast**
   - Implement the toast in both apply entry points.
   - Add/adjust a small unit test only if there’s an existing test harness for the relevant module; otherwise do manual verification.

3) **Accessibility pass (targeted)**
   - Add “skip to content” and label audits for primary forms.
   - Do a keyboard-only run through Journeys A/B/C.

4) **Startup resilience**
   - Add detection/guardrails around persisted store rehydrate.
   - Add a manual “corrupt storage” test procedure (below).

---

## Manual MVP smoke test script

Run this after the above blockers are done.

### Scenario 1 — Normal user

- [ ] Login
- [ ] Planner: create scenario → add income → add expense → save month plan
- [ ] Accounts: import a sample CSV → verify staged transactions and import history entry
- [ ] Import History: apply session → verify tracker month updates; undo within window behaves
- [ ] Tracker: verify Plan vs Actual presentation is clear for that month
- [ ] Settings: verify import policy settings save and take effect

### Scenario 2 — Demo mode

- [ ] Demo: Import Account Data → Load Demo CSV (Tiny)
- [ ] Apply → verify visible month actuals change
- [ ] Settings → Reset demo data → confirm returns to initial demo dataset

### Scenario 3 — Corrupted local storage resilience

- [ ] In devtools, corrupt the user-scoped budget store value (invalid JSON) and reload
- [ ] App recovers (clears + message + renders)

---

## Explicitly not required for MVP (post-MVP)

These are valuable but do **not** block calling MVP achieved:

- “Generate suggestions” heuristics toggle for imports (`TODO(P1)`)
- Advanced “Clear session” options and DEV-only variants (`TODO(P2)`)
- Per-transaction rename/edit entrypoint in Tracker (`TODO(P2)`)
- Backend sync strategy decisions (`TODO(P4/P5)`)
