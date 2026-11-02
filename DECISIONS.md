# Decisions and specification reconciliation

Recorded 2026-11-02. These guide later work; they are not implemented database guarantees yet.

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
