# Budgeteer — Milestones

Last updated: 2026-02-10

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

Status: Planned / In progress

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
- [ ] Routes in `src/App.tsx` match sidebar/header links (no dead links)
- [ ] Public routes behave correctly (Home/About/Planner/Tracker/Settings/Login)
- [ ] Protected routes behave correctly (Accounts/Imports/Profile, and Dev in DEV only)
- [ ] Auth redirect after login lands on a Budgeteer route (not legacy)
- [ ] 404/unknown routes land on a sensible Budgeteer page

**B) Copy + terminology**
- [ ] Planner copy reads as Budgeteer (titles, buttons, empty states)
- [ ] Tracker copy reads as Budgeteer (titles, buttons, empty states)
- [ ] Accounts + Imports copy reads as Budgeteer (titles, buttons, empty states)
- [ ] Settings copy reads as Budgeteer (titles, sections, helper text)
- [ ] Remove/rename any leftover non-Budgeteer terminology in the UI

**C) Storage + user switching (no state leakage)**
- [x] All persisted keys follow `budgeteer:*` and user-scoped keys use the `budgeteer:u:<scope>:` prefix
- [x] Main persisted budget state is user-scoped (no shared `budgeteer:budgetStore` across users)
- [ ] Switching users does not reuse the previous user’s cached UI metadata
- [ ] Switching users does not reuse the previous user’s local settings / tips / demo preferences
- [ ] “Clear caches”/reset pathways are discoverable and work as expected
- [x] “Clear caches” clears user-scoped persisted stores + tip/demo/welcome prefs

**D) Regression guardrails**
- [ ] No console warnings/errors during normal navigation
- [x] `npm run check` stays green for Milestone 1 changes

**Milestone 1 manual test script (quick)**
- [ ] Sign in as User A → visit Planner/Tracker/Accounts/Imports/Settings → sign out
- [ ] Sign in as User B → repeat → confirm no User A state is visible

---

## Milestone 2 — Domain boundaries and type hardening

Status: Planned

Goal:
- Reduce risk by making budgeting logic easier to change.

Scope:
- Split monolithic store into slices (planner/accounts/import/settings)
- Add types at ingestion and transaction boundaries
- Add high-value tests for staging/apply/undo transitions

Acceptance:
- Fewer implicit/widened types in critical paths
- Tests cover strong key and import lifecycle

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
