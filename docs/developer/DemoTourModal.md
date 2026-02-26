# Budgeteer — Demo Tour Modal (Script)

Last updated: 2026-02-25

This document is the **copy/source script** for the in-app Demo Tour modal.

Goals:

- Provide a fast, credible walkthrough of Budgeteer’s core story.
- Stay aligned with the PRD journeys: Plan → Import safely → Track plan vs actual.
- Keep expectations honest (local-first, CSV-based, no bank credential linking).

---

## Modal title

**Demo quick tour**

## Intro copy

A short walkthrough you can use for a showcase. Budgeteer is planning-first: make a plan, import transactions safely, then track plan vs actual.

## Demo account note

Demo data is meant for temporary evaluation. Use Settings → Demo Data to reset the demo experience back to square one anytime.

---

## Recommended steps

### 1) Planner = build a month plan

- Create (or load) a scenario.
- Add income sources and expenses.
- Save a plan for the selected month.

Primary navigation:

- Planner (`/planner`)

### 2) Accounts + Imports = ingest safely

- Import a CSV into an account container.
- Review the staged results and import session entry.
- Re-importing the same file should create **no duplicates** (idempotent).

Primary navigation:

- Accounts (`/accounts`)
- Import History (`/imports`)

### 3) Apply/Undo = safe experimentation

- Apply a selected import session to push staged transactions into monthly actuals.
- Undo is time-limited, but session-scoped and designed to be safe.

Primary navigation:

- Import History (`/imports`)

### 4) Tracker = planned vs actual

- Open Tracker for a month.
- Use the month summary to see whether you’re ahead/behind plan.

Primary navigation:

- Tracker (`/tracker`)

### 5) Settings = demo reset tools

- Use Reset demo data to return to the initial seeded dataset (“square one”).

Primary navigation:

- Settings (`/settings`)

---

## Footer controls

- Checkbox: **Don’t display again**
- Helper text: **You can re-enable this in Settings.**

---

## Notes

- Keep the tour steps stable and avoid referencing non-existent pages.
- If routes change, update both this doc and the modal component.
