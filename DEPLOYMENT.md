# Cloudflare deployment

Deployed and browser-verified on 2026-11-03: https://classroom-survey-web-app.nesattar786.workers.dev. Git-integrated build 8717fc6 completed successfully. The user created a Git-connected Worker in the dashboard, so this release uses Workers static assets. Supabase remains the backend.

## Build settings

Use the existing GitHub repository, `nebraassattar/Classroom-Survey-Web-App`, production branch `main`, with the repository root as the application root. Use the existing Worker `classroom-survey-web-app`; do not create a second service.

- Host: Cloudflare Workers static assets
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Static assets: `./dist`, configured in `wrangler.json`
- Node version: `24.11.0`, pinned by `.node-version`

The app is static frontend code; Supabase hosts Auth and PostgreSQL separately. Do not create a second database or upload `.env.local`.

Before building, add production **build** variables in Worker Settings → Builds → Variables and secrets (runtime bindings do not configure Vite):

- `VITE_SUPABASE_URL`: same project URL used locally.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: same browser-safe publishable key used locally.
- `VITE_PUBLIC_APP_URL`: the final `https://classroom-survey-web-app.nesattar786.workers.dev` origin, with no path.

These variables are bundled into public JavaScript. Never use a service-role key, secret key, database password, instructor password or access token. Environment changes require a new build. If the chosen project name is unavailable, update the public origin to the actual assigned domain before rebuilding. Preview builds must also receive browser-safe configuration; their QR codes intentionally point to the configured production origin.

## Routing and Auth

Workers SPA fallback is explicitly configured with `assets.not_found_handling = "single-page-application"` in `wrangler.json`. Navigation requests without a matching asset receive the root document. Verify fresh direct navigation to `/login`, `/dashboard`, `/s/<active-slug>` and an unknown route. The app owns its 404 screen. No backend Worker code or runtime secrets are required.

In Supabase Authentication → URL Configuration, set Site URL to the final HTTPS origin. Allow exact production and localhost redirect URLs as needed; avoid broad production wildcards. Email/password sign-in is an API call, but invitation/recovery links also depend on this configuration. Keep new-user signup disabled and leave instructor membership restricted to the private allowlist.

## Release verification

1. Confirm the Worker deployment succeeds for the intended Git commit.
2. Open the public home page and a student deep link in a signed-out browser outside the local network. Verify the actual QR destination uses the public HTTPS origin.
3. Sign in privately, open dashboard/results/presentation and refresh direct protected links. Verify sign-out blocks protected routes.
4. On an identified disposable test survey, check create/edit/reload, activation, anonymous submission and duplicate refresh. Activation closes any previous Active survey, so coordinate before using live classroom data.
5. Confirm results and CSV match the stored answers. Scan the QR on an actual phone; use cellular data for an outside-local-network check.
6. Capture the required sanitized screenshots listed in `submission/README.md`. Record actual outcomes in `DEVELOPMENT_LOG.md`; build success alone does not complete these steps.

## Updates and recovery

With Git integration, a push to `main` triggers a production build. Review changes and run the relevant local checks first. Use Worker deployment history to restore a previous successful frontend deployment if needed. Frontend rollback does not roll back database migrations; never reset populated Supabase tables to recover a frontend release. Retain the production build environment settings when rebuilding.

## Optional Pages alternative

A new Pages project can instead use the React (Vite) preset, `npm run build` and output `dist`. Without a top-level `404.html`, Pages supplies SPA fallback. This is an alternative deployment, not the service used for this release. Update the build origin and Auth URLs when changing hosts.

## Official references

- [React deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Build image and Node version](https://developers.cloudflare.com/pages/configuration/build-image/)
- [SPA routing](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

- [Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Workers SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Workers build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

## Recorded release checks — 2026-11-03

Public home/student/protected/unknown deep routes passed. Private instructor login, refresh persistence and logout passed. Created and reopened a Draft containing both question types without activating it. One anonymous test submission was stored; refresh showed Already submitted. Results and production CSV matched two stored responses and four answer rows at the evidence checkpoint. The browser-generated QR PNG decoded to the exact public student URL. Supabase Site URL is saved to the production origin; no additional redirect wildcard was added. See DEVELOPMENT_LOG.md for limits and any subsequent user-reported phone check.
