# Submission package

Status: public deployment and the four evidence screenshots are verified. The development report needs student review; phone verification and private grader access are tracked below. Do not submit pending checks as proof of success.

- GitHub: https://github.com/nebraassattar/Classroom-Survey-Web-App
- Public app: https://classroom-survey-web-app.nesattar786.workers.dev
- Development report: `DEVELOPMENT_SUMMARY.md` (review the draft, especially deployment and personal learning).
- AI interaction history: `AI_HISTORY.md`, with the detailed chronology in `../DEVELOPMENT_LOG.md`.
- Database schema: `../supabase/migrations/`.
- Setup/deployment: `../README.md` and `../DEPLOYMENT.md`.

## Private grader access

User selected a separate grader account on 2026-11-03; provisioning is still pending. Create the grader instructor privately through the Supabase dashboard and add its Auth UUID to `private.instructors` using the administrative instructions in `../supabase/README.md`. Keep public signup disabled. Test that account privately on the deployed app. Provide the app URL and access instructions/password only through the private HuskyCT submission channel or an instructor-approved private method. Never put credentials in this folder, GitHub, screenshots, the report or AI history. A separate account can be revoked after grading without changing the owner's login.

## Required real screenshots

Actual sanitized screenshots were captured and inspected on 2026-11-03. Browser screenshots are JPEGs. See [evidence index](evidence/README.md).

1. `01-database-tables.jpg`: Supabase showing all five public tables and their names.
2. `02-survey-questions.jpg`: a real stored survey with its associated questions; use safe SQL result columns if one Table Editor view cannot show the relationship.
3. `03-stored-responses.jpg`: real responses with related answer rows. Omit `anonymous_token` and all Auth data.
4. `04-app-results.jpg`: the corresponding survey's counts and percentages in the deployed app.

Use a disposable test survey with non-personal choices. Include survey identifiers/title only as needed to connect the evidence. Exclude passwords, keys, browser storage, session tokens, private email addresses and private student data. Screenshots must be actual application/database views, not generated illustrations.

## Final user checks

- Scan the deployed QR on a physical phone and submit once (user deferred this check until later).
- Stored answers/count, production CSV, Excel import and duplicate refresh passed at the recorded checkpoint. Recheck after any further changes.
- Check another browser engine and keyboard behavior; record exact device/browser outcomes.
- Review the report in your own words and explain the five-table data flow.
- Fill the public URL and private grader instructions in the HuskyCT submission, attach the report/history/evidence and submit yourself.

Performance targets and real database race tests are separately tracked in `../VERIFICATION.md`; do not claim them based on component or embedded-database tests.
