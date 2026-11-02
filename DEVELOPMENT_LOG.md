# Development and AI history

## 2026-11-02 — Phase 1 setup

- User requested a phased implementation, stopping after initial setup. AI read all five supplied specification files and inspected the workspace. ASSIGNMENT.md was absent; no application files or Git repository existed.
- Supplied TODO had checked implementation/deployment items without supporting code. AI reset unsupported checks rather than treating them as accomplishments.
- Explained frontend/backend/database roles and proposed phases before coding. Recorded authorization, atomic RPC, historical immutability and route decisions in DECISIONS.md.
- The Vite generator failed with npm registry DNS resolution (ENOTFOUND) in the sandbox. AI wrote the scaffold directly and retried dependency installation with network permission. No Vite-generated output was used.
- Added React/TypeScript/Vite configuration, Tailwind Vite plugin, React Router routes, static home page and clearly labeled login placeholder, lazy real Supabase client factory, dependency declarations, formatting/lint scripts, environment example and ignores.
- Initialized local Git. No commit, GitHub remote, push, Supabase project, SQL migration, authentication or public deployment was completed.
- Added setup/deployment planning, verification plan and submission-artifact tracking. No credentials requested or collected; no mock survey data.
- Tooling guidance checked against official Vite and Tailwind documentation: https://vite.dev/guide/ and https://tailwindcss.com/docs/installation/using-vite .

Validation outcomes will be appended after checks finish. Browser, database, end-to-end and performance checks remain unverified.

- Validation: dependency installation succeeded (339 packages), ESLint passed with zero warnings, TypeScript passed, and production build passed (42 modules; JavaScript 261.90 kB / 83.41 kB gzip). These are build measurements, not page-load performance results. No browser QA was performed. The unused sandbox install was cancelled after the successful network-enabled installation. Phase 1 checklist now reflects verified setup only.

## 2026-11-02 — Assignment review

- User supplied the assignment after the setup review. AI read it completely and copied the supplied text unchanged into ASSIGNMENT.md.
- Reconciled the requirements and all eight rubric categories (100 points) in VERIFICATION.md; updated README, TODO and decisions to resolve the missing-assignment status.
- No blocking requirements conflict found. Retained the requested stack and security-first phase order; the assignment's order is suggested, and alternative hosting/database choices are permitted rather than required.
- Confirmed HuskyCT submission artifacts, private grader access, actual desktop/mobile tests and Supabase inspection/evidence. No application feature or acceptance test was marked complete by this document review. Did not start Phase 2.

## 2026-11-02 — GitHub setup

- User supplied and authorized the GitHub remote https://github.com/nebraassattar/Classroom-Survey-Web-App.git and requested pushing main.
- Verified environment files, dependencies and build output are ignored. Prepared the initial source/specification/documentation commit. Remote push outcome will be reported separately; database and deployment work remain pending.

- Push succeeded: initial commit a1d9dba reached origin/main, and local main now tracks origin/main. Marked the GitHub push checklist complete; Cloudflare deployment remains pending.

## 2026-11-02 — Phase 2 database foundation

- User authorized starting Phase 2 and confirmed no Supabase project exists yet. No Supabase connector was available. Docker executable exists but its engine was not running. Continued independent database implementation and supplied manual project setup steps without requesting secrets.
- Added two transactional versioned migrations: five public domain tables, private instructor allowlist and mutation lock, primary/composite foreign keys, ordering/length/type constraints, timestamps, indexes and mandatory per-survey UUID-token uniqueness.
- Added explicit grants and RLS. Public reads expose active content only; responses/answers and results are instructor-only. Direct client table writes are denied; authorized RPCs perform draft saves, activation/close/archive/delete/duplicate and results. Public submission validates every answer and inserts atomically. Fixed security-definer search paths and revoked default function execution before explicit grants.
- Draft saves replace nested content atomically; activated content cannot return to Draft. Historical answers remain fixed through close/archive. Composite foreign keys prevent cross-survey/question answer links. Singleton instructor mutation lock plus shared submission survey locks encode concurrency policy; concurrent-session verification remains pending.
- Installed PGlite as a development-only embedded PostgreSQL dependency and added `npm run test:db`. Local Auth/role fixtures are test-only, not application mocks or real Supabase integration. Actual SQL migrations applied successfully; 77 assertions passed. The rollback-only hosted smoke script also executed locally and restored the prior survey state.
- Added Supabase setup/provisioning instructions and RPC contracts, plus hosted role smoke checks. Documented that manual SQL Editor application does not populate CLI migration history. No hosted schema, Auth account, application data, screenshots, live API result, concurrency result or performance result is claimed.
- Checked official Supabase database-function, RLS and Auth configuration guidance; links are in supabase/README.md. Frontend remains the Phase 1 setup shell. No Phase 3 implementation was started.

- Final checks: ESLint passed with zero warnings, TypeScript passed, and production build passed (42 modules; JavaScript 261.90 kB / 83.41 kB gzip). Prettier formatting and Git whitespace checks also passed. SQL tests use embedded PostgreSQL only; no hosted/browser/performance pass is claimed.

## 2026-11-02 — User-reported hosted setup handoff

- User supplied a pasted setup conversation reporting successful instructor allowlist provisioning and execution of the full hosted smoke script without errors, displaying a blank set_config result. This is consistent with successful smoke execution; the agent did not independently observe Supabase or receive a captured PASS notice. Migration application is inferred from functioning RPCs, not directly inspected. Signup-disabled status and exact migration application dates remain unconfirmed.
- Checked only whether .env.local existed (it did not); created it from .env.example and verified Git ignores it. No secrets were collected or printed. User must enter the project URL and publishable key privately; frontend Auth/API and concurrent-session verification remain pending.

