# Import Directives + Staging Proposals (Design)

Status: Draft (approved for implementation)

Last updated: 2026-02-23

## Why this exists

Budgeteer imports bank transactions and stages them before applying to the budget.
We want to support:

- A user-facing `name` (display label) that does **not** overwrite the raw bank `description`.
- Optional “directive” hints embedded in imported notes (e.g., `budgeteer:rename=Primary Paycheck`).
- A staging-time review/approval workflow for proposed changes.
- Persistence that survives delete/re-import where possible (via strong key + override rules).

This design is intentionally local-first, explicit, and conservative.

## Goals

- Keep raw imported transaction data stable and auditable.
- Make rename/category/goal/savings actions visible **before** Apply-to-Budget.
- Ensure Apply-to-Budget is a simple “use the staged, approved state” step.
- Provide an ergonomic UI to review, batch-approve, and edit proposals.
- Allow users to create durable rules (e.g., Name Overrides) from staging edits.

## Non-goals (MVP)

- No NLP/free-text inference from human notes.
- No auto-generated suggestions by default (heuristics are explicitly gated and reviewable).
- No requirement that banks support editable/exported notes.

## Key decisions (locked)

### Description vs Name

- `description`: raw/imported descriptor; keep stable.
- `name`: user-facing label; may be empty.
- UI display rule: show `name ?? description`.
- Inline editing updates `name` (never `description`).

### Notes vs Directives

Persist three distinct concepts:

- `bankNote`: raw note imported from file (unchanged).
- `note`: cleaned human note derived from `bankNote` (directives removed, trimmed).
- `directives`: structured objects parsed from `bankNote`.

Directives are **not** stored as free-form strings.

### Staging-time proposals

- Parse directives during import.
- Generate proposals during import (from directives and/or from manual edits).
- Apply-to-Budget consumes the staged, approved data.

### Directive editing

- Users do not edit directive text directly post-import.
- Users edit `note` and `name` as text.
- Users add/remove directives via explicit UI controls (dropdowns/selectors).

### Import toggle (default ON)

- Toggle (default ON): “Auto-apply explicit `budgeteer:*` directives during import”.
  - ON: explicit directives are applied immediately (no approval required) but remain visible/auditable.
  - OFF: explicit directives are parsed into proposals that require approval.

- Future (TODO(P1)): Advanced toggle (default OFF): “Generate suggestions” (heuristics).
  - Suggestions must always be staged as proposals (never silently applied).

### Review UX

- Staging table stays the primary view.
- Rows with proposals/directives are highlighted and badge-labeled.
- If *any* rows need review, enable “Needs review” filter automatically.
- Apply-to-Budget is allowed even with unresolved proposals, but requires a confirm modal.

### Approve all proposals

- “Approve all” approves everything currently pending (explicit directives when not auto-applied + manual edits).
- Requires a confirm modal with counts by change type.

## Terminology

- **Directive**: an explicit `budgeteer:*` instruction found in notes or added via UI.
- **Proposal**: a pending change derived from directives or suggestions or manual edits that requires approval.
- **Approved change**: a change that is accepted and will be applied when applying the session.

## Data model changes

These are conceptual fields; exact types live in `src/types/` or store slice types.

### Transaction (staged and applied)

- `description: string` (existing)
- `name?: string | null` (new)
- `bankNote?: string | null` (new)
- `note?: string | null` (new)
- `directives?: Directive[]` (new; structured)

### Directive (structured)

A minimal initial set:

- `rename`: set `name`
- `category`: set/override category (and optionally create category if missing)
- `applySavingsToGoal`: apply savings-type outcomes to a named savings goal (create if missing)

Example (conceptual):

- `{ kind: 'rename', value: 'Primary Paycheck', source: 'bankNote' }`
- `{ kind: 'goal', value: 'Auto Loan Down-payment', source: 'bankNote' }`

### Proposal / Change

Proposals should be structured and typed (not strings), e.g.:

- `{ field: 'name', next: 'Primary Paycheck', source: 'directive', status: 'pending' }`
- `{ field: 'category', next: 'Transportation', source: 'directive', status: 'pending' }`

Status:

- `pending` → needs approval
- `approved` → will apply
- `rejected` → will not apply (but may remain visible/auditable)

### Persistence across delete/re-import

Two complementary mechanisms:

1) **Rule-based** persistence
- Name Overrides (Exact Match): durable rule keyed by normalized description (and optionally account)
- Created when user chooses “Apply rename to similar transactions”

2) **StrongKey-based** persistence
- Maintain a mapping from `strongKey -> { name, note, directiveOutcomes }`
- Used to rehydrate one-off edits if transactions are deleted and later re-imported

Caveat: strongKey stability depends on export shape (e.g., presence of balance). This is acceptable.

## Import pipeline changes

During import/analyze:

