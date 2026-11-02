# Classroom Survey Web App

Individual CSE 4095 project. The frontend remains a local React/TypeScript/Vite shell. Phase 2 adds versioned SQL migrations, RLS and guarded RPCs with embedded PostgreSQL tests. Hosted Supabase setup, frontend authentication/surveys and deployment remain pending. No mock survey data is used in the application; database tests use disposable fixtures.

## Local setup

Use Node 22.12+ (this session uses Node 24.11) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Verify the home page, Instructor Login setup notice, and unknown-route message. No credentials are required for this phase.

```sh
npm run lint
npm run test:db
npm run typecheck
npm run format:check
npm run build
npm run preview
```

Use the committed lockfile with `npm ci` for reproducible installation. Run `npm run format` to format files.

For Phase 2, follow [Supabase setup and RPC contracts](supabase/README.md). Create your project, apply the two migrations, disable signup, provision instructor membership, and configure browser-safe values locally. Hosted verification is pending; the automated database suite runs without credentials.

## Configuration and security

In the database phase, copy `.env.example` to `.env.local` and fill values locally from your Supabase project. Never paste secrets into chat. Vite exposes all `VITE_` values publicly: use only the project URL and publishable key, never a secret/service-role key or database password. The current client factory is not invoked by any page.

Authentication will require both a valid Supabase session and a database-controlled instructor allowlist. Public signup will be disabled; signing in alone must never grant instructor privileges. Database RLS and validated RPCs are mandatory before data features are connected.

## Architecture and roadmap

React renders routed pages; Tailwind supplies styles; the Supabase client connects to Auth and PostgreSQL. PostgreSQL owns authorization, constraints, activation transactions, and atomic submissions. Recharts and qrcode are declared for later phases.

1. Project setup (complete).
2. Versioned migrations, RLS, instructor allowlist, submission/activation RPCs and database security tests (implemented locally; hosted setup pending).
3. Instructor authentication and protected routes.
4. Dashboard, draft editor, duplication and lifecycle controls.
5. Activation and presentation with public URLs and downloadable QR PNG.
6. Anonymous student forms and duplicate protection.
7. Results, history and CSV.
8. End-to-end, accessibility, performance, GitHub and Cloudflare Pages deployment, submission artifacts.

See `DECISIONS.md`, `VERIFICATION.md`, `DEVELOPMENT_LOG.md` and `TODO.md`. `ASSIGNMENT.md` is now included and reviewed. Its requirements and 100-point rubric are the acceptance criteria; see `VERIFICATION.md` for coverage. The five supplied specification files are retained.

## Deployment plan (not performed)

Create a GitHub repository and push reviewed source, specifications, lockfile and migrations. In Cloudflare Pages connect that repository, build with `npm run build`, and publish `dist`. Configure the three variables from `.env.example` for production; set `VITE_PUBLIC_APP_URL` to the public HTTPS origin. Confirm SPA fallback on direct nested routes. Configure Supabase Site URL/allowed redirects for the final origin and local development. Provision the instructor privately and communicate grader access outside this repository. Verify production login, QR destinations, submissions and results before declaring deployment complete. Recheck provider free-tier limits and current configuration instructions at deployment.

## Submission artifacts still required

GitHub source and migrations; public URL and private grader access; a factual 1–2 page development summary; AI development history; screenshots of Supabase tables, related survey/questions, stored responses and results. The development log is the starting AI history and must be extended each phase.
