# Samples

This folder contains sample CSV exports you can use to test Budgeteer’s import pipeline.

## Canonical format (bank History export)

The canonical sample format for Budgeteer is the bank “History export” format in `History_07-28-25.csv`.
Going forward, any newly generated sample files should match that header/column style.

## Files

- `sample-transactions.csv`
  - Small, curated set of transactions for quick manual testing.
  - Good for verifying: dedupe, staging, apply/undo, and category/type parsing.

- `History_07-28-25.csv`
  - Larger “history export” style file.
  - Good for verifying: performance, streaming thresholds, and long-range month grouping.

- `History_Showcase_Tiny.csv`
  - Small “showcase” file in the canonical bank History export format.
  - Includes clean recurring deposits/charges (rent, paychecks, utilities) plus a few daily transactions.

- `History_Showcase_Medium.csv`
  - Medium “showcase” file in the canonical bank History export format.
  - Intended for realistic stage/apply demos without taking too long.

- `showcase-recurring-tiny.csv` / `showcase-recurring-medium.csv`
  - Simple import format (date/description/amount/type/category).
  - Still supported by the importer, but not the canonical bank History export format.

## Expected columns

Budgeteer’s importer expects a header row and a date column.

Common columns:

- `date` — `YYYY-MM-DD`
- `description`
- `amount` — numeric (may be signed in some exports)

Optional columns (supported or used when present):

- `type` — `income | expense | savings`
- `category` — free text
- `balance` — used to strengthen dedupe in collision-prone exports

## Notes

- Imports are intended to be idempotent: importing the same file twice should not create duplicates.
- New transactions are typically staged first so they can be applied/undone safely.
