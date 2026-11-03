# Submission package

Status: draft package. Public deployment, grader access and evidence screenshots must be completed before submission. Do not submit this checklist as proof that pending work passed.

- GitHub: https://github.com/nebraassattar/Classroom-Survey-Web-App
- Public app: pending deployment verification.
- Development report: `DEVELOPMENT_SUMMARY.md` (review the draft, especially deployment and personal learning).
- AI interaction history: `AI_HISTORY.md`, with the detailed chronology in `../DEVELOPMENT_LOG.md`.
- Database schema: `../supabase/migrations/`.
- Setup/deployment: `../README.md` and `../DEPLOYMENT.md`.

## Private grader access

Provision a separate grader instructor through the Supabase dashboard and add its Auth UUID to `private.instructors` using the administrative instructions in `../supabase/README.md`. Keep public signup disabled. Test that account privately on the deployed app. Provide the app URL and access instructions/password only through the private HuskyCT submission channel or an instructor-approved private method. Never put credentials in this folder, GitHub, screenshots, the report or AI history. A separate account can be revoked after grading without changing the owner's login.

## Required real screenshots

Save sanitized PNGs in `evidence/` after inspecting them. None have been captured for this package yet.

1. `01-database-tables.png`: Supabase showing all five public tables and their names.
2. `02-survey-questions.png`: a real stored survey with its associated questions; use safe SQL result columns if one Table Editor view cannot show the relationship.
3. `03-stored-responses.png`: real responses with related answer rows. Omit `anonymous_token` and all Auth data.
4. `04-app-results.png`: the corresponding survey's counts and percentages in the deployed app.

Use a disposable test survey with non-personal choices. Include survey identifiers/title only as needed to connect the evidence. Exclude passwords, keys, browser storage, session tokens, private email addresses and private student data. Screenshots must be actual application/database views, not generated illustrations.

## Final user checks

- Scan the deployed QR on a physical phone and submit once.
- Verify stored answers, count, CSV import in a spreadsheet and duplicate prevention after refresh.
- Check another browser engine and keyboard behavior; record exact device/browser outcomes.
- Review the report in your own words and explain the five-table data flow.
- Fill the public URL and private grader instructions in the HuskyCT submission, attach the report/history/evidence and submit yourself.

Performance targets and real database race tests are separately tracked in `../VERIFICATION.md`; do not claim them based on component or embedded-database tests.
