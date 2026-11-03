# Verification plan

No runtime, database, browser or performance result is implied by this plan. Record actual outcomes in DEVELOPMENT_LOG.md.

## Setup gate

Install dependencies, lint, typecheck, check formatting, build. Manually verify home/login-placeholder/unknown routes, keyboard focus and narrow viewport. No artificial unit tests for static setup pages.

## Database gate

Local command: `npm run test:db`. Actual migrations and rollback-only hosted smoke script execute against ephemeral embedded PostgreSQL. Auth roles/claims are fixtures; hosted Auth/API and concurrent sessions are separate pending gates. Follow `supabase/README.md` to apply migrations and run `supabase/tests/hosted-smoke.sql` in the real project. Do not interpret local test success as hosted verification.

Apply versioned migrations to a disposable Supabase environment. Test anon, authenticated non-instructor and allowlisted instructor roles. Anon/non-instructors cannot mutate surveys, read responses/results or grant membership. Test direct REST writes as well as RPC access. Test active-only public reads, all foreign-key relationships, malformed/extra/missing/duplicate answers, wrong question/choice combinations, uniqueness, rollback on failure, concurrent activation, and close-versus-submit races. Assert exact stored response/answer counts.

## Full workflow

Instructor login → create survey/questions/choices → reload and verify persistence → activate → scan QR on a phone → submit anonymously → verify database records → instructor counts/percentages/charts → CSV with correct values and safe escaping. Refresh results and confirm persistence. Duplicate must copy content only; archive preserves history; deletion requires confirmation.

Test signed-out protected URLs, expired sessions and a non-instructor account. Test duplicate token submissions, cleared storage limitation, closed/unknown survey, network failures, loading/empty/error states and double-click prevention. Test required answers, ordering, historical immutability, CSV punctuation/newlines/formula text, and keyboard/dialog focus.

Use at least two browsers and mobile widths including 320px. Scan actual QR rather than only clicking its URL. Production checks include direct SPA deep links, final-origin QR PNG, Auth URLs, successful submission and instructor results. Keep sanitized screenshots; do not capture secrets or student tokens.

## Performance targets (unmeasured)

Specification targets: at least 200 simultaneous students; average page load under 2 seconds. Use a disposable dataset, 200 distinct browser tokens and a controlled concurrent submission script; record errors, latency distribution, database completeness and environment. Measure repeated cold/warm page loads with stated device/network/cache conditions, sample size and average. Confirm provider load-test policy before execution. A successful build is not evidence of these targets.

## Assignment acceptance and rubric coverage

ASSIGNMENT.md was supplied and read completely on 2026-11-02 after initial setup. The assignment requirements and rubric govern acceptance alongside the requested specification features. All functional acceptance checks below remain pending.

- Frontend functionality and usability (15 points): instructor/student routes, required-answer validation, feedback and error handling; verify on a computer and actual mobile device, plus keyboard checks.
- Instructor survey management (15 points): login, create, add both question types, edit drafts, list, activate, close, one-active invariant, results counts/percentages and CSV; exercise the full workflow with persisted data.
- Student survey and QR-code functionality (15 points): real QR scan and direct public URL, anonymous answers, confirmation, accidental duplicate protection; verify projected presentation title, QR, URL and response count.
- Database schema and relationships (15 points): versioned migrations for all five named tables with primary/foreign keys; inspect survey-to-question, question-to-choice, survey-to-response and response-to-answer relationships in Supabase Table Editor or SQL Editor.
- Database integration, persistence and security (15 points): verify actual stored surveys/questions/submissions, retrieved results and persistence after refresh. Run the role/RLS/RPC tests above; students must not modify surveys or access instructor results.
- GitHub repository and deployment (10 points): source, supplied specifications, accurate TODO, migrations/schema and setup/deployment README in GitHub. Verify public access from outside the local network, separate hosted database and private grader instructor access. Check sensitive files are excluded.
- Testing and debugging (5 points): retain actual test outcomes and at least one factual problem/resolution. Compilation alone does not verify the workflow. The npm DNS failure and successful network-enabled installation are recorded; continue recording application issues as encountered.
- Development summary and AI interaction history (10 points): produce approximately 1–2 pages explaining specification guidance, AI-generated portions, database configuration, frontend communication, actual problem/resolution, deployment and lessons learned. Retain exported chat or a factual Markdown interaction summary showing user direction, implementation, testing and debugging.

Submission through HuskyCT must include the GitHub URL, deployed application URL, private method for grader instructor access, development summary, AI history and four evidence screenshots: Supabase tables, survey with associated questions, stored student responses and application results. Capture real evidence after implementation; exclude credentials and private student information. Student independently configures, tests and documents their own application and should be able to explain the schema and data flow.

## 2026-11-03 verification checkpoint

116 app tests and 104 embedded PostgreSQL assertions passed, along with lint, TypeScript, production build, formatting and whitespace checks. Real signed-in Chrome results/QR, CSV download and dialog cancellation passed; narrow dashboard/results/public layouts had no horizontal overflow. Chrome and the in-app browser are both Chromium, so cross-engine coverage remains pending. See DEVELOPMENT_LOG.md for exact scope, limitations and outstanding physical-device, spreadsheet, concurrency and performance checks. The current production dependency audit was blocked by registry DNS failure.

## Production checkpoint — 2026-11-03

Public deployment is verified at https://classroom-survey-web-app.nesattar786.workers.dev. Production login/session refresh/logout, draft creation/reopen with both question types, anonymous response/refresh protection, stored answers, results, CSV and QR URL decoding passed. Required real evidence is indexed in submission/evidence/README.md. The downloaded CSV imported successfully in Excel using UTF-8/comma settings. These observations supplement the automated checkpoint; they do not establish physical scanning, cross-engine, assistive-technology, real concurrent-session or performance coverage.
