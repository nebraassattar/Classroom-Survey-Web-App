# Classroom Survey Web App

Individual CSE 4095 project built with React, TypeScript, Vite, Tailwind CSS, React Router, Supabase, Recharts and QRCode. Instructors manage surveys and view results; students answer active surveys anonymously through a public URL or QR code.

- Source: https://github.com/nebraassattar/Classroom-Survey-Web-App
- Public deployment: in progress; no public URL verified yet.
- [Deployment instructions](DEPLOYMENT.md)
- [Submission package and evidence checklist](submission/README.md)

## Run locally

Use Node 24.11.0 (pinned in `.node-version`) and npm. Package engines require Node 22.12 or later.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and enter your Supabase project URL and browser-safe publishable key locally. Keep `VITE_PUBLIC_APP_URL=http://localhost:5173` for local use. Never use a service-role/secret key, database password or instructor password in a `VITE_` variable: Vite embeds these values in public JavaScript.

```sh
npm run dev
```

Open the URL printed by Vite. Sign in with a privately provisioned instructor account. Students use `/s/:slug` without signing in. A localhost QR cannot connect a phone to your computer; physical-device checks need a reachable public origin.

## Database setup

Follow [Supabase setup and RPC contracts](supabase/README.md). For a new project, apply all three migrations in order, disable public signup and privately provision the instructor allowlist. Existing projects with the first two migrations need only `202611030003_csv_export.sql`; do not rerun or reset the initial schema. The current hosted project has working instructor CSV export.

PostgreSQL stores five related public tables: surveys, questions, choices, responses and answers. Private tables hold instructor membership and the mutation lock. Versioned migrations enforce foreign keys, RLS, authorized RPCs, historical immutability, atomic submissions and a single Active survey. SQL Editor provisioning does not populate CLI migration history; reconcile history before adopting `supabase db push`.

## Instructor workflow

1. Sign in and create a Draft survey. Add Multiple choice (2–20 choices) or True / False questions; all questions are required. Reorder or remove content before saving.
2. Save and reopen to verify persistence. Save and activate uses two RPCs; if activation fails after saving, the editor retains the saved survey ID for retry.
3. Activation closes the previous Active survey. Present QR shows title, URL, QR PNG and a response count refreshed every 10 seconds. Close stops submissions and preserves history.
4. View results to see counts, percentages, charts and full numeric tables. Refresh results to load new responses; this page is not live Realtime.
5. Export CSV for a fresh, consistent snapshot. Each response occupies one row, ordered question headers identify answers, and metadata/timestamps are included. Browser tokens are excluded. Quoting, CRLF, UTF-8 BOM and formula-leading text protection are applied; text-prefix protection can deliberately change exported cell text.
6. Filter history by title, status and inclusive local creation dates. Duplicate a survey to revise/reuse it; activated content cannot return to Draft. Archive preserves responses. Delete only disposable content after reading the confirmation.

Draft saves replace nested content atomically; question/choice IDs can change before activation. Multi-tab draft editing is last-save-wins. Save before leaving: the editor warns on its Back link and supported reload/close actions, but does not block every history transition. The dashboard fetches API pages of 500 and displays 12 cards per UI page; keep the project's API row cap at least 500. Refresh reconciles concurrent list changes.

## Student workflow and security

The public route uses a separate anonymous, nonpersistent client. It reads active content and submits only through validated database functions. The response and every answer are stored in one transaction. Required radio groups, loading/errors and duplicate feedback are accessible through keyboard navigation.

A random UUID is saved in browser storage before submission. A database uniqueness constraint prevents repeat responses for that survey/token; retries reuse the same token after uncertain network outcomes. A local per-survey success marker restores Already submitted after refresh. Clearing storage, changing browser/profile/origin or using another device bypasses this accidental-duplicate protection; it does not establish one-person identity. Unsubmitted selections live in memory and may be lost on refresh.

Instructor access requires both a Supabase session and allowlist membership. The database independently checks authorization; frontend guards alone are insufficient. Direct client writes and public access to responses/results are denied. Logout clears the current browser session, not every device. Use private browser profiles on shared computers. Keep credentials and `.env.local` out of Git, screenshots and reports.

## Verification

```sh
npm run lint
npm test
npm run test:db
npm run typecheck
npm run format:check
npm run build
npm run check:supabase
```

`check:supabase` uses `.env.local` for read-only hosted checks without an instructor password. `test:db` applies actual migrations and rollback smoke SQL to ephemeral embedded PostgreSQL with Auth/role fixtures; it does not contact Supabase or establish real concurrent-session behavior. `supabase/tests/hosted-smoke.sql` is a separate hosted role test; follow the database guide before running it, when no classroom collection is in progress.

Recorded checkpoint on 2026-11-03: 116 app tests and 104 embedded database assertions passed; lint, TypeScript, build, formatting and whitespace checks passed. The production dependency audit reported zero known vulnerabilities. Hosted read-only checks confirmed public lookup, anonymous response/answer/results restrictions and disabled signup. Real signed-in Chrome results, matching downloaded CSV, QR presentation and canceled confirmation were checked. Public/dashboard/results layouts had no horizontal overflow at 320px. User-reported local feature/persistence checks are recorded separately from agent observations.

Remaining checks include spreadsheet application import, physical phone/projector, another browser engine, screen-reader/contrast, production workflows, real concurrent database sessions and the 200-student/under-two-second targets. Chrome and the in-app browser are both Chromium. Axe tests cover semantics with color contrast disabled in JSDOM. Build sizes and passing tests do not prove performance targets. See [verification plan](VERIFICATION.md) and [detailed outcomes](DEVELOPMENT_LOG.md).

## Deploy and submit

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for Cloudflare Workers static assets, build variables, `npm run build`, `dist`, SPA routes, production QR origin and Supabase Auth settings. Supabase remains the separately hosted backend. A Git-integrated push to `main` will rebuild production after configuration.

The [submission package](submission/README.md) includes a draft 1–2 page report, an AI interaction summary and an evidence checklist. Review the report in your own words. Provide grader credentials only through a private approved channel; never commit them. Production verification and physical-device checks must be completed before claiming the assignment finished.

The supplied specification documents and [assignment](ASSIGNMENT.md) remain in the repository. [TODO.md](TODO.md) tracks implementation and open gates, and [DECISIONS.md](DECISIONS.md) explains choices not fully specified. Optional Phase 16 enhancements are outside the current scope.
