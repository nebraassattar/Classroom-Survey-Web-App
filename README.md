# Classroom Survey Web App

Individual CSE 4095 project. The app includes secure instructor login, a Supabase-backed dashboard and the full draft question editor with multiple-choice and True/False questions. Versioned migrations enforce RLS, authorization, lifecycle rules and atomic saves/submissions. QR presentation, student forms, results/CSV and deployment remain pending. No mock data is used in the application; automated tests use isolated fixtures.

## Local setup

Use Node 22.12+ (this session uses Node 24.11) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The home page links to Instructor Login. Use your privately provisioned instructor credentials there, never in chat. An authorized account reaches `/dashboard` and loads surveys from Supabase.

```sh
npm run lint
npm test
npm run test:db
npm run typecheck
npm run format:check
npm run build
npm run preview
```

Use the committed lockfile with `npm ci` for reproducible installation. Run `npm run format` to format files.

For Phase 2, follow [Supabase setup and RPC contracts](supabase/README.md). Create your project, apply the two migrations, disable signup, provision instructor membership, and configure browser-safe values locally. Hosted verification is pending; the automated database suite runs without credentials.

## Configuration and security

Copy `.env.example` to `.env.local` and fill values locally from your Supabase project. Never paste secrets into chat. Vite exposes all `VITE_` values publicly: use only the project URL and publishable key, never a secret/service-role key or database password. Auth and survey pages use the shared client.

Authentication requires both a valid Supabase session and a successful `is_instructor()` RPC. Public signup is disabled; signing in alone grants no instructor privileges. Membership checks fail closed on errors, and the database independently enforces access. The SDK persists/refreshes sessions locally; logout clears the current browser session (not every device). Keep the browser profile private on shared computers.

## Phase 3 verification

Run `npm test` for component-level Auth tests using SDK fixtures, and `npm run check:supabase` for read-only hosted checks using `.env.local` (no instructor password). The latter verifies public RPC connectivity, anonymous response/answer/result denial, and disabled signup; it does not test a real instructor login.

Real instructor login, refresh persistence, logout and signed-out redirect are user-confirmed. Still check invalid credentials, keyboard controls and narrow mobile layouts. Test a separately provisioned non-allowlisted account privately to confirm denial. Never enable public signup to create test users. Two-browser, mobile and real non-instructor checks remain pending.

## Phase 4 verification and boundary

Sign in, choose **New survey**, enter title/description and save. Refresh to confirm the database-backed Draft persists. Search by title and filter by status. Edit draft details, duplicate a survey and confirm the copied draft opens. Test archive confirmation/cancellation and refresh persistence. Delete only disposable test drafts after reading the warning; existing responses receive a stronger warning, and archive is recommended. The UI refuses deletion if its response-count check fails.

Activation asks for confirmation and closes the prior Active survey through the existing RPC. A new empty draft correctly reports that questions are required. Active surveys expose Close, while Closed/Archived surveys require duplication to edit or reuse. No new migration is needed for the dashboard or question editor.

The dashboard fetches ordered API pages of 500 rows, searches/filters the loaded set and displays 12 cards per UI page. This assumes the project's default API row cap is at least 500; reducing it requires adjusting the page size. Concurrent changes during multi-page fetches may require Refresh to reconcile. Results/presentation navigation is deferred until the corresponding pages exist, rather than linking to unfinished routes.

Draft creation and persistence after refresh are user-confirmed. Other dashboard mutations have not been independently exercised through a real instructor session; perform the manual checks above. Mobile/native-dialog focus and full end-to-end verification remain pending.

## Phase 5 question editor

Open an existing Draft with **Edit**, or create a new survey. Add questions, select Multiple choice or True / False, and enter content. Every student question is required. Multiple choice allows 2–20 ordered choices; True/False has fixed True and False choices. Add up to 100 questions. Move up/down buttons preserve text; question/choice deletion and destructive type changes ask for confirmation. Validation appears next to fields and moves focus to the first invalid field.

