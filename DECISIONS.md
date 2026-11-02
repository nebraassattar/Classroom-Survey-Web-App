# Decisions and specification reconciliation

Recorded 2026-11-02. Phase 2 migrations implement the database decisions below and are tested in embedded PostgreSQL; hosted Supabase application and verification remain pending.

- ASSIGNMENT.md was supplied and reviewed after setup on 2026-11-02. Its requirements and rubric are the acceptance criteria. No blocking conflict with the selected stack or plan was found. The assignment suggests a development order and permits alternative hosting/database services; retain the user-requested security-first order, Supabase and Cloudflare Pages. The one-week duration is stated, but no calendar due date is supplied.
- Workspace inspection found only five Markdown specifications. Original TODO checks are unsupported and have been reset; only verified setup items may be restored.
- Use the requested React/TypeScript/Vite/Tailwind/React Router/Supabase/Recharts/qrcode stack and Cloudflare Pages. No alternate hosting or post-MVP features.
- DATABASE.md's permissive authenticated-user examples are superseded by the explicit security requirement: use an admin-managed instructor allowlist, disable public signup, and enforce membership in RLS and privileged RPCs. Frontend guards are only a convenience.
- DATABASE.md's suggested anonymous INSERT access is superseded by RPC-only submissions. Anonymous users cannot directly write responses/answers or read results. Validate all answers and insert them in a single transaction with a fixed search_path and explicit function grants.
- Enforce one active survey globally through a partial unique index and serialized activation RPC. Coordinate submission/close locks so a submission cannot succeed after closure wins the transaction race.
- All MVP questions are required, single choice; True/False has exactly two fixed choices. Enforce relationships and ordering constraints in the database as well as forms.
- Public route is /s/:slug, correcting TODO's /s/:surveyId. Generate an unpredictable unique slug. Return minimal public data; closed/not-found states must not expose response data.
- Edit content only in drafts without responses. Surveys with responses retain question/choice text and ordering; duplicate to revise. Closing does not unlock historical content. Archive preserves results. Explicitly confirmed deletion may cascade through responses as specified, with a stronger warning when responses exist.
- Browser tokens plus mandatory per-survey uniqueness provide reasonable duplicate protection, not one-person identity. Clearing storage or changing browsers can bypass it; document this limitation.
- Use database aggregation for instructor results and browser CSV generation with escaping and spreadsheet formula protection. Realtime is outside MVP; provide refresh.
- Production QR URLs derive from a validated public origin configured at build time, not a hardcoded localhost URL.
- Keep the supplied phase numbering in TODO; implement duplication with survey management even though its checklist is later. No automatic next phase after setup review.

## Phase 2 implementation choices

- All instructor writes use authorized RPCs instead of direct client table mutations. This enforces draft-only content editing and lifecycle rules in the database. Instructor raw reads remain available under RLS for dashboard/history/CSV. Public read policies also apply to authenticated non-instructors so they may participate as students without receiving instructor rights.
- Use `private.instructors` solely as an authorization allowlist, not a multiple-instructor management feature. No public signup or client self-enrollment. The administrator provisions UUID membership after creating the Auth user.
- Whole-draft saves replace nested content atomically and derive contiguous positions from array order. Question/choice IDs may change during drafting; the editor must refetch on save. No submitted/activated content can enter this write path. Empty drafts are allowed to support preparation; activation requires questions with valid choices.
- Closed/Archived content cannot be reopened or edited; duplicate it into a fresh Draft. This preserves a fixed historical response set and avoids reusing student tokens across separate classroom runs.
- Browser tokens are mandatory UUIDs. `answers.survey_id` and composite foreign keys enforce survey and choice relationships independently of RPC validation; free-text answers stay null for MVP.
- The singleton instructor mutation lock serializes activation and edits. Shared survey-row locks allow parallel students and conflict with closing/deleting. A submission that locks first may finish before closure commits; after closure wins, new submissions reject. Hosted concurrency and performance still require measurement.
- Private helpers have no client execute grants. Public security-definer RPCs fix search_path to empty and qualify application objects; explicit grants restrict the callable surface.

## Phase 4 boundaries

- Add basic draft metadata forms with the dashboard so New/Edit/Duplicate have working destinations. Preserve existing questions/choices in position order through the current atomic save RPC. Full question controls remain Phase 5. Concurrent edits from multiple tabs are last-save-wins while still Draft; activated/historical content remains protected by the database.
- No results/presentation links until those pages exist. Keep the corresponding checklist work open instead of introducing dead links. Empty drafts may be stored, but the database rejects activation until questions exist.
- Read all ordered API pages for client-side title/status filtering, then paginate cards locally. A refresh reconciles changes made in another tab. Use native modal dialogs with initial Cancel focus, Escape/cancel and focus restoration; block cancellation while a mutation is in flight. Refuse deletion if response-count lookup fails.
