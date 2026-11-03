# Classroom Survey Web App — TODO

## Audit status — 2026-11-03

The starting workspace contained only five specification files, without application code or Git history. Inherited checks were reset. Phases 1–9 (including the Phase 8 duplicate foundation) are committed/pushed. Real login, draft/editor/presentation and suggested student workflows are user-reported successful; results verification is still pending. Phase 10 historical created-date filters are implemented locally. CSV, deployment, evidence capture, broader hosted/concurrency and performance checks remain pending.

## Purpose

This roadmap breaks the implementation into small, testable phases ordered from foundational work to advanced features.

---

# Phase 1 — Project Setup

- [x] Create a new React + TypeScript project with Vite.
- [x] Add Tailwind CSS.
- [x] Add React Router.
- [x] Add Supabase JavaScript client.
- [x] Add Recharts.
- [x] Add QR code generation package.
- [x] Create the initial project folder structure.
- [x] Add `.env.example` with Supabase environment variable names.
- [x] Configure ESLint and formatting.
- [x] Create a basic home page.
- [x] Verify the project builds successfully.

---

# Phase 2 — Supabase Project and Database

Database definitions and role behavior below are verified in embedded PostgreSQL, not hosted Supabase. Phase 2 remains open until the hosted checks are completed. See `supabase/README.md` for setup and contracts.

- [x] Create a Supabase project (user-reported in supplied setup history).
- [x] Define and locally create the `surveys` table through migrations.
- [x] Define and locally create the `questions` table through migrations.
- [x] Define and locally create the `choices` table through migrations.
- [x] Define and locally create the `responses` table through migrations.
- [x] Define and locally create the `answers` table through migrations.
- [x] Add foreign-key constraints, including composite answer relationships.
- [x] Add database indexes.
- [x] Add timestamps and survey update trigger.
- [x] Add survey-status validation and one-active unique index.
- [x] Create Row Level Security policies and explicit grants.
- [x] Verify students cannot read survey results in local database role tests.
- [x] Verify anonymous students can read active surveys in local role tests.
- [x] Verify anonymous students can submit complete responses atomically in local tests.
- [x] Verify allowlisted instructors can read/manage data via authorized RPCs locally.
- [x] Add admin-managed instructor allowlist; deny authenticated non-instructor permissions.
- [x] Add activation, close, archive, deletion, duplication and atomic draft-save RPCs.
- [x] Add submission validation, mandatory browser-token uniqueness and rollback tests.
- [x] Add private result aggregation and minimal public survey RPCs.
- [x] Add rollback-only hosted smoke script and verify it executes locally.
- [ ] Apply both migrations to hosted Supabase and record application dates.
- [x] Disable public signup and provision instructor Auth user plus allowlist entry (user-confirmed).
- [x] Configure browser-safe local environment values (filled and Git-ignored; read-only hosted connectivity verified).
- [ ] Run the hosted database smoke script and inspect tables/relationships/RLS.
- Hosted progress: user reports instructor allowlist provisioning and whole-script smoke execution without errors. Exact migration dates and schema inspection evidence remain unconfirmed. Public signup is user-confirmed disabled. `.env.local` settings are now filled and Git-ignored; read-only hosted connectivity is verified.
- [ ] Verify actual hosted Auth/Data API access with instructor, non-instructor and anon clients (requires Auth integration).
- [ ] Verify concurrent activation, duplicate submissions and close-versus-submit on multi-session PostgreSQL.

---

# Phase 3 — Instructor Authentication

Implementation checks below are component-tested using SDK fixtures. Real instructor-account login, refresh and logout are user-confirmed; non-instructor, mobile and multi-browser verification remain pending. No password is collected in chat.

- [x] Create the instructor login page.
- [x] Connect login to Supabase Auth.
- [x] Add logout (current browser session).
- [x] Create an authentication context/provider.
- [x] Create a protected-route component with server-side allowlist RPC check.
- [x] Redirect unauthenticated users to login.
- [x] Show the logged-in instructor in the dashboard shell.
- [x] Handle failed authorization, non-instructor accounts and stale asynchronous results without exposing protected content.
- [x] Verify hosted public RPC connectivity and anonymous data restrictions through read-only API checks.
- [x] Independently verify hosted Auth reports public signup disabled after correcting the setting.
- [x] Manually verify real instructor login (user-reported successful local app/login check).
- [x] Manually verify persistence after refresh and logout (user-confirmed).
- [ ] Manually verify a real non-instructor account is denied.
- [ ] Verify mobile layout, keyboard behavior and two browsers with real Auth.

---

# Phase 4 — Instructor Dashboard

Implementation is verified with component/service fixtures and existing database tests; actual-account edit/duplicate/lifecycle and native-dialog/mobile verification remain pending. New/Edit now use the Phase 5 question editor.

