# Classroom Survey Web App

Individual CSE 4095 project. The app includes secure instructor login, a Supabase-backed dashboard, draft editing, classroom QR presentation, anonymous atomic submissions, instructor charts/history and CSV export. Versioned migrations enforce RLS, authorization, lifecycle rules and duplicate protection. CSV requires the new export migration in the hosted project. Final polish/testing, deployment and submission evidence remain pending. No mock data is used in the application; automated tests use isolated fixtures.

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

The dashboard fetches ordered API pages of 500 rows, searches/filters the loaded set and displays 12 cards per UI page. This assumes the project's default API row cap is at least 500; reducing it requires adjusting the page size. Concurrent changes during multi-page fetches may require Refresh to reconcile. Active survey cards provide Present QR; results navigation remains deferred until that page exists.

Draft creation and persistence after refresh are user-confirmed. Other dashboard mutations have not been independently exercised through a real instructor session; perform the manual checks above. Mobile/native-dialog focus and full end-to-end verification remain pending.

## Phase 5 question editor

Open an existing Draft with **Edit**, or create a new survey. Add questions, select Multiple choice or True / False, and enter content. Every student question is required. Multiple choice allows 2–20 ordered choices; True/False has fixed True and False choices. Add up to 100 questions. Move up/down buttons preserve text; question/choice deletion and destructive type changes ask for confirmation. Validation appears next to fields and moves focus to the first invalid field.

**Save draft** stores title, description and ordered questions/choices in one RPC transaction, then returns to the dashboard. Empty drafts remain allowed; incomplete question cards must be completed or removed before saving. Reopen a saved survey to refetch current database content. Draft question/choice IDs can change on save; activated/historical surveys remain immutable and require duplication to revise.

**Save and activate** confirms, saves, then activates with the existing lifecycle RPC. These are two calls: if activation fails after saving, the editor says the draft was saved and retains its ID for retry rather than creating another new draft. If another tab activated the survey, database rules reject further content saves. Multi-tab draft editing remains last-save-wins.

Unsaved edits trigger confirmation on the Back to dashboard link, and a browser warning on reload/tab close when supported. Other browser-history transitions are not comprehensively blocked; save before navigating elsewhere. No autosave is implied.

User reports the Phase 5 editor and save/reopen/refresh workflow work as expected after the suggested checks. Mobile/native-dialog verification remains pending. Test Save and activate only on a disposable survey when no classroom collection is active, because it closes the previous Active survey. Results pages are now available through View results.

`npm test` covers editor/service/Auth behavior with fixtures; `npm run test:db` executes real PostgreSQL draft updates, ordering and rollback checks. Protected page bundles load on demand with a loading fallback; build sizes are measured, but the under-two-second page-load target remains unverified.

## Phase 6 classroom presentation

Activate a complete draft, then select **Present QR** on its Active dashboard card. The protected `/surveys/:id/present` page shows a projector-sized black/white QR image, title, readable `/s/:slug` URL, stored response count, Refresh presentation, Download QR PNG and confirmed Close survey.

The QR is a 1024×1024 PNG with a four-module quiet zone and medium error correction. The displayed image and download use the same PNG and URL. Tests generate a real PNG and independently decode it back to the exact URL; this does not replace scanning it with an actual phone/projector setup. Node QR tests use the library's Node renderer; browser canvas/download behavior still needs manual verification.

`VITE_PUBLIC_APP_URL` must be an origin without a path, credentials, query or fragment. Production requires a public HTTPS origin and refuses localhost/private development URLs. Set the deployed origin and rebuild at deployment. Development follows the current localhost port if Vite switches ports; an explicitly configured reachable LAN/public origin is preserved. A localhost QR cannot connect a phone to your computer. No external URL or deployment has been created by this phase.

