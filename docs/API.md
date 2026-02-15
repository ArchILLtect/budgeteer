# Budgeteer — API Reference

Last updated: 2026-02-10

This document describes the **API surfaces Budgeteer uses today**, and the conventions for adding new ones.

Budgeteer is currently a **frontend-only React SPA** that:

- Uses **AWS Amplify Auth (Cognito)** for identity.
- Uses **AWS AppSync GraphQL** for a small set of shared backend models (notably `UserProfile`).
- Keeps most budgeting domain data locally in a persisted Zustand store.

Where relevant, this doc distinguishes **Current** behavior vs **Planned** behavior.

---

## 1) External (backend) APIs

### 1.1 Amplify Auth (Cognito)

**Purpose**: sign-in, sign-out, retrieve current user identity.

**Libraries**:
- `aws-amplify/auth`

**Key calls (examples)**:
- `getCurrentUser()` — resolve the current identity (used by bootstrap flows).

**Conventions**:
- Configure Amplify before any Auth calls (see `src/amplifyConfig.ts`).
- Treat Auth as the source of truth for identity; do not “cache” identity in arbitrary places.

### 1.2 AppSync GraphQL (Amplify API)

**Purpose**: read/write a shared backend GraphQL schema.

**Libraries**:
- `aws-amplify/api`

**Client wrapper**:
- `src/amplifyClient.ts` wraps `generateClient()`.

**UI/Store boundary**:
- UI components should not call `client.graphql(...)` directly.
- Code should go through a small wrapper module so the rest of the app stays insulated from schema churn.

#### 1.2.1 GraphQL wrapper: `budgeteerApi`

Module:
- `src/api/budgeteerApi.ts`

Design goals:
- “Boring” stable methods.
- Minimal selection sets.
- Defense-in-depth (e.g., ensure the client cannot send `owner` in update payloads).

Current method surface (as implemented today):
- `getUserProfile(id)`
- `getUserProfileEmailProbe(id)`
- `createUserProfile(input)`
- `updateUserProfile(input, condition?)`
- `listUserProfiles(opts?)`
- `listUserProfilesSafe(opts?)`

Selection sets:
- `src/api/operationsMinimal.ts`

Mapping:
- `src/api/mappers.ts` maps GraphQL shapes → UI shapes.

#### 1.2.2 Auth rules and multi-app backend sharing (important)

The backend schema may be shared with other app(s). Key implications:

- Owner-based auth rules exist server-side (AppSync) and are also reinforced client-side.
- Some Amplify/AppSync resource identifiers may use non-Budgeteer naming (infrastructure identifiers). Treat them as configuration values; do not rename without updating the backend configuration.

See:
- `docs/legacy/AMPLIFY_BACKEND_OVERVIEW.md`
- `docs/legacy/PLATFORM_SYSTEMS_OVERVIEW.md`

---

## 2) Internal (frontend) APIs

Budgeteer also has internal “API-like” surfaces you should treat as stable boundaries.

### 2.1 Ingestion orchestrator

Entry point:
- `src/ingest/analyzeImport.ts`
- Store commit boundary: `commitImportPlan(plan)` (Import slice)

Purpose:
- Turn CSV text or parsed rows into an **ImportPlan** (serializable data):
  - accepted transactions (staged)
  - stats + telemetry
  - structured errors
  - `savingsQueue` entries (deferred until Apply-to-Budget)
- Commit that plan via a single store action (no patch functions in UI)

Key properties:
- Deterministic
- Idempotent (re-importing produces no duplicates)
- Pure orchestrator (no store/backend calls)

Docs:
- `docs/ingestion-architecture.md`
- `docs/developer/category-rules-and-savings-queue.md`

### 2.2 CSV parsing

- `src/ingest/parseCsv.ts` — in-memory parsing
- `src/ingest/parseCsvStreaming.ts` — streaming parsing for large files

### 2.3 Store boundary (domain API)

Budgeting domain operations live behind the Zustand store actions.

Store:
- `src/store/budgetStore.ts`

Conventions:
- UI components call store actions; they don’t mutate state directly.
- Keep store actions pure with immutable updates.

---

## 3) Planned API surfaces (explicitly not fully implemented)

These are described in the ingestion architecture docs but are not yet fully reflected in the current codebase.

### 3.1 Privacy-aware account identification

Planned concept:
- Account fingerprinting (`HMAC_SHA256(accountNumber, secret)`) to avoid persisting raw account numbers.

Doc:
- `docs/ingestion-architecture.md` ("Account Identification Model")

Current reality (today):
- Local state still relies on an `accountNumber` key in multiple places.

---

## 4) How to add a new backend call

1. Add a minimal selection set operation in `src/api/operationsMinimal.ts`.
2. Add a method in `src/api/budgeteerApi.ts` that calls it.
3. If needed, add a mapping function in `src/api/mappers.ts`.
4. Use the method from a hook/service/store action (not directly from a presentational component).

---

## 5) Non-goals

- This is not an OpenAPI/REST spec.
- This doc does not enumerate every store action; see `docs/DATA_MODEL.md` for domain shapes and store conventions.
