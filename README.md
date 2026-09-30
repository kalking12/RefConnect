# RefConnect

RefConnect is a procedure-based hospital readiness and referral demonstration. Visitors can explore the public introduction and choose a procedure. Hospital results, comparisons, and referral preparation require a verified Google account. The administrator portal lets approved administrators maintain capability values; the initial owner, `osinusikalid@gmail.com`, can grant or revoke other administrator roles after those users sign in.

**Build period:** 24–30 September 2026 (seven calendar days, inclusive).

## What the demonstration does

1. Choose a procedure on the public landing page and open ranked hospitals. A direct `/search` visit without a procedure asks for a choice.
2. Sign in with a Google account whose email is verified. The chosen procedure survives sign-in.
3. Compare hospitals and prepare a referral from an available profile. If the reply to a referral save is lost, **Try again** reuses the same user-scoped request ID so the server can reconcile the attempt.
4. Approved administrators edit hospital information and capability levels. Only the owner manages administrator roles. Server checks protect each private request and edit.

The site has a short, skippable welcome on each fresh page load, including direct secure links (bypassed when reduced motion is requested). Internal navigation does not replay it. After the welcome, direct secure links retain their destination and show the sign-in gate as needed. The landing page has rotating clinical imagery and an About section for the two founders, Khalid Osinusi and Morayo Akinbile.

**Demonstration data:** The five active hospitals start with *illustrative*, unverified capability scores; the wider directory is inactive and a shared sample profile is non-clinical. Rankings must not be used as clinical advice or current availability. The server refuses a real patient profile paired with an illustrative hospital. Real referrals require verified hospital data and a separate clinical approval workflow. New prepared handoffs do not duplicate patient details in the legacy `profileSnapshot` column; older stored rows may still contain snapshots. Set retention, deletion, and publishing-consent policies before handling real patient information or publishing the supplied clinical photos.

## Stack and source layout

| Part | Technology / location |
| --- | --- |
| Web app | React 19, TypeScript, Vite 7, Tailwind CSS 4 in `client/` |
| API and access control | Node.js, Express, tRPC, Google Identity Services token verification in `server/` |
| Data | MySQL, Drizzle ORM schema and migrations in `drizzle/` |
| Shared logic | Procedure scoring and data contracts in `shared/` |
| Deployment | One Render web service in `render.yaml`; Aiven MySQL, or a compatible MySQL service, configured externally |
| Optional activity log | Private Google Sheets webhook in `apps-script/`; the app works without it |

The source preserves the React/Vite/Express project layout inherited from Manus; runtime authentication, images, and data access do not require Manus services. There is no Android APK in this repository.

## Run locally

Use Node.js 22+ and pnpm 11.25.0. A MySQL database and a Google OAuth **Web application** client are required to exercise sign-in and protected data.

```bash
pnpm install --frozen-lockfile
cp env.example .env.local
# Fill in the variables in .env.local; keep the file private.
pnpm db:migrate:verbose
pnpm dev
```

Open the address printed by the server (normally `http://localhost:3000`). Add that origin to the Google client's Authorized JavaScript origins. Production uses the actual HTTPS origin instead. Server process variables take precedence over `.env.local`, then `.env`.

Required settings are `DATABASE_URL`, `JWT_SECRET` (a new random secret of at least 32 bytes), `GOOGLE_CLIENT_ID`, and `VITE_GOOGLE_CLIENT_ID` (the same browser-visible client ID). Use `DB_CA_CERT` to verify Aiven TLS. Set `APP_ORIGIN` to the exact production origin to restrict sign-in and state-changing requests; `DEV_ALLOWED_HOSTS` is optional for remote development previews. `env.example` lists the optional Sheets webhook variables. Never commit `.env.local` or a database export.

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

The build output is generated under `dist/`; it is excluded from source. Keep `pnpm-lock.yaml` for reproducible installs. The production process serves the site and API together; `/healthz` checks that the process responds, not that MySQL or Google sign-in works.

## Deploy and submit

Follow [the Render and Aiven guide](DEPLOY_RENDER_AIVEN.md) for migrations, environment variables, Google origin configuration, and deployment checks. Submit the actual details below through the submission form; the links and complete team details are not present in this source archive.

| Submission field | Supply from |
| --- | --- |
| Team details | Confirmed entrant names, roles, and contact details |
| Deployed/live URL | The final HTTPS site origin after Render deployment |
| GitHub repository | The repository URL after pushing this source |
| Demo video | The shareable URL of the completed three-minute recording |
| Tech stack | The stack table above |

In the video, show the landing procedure finder, verified sign-in, ranked results/comparison, a demonstration referral, and owner/admin controls. State clearly that capability values are illustrative.

Before submitting, verify the published HTTPS site and direct `/search` and `/admin` routes, sign-in as a verified regular user and an approved admin, and a database-backed read and save. The local build and unit tests do not establish that the live Render/Aiven environment or an Android wrapper works. A browser-based Android Trusted Web Activity needs its own device and Google sign-in checks; see the deployment guide.
