# Actual evidence — 2026-11-03

The four required views are actual screenshots, not mockups. The survey is **Copy of Test Survey** (`4e07512a-0ba5-4824-a0ad-1fcfe5920dc4`). At the matching database/results capture it had two responses, each with answers 10 and True. Later test submissions can increase the live count.

- [01 — Database tables](01-database-tables.jpg): all five public domain tables and RLS enabled. Privileged SQL inspection is not a substitute for role tests.
- [02 — Survey and questions](02-survey-questions.jpg): real survey-to-question join and ordered question text.
- [03 — Stored responses and answers](03-stored-responses.jpg): four joined answer rows, including the production test submission at 21:45:02 UTC. No browser/anonymous token column was selected.
- [04 — Deployed app results](04-app-results.jpg): two responses, matching charts/tables and 100% counts for 10 and True.

Additional release evidence:

- [05 — Public home](05-production-home.jpg)
- [06 — Server-confirmed student submission](06-production-submission.jpg)
- [07 — Actual production QR PNG](07-production-qr.png), independently decoded to the exact public student URL (not a physical scan)
- [08 — Production presentation](08-production-presentation.jpg)
- [09 — Saved production QA draft](09-production-draft.jpg), containing both supported question types and left inactive

Queries used for the database screenshots are in [evidence-queries.sql](../evidence-queries.sql). Screenshots omit keys, credentials, anonymous tokens, Auth users and private student information. They show real non-personal test data. Include the four required images with the HuskyCT submission.
