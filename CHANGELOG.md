# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow Semantic Versioning once releases begin.

## [Unreleased]

### Added
- App foundation: routing shell + protected routes, redirect sanitization, and auth lifecycle/session bootstrapping.
- Zustand slice architecture (`accounts`, `import`, `planner`, `settings`) with expanded unit test coverage for cross-slice invariants and import apply/undo flows.
- Import session features: session-scoped apply helpers, import history pruning/retention tests, and regression tests for overlapping import sessions.
- ImportPlan commit boundary: `analyzeImport(...) -> ImportPlan` (serializable) and store commit via `commitImportPlan(plan)`.
- UI components and screens: improved Accounts/Planner/Tracker pages, new/shared form components, Welcome modal logic tests, and import metrics panels.
- Apply-to-Budget savings review aggregation: savings transfers are reviewed once per apply run (across months), not repeatedly per month.
- Import History improvements: fixed “Imported” rendering, added Apply/Undo feedback toasts, and ensured the savings review modal is available from Import History flows.
- Privacy display guardrail: conservative account-number masking (`xxxx-xx-####`) in key UI surfaces.
- Modal keyboard/accessibility QoL: optional initial focus and “Enter to accept” support for safe dialogs; risky confirms default focus Cancel and Enter cancels.
- Import History “Clear session” (trash) action to permanently delete an import session’s staged transactions plus associated tracker artifacts (monthly actuals + savings logs), with a risky confirmation dialog.
- Expanded developer documentation, including ingestion architecture/contract docs and updated milestones.
- DOMPurify-based SVG sanitization pipeline via `SanitizedSvg` and applied it to the Home page banner.
- Shared formatting utilities: `formatCurrency(...)` and `formatNumber(...)` in `src/utils/formatters.ts`.
- Expanded date/time helpers in `src/services/dateTime.ts` (month/day keys and consistent UI labels).
- Centralized numeric parsing helpers in `src/services/inputNormalization.ts` (`parseFiniteNumber`, `normalizeMoney`).
- Planner income types: weekly and bi-weekly support in income calculations.
- Planner income empty-state guidance when no sources exist.

### Changed
- Ingestion entrypoints now follow the explicit plan/commit boundary (no UI patch application).
- Income calculation state handling to avoid unstable snapshots and update-depth loops.
- Documentation updated repo-wide to reflect the current ingestion design (ImportPlan + commit boundary).
- Savings goals created during savings review are tagged with their originating `importSessionId` so session clearing can remove them safely (only when unreferenced).
- Tracker summary presentation now uses consistent “Planned vs Actual” labels and shared currency formatting.
- Several money-like inputs now normalize/clamp values (finite, non-negative, rounded to cents) instead of ad-hoc `parseFloat(...) || 0`.

### Fixed
- Planner/Tracker crash caused by a render/update feedback loop (“Maximum update depth exceeded” / unstable snapshots) in `IncomeCalculator`.
- Apply-to-Budget “Ignore savings goal linking before this date” checkbox rendering (Chakra checkbox structure).
- Import History table refresh after Apply (derived row memoization now tracks account transaction state changes).
- Tracker “Total Override” checkbox behavior and override-aware monthly income total.
- Tracker income delete confirmation/toast copy (no longer refers to “expense”; includes income name).
- Savings Goals/Logs numeric input parsing and progress calculations (avoid NaN/invalid progress values).
- Runtime hardening: persisted Zustand payload parsing and ingestion normalization now validate/ignore malformed values instead of crashing.
- Settings page name override inputs no longer trigger controlled/uncontrolled warnings.

### Removed
- Legacy `runIngestion` wrapper module and remaining patch-closure terminology in non-legacy docs.

## [0.0.0] - 2026-02-10

### Added
- Initial public repo baseline for Budgeteer (frontend app + documentation).