Survey status and response count refresh together, with the next poll scheduled 10 seconds after a successful Active-survey check; requests do not overlap. Refresh is also available manually. Closing elsewhere removes QR/download once detected. A status-fetch failure hides stale sharing information and asks for manual refresh; a count-only failure shows Unavailable, never a false zero. Closing here preserves history and prevents an older Active snapshot from restoring the QR. Counts use instructor-only queries, not a public response-count endpoint.

User reports checking the presentation and that it works as expected. Independent browser download, phone/projector and cross-tab checks remain pending. Use a second instructor tab to activate a different survey and confirm the previous presentation detects closure. `/s/:slug` now renders the Phase 7 student form. View results now links from the presentation to the protected results page.

## Phase 7 student form and required duplicate-protection foundation

`/s/:slug` is a public, one-column student page, outside instructor Auth/route guards. It uses a separate non-persistent anonymous Supabase client, so instructor sessions are not attached to student requests. No student Auth account is created. The page loads only through `get_public_survey`; submissions use only `submit_survey_response`, never direct response/answer inserts.

Every question is a required, labeled radio group with large touch targets. Missing-answer errors appear near questions and focus the first missing group. Submission disables controls and guards against repeated events. Success appears only after the RPC confirms storage. Closed, unknown, duplicate, unavailable and validation errors have friendly states without raw database exceptions. Answers remain selected after retryable failures.

The existing RPC requires a UUID browser token, so the Phase 8 foundation is included now: persist a random token locally before sending; retain it on retries; enforce database `(survey_id,anonymous_token)` uniqueness; map duplicate errors. A per-survey local success marker restores Already submitted after refresh. This marker is a UI convenience, not authorization or proof checked by the server. Storage-blocked browsers receive guidance before any submission; failed optional marker writes do not invalidate server success. No token or response ID is displayed, logged or exported by the student page.

If a network response is lost after commit, retrying with the same token may return Already submitted, which prevents a second stored response. Clearing storage, changing browser/profile/origin or using another device can bypass browser-token protection; it is reasonable accidental-duplicate protection, not one-person identity. Responses belong to the survey regardless of browser markers; do not clear tokens to work around an uncertain submission. Student choices are kept in memory only before submission; refreshing an unfinished form can lose those selections.

Manual workflow: activate a disposable complete survey, open Present QR, copy the student URL into an incognito window on the same computer, answer both question types, submit, and refresh to check Already submitted. In the instructor presentation, refresh/wait for the response count. In Supabase Table Editor inspect the new `responses` row and associated `answers`, then refresh again to establish persistence. Do not expose anonymous tokens in screenshots. Open a student form, close the survey in the instructor tab, and confirm a late submission rejects. An unknown slug should show Survey not found.

User subsequently reported the suggested student submission, refresh/duplicate, response-count and stored-record workflow works as expected. This is user-reported verification, not independently captured database evidence. Phone checks require a reachable LAN/public origin; localhost refers to the phone itself. Detailed mobile/two-browser, uncertain-network replay and concurrent closure checks remain pending. The agent did not create or submit hosted data. Student participation needs no additional migration; CSV requires the export migration below.

## Phase 9 instructor results

Select **View results** on any dashboard survey card or from the presentation page. The protected `/surveys/:id/results` route calls the existing instructor-only `get_survey_results` RPC and fetches survey metadata. It never reads raw anonymous tokens or student response rows. Anonymous/non-instructor results remain denied in the database.

Each question shows answered/unanswered counts, a horizontal Recharts count chart and a semantic table with full choice text, counts and one-decimal percentages. Zero-count choices remain visible; zero-response surveys show an empty state with 0.0% values rather than NaN. Percentages use total survey responses as the denominator, including any unanswered questions; rounded percentages may total 99.9% or 100.1%. True/False uses the same aggregation and display.

Charts number choices to avoid truncating long answer text; the matching table includes the full text and exact values. Recharts keyboard accessibility is enabled, and numerical tables avoid reliance on color or tooltips. Chart rendering is tested with real Recharts SVG and fixed test-container dimensions; actual browser resizing, phone layout and screen-reader interaction still need manual checks.

