# Supabase setup and database contract

Phase 2 includes executable migrations and embedded PostgreSQL tests. A hosted project has **not** been created or verified. Frontend authentication and connected pages are later phases.

## 1. Create a free project

1. Sign in at https://supabase.com/dashboard and create a project in your own organization. Choose the free plan and a nearby region. Save a strong database password in your password manager; never paste it into chat or commit it.
2. After provisioning, open Authentication settings and turn **Allow new users to sign up** off. Leave anonymous Auth sign-ins off: students use the unauthenticated Data API role, not anonymous Auth accounts. Retain email/password authentication for the instructor. Labels may vary with dashboard updates.
3. In Authentication → Users, manually add your instructor with a strong password. Confirm email using the supported dashboard/invitation flow. Copy the user's UUID, not their password.

## 2. Apply migrations once, in order

In SQL Editor of the new empty project, run the complete contents of each file separately:

- `migrations/202611020001_schema.sql`
- `migrations/202611020002_rpcs.sql`

Each is transactional: an error rolls that file back. Stop on errors and record sanitized text. Do not rerun a successful file; these are ordered migrations, not idempotent scripts. Future changes belong in new files. Inspect any existing database before applying; never reset populated hosted data to retry. Record applied versions/dates below.

This SQL Editor workflow does not populate Supabase CLI migration history. If switching to CLI `db push` later, reconcile that history first; do not reapply the initial migrations.

