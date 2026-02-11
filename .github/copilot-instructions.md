# Copilot instructions for Budgeteer

These notes help AI agents work productively in this repo. Keep changes small, code-accurate, and aligned with the docs.

Developer Documentation Hub (start here): `docs/index.md`

## Big picture

- Frontend-only SPA: React 19 + Vite 7 + TypeScript.
- UI: Chakra UI v3 (use Chakra components + theme tokens; avoid inventing new colors/styles).
- Routing: React Router in `src/App.tsx`.
- State: Zustand stores under `src/store/` (some persisted to localStorage).
- Cloud integration: AWS Amplify (Cognito auth + AppSync GraphQL client).

## Key conventions and patterns to know before editing:


## Legacy / backward-compat stance (important)

- There are currently no real users or accounts for this app yet (no admin/tester accounts either).
- Do NOT add temporary “legacy compatibility” code to support pre-update states/APIs/fields.
- Prefer clean refactors: update references and call-sites directly, rename/delete freely, and keep the codebase consistent.
- If you must break local persisted data (e.g., Zustand persistence), prefer an explicit reset (clear storage / bump storage key) over maintaining dual-read legacy adapters.

Note: When you start needing backward compatibility, switch to the legacy-mode guidance in `.github/copilot-instructions-legacy.md`.

## Routes (source of truth)

- Public routes: `/`, `/about`, `/planner`, `/tracker`, `/settings`, `/login`.
- Protected routes (wrapped in `RequireAuth`): `/accounts`, `/imports`, `/profile` (+ `/dev` in DEV only).
- See `src/App.tsx` for exact wiring.

## State & persistence

- Main domain store: `src/store/budgetStore.ts` (persisted under localStorage key `budgeteer:budgetStore`).
- Persistence boundary: `partialize` intentionally strips transient/UI-only fields (e.g. modal state, progress state, `hasInitialized`, `sessionExpired`).
- Other persisted stores exist under `src/store/` and `src/services/`.
- Do not change persisted store shapes or storage keys without an explicit migration plan.

## Auth & user bootstrapping

- Auth is Amplify-first (no Axios `/me`):
    - Resolve session user via `getCurrentUser()` in `src/hooks/useAuthUser.ts`.
    - Sign out via Amplify `signOut`, then clear session caches.
    - Auth lifecycle events are listened for via Amplify `Hub` (see `src/App.tsx` and `useAuthUser`).
- On app shell mount, profile bootstrapping runs via `src/hooks/useBootstrapUserProfile.ts` → `src/services/userBootstrapService.ts`.

## User-scoped localStorage (important)

- User scoping utilities live in `src/services/userScopedStorage.ts`.
- Keys are namespaced under `budgeteer:*` and user-scoped values use a `budgeteer:u:<scope>:` prefix.

## Data shape conventions (budget + transactions)

- Dates:
    - Daily: `YYYY-MM-DD`
    - Monthly: `YYYY-MM`
- Transactions (ingestion + persistence):
    - `rawAmount` is signed; `amount` is generally absolute; classification uses signedness.
    - Strong transaction key is the sole dedupe/idempotency key:
        `accountNumber|YYYY-MM-DD|signedAmount|normalized description[|bal:balance]`

## Ingestion pipeline

- Located in `src/ingest/` (TypeScript modules).
- Orchestrator: `runIngestion(...)` returns `{ patch, savingsQueue, stats, errors, acceptedTxns }`.
- Imported txns are tagged with `importSessionId` and may be `staged`.
- Strong key is built early to short-circuit duplicate work.

## API / GraphQL

- Prefer `src/api/budgeteerApi.ts` over calling `client.graphql` directly.
- Minimal selection sets live in `src/api/operationsMinimal.ts`.
- Be defensive about ownership fields: client should not send `owner` in mutation inputs.

## Tests

- Test runner: Vitest (`npm test`).
- Existing unit tests focus on ingestion (see `src/ingest/__tests__/`).
- Keep tests fast and deterministic; add new tests adjacent to the module under test.

## For checklists

- Never delete an item from a checklist in the docs; mark it as done with a strikethrough and add a note if needed.
- For new features or significant refactors, add a new checklist item to the relevant milestone in `docs/MILESTONES.md` to ensure it gets verified in future manual test runs.
- If the change is significant enough to require a new milestone, add a new section to `docs/MILESTONES.md` with a checklist for the new milestone.
- For minor changes that don't warrant a new milestone, consider adding a note to the relevant existing checklist item or creating a new item under an "Other" category in the relevant milestone.
- Keep the checklist items concrete and verifiable in the UI; avoid vague or subjective items.
- Keep the checklist up-to-date as items are completed or as the app evolves; outdated checklists can lead to confusion and missed regressions.

## Verification (run this when it matters)

- After each run that changes anything that could affect build, lint, or tests, verify with: `npm run check`.
- Skip verification when changes are docs-only (e.g., only `docs/**`, `README.md`, `CHANGELOG.md`, `TODO.md`, other `*.md`).
- Treat these as “verification required” changes:
    - Code changes: `src/**` (TS/TSX/JS/CSS), `index.html`
    - Tooling/config: `package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`
    - Tests: `src/**/__tests__/**`, `*.test.*`
    - Type/API surfaces: `src/API.ts`, GraphQL operations/mappers

## Commands

```bash
npm run dev      # Start Vite dev server
npm run check    # Verify (lint + test + build/typecheck as configured)
npm run build    # Typecheck + production build
npm run lint     # ESLint
npm test         # Vitest
```

## When adding features

- Keep UI consistent with Chakra patterns already in the codebase.
- Prefer adding store actions/selectors in the appropriate Zustand store file; avoid random `localStorage` access outside `src/services/userScopedStorage.ts`.
- Avoid conditional hook calls; keep renders pure (no `Date.now()`/randomness in render).
- If you touch ingestion, keys, savings queue, or persistence: update docs in `docs/` and add/adjust tests.

## Pointers (common starting points)

- App wiring + auth lifecycle: `src/App.tsx`
- App layout shell: `src/layout/AppShell.tsx`
- Main store: `src/store/budgetStore.ts`
- Auth hook: `src/hooks/useAuthUser.ts`
- User bootstrap: `src/hooks/useBootstrapUserProfile.ts`
- User-scoped storage: `src/services/userScopedStorage.ts`
- Ingestion pipeline: `src/ingest/`
- Docs hub: `docs/index.md`