- [x] Create the dashboard layout.
- [x] Load surveys from Supabase with ordered API pagination.
- [x] Display survey title, status, and creation date.
- [x] Add status badges for Draft, Active, Closed, and Archived.
- [x] Add a New Survey button and draft editor.
- [x] Add Edit action for drafts, loading question content.
- [x] Add Duplicate action and redirect to the new draft.
- [x] Add Delete action with response-count warning and confirmation.
- [x] Add Archive action with confirmation.
- [ ] Add View Results action (deferred until results page in Phase 9).
- [x] Add Activate action with confirmation and friendly validation errors.
- [x] Add Close action with confirmation.
- [x] Add search by survey title.
- [x] Add filtering by status.
- [x] Add refresh, loading/error/empty states and UI pagination.
- [x] Verify actual-account draft creation and persistence after refresh (user-confirmed).
- [ ] Verify actual-account edit/duplicate/archive/delete.
- [ ] Verify native dialog keyboard/focus behavior and narrow/mobile layouts.

---

# Phase 5 — Survey Editor

Implemented and component-tested; actual-account question save/reload, mobile and native-dialog checks remain pending. No new migration needed.

- [x] Create the full draft survey editor.
- [x] Add survey title field.
- [x] Add optional description field.
- [x] Add questions dynamically.
- [x] Support Multiple Choice questions.
- [x] Support True / False questions with fixed choices.
- [x] Add answer choices dynamically.
- [x] Reorder questions without losing typed edits.
- [x] Reorder choices without losing typed edits.
- [x] Delete questions with confirmation.
- [x] Delete choices with confirmation, retaining at least two choices.
- [x] Validate required fields near inputs and focus the first invalid field.
- [x] Save survey details/questions/choices atomically as Draft.
- [x] Load an existing draft for editing in stored order.
- [x] Enforce draft-only editing; Active/Closed/Archived content requires duplication, preserving historical answers.
- [x] Confirm destructive type changes and unsaved Back navigation.
- [x] Add Save and activate with confirmation and partial-success/retry handling.
- [x] Test ordered draft updates and invalid-update rollback in embedded PostgreSQL.
- [x] Verify real-account question creation/editing, save/reopen/refresh and ordering (user reports the editor saves and works as expected after the suggested checks).
- [ ] Verify mobile editor, keyboard reordering and native confirmation dialogs.

---

# Phase 6 — Survey Activation

Implementation and QR decoding are automatically tested; presentation behavior is user-reported. Detailed browser/phone/projector checks remain pending. Existing migration/RPC handles activation; no new migration. Student URL now loads the Phase 7 public form.

- [x] Add activation logic (existing authorized RPC, dashboard/editor integration).
- [x] Ensure at most one survey is Active through the database index and serialized RPC (multi-session verification still pending).
- [x] Automatically close the previously active survey (database-tested).
- [x] Generate a public survey slug or identifier in the database.
- [x] Generate the public survey URL from validated configuration.
- [x] Generate a QR code from the public URL.
- [x] Create a protected Present Survey page and Active-card link.
- [x] Display survey title and QR code.
- [x] Display a readable fallback URL.
- [x] Display instructor-only response count with refresh and unavailable/error handling.
- [x] Detect closure/unknown status and hide stale QR sharing controls.
- [x] Add a Close Survey button with confirmation.
- [x] Add a Download QR PNG link using the displayed QR image.
- [x] Decode a real generated PNG and assert the exact URL in automated tests.
- [x] Verify real-account presentation behavior (user reports it works as expected).
- [ ] Independently verify browser PNG download and actual phone/projector scan.
- [ ] Verify cross-tab status/response-count updates with real data.
- [ ] Verify production QR origin after deployment.

---

# Phase 7 — Student Survey Page

Implementation is tested with UI/SDK fixtures plus the existing real embedded PostgreSQL submission tests. Real hosted anonymous submission and record persistence have not yet been observed/reported. Token basics from Phase 8 are necessary here because the RPC requires them; no new migration.

- [x] Create the public route `/s/:slug` outside instructor Auth guards.
- [x] Load the requested active survey through a dedicated anonymous client/RPC.
- [x] Show an error if the survey does not exist.
- [x] Show a message if the survey is closed, including closure during submission.
- [x] Render survey title and description.
- [x] Render Multiple Choice questions.
- [x] Render True / False questions.
- [x] Validate required answers and focus the first missing group.
- [x] Add Submit button with in-flight protection and disabled controls.
- [x] Integrate atomic Supabase response/answer RPC (database-tested; hosted student workflow pending).
- [x] Show confirmation only on acknowledged success.
- [x] Implement one-column, large-touch-target responsive layout.
- [x] Preserve selections and browser token on retryable submission failure.
- [x] Handle malformed public payloads, loading/retry/error/empty terminal states without raw exceptions.
- [x] Verify hosted student workflow/persistence (user reports all suggested checks work as expected; not independently inspected).
- [ ] Verify phone layout, keyboard/screen-reader controls and at least two browsers.

---

# Phase 8 — Duplicate Submission Protection

Required foundation implemented alongside Phase 7; actual-browser/hosted retry verification remains pending. Protection is browser/origin-based, not one-person identity.