Use **Refresh results** for new submissions; results do not subscribe to Realtime or poll automatically. A transient refresh failure retains the previous snapshot with a clear stale-data message and last-loaded time. Authorization failures and missing/deleted surveys clear the snapshot. Malformed aggregate payloads are rejected rather than displayed as zero. Closed/Archived history, date filtering and CSV are implemented. Active results link back to Present QR.

Manual checks: open a survey with known stored submissions, compare totals and per-choice percentages to Supabase, submit a response from a different browser/profile, then refresh results. Verify both question types, zero-choice counts, a survey with no responses and long answer text. Close/archive the test survey and ensure results remain available without a Present QR link. Try a signed-out results URL and confirm login redirect. Do not alter real classroom data just to create a test case; use a disposable survey and the normal lifecycle confirmations.

No new migration is needed. Database tests cover mixed counts, 66.7%/33.3% rounding, zero-count choices, authorization and preserved history. Actual-account results, responsive charts and comparison screenshots remain pending. Tests encountered sandbox worker-start/timeouts; running the fixture suite outside the sandbox passed. Vitest uses at most two workers to bound resource usage. Run checks in your normal terminal if sandbox workers cannot start.

## Phase 10 historical filters

In the dashboard, combine title search and Closed/Archived status with **Created from** and **Created through**. These dates filter the survey's creation timestamp, not its activation or student submission dates. They match the calendar date shown on the card in your device's local time, and include the entire first/last day. Either bound can be blank. Calendar comparisons cover daylight-saving transition days without assuming every day is 24 hours.

An inverted range shows an inline error and hides the filtered list until corrected, rather than claiming no surveys exist. Date changes reset pagination. **Clear filters** resets title, status, dates and page together. Filtering uses the already loaded survey list and does not change any survey, question or response record. Open **View results** on a matching historical card to inspect preserved data. Filters currently reset when the dashboard is remounted; no saved filter preferences are implied.

User reports the suggested history/date filter checks are all good; independent mobile/native-picker and evidence checks remain pending. No database migration or external configuration is needed for date filtering.

## Combined batch: CSV and duplication verification (Phases 11–12)

Before hosted CSV testing, run **only** `supabase/migrations/202611030003_csv_export.sql` once in Supabase SQL Editor. It adds `get_survey_export`, an allowlisted-instructor read RPC. It does not change/delete survey records or require new environment variables. Do not rerun the original schema/RPC migrations. The updated rollback-only hosted smoke test requires all three migrations and now checks export permissions/counts. See `supabase/README.md` for setup and application records.

Choose **Export CSV** in an instructor results page with at least one stored response. It fetches a fresh, consistent database snapshot independently of the chart's previous refresh. New submissions committed after that snapshot are omitted until a later export. One download row corresponds to one response. Columns are survey ID/title/description/status/created timestamp/public slug, response ID/submission timestamp, then `Q1. question text`, `Q2. question text`, etc. Prefixes distinguish repeated question wording. Answer cells contain selected choice text; missing historical answers are blank. Timestamps retain their database ISO offset. Browser tokens, passwords and Auth data are excluded.

Metadata repeats per response so the file stays a rectangular CSV with one header row. No-response export is disabled rather than generating a fake response/metadata row; refresh results after the first submission. Active, Closed and Archived exports use the same authorized function. Concurrent export is read-only and uses the PostgreSQL statement snapshot rather than paginating changing response rows. The intended classroom workload is supported structurally; no large-export performance or concurrent export benchmark is claimed.

Every field is quoted, embedded quotes are doubled, records use CRLF, and a UTF-8 BOM supports spreadsheet Unicode import. Formula-leading values (including whitespace/control prefixes) get a leading apostrophe to mitigate spreadsheet formula execution. This intentionally alters those exported text cells; ordinary commas, quotes, line breaks and Unicode round-trip unchanged. Null characters are removed. The browser uses a temporary Blob URL and a filename based on survey UUID. A download-start notice is not proof that a browser saved the file.