1) Normalize each row (existing)
2) Extract `bankNote` (if present)
3) Parse directives from `bankNote`
4) Produce:
   - `note` = `bankNote` with directive tokens removed
   - `directives` = structured array
5) Apply name overrides rules (existing settings feature)
6) If “Auto-apply explicit directives” is ON:
   - immediately apply directive outcomes into staged transaction fields
   - record outcomes as “applied from directive” (auditable)
7) Otherwise:
   - create proposals (`pending`) from directives

## UI changes

### Accounts: Staged/Imported transactions table

Add columns (minimal):

- Description (raw)
- Name (effective display value; indicates when it’s falling back to Description)
- Note (clean human note)
- Directives (summary chips; read-only initially)
- Status (badge):
  - “Needs review” (pending proposals exist)
  - “Directive applied” (directives present and applied automatically)

Row interaction:

- Click Name/Note/Directives cell → opens “Edit staged transaction” modal.

Filters:

- “Needs review” (auto-enabled when any pending proposals exist)
- “Has directives” (shows any row with directives, regardless of approval)

Batch actions:

- “Approve all” (with confirm modal)

Apply-to-Budget:

- If pending proposals exist: show warning and require confirm modal to proceed.

### Modal: Edit staged transaction

MVP fields:

- Name (text)
- Note (text)
- Directives (explicit add/remove controls; no raw directive text editing)

Options:

- Checkbox: “Apply this rename to similar future transactions”
  - Shows a preview of the exact match key it will add to Name Overrides

## Tracker changes

- Display transaction label as `name ?? description`.
- Inline edits update `name` (not `description`).

## Testing plan

Unit tests:

- Directive parser: extracts directives, produces cleaned note
- Import: bankNote -> note/directives/proposals behavior
- Auto-apply toggle:
  - ON: directives become applied outcomes, no pending proposals
  - OFF: directives become pending proposals
- StrongKey rehydration mapping
- Name Override creation from staging modal

UI tests (if present) or manual scripts:

- Import sample file with directives
- Confirm “Needs review” filter auto-enables when pending proposals exist
- Approve all and verify badges + apply works
- Apply-to-budget confirm modal appears when pending proposals exist
- Tracker displays `name` when set

## Implementation checklist (step-by-step)

1) Types
- [ ] Add `Directive` and proposal/change types (Directive done; proposals pending)
- [x] ~~Add transaction fields: `name`, `bankNote`, `note`, `directives`~~

2) Parsing
- [x] ~~Implement directive token parser for `budgeteer:*` (strict whitelist)~~
- [x] ~~Implement `cleanNote(bankNote)` that strips directive tokens~~

3) Ingestion integration
- [x] ~~Populate `bankNote` from imported rows when present~~
- [x] ~~Populate `note` + `directives` on staged transactions~~

4) Persistence helpers
- [x] ~~Add store/service to persist `strongKey -> overrides` mapping~~
- [x] ~~Rehydrate staged txns from strongKey mapping on re-import~~

5) Settings integration (Name Overrides)
- [x] ~~Wire “Apply rename to similar” to create Name Override exact-match entry~~
- [x] ~~Ensure it reuses the same SettingsPage infrastructure (single source of truth)~~ (uses `localSettingsStore`)

6) Staging proposals
- [x] ~~Add proposal generation from directives when auto-apply toggle is OFF~~
- [x] ~~Add proposal approval actions (single + batch)~~
- [x] ~~Ensure “Approve all” includes manual edits~~ (approves all pending proposals regardless of source)

7) UI: Accounts staged table
- [x] ~~Add Name/Note/Directives columns and status badges~~
- [x] ~~Add filters: “Needs review” (auto-on) and “Has directives”~~
- [x] ~~Add row highlighting for “Needs review”~~

8) UI: Edit staged transaction modal
- [x] ~~Implement modal with Name + Note editing~~
- [x] ~~Add directive UI (explicit controls; no raw text editing)~~
- [x] ~~Add “Apply rename to similar” checkbox + preview~~

9) Apply-to-budget safeguards
- [x] ~~If pending proposals exist, require confirm modal before applying~~ (currently `window.confirm`; can upgrade to `ConfirmModal` later)
- [ ] Demo-mode: allow auto-approve / reduced friction (later)

10) Tracker
- [x] ~~Use `name ?? description` for display~~
- [ ] Inline edits update `name` (no inline edit UI exists yet)

11) Tests + docs
- [x] ~~Add unit tests for parser + import behaviors~~
- [ ] Update any ingestion docs if needed
- [ ] Keep `npm run check` green

## Open questions (deferred)

- Which directive kinds to support in MVP beyond rename/category/goal link?
- How to represent goal links before a dedicated “goal linking” domain exists for non-savings txns?
- How to handle unknown directives found in `bankNote` (show warning chip; ignore).