After both migrations, provision membership in SQL Editor (replace only the UUID with your manually created Auth user's UUID):

```sql
insert into private.instructors(user_id)
values ('REPLACE-WITH-INSTRUCTOR-USER-UUID'::uuid)
on conflict (user_id) do nothing;
```

This is administrative SQL, never browser code. No client can edit the allowlist. Revoke access by deleting that UUID from `private.instructors`. Signing in alone does not grant instructor permissions.

## 3. Configure local browser-safe variables

Copy `.env.example` to `.env.local`. From Supabase project API/connection settings, copy the project URL and **publishable** key into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Keep `VITE_PUBLIC_APP_URL=http://localhost:5173` locally. Restart Vite after changes. Never use a secret key, service-role key or database password: all `VITE_` values appear in browser code.

Current setup pages intentionally make no Supabase requests. Configuring variables does not implement login; Phase 3 will connect Auth and check `is_instructor()`.

## 4. Inspect and verify

Confirm the five public tables in Table Editor with RLS enabled; `private` contains authorization and the mutation-lock row. Inspect the schema in SQL Editor:

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
and tablename in ('surveys','questions','choices','responses','answers');

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint where connamespace = 'public'::regnamespace;

select policyname, tablename, roles, cmd from pg_policies
where schemaname = 'public';
```

Run `tests/hosted-smoke.sql` in SQL Editor after provisioning an instructor. It uses the first allowlisted user as a test principal and rolls back all temporary fixtures. It may temporarily close the current active survey inside its transaction; run against the initial/test project when no classroom collection is in progress. Expect a success notice and rollback. SQL Editor normally runs as a privileged role: ordinary queries there alone are not RLS evidence. Never run the embedded test Auth bootstrap on Supabase.

This smoke test checks database roles, not real JWT issuance or HTTP behavior. Test actual signed-in/signed-out clients after Phase 3 and real concurrent activation/submit/close sessions before claiming concurrency verified. Capture sanitized Table Editor screenshots with real application records in later phases.

## Local tests

```sh
npm ci
npm run test:db
```

The runner applies the actual migrations to ephemeral PGlite (embedded PostgreSQL), with fixtures for Supabase Auth roles and `auth.uid()`. It executes SQL, PL/pgSQL, constraints and RLS, discarding data on exit. It never connects to Supabase or uses credentials. Its single session cannot establish concurrent locking, hosted Auth, PostgREST or production performance.

## RPC contract

Use `supabase.rpc(name, parameters)`. Every instructor RPC checks the private allowlist. Tables grant reads under RLS and **no direct client writes**, including for instructors. API.md's direct mutation examples are superseded by these RPCs.

- `is_instructor()` → boolean; authenticated only.
- `save_survey_draft(p_survey_id uuid|null, p_title text, p_description text|null, p_questions jsonb)` → UUID. Null ID creates; existing ID atomically replaces an editable draft. Empty drafts may be saved but not activated. Payload: `[{"question_text":"Ready?","question_type":"true_false","choices":["True","False"]}]`. Array order sets positions. Up to 100 questions, 2–20 string choices each. True/False requires exactly True then False. Draft question/choice IDs change on save: refetch afterward.
- `activate_survey(p_survey_id)` → `{id,status,public_slug}`. Draft/Active only. Closes the previous Active transactionally; random UUID slug generated once. Duplicate Closed/Archived surveys to use again.
- `close_survey(p_survey_id)` → void; Active → Closed.
- `archive_survey(p_survey_id)` → void; Draft/Closed → Archived. Close Active first.
- `delete_survey(p_survey_id)` → void; deletes non-Active survey and related data. UI must confirm, warn strongly for responses and encourage Archive.
- `duplicate_survey(p_survey_id)` → new Draft UUID, copied ordered content, no responses.
- `get_public_survey(p_slug text)` → `{state:'active',survey:{id,title,description},questions:[...]}`, `{state:'closed'}` or `{state:'not_found'}`. Anon/authenticated allowed; no inactive content or response data. Active content is also readable through RLS.
- `submit_survey_response(p_survey_id uuid, p_anonymous_token uuid, p_answers jsonb)` → `{success:true,response_id}`. Anon/authenticated allowed. Persist a `crypto.randomUUID()` browser token locally. Payload `[{question_id,choice_id}]` must answer every question exactly once; validation and insertion are atomic.
- `get_survey_results(p_survey_id)` → `{survey_id,response_count,questions:[{question_id,question_text,position,response_count,choices:[{choice_id,choice_text,position,count,percentage}]}]}`. Instructor only, including history; percentages rounded to one decimal place. Raw response/answer reads under instructor RLS support CSV; exclude browser tokens from exports.

Business errors: `INSTRUCTOR_REQUIRED`, `SURVEY_NOT_FOUND`, `SURVEY_NOT_EDITABLE`, `INVALID_SURVEY_STATE`, `SURVEY_HAS_NO_QUESTIONS`, `SURVEY_NOT_ACTIVE`, `INVALID_TOKEN`, `INVALID_ANSWERS`, `INVALID_ANSWER`, `MISSING_REQUIRED_ANSWER`, `INVALID_QUESTION`, `INVALID_CHOICE`, `DUPLICATE_QUESTION`, `DUPLICATE_RESPONSE`, `INVALID_TRUE_FALSE`, `INVALID_CHOICES`, `INVALID_QUESTIONS`, `TOO_MANY_QUESTIONS`. Constraints also reject invalid lengths/types/UUIDs. Later UI must map errors to friendly messages with a generic fallback; never display raw exceptions.

## Integrity and concurrency

Only drafts without responses may change content. Activated surveys never return to Draft; closing/archiving preserves questions and answers. Duplicate to revise. Explicit whole-survey deletion deliberately removes history.

Mandatory `(survey_id,anonymous_token)` uniqueness prevents repeated tokens, but clearing storage or changing browsers bypasses it. Composite foreign keys enforce response/question survey membership and choice/question membership. `text_answer` stays null because free text is outside MVP. Positive/unique positions protect order; a partial unique index enforces one active survey globally.

Instructor mutations acquire a singleton row lock first to serialize activation. Student submissions take shared survey-row locks: students can submit concurrently, while closure/deletion waits. If closure commits first, submission rejects; if submission locks first, closure waits for completion. Hosted concurrent-session behavior and performance remain unmeasured.

## Hosted application record

- Project created: user-reported in supplied setup history on 2026-11-02.
- Both migration versions applied: inferred from user-reported successful instructor provisioning and full smoke-script execution; no direct inspection or exact application timestamps available.
- Instructor provisioned: user-reported successful allowlist insert. Public signup disabled: user-confirmed on 2026-11-02.
- Browser-safe local variables: user saved values; all three expected fields are filled and the file is Git-ignored. Values were not printed. Hosted connectivity is not yet verified.
- Hosted smoke: user reports executing the entire script with no error, displaying a blank `set_config` result. This is consistent with successful execution; PASS notice was not captured and the agent did not independently observe the hosted run.
- Actual Auth/Data API, schema inspection evidence and concurrent-session verification: pending.

Sources: [Database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth configuration](https://supabase.com/docs/guides/auth/general-configuration).