**Save draft** stores title, description and ordered questions/choices in one RPC transaction, then returns to the dashboard. Empty drafts remain allowed; incomplete question cards must be completed or removed before saving. Reopen a saved survey to refetch current database content. Draft question/choice IDs can change on save; activated/historical surveys remain immutable and require duplication to revise.

**Save and activate** confirms, saves, then activates with the existing lifecycle RPC. These are two calls: if activation fails after saving, the editor says the draft was saved and retains its ID for retry rather than creating another new draft. If another tab activated the survey, database rules reject further content saves. Multi-tab draft editing remains last-save-wins.

Unsaved edits trigger confirmation on the Back to dashboard link, and a browser warning on reload/tab close when supported. Other browser-history transitions are not comprehensively blocked; save before navigating elsewhere. No autosave is implied.

Manual verification: create one Multiple choice and one True/False question; reorder questions and choices after typing; cancel then confirm a deletion/type change; save; refresh/reopen and verify all text and ordering. Try blank fields to confirm validation. Duplicate a Closed/Archived survey to edit; direct historical edit URLs must stay blocked. Test Save and activate only on a disposable survey when no classroom collection is active, because it closes the previous Active survey. QR/student/results pages are still pending. Check on a phone and with keyboard navigation; real-account Phase 5 workflow is not yet confirmed.

`npm test` covers editor/service/Auth behavior with fixtures; `npm run test:db` executes real PostgreSQL draft updates, ordering and rollback checks. Protected page bundles load on demand with a loading fallback; build sizes are measured, but the under-two-second page-load target remains unverified.

## Architecture and roadmap

React renders routed pages; Tailwind supplies styles; the Supabase client connects to Auth and PostgreSQL. PostgreSQL owns authorization, constraints, activation transactions, and atomic submissions. Recharts and qrcode are declared for later phases.

1. Project setup (complete).
2. Versioned migrations, RLS, instructor allowlist, submission/activation RPCs and database security tests (implemented locally; hosted setup pending).
3. Instructor authentication and protected routes (implemented, component-tested; actual-account login/refresh/logout user-confirmed).
4. Dashboard, duplication and lifecycle controls (implemented; create/refresh user-confirmed, other actual-account checks pending).
5. Full question editor (implemented; actual-account workflow verification pending).
6. Classroom presentation with public URLs and downloadable QR PNG.
7. Anonymous student forms.
8. Browser-token duplicate protection in the student UI (database constraint already implemented).
9. Results dashboard.
10. Historical results browsing.
11. CSV export.
12. Duplication integration verification (backend/dashboard already implemented).
13. UI polish and accessibility.
14. End-to-end, security and performance verification.
15. Cloudflare Pages deployment and submission artifacts (GitHub source already configured).

See `DECISIONS.md`, `VERIFICATION.md`, `DEVELOPMENT_LOG.md` and `TODO.md`. `ASSIGNMENT.md` is now included and reviewed. Its requirements and 100-point rubric are the acceptance criteria; see `VERIFICATION.md` for coverage. The five supplied specification files are retained.

## Deployment plan (not performed)

Create a GitHub repository and push reviewed source, specifications, lockfile and migrations. In Cloudflare Pages connect that repository, build with `npm run build`, and publish `dist`. Configure the three variables from `.env.example` for production; set `VITE_PUBLIC_APP_URL` to the public HTTPS origin. Confirm SPA fallback on direct nested routes. Configure Supabase Site URL/allowed redirects for the final origin and local development. Provision the instructor privately and communicate grader access outside this repository. Verify production login, QR destinations, submissions and results before declaring deployment complete. Recheck provider free-tier limits and current configuration instructions at deployment.

## Submission artifacts still required

GitHub source and migrations; public URL and private grader access; a factual 1–2 page development summary; AI development history; screenshots of Supabase tables, related survey/questions, stored responses and results. The development log is the starting AI history and must be extended each phase.
