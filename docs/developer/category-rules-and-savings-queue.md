# Developer Guide: Category Rules & Savings Queue

Last Updated: 2025-09-24

## Overview

This guide explains how to extend the transaction category inference engine and enhance the savings queue workflow used post‑ingestion.

## 1. Category Inference Engine

Source files:

-   `src/ingest/inferCategory.js`
-   `src/ingest/categoryRules.js`

Pipeline order for per‑transaction inference:

1. Provided category (if not low-quality / "uncategorized")
2. Keyword map match (`KEYWORD_MAP` longest key first)
3. Regex rule match (`REGEX_RULES` first match wins)
4. (Deferred) Vendor consensus pass (dominant category among labeled transactions for same vendor root)

Supporting exports from `categoryRules.js`:

-   `KEYWORD_MAP`: `{ substringLower: category }`
-   `REGEX_RULES`: `[ { test: /pattern/i, category: 'name' }, ... ]`
-   `CARD_PREFIX_PATTERNS`: `[ /regex/, ... ]` stripped before deriving vendor root
-   `CONSENSUS_THRESHOLDS`: `{ minOccurrences, dominanceRatio }`

Vendor root derivation trims card prefixes and normalizes whitespace; first N words (default 3) form the root.

### Adding / Updating Rules

1. Prefer keyword entries for stable literal substrings (lowercase keys).
2. Use regex rules for variable tokens (digits, anchors, conditional groups). Keep them specific to reduce false positives.
3. Group related keywords with code comments (e.g., fuel, groceries) for maintainability.
4. Tune `CONSENSUS_THRESHOLDS` cautiously; lowering `dominanceRatio` risks mislabeling mixed vendors.
5. Add tests for new patterns in `src/ingest/__tests__/categoryInference.test.js` (fast, deterministic).

### Performance Notes

-   Keywords are sorted by length once per process start; acceptable until scale > ~500 entries. If it grows larger, precompute and export `SORTED_KEYWORDS` from `categoryRules.js`.
-   Avoid overly broad regex (e.g., `/.+/`) that would shadow later rules.

### Future Extension Ideas

-   User-defined custom keyword + regex sets merged at runtime (persisted in store or localStorage).
-   Negative rules (blocklist) to suppress consensus for ambiguous vendors.
-   Confidence scoring (`_catConfidence`) to highlight low-trust assignments.
-   Rule versioning & migration (track when a rule last changed for analytics).

## 2. Savings Queue Enhancements

The ingestion pipeline collects savings transactions (type `savings`) into a `savingsQueue` for review & goal linkage after import.

Current behavior (baseline):

-   Savings txns pushed to queue (with `originalTxId`, `importSessionId`).
-   Post-apply modal guides user to assign to goals (or leave unassigned).

### Enhancement Heuristics (Planned / Suggested)

1. Auto-link small savings when a single active goal exists.
2. Skip pattern list for ignored noise (e.g., interest accrual entries).
3. Goal guessing via keyword → goalId mapping (confidence badge).
4. Batch actions ("Link All to X" when homogeneous).
5. De-duplication using savings key `date|abs(amount)` to prevent re-queue on identical repeat imports.

### Example Auto-Link Pseudocode

```js
if (tx.type === 'savings') {
    if (autoLinkEnabled && tx.amount < SMALL_THRESHOLD && activeGoals.length === 1) {
        autoLinked.push({ ...tx, goalId: activeGoals[0].id, _autoLinked: true });
    } else if (!skipPatterns.some((p) => tx.description.toLowerCase().includes(p))) {
        savingsQueue.push({ ...tx, originalTxId: tx.id });
    }
}
```

### UI Considerations

-   Distinguish pending vs auto-linked entries (badge/color + optional filter tabs).
-   Provide batch undo for auto-link operations.
-   Surface metrics: counts for `autoLinked`, `pendingReview`, `skipped`.

### Testing Guidelines

-   Unit test new heuristics with a small synthetic set (no store side-effects).
-   Assert immutability: clone before tagging (`{ ...tx }`).
-   Cover edge cases: duplicate dates, very small fractional amounts, mixed-case descriptions.

### Telemetry Ideas

-   Track acceptance vs correction rate for auto-links (user adjustments).
-   Persist aggregate ratios (e.g., auto-link coverage %) for tuning thresholds.
-   Time-to-complete (queue open → finished) as a UX efficiency metric.

## 3. Contribution Checklist

Before submitting a PR that alters rules or queue logic:

-   [ ] Added / updated tests
-   [ ] Updated this guide if semantics changed
-   [ ] Benchmarked large import (if regex set grew significantly)
-   [ ] Verified no performance regression (rows/sec unchanged in benchmark panel)
-   [ ] Ensured undo & savings linking flows still succeed

## 4. Quick Reference

| Concern                   | Location                                              |
| ------------------------- | ----------------------------------------------------- |
| Keyword / regex rules     | `src/ingest/categoryRules.js`                         |
| Inference engine          | `src/ingest/inferCategory.js`                         |
| Ingestion orchestrator    | `src/ingest/analyzeImport.ts`                         |
| Strong key builder        | `src/ingest/buildTxKey.js`                            |
| Savings queue modal logic | `src/components/SavingsReviewModal.jsx` (and related) |
| Tests (inference)         | `src/ingest/__tests__/categoryInference.test.js`      |
| Tests (strong key utils)  | `src/utils/__tests__/strongKeyUtils.test.js`          |

## 5. Future TODO Seeds

-   Pluggable user rule editor UI
-   Import/export rule sets (JSON)
-   Rule linting (warn on overlapping regex / duplicate keyword)
-   Vendor clustering (embedding-based) for smarter consensus
-   ML-based fallback classification (after deterministic stages)

---

End of guide.
