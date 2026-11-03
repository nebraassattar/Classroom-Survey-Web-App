# Classroom Survey Web App — TODO

## Audit status — 2026-11-02

The starting workspace contained only five specification files, without application code or Git history. Inherited checks were reset. Phases 1–4 are committed/pushed; hosted provisioning/smoke are user-reported and read-only hosted restrictions are independently checked. Real login/refresh/logout and draft creation/refresh are user-confirmed. Phase 5 question editing is implemented locally; presentation, student submissions, results and deployment remain pending. Exact migration records, broader hosted checks and full workflow verification remain open.

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

- [ ] Add activation logic.
- [ ] Ensure at most one survey is Active.
- [ ] Automatically close the previously active survey.
- [ ] Generate a public survey slug or identifier.
- [ ] Generate the public survey URL.
- [ ] Generate a QR code from the public URL.
- [ ] Create a Present Survey page.
- [ ] Display survey title and QR code.
- [ ] Display a readable fallback URL.
- [ ] Add a Close Survey button.
- [ ] Add a Download QR Code button.

---

# Phase 7 — Student Survey Page

- [ ] Create the public route `/s/:slug`.
- [ ] Load the requested active survey.
- [ ] Show an error if the survey does not exist.
- [ ] Show a message if the survey is closed.
- [ ] Render survey title and description.
- [ ] Render Multiple Choice questions.
- [ ] Render True / False questions.
- [ ] Validate required answers.
- [ ] Add Submit button.
- [ ] Store response and answers in Supabase.
- [ ] Show a submission confirmation page.
- [ ] Make the entire experience mobile friendly.

---

# Phase 8 — Duplicate Submission Protection

- [ ] Generate an anonymous browser token.
- [ ] Store the token in local storage.
- [ ] Save the token with each response.
- [ ] Prevent the same token from submitting twice to the same survey.
- [ ] Show a friendly message if a duplicate submission is attempted.
- [ ] Add a database uniqueness constraint if appropriate.

---

# Phase 9 — Results Dashboard

- [ ] Create a results page for each survey.
- [ ] Show total response count.
- [ ] Aggregate answers by question.
- [ ] Show counts for each choice.
- [ ] Show percentages for each choice.
- [ ] Add bar charts using Recharts.
- [ ] Clearly label unanswered questions.
- [ ] Add Refresh Results button.
- [ ] Add link back to the main dashboard.

---

# Phase 10 — Historical Results

- [ ] Allow viewing results for Closed surveys.
- [ ] Allow viewing results for Archived surveys.
- [ ] Add filtering by date.
- [ ] Add filtering by survey title.
- [ ] Preserve all historical response data.

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