- User confirmed saving .env.local. Checked only filled/placeholder status for the three expected settings and Git exclusion; all were filled and ignored. No values were displayed. This does not verify credential validity or hosted connectivity.

- User explicitly confirmed public signup is off in Supabase. Updated the configuration checklist as user-confirmed; actual Auth/API and concurrent-session checks remain pending.

## 2026-11-02 — Phase 2 push and Phase 3 authentication

- User requested pushing all existing work before Phase 3. Committed/pushed Phase 2 as a6a4794 (`feat: add secure database foundation and PostgreSQL tests`). Environment values remained excluded.
- Implemented real email/password Supabase login, a shared client, auth provider, initial getSession restoration, synchronous onAuthStateChange listener, separate instructor-membership RPC, local-browser logout and a protected dashboard shell displaying the account email. No signup route or mock Auth exists in the app.
- Authorization fails closed while pending, denied or errored. Cancellation/snapshot checks prevent old session or membership responses from exposing protected content after sign-out. Network and initial-session checks have bounded waits; errors are friendly and credentials are never logged.
- Added Vitest/Testing Library tests with SDK fixtures, distinct from real hosted checks. First run passed 11/12: the logout-error test clicked a logout button in the intermediate loading panel before the dashboard mounted, losing the component-local error when the view changed. Corrected the test to await the dashboard and removed the intermediate loading-panel logout button; second run passed all 12 before the final timeout changes. Final checks are recorded after execution.
- Added a read-only hosted check script that prints status only. Public RPC connectivity and anonymous response/answer/results denial passed. Auth settings initially returned disable_signup=false despite the earlier user confirmation. Informed the user; they turned signup off and saved. Repeat read-only check passed all five checks, including disable_signup=true. No users or data were created by this probe.
- Browser preview initially failed because the sandbox server was not reachable from the browser. Restarted Vite outside the sandbox; browser rendered the login form and visibly redirected signed-out /dashboard to /login. No real instructor password was entered. Actual-account login/refresh/logout, non-instructor login, mobile and multi-browser QA remain pending.
- Consulted official Supabase Auth listener documentation: https://supabase.com/docs/reference/javascript/auth-onauthstatechange . Kept Supabase calls outside the listener callback. No Phase 4 survey management was implemented.

- Final Phase 3 validation: all 12 Auth component tests and 77 embedded database assertions passed; ESLint, TypeScript (also run by production build), Prettier formatting and Git whitespace checks passed. Production build succeeded (93 modules; JavaScript 493.46 kB / 144.42 kB gzip). All five read-only hosted checks passed. These do not establish actual-account or performance results. Phase 3 changes remain local for review; Phase 2 is pushed.

- User reported 'It works!' after instructions to run the app and sign in with the real Supabase instructor account. Recorded as user-reported successful local application/login verification. Refresh persistence, logout, real non-instructor denial, mobile and two-browser behavior were not specifically confirmed.

- User confirmed real-account dashboard refresh persistence, logout and signed-out protected-route redirection work as expected. User requested committing/pushing Phase 3 and proceeding to the dashboard phase.

## 2026-11-02 — Phase 3 push and Phase 4 dashboard

- Committed and pushed Phase 3 as 3947b62 (`feat: add instructor authentication and protected routes`) before starting Phase 4, as requested. Private environment values remain ignored.
- Added Supabase-backed survey list, title search, combined status filter, labels/dates, refresh/loading/error/empty states, ordered API pagination and 12-card UI pagination. No demo data is included in the application.
- Added basic New/Edit draft title/description forms and Duplicate redirect. Metadata saves preserve ordered nested question/choice text through the existing atomic draft RPC; full question editing remains Phase 5. Active/Closed/Archived editing is withheld and still rejected by the backend.
- Added activation/close/archive/delete RPC actions with native confirmations. Activation warns about closing the prior active survey. Delete checks response count, warns strongly about historical data and encourages Archive; count-check failure prevents deletion. Results/presentation navigation remains pending until real pages are implemented.
- Added dashboard/service tests for filtering, pagination, load retry, metadata save, preserving nested content/order, duplication destination, historical edit blocking, cancellation, response-deletion warnings and activation validation. Test-only native-dialog fixture models open/close; actual native focus trapping/mobile behavior is not established by these fixtures.
- First dashboard test run passed 23 component tests; lint identified a dialog ref cleanup warning. Captured the actual dialog element in the effect cleanup, fixing the warning. Added five service tests; all 28 component/service/Auth tests then passed, along with 77 embedded PostgreSQL assertions, lint, TypeScript and production build.
- Production build: 96 modules; JavaScript 504.82 kB / 147.84 kB gzip. Vite reports the chunk exceeds 500 kB; page-load target remains unmeasured and route splitting/performance work remains for verification. No hosted instructor data was created/deleted by the agent in this phase. Actual-account dashboard workflow, mobile/native-dialog and full end-to-end checks remain pending.
- Consulted official ordered range-query guidance: https://supabase.com/docs/reference/javascript/using-modifiers-range . No database migrations changed.

- User confirmed the created draft remains after refresh. Recorded actual-account creation/persistence as user-reported; edit, duplicate, archive and deletion behavior were not explicitly confirmed.
- User requested committing/pushing Phase 4 now and waiting for explicit instruction before starting the next phase. Preparing the reviewed dashboard, basic draft forms, tests and documentation for that push; no Phase 5 question controls started.
