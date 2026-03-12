# Budgeteer — Volunteer Tester Script (Non-Technical)

Thank you for helping test Budgeteer. You do **not** need to be technical.

Goal: try normal usage **and** “weird” usage to spot confusing UX, bugs, and edge cases.

This page includes checkboxes you can tick as you go — they save automatically in your browser on this device.

---

## Copy/paste invite (send to testers)

Hey! Can you help me test my budgeting app?

- Site: https://budgeteer.nickhanson.me/
- Time: 10–15 minutes (quick), or 30–60 minutes (full)
- Please don’t use real bank data — use Demo Mode / sample CSVs in the script.

If you find anything confusing or broken, please send me:
- What you were trying to do
- What happened vs what you expected
- Your device + browser
- Screenshot/screen recording
- The page URL

Thank you!

## What to send me (so I can fix things)

When you report something, please include:

1) What were you trying to do?
2) What happened (what you saw)?
3) What did you expect to happen?
4) Your device + browser (example: “iPhone Safari”, “Windows Chrome”, “Mac Chrome”)
5) A screenshot (or screen recording if possible)
6) The page URL (copy/paste from the address bar)

If the app shows an error message, include the exact words.

## Important privacy note

Please **do not** upload real bank exports or sensitive personal data.

Use **Demo Mode** and/or the **sample CSV files** linked below.

Sample CSV downloads (safe):
- https://budgeteer.nickhanson.me/demo/demo-tiny.csv
- https://budgeteer.nickhanson.me/demo/demo-medium.csv
- https://budgeteer.nickhanson.me/demo/demo-large.csv

(If a link 404s, tell me — that’s a bug.)

---

## Quick test (10–15 minutes)

### 1) Load the app
- [ ] Open: https://budgeteer.nickhanson.me/
- [ ] First impression: is it clear what the app is and what you should click?

### 2) Basic navigation
Click each of these and make sure the page loads and looks “normal”:
- [ ] Home
- [ ] About
- [ ] Planner
- [ ] Tracker
- [ ] Settings

Try:
- [ ] The browser Back button
- [ ] Refresh (reload the page) on at least one page

### 3) Demo Mode (no login)
On the Home page, click **Try Demo (No Signup)**.

Then:
- [ ] Click around Planner / Tracker / Accounts (if shown)
- [ ] Try to find where imports happen (import/account data)

### 4) Import (demo data)
In Demo Mode, find the import flow and try to load a demo dataset (Tiny).

Confirm:
- [ ] You see some transactions appear (staged/imported)
- [ ] You can “apply” the import to your budget (if prompted)
- [ ] You can find “Import history” (if available) and see your import session

### 5) General “does it feel right?” feedback
- [ ] Anything confusing?
- [ ] Any wording that feels unclear?
- [ ] Any button you expected to exist but didn’t?

---

## Full test (30–60 minutes)

If you have time, do everything in “Quick test”, plus:

### A) Planner: create a simple plan
- [ ] Create or open a scenario/month plan
- [ ] Add at least:
  - [ ] 1 income item
  - [ ] 2 expense items
  - [ ] (optional) a savings goal

Try edge cases:
- [ ] Enter a value like `0`
- [ ] Try deleting an item you just added
- [ ] Try very large numbers (e.g. `999999`)

What to look for:
- [ ] Do totals update quickly and correctly?
- [ ] Any negative totals that don’t make sense?
- [ ] Any weird formatting (too many decimals, etc.)?

### B) Tracker: compare planned vs actual
- [ ] Go to Tracker
- [ ] Change months (if there’s a month picker)

What to look for:
- [ ] Is it obvious what numbers are “planned” vs “actual”?
- [ ] Is anything confusing about the summary?

### C) CSV import (upload a file)
If there’s an “Import CSV” button that lets you upload a file:
- [ ] Download `demo-tiny.csv` (link at top)
- [ ] Upload it

Try edge cases:
- [ ] Upload the same file twice (do you get duplicate transactions or does it handle re-import?)
- [ ] Cancel out of the import flow half-way through (does the app stay stable?)
- [ ] Refresh during or right after importing

What to look for:
- [ ] Does the UI explain what “staged” means?
- [ ] Is it clear what “apply” and “undo” will do?
- [ ] Do you ever feel afraid to click something because it’s unclear?

### D) Settings
- [ ] Change at least one setting
- [ ] Leave Settings and come back

What to look for:
- [ ] Did your setting actually save?
- [ ] Any setting that feels risky or unclear?

### E) “Weird user” behavior (edge case hunting)
Try a few of these (stop if anything feels annoying):
- [ ] Open the site in two tabs at once
- [ ] Use Back/Forward a lot
- [ ] Reload the page while on a non-home page
- [ ] Click buttons quickly 2–3 times
- [ ] Resize the browser window (wide → narrow)
- [ ] On mobile: rotate portrait ↔ landscape

What to look for:
- [ ] App crash / blank screen
- [ ] Frozen loading state
- [ ] Buttons that stop working
- [ ] Layout that becomes unusable on smaller screens

---

## If something breaks

If the app ever becomes unusable:
- Take a screenshot
- Copy the URL
- Tell me what you clicked right before it broke

Optional: try a hard refresh
- Windows: `Ctrl+F5`
- Mac: `Cmd+Shift+R`

Thank you — even “small” notes help a lot.
