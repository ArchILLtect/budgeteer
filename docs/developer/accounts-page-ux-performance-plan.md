# Accounts Page UX + Performance Plan (Fast Shell + Collapsed Accounts)

Date: 2026-02-26

## Status

Implemented (2026-02-26):

- `/accounts` now renders a fast page shell immediately, with a clear “may take a bit…” message.
- The accounts list mount is deferred by one animation frame, showing a “Loading accounts…” indicator.
- Accounts are collapsed by default; expanding an account mounts the existing heavy details UI.

Primary implementation files:

- `src/pages/AccountsPage.tsx`
- `src/components/accounts/AccountCard.tsx`

## Goals

- Make navigation to `/accounts` feel immediate and unambiguous.
  - On click, the user should quickly see the Accounts page shell (heading + guidance message).
  - If account/transaction rendering is heavy, show an explicit “working…” indicator so users don’t re-click.
- Reduce initial render cost by defaulting account details to **collapsed**.
  - Render a lightweight summary row/card per account.
  - Only mount/compute heavy transaction UI when the user expands an account.
- Keep UX minimal and consistent with Chakra UI v3 patterns already used in the app.

## Non-goals

- No new routes (no interstitial `/loading` page).
- No redesign of import/apply workflow.
- No new theme tokens, colors, or bespoke UI styling.

## Problem Summary (Current Behavior)

- `AccountCard` performs substantial synchronous work during render (multiple loops over transactions, sets, sorting, proposal counts, month/year derivations).
- When `/accounts` mounts and renders all cards at once, the main thread can be blocked.
- When the main thread is blocked, the browser cannot paint spinners/messages immediately, so users may perceive that navigation did not “take”.

## Proposed UX (Option 1 + Option 2)

### Page shell (fast)
- `/accounts` renders immediately with:
  - Heading + existing description text.
  - A short message such as: “This page may take a bit to load depending on the number of accounts and transactions imported.”
  - A small spinner or skeleton indicator while account summaries are initializing (if needed).

### Account list (collapsed-by-default)
- Render an account summary card/row for each account.
- Each summary includes minimal information (cheap to compute):
  - Account label/masked number, institution
  - Last imported time (if available)
  - Counts that are cheap/available without scanning all txs (or computed lazily)
- Expanding an account mounts the heavy details view (transactions, proposals, staged sessions, etc.).

## Implementation Approach

### Step 1 — Split summary vs details
- Create a clear boundary so the collapsed view is lightweight:
  - **Summary component**: cheap props, avoids scanning full transaction arrays.
  - **Details component**: contains the existing heavy UI and transaction-derived computations.

Recommended structure:
- `AccountCard` becomes a wrapper with expand/collapse state.
- Heavy content moves into a child like `AccountCardDetails` that only renders when expanded.

### Step 2 — Ensure initial paint happens before heavy work
- Avoid doing heavy per-account computation at the top level of the Accounts route render.
- If necessary, allow the page shell to paint first (e.g., via a “deferred render” boundary for the list or details).

### Step 3 — Instrument and validate
- Use existing perf logging (`usePerfMilestone`, `recordRouteLoadComplete`) to confirm:
  - Time-to-first-paint on `/accounts` improves.
  - Expanding an account is acceptable.

## Checklist (This Change)

- [x] Update `/accounts` page to render a fast shell immediately (heading + message + spinner).
- [x] Change account rendering to collapsed-by-default (summary first).
- [x] Refactor `AccountCard` into summary + details (details mounts only when expanded).
- [x] Ensure collapsed summaries do not scan full transaction lists during render.
- [x] Show per-account “Loading…” indicator on expand if details are expensive.
- [x] Confirm existing flows still work (manual UI verification):
  - [x] Import Account Data (sync modal)
  - [x] Review staged sessions
  - [x] Apply to budget
  - [x] Savings review
  - [x] DEV: Clear Imported Data
- [x] Verify performance manually with a large dataset.
- [x] Run repo verification: `npm run check`.

## Implementation Notes (As Built)

### `/accounts` fast shell

- `AccountsPage` renders the heading + guidance message immediately.
- The accounts list is mounted after the first paint using `requestAnimationFrame`, showing an inline “Loading accounts…” indicator in the meantime.

### Collapsed-by-default accounts

- `AccountCard` is now a lightweight wrapper:
  - Renders a cheap summary (label/institution + transaction count).
  - Defaults to collapsed.
  - On expand, shows a brief per-card “Loading account details…” indicator for one frame, then mounts the heavy details component.
- `AccountCardDetails` contains the existing heavy account UI and only renders when expanded.

## Follow-ups / Future Work

### Option 4 — Virtualize the accounts list

When it helps:
- Many accounts (even if each has few transactions).

Notes:
- Virtualization is most valuable when the collapsed view is cheap and consistent height.
- If expanded details are very tall/variable height, virtualization is still possible but more complex.

Checklist (Option 4)
- [ ] Pick a virtualization approach compatible with React + Chakra (e.g., react-window) and minimal styling disruption.
- [ ] Virtualize the collapsed account summary list.
- [ ] Confirm expand/collapse works within a virtualized list.
- [ ] Validate keyboard navigation / focus behavior remains sane.
- [ ] Run `npm run check`.

### Option 5 — Precompute/cached per-account summaries (import-time)

When it helps:
- Any time the UI repeatedly rescans transactions to compute the same summary values.

Notes:
- The key is choosing stable, clearly invalidated summary fields.
- Prefer computing during ingestion/commit where the transaction list is already being walked.

Checklist (Option 5)
- [ ] Define “AccountSummary” shape (minimal fields used by collapsed UI).
- [ ] Compute summary during ingestion commit (or immediately after) and store on the account.
- [ ] Ensure edits that affect summary (e.g., proposal approvals) update summary correctly.
- [ ] Remove redundant per-render scans in UI in favor of the cached summary.
- [ ] Add/adjust unit tests if summary computation touches ingestion modules.
- [ ] Run `npm run check`.

## Risks / Watchouts

- If the collapsed summary still computes expensive derived fields, the page will remain slow.
- If expand triggers a large synchronous render, the per-account spinner may only appear briefly before the heavy render blocks; consider yielding (chunking) or limiting what mounts initially.
- Keep changes minimal: avoid introducing new UX beyond collapse + explicit loading messaging.
