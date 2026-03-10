# Budgeteer — Deployment Checklist (Netlify)

Last updated: 2026-02-10

Target: Netlify with CI/CD auto-deploy from GitHub to:

- https://budgeteer.nickhanson.me/

This checklist focuses on deploying the **frontend-only** Budgeteer app.

---

## 1) Repo and build settings

- Netlify site connected to the GitHub repo
- Build command: `npm run build`
- Publish directory: `dist`

Recommended:
- Use `npm ci` in CI environments (Netlify typically does this automatically when lockfiles exist).

---

## 2) Node + tooling

- Ensure Netlify uses a Node version compatible with the repo.
- If you need to pin a version, configure it in Netlify settings or via a repo-level Node version file.

---

## 3) Environment variables

In Netlify Site Settings → Environment variables:

- Add any required `VITE_*` variables.
- Avoid storing secrets that should not be exposed to the client (Vite embeds `VITE_*` at build time).

Notes:
- If the app is consuming a shared Amplify backend, confirm the Amplify config files are correct for production.

---

## 4) SPA routing (critical)

Budgeteer is an SPA (React Router). Netlify must serve `index.html` for unknown routes.

Ensure one of the following exists:

Option A — `public/_redirects` containing:

```
/*  /index.html  200
```

Option B — `netlify.toml` with an equivalent redirect.

(If this is missing, direct navigation to deep links like `/planner` will 404.)

---

## 5) Cognito / Amplify hosted UI config

If using Cognito Hosted UI or redirect-based auth flows:

- Add the deployed origin to Cognito callback URLs
- Add the deployed origin to Cognito sign-out URLs

Because the backend is shared, coordinate changes carefully.

See:
- `docs/legacy/AMPLIFY_BACKEND_OVERVIEW.md`

---

## 6) Post-deploy smoke checks

- Load the home page
- Navigate directly to each route via URL (SPA redirect verification)
- Login/logout flow works
- Import pages render (even if backend actions are not used)
- Build logs show no missing env vars

---

## 7) Rollback

- Use Netlify deploy history to rollback to the last known-good deploy.

---

## 8) Observability (optional)

If you add client-side monitoring, ensure it is:

- privacy-aware
- opt-in (or at minimum documented)
- does not transmit raw transaction descriptions/account identifiers unintentionally