- [x] Generate an anonymous UUID browser token.
- [x] Persist token in local storage before submitting; fail clearly if storage is unavailable.
- [x] Pass token to the RPC, which stores it with each response.
- [x] Prevent the same token from submitting twice through mandatory database uniqueness.
- [x] Show a friendly duplicate message and retain token across uncertain retries.
- [x] Restore Already submitted from per-survey local success markers.
- [x] Add a database uniqueness constraint (existing Phase 2 migration).
- [x] Verify same-browser refresh and response-count behavior (user reports the suggested student workflow works; uncertain-network replay remains independently unverified).
- [ ] Verify expected separate-browser behavior and document storage-clearing limitations in final report.

---

# Phase 9 — Results Dashboard

Implemented with component/service/chart and database tests; real instructor results and responsive/chart accessibility verification remain pending. Existing aggregation RPC is used; no new migration or direct response reads.

- [x] Create a protected results page for each survey.
- [x] Show total response count.
- [x] Aggregate answers by question through the instructor-only RPC.
- [x] Show counts for each choice, including zero-count choices.
- [x] Show percentages for each choice with explicit denominator and rounding note.
- [x] Add horizontal bar charts using Recharts, plus semantic numeric tables.
- [x] Clearly label answered and unanswered counts.
- [x] Add Refresh Results, loading/empty/error states and stale-snapshot handling.
- [x] Add links from dashboard/presentation and back to dashboard/Active presentation.
- [x] Test mixed database counts, rounded percentages, zero choices and history.
- [ ] Verify actual-account results against stored records and refreshed submissions.
- [ ] Verify mobile/chart resizing, keyboard/screen-reader interaction and capture evidence.

---

# Phase 10 — Historical Results

Implementation and targeted date/dashboard/results regressions pass; actual-account historical/date-picker/mobile verification remains pending. Date filters use inclusive survey creation dates in device-local time, matching card dates; no new migration or data writes.

- [x] Allow viewing results for Closed surveys (implementation/component/database tested; actual-account check pending).
- [x] Allow viewing results for Archived surveys (implementation/component/database tested; actual-account check pending).
- [x] Add inclusive Created from/through filters with optional bounds, invalid-range feedback and local-calendar/DST-safe comparisons.
- [x] Add filtering by survey title (existing dashboard search covers history).
- [x] Preserve historical response data through close/archive (database-tested).
- [x] Combine date range with title/status, reset pagination on date changes and add Clear filters.
- [x] Verify historical/date filtering behavior (user reports it is all good after the suggested checks).
- [ ] Independently verify mobile/native date pickers and historical results evidence.

---

# Phase 11 — CSV Export

- [ ] Add Export CSV button.
- [ ] Export survey metadata.
- [ ] Export one row per response.
- [ ] Include submission timestamp.
- [ ] Include each question and answer.
- [ ] Create safe CSV escaping.
- [ ] Test export with spreadsheet applications.

---

# Phase 12 — Survey Duplication

- [ ] Duplicate survey title and description.
- [ ] Duplicate questions.
- [ ] Duplicate answer choices.
- [ ] Create the copy in Draft state.
- [ ] Add "Copy of ..." naming.
- [ ] Redirect to the editor after duplication.

---

# Phase 13 — UI Polish

- [ ] Add consistent page layouts.
- [ ] Improve mobile responsiveness.
- [ ] Add loading states.
- [ ] Add empty states.
- [ ] Add error messages.
- [ ] Add confirmation dialogs for destructive actions.
- [ ] Improve QR-code presentation for classroom projection.
- [ ] Test accessibility and keyboard navigation.
- [ ] Improve color contrast.

---

# Phase 14 — Testing

- [x] Test instructor login (component-tested and user-confirmed with real account).
- [ ] Test survey creation.
- [ ] Test survey editing.
- [ ] Test activation.
- [ ] Test closing surveys.
- [ ] Test QR-code links.
- [ ] Test student submissions.
- [ ] Test duplicate-submission prevention.
- [ ] Test results calculations.
- [ ] Test CSV export.
- [ ] Test mobile layout.
- [ ] Test with at least two browsers.
- [ ] Test unauthorized access attempts.
- [ ] Test database Row Level Security.

---

# Phase 15 — Deployment

- [x] Push the project to GitHub.
- [ ] Create the Cloudflare Pages site.
- [ ] Connect Cloudflare Pages to the GitHub repository.
- [ ] Configure production environment variables.
- [ ] Deploy the application.
- [ ] Configure SPA routing.
- [ ] Verify production login.
- [ ] Verify QR codes point to the production URL.
- [ ] Test student submissions in production.
- [ ] Test instructor results in production.

---

# Phase 16 — Post-MVP Enhancements

- [ ] Add live updating results with Supabase Realtime.
- [ ] Add question bank.
- [ ] Add survey import/export as JSON.
- [ ] Add Markdown import.
- [ ] Add short-answer questions.
- [ ] Add checkbox questions.
- [ ] Add rating-scale questions.
- [ ] Add numeric questions.
- [ ] Add AI-assisted question generation.
- [ ] Add LMS integration.
- [ ] Add multiple instructors.
- [ ] Add course and semester organization.
- [ ] Add analytics across multiple surveys.
