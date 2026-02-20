
# Budgeteer — PRD (Product Requirements Document)

Last updated: 2026-02-15

Budgeteer is a privacy-aware personal finance app focused on **planning-first budgeting**, **CSV-based transaction imports**, and **clear monthly tracking**.

This PRD is grounded in:

- `docs/budgeteer_project_context_vision.md`
- The current implementation in `src/`
- The shared-platform patterns described in `docs/legacy/*`

---

## 1) Problem statement

Most consumer budgeting tools either:

- require bank credential integrations, or
- hide logic behind opaque categorization/automation, or
- make it difficult to safely ingest and reconcile transaction data.

Budgeteer’s approach:

- **User-controlled imports** (CSV files the user already owns)
- **Deterministic ingestion** (idempotent, debuggable)
- **Plan → track** workflow (planner is primary, tracker complements)
- **Clear staging safety** (preview/stage/apply + undo window)

---

## 2) Goals

### Product goals

1. Planning-first budgeting: model income/expenses/savings via scenarios.
2. Safe imports: repeated imports never create duplicates; users can undo mistakes.
3. Clarity: planned vs actual is explicit; calculations are explainable.
4. Privacy-by-design: no bank scraping; minimize sensitive identifiers.
5. Showcase-quality engineering: clean boundaries, robust auth, scalable patterns.

### Engineering goals

- Keep UI components thin and declarative.
- Centralize business logic in domain helpers/services/stores.
- Insulate UI from backend/AppSync selection sets via API wrapper + mappers.
- User-scoped persistence to avoid cross-account cache leakage on shared devices.

---

## 3) Non-goals (explicit)

- Plaid/bank credential linking (not in scope now).
- Automated “magic” budgeting that hides logic.
- Crypto / investing / net-worth dashboards (out of scope).
- Multi-user household collaboration (future possibility, not current).

---

## 4) Target users / personas

1. **Budget planner**: wants to plan monthly spending before the month starts.
2. **Spreadsheet migrator**: wants a more structured version of a spreadsheet, without giving away data.
3. **Developer/reviewer**: evaluates architecture, correctness, and cloud integration.

---

## 5) Key user journeys

### Journey A: Plan a month (scenarios)

1. User opens Planner.
2. Creates/loads a scenario.
3. Enters income sources (hourly/salary) and filing status.
4. Enters expenses and savings mode.
5. Saves plan for the selected month.

Success: the plan is saved and visible in the tracker.

### Journey B: Import transactions safely

1. User opens Accounts.
2. Syncs/creates an account container.
3. Imports a CSV.
4. System dedupes idempotently, stages new rows, and records an import session.
5. User reviews Import History.
6. User applies the staged transactions for the selected import session (session-scoped apply) or undoes the session.

Success: staged/apply/undo is understandable, safe, and reversible.

### Journey C: Track actuals against plan

1. User opens Tracker for a month.
2. Sees income/expense totals and savings.
3. Compares planned vs actual.
4. Makes small adjustments (e.g., overridden totals) where needed.

Success: tracking feels “honest” and not confusing.

---

## 6) Functional requirements

### 6.1 Planner

Requirements:

- Users can maintain multiple named scenarios.
- Income sources support at least:
	- hourly (rate + hours/week, with overtime rules)
	- salary (gross)
- Planner computes gross → estimated taxes → net income (state + filing status).
- Users can model expenses and a savings allocation mode.

Acceptance criteria:

- Scenario switching is deterministic and doesn’t lose edits.
- Calculations are stable across refresh (persisted state).

### 6.2 Accounts

Requirements:

- Users can create/sync logical accounts (checking/savings/credit).
- Each account is a container for imported transactions.
- The UI can display and group transactions by month.

Acceptance criteria:

- Account list loads quickly and is stable across refresh.
- Accounts do not leak or mix between signed-in users.

### 6.3 Transaction import (CSV)

Requirements:

- Importing the same CSV multiple times is idempotent (no duplicates).
- Imported transactions are initially staged (not immediately applied).
- Each import creates a session with:
	- importedAt
	- newCount
	- hash
	- accountNumber
- Streaming parse auto-toggle is supported by threshold (file size/line count).

Acceptance criteria:

- A re-import of the same file results in 0 newly-staged rows.
- Large files do not freeze the UI (streaming path or chunked processing).

### 6.4 Staging / Apply / Undo

Requirements:

- Users can undo staged imports within a configurable window.
- Users can apply staged transactions for a selected import session to mark them budget-applied.
- Users can see import session status: active, expired, applied, partial states.
- Staged sessions can auto-expire into applied state after N days.
- Users can permanently clear an import session (destructive), removing that session’s staged transactions and associated tracker artifacts.

Notes:
- Detailed “clear session” semantics are documented in [ARCHITECTURE](./ARCHITECTURE.md).

Acceptance criteria:

- Undo cannot remove already-applied transactions.
- Status transitions are correct and explainable.

### 6.5 Tracker

Requirements:

- Monthly view shows:
	- actual income, actual expenses, savings
	- comparisons with planned values where available
	- a summary component (can be lazy-loaded)

Acceptance criteria:

- Tracker is usable without importing (manual actual entry still works).

### 6.6 Settings

Requirements:

- Users can configure import policy:
	- undo window minutes
	- history retention (max entries, max age)
	- staged auto-expire days
	- streaming auto thresholds
- Settings changes should take effect immediately and safely.

### 6.7 Auth & identity

Requirements:

- Users can sign in/out via Amplify/Cognito.
- UserProfile is created (and legacy fields self-healed) on first login.
- Persisted client state is user-scoped.

### 6.8 Demo mode (portfolio feature)

Requirements:

- “Try demo” creates demo credentials via a backend endpoint.
- Demo session is flagged locally so seeding logic is safe.

Note: UI copy and routes may still evolve as the product surface is tightened.

---

## 7) Non-functional requirements

### Privacy & security

- Do not request/store bank credentials.
- Do not persist unnecessary sensitive fields.
- Protect cross-user state: user-scoped persistence required.

### Performance

- First meaningful paint should be fast on repeat visits (persisted state).
- CSV parsing should not lock the UI for large files.
- Use code splitting for heavy components.

### Reliability

- Build must be clean (`npm run build`).
- App should tolerate corrupted localStorage entries without bricking.

### Accessibility

- Basic keyboard navigation and “skip to content” support.
- Form controls should be labeled.

---

## 8) Metrics (lightweight)

Because this is privacy-aware, metrics should be minimal and opt-in.

Potential success indicators (qualitative):

- Users can import the same file repeatedly with zero duplicates.
- Users understand staged vs applied state without reading docs.
- The planner feels “trustworthy” (no mysterious numbers).

---

## 9) Risks & open questions

Risks:

- Naming inconsistencies (routes/copy/storage keys) can confuse users.
- Central persisted store (`budgetStore`), even when composed from slices, can become hard to maintain as features grow.
- Remaining type gaps (mostly at boundaries like CSV parsing) can mask bugs in ingestion/account math.

Open questions:

- When should budgeting domain data move from local persistence to AppSync models?
- How should “accountNumber” be represented to avoid storing raw identifiers?
- What is the canonical category taxonomy (and how user-editable should it be)?