Automated tests parse the generated file with an independent CSV parser and verify metadata, row counts, question ordering, quoting/newlines/Unicode, blank answers, formula prefixes, malformed data and authorization failures. Database tests confirm anonymous/non-instructor export denial and browser-token exclusion. These do not replace opening the downloaded file in Excel/LibreOffice; actual browser download and spreadsheet checks remain pending after hosted migration application.

Duplication was already implemented earlier. This batch additionally verifies copy title/description, both question types, full choice ordering/text, fresh question/choice IDs, Draft status, empty public slug and zero copied responses in PostgreSQL. The dashboard redirect to the new editor is component-tested. Final manual check: duplicate a survey containing both question types and responses; compare its ordered content, confirm zero responses, edit the copy and verify original content/history remain unchanged.

The user-approved remaining plan is three reviewable batches: **11–12 CSV/duplication**, **13–14 UI polish/full testing**, then **15 deployment/submission**. Finish manual review of this batch before moving to the next. Phase 16 enhancements remain excluded.

## Architecture and roadmap

React renders routed pages; Tailwind supplies styles; the Supabase clients connect to Auth and PostgreSQL. PostgreSQL owns authorization, constraints, activation, atomic submissions and result aggregation. Recharts renders results, and qrcode generates presentation PNGs. Larger pages load on demand.

1. Project setup (complete).
2. Versioned migrations, RLS, instructor allowlist, submission/activation RPCs and database security tests (implemented locally; hosted setup pending).
3. Instructor authentication and protected routes (implemented, component-tested; actual-account login/refresh/logout user-confirmed).
4. Dashboard, duplication and lifecycle controls (implemented; create/refresh user-confirmed, other actual-account checks pending).
5. Full question editor (implemented; actual-account workflow user-confirmed).
6. Classroom presentation with public URLs and downloadable QR PNG (implemented; user reports expected behavior; detailed phone/projector/cross-tab checks pending).
7. Anonymous student forms (implemented; suggested workflow user-reported successful).
8. Browser-token duplicate protection included with Phase 7; basic refresh/count behavior user-reported, broader retry/multi-browser verification pending.
9. Results dashboard (implemented; actual-account results verification pending).
10. Historical results and title/status/created-date filters (implemented; manual date-filter verification pending).
11. CSV export (implemented locally; hosted export migration, browser download and spreadsheet verification pending).
12. Duplication integration verification (database/component checks expanded; final manual comparison pending).
13. UI polish and accessibility.
14. End-to-end, security and performance verification.
15. Cloudflare Pages deployment and submission artifacts (GitHub source already configured).

See `DECISIONS.md`, `VERIFICATION.md`, `DEVELOPMENT_LOG.md` and `TODO.md`. `ASSIGNMENT.md` is now included and reviewed. Its requirements and 100-point rubric are the acceptance criteria; see `VERIFICATION.md` for coverage. The five supplied specification files are retained.

## Deployment plan (not performed)

Create a GitHub repository and push reviewed source, specifications, lockfile and migrations. In Cloudflare Pages connect that repository, build with `npm run build`, and publish `dist`. Configure the three variables from `.env.example` for production; set `VITE_PUBLIC_APP_URL` to the public HTTPS origin. Confirm SPA fallback on direct nested routes. Configure Supabase Site URL/allowed redirects for the final origin and local development. Provision the instructor privately and communicate grader access outside this repository. Verify production login, QR destinations, submissions and results before declaring deployment complete. Recheck provider free-tier limits and current configuration instructions at deployment.

## Submission artifacts still required

GitHub source and migrations; public URL and private grader access; a factual 1–2 page development summary; AI development history; screenshots of Supabase tables, related survey/questions, stored responses and results. The development log is the starting AI history and must be extended each phase.
