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
