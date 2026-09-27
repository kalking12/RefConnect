# RefConnect cleanup log

Generated from the uploaded project archive.

## Removed from the source archive

### Generated / local artifacts
- `node_modules/` — installed dependencies; recreated by `pnpm install`.
- `dist/` — generated production build.
- `.vite/` — Vite cache.
- `.manus-logs/` — generated browser/network/session logs.
- `.env.local` — contained local secrets and must never be redistributed.
- `package-lock.json` — npm lockfile; this project uses pnpm.
- `.github/` and `.vscode/` — editor/CI metadata not required to run the website.

### Manus-specific development/runtime paths
- `client/public/__manus__/debug-collector.js`
- `client/public/__manus__/version.json`
- the custom Manus debug collector in `vite.config.ts`
- `vite-plugin-manus-runtime`
- Manus OAuth redirect/callback flow
- Manus login UI and `ManusDialog`
- Manus preview `sessionStorage` authentication fallback
- Manus-generated helper modules for AI, maps, data APIs, image generation, voice transcription, heartbeat jobs, and S3 storage helpers
- Manus notification/system router that was not used by the website

The existing `/manus-storage/...` image proxy was retained because the current RefConnect pages still reference those image assets.

### Unused application/UI code
- `AIChatBox.tsx`
- `Map.tsx`
- `ComponentShowcase.tsx`
- unused generated shadcn UI components that were not reachable from the application entry points

### Unused dependencies
Removed dependencies that had no remaining application imports after the code cleanup, including AWS SDK packages, form resolver/react-hook-form packages, Framer Motion, Next Themes, Streamdown, date-fns, Tailwind animation extras, unused Google Maps types, and related unused UI dependencies.

## Authentication

- Google authentication is now the only application login flow.
- Session cookies use `SameSite=Lax`; production cookies are `Secure`.
- Sessions expire after seven days and legacy sessions are rejected.
- The sole administrator email is `osinusikalid@gmail.com`.
- The Google endpoint reports configuration and verification errors without
  exposing internal database details.
- Server-side Google configuration and JWT session configuration are checked explicitly.
- The Manus OAuth warning caused by missing `OAUTH_SERVER_URL` is removed.
- Google session signing no longer depends on the Manus OAuth SDK.

## Setup

The project now includes a lockfile matching `package.json`. Run `pnpm install`,
then `pnpm check`, `pnpm test`, and `pnpm build`. Create `.env.local` from
`env.example` and add credentials locally. Keep secrets out of archives.


## Correction — September 26, 2026

- Removed stale `wouter@3.7.1` from `pnpm.patchedDependencies`.
- Removed `patches/wouter@3.7.1.patch`.
- This correction prevents `ERR_PNPM_PATCH_NOT_APPLIED` during `pnpm install`.

## Current pass — September 26, 2026

- Preserved the current Manus-based Vite/React layout and the `/manus-storage`
  proxy used by the page images.
- Removed the unused `@assets` alias, which pointed to a missing directory.
- Included the existing shared readiness tests in the Vitest test selection.
- Kept all direct dependencies: each has a reachable import, CSS reference,
  or build/tooling script.
- Regenerated `pnpm-lock.yaml` with compatible dependency releases that pass
  the package manager's minimum-release-age check.
- Made the optional Apps Script activity receiver reject its placeholder
  secret, keep the sheet private, and avoid storing incoming personal fields.
- Removed the unused application-title environment setting and its tautological
  test; the page title remains in `client/index.html`.
- Preserved Vite development host and filesystem restrictions when starting
  its middleware (remote preview hosts can be configured), and reduced the JSON
  request limit to match the small API.
- Google accounts are keyed by Google's subject identifier; legacy email
  matches are not automatically linked to existing referral records.
- Added four square, photorealistic site photographs under
  `client/public/images/` and connected them to the existing hero, procedure,
  administrator callout, and sidebar placements. The original Manus logo and
  its guarded proxy remain; the generated image routes also require sign-in.
- Added a lightweight CSS/SVG welcome animation before the existing sign-in
  screen or dashboard. It runs once per tab session, can be skipped, and is
  bypassed when reduced motion is requested.

## Independent hosting preparation — September 26, 2026

- Replaced the remaining Manus-hosted logo with the local RefConnect
  stethoscope mark already used on the sign-in screen, preserving the page
  layout while removing the Forge storage proxy and credentials.
- Added a Render Free Blueprint and deployment guide for an external Aiven
  MySQL database. Render generates the session signing secret.
- Added CA-verified TLS support for the Aiven connection and migrations,
  a small database connection pool, and a public `/healthz` process check.
- Existing Manus database contents still require a separate private export
  and import into Aiven; no records or credentials are packaged here.

## Regenerated logo — September 26, 2026

- Recreated the supplied sage medical-network symbol and forest green
  RefConnect wordmark as local square transparent PNG assets.
- Used the wordmark on the welcome screen, sign-in screen, homepage header and
  footer; used the symbol in the dashboard and browser icon.
- Kept both brand assets public so the sign-in screen can display them, while
  the site photographs under `/images` remain behind the account gate.
