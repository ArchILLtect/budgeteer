# Budgeteer — Setup

Last updated: 2026-02-10

This document is the practical “get it running” guide for the Budgeteer frontend.

If you’re looking for architecture and domain details, start with:
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/developer/README.md`

---

## 1) Prerequisites

- Node.js (LTS recommended)
- npm

Optional (only if you’re working on Amplify backend workflows):
- AWS Amplify CLI
- AWS credentials configured for the target account

---

## 2) Install

```bash
npm install
```

---

## 3) Run (development)

```bash
npm run dev
```

Vite will print the local URL (usually `http://localhost:5173`). If that port is taken, it will choose another.

---

## 4) Quality gates

```bash
npm run lint
npm run test
npm run build
```

---

## 5) Environment variables

This project uses Vite env vars (`VITE_*`).

Known patterns used by the codebase:

- `VITE_E2E_BYPASS_AUTH` — allows protected routes to render without Cognito for deterministic E2E testing (see platform overview / `RequireAuth`).

If you add additional env vars:
- Document them in this file.
- Ensure they are prefixed with `VITE_`.

---

## 6) Amplify configuration (consumer app)

Budgeteer consumes an existing Amplify backend configuration.

Key files:
- `src/amplifyConfig.ts` (calls `Amplify.configure(...)`)
- `src/amplifyConfiguration.ts` (endpoints/regions/ids; committed so CI/CD builds work)

Notes:
- Treat `amplify/` as infrastructure config; avoid manual edits unless you are deliberately running an Amplify workflow.
- Some Amplify-generated files are intentionally gitignored (per Amplify defaults). This repo’s deployable frontend should not depend on gitignored config files.

For backend details, see:
- `docs/legacy/AMPLIFY_BACKEND_OVERVIEW.md`

---

## 7) Project structure (quick map)

- `src/pages/*` — route-level pages
- `src/layout/*` — AppShell, Header/Sidebar, ErrorBoundary
- `src/components/*` — feature components
- `src/store/budgetStore.ts` — persisted domain state
- `src/ingest/*` — CSV ingestion pipeline
- `docs/*` — architecture and developer docs
