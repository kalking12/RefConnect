# RefConnect

A procedure-based hospital readiness and referral demonstration. Visitors explore a public introduction and choose a procedure; ranked hospital results, comparisons, and referral preparation require a verified Google account. An administrator portal lets approved administrators maintain capability values, with the initial owner (`osinusikalid@gmail.com`) granting or revoking other administrator roles after those users sign in.

**Build period:** 24–30 September 2026 (7 calendar days, inclusive)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Testing and Building](#testing-and-building)
- [Deployment](#deployment)
- [Data and Safety Notes](#data-and-safety-notes)
- [Build Timeline](#build-timeline-24–30-september-2026)
- [Submission](#submission)

## Features

- **Procedure-first discovery** — choose a procedure on the public landing page and open ranked hospitals for it. A direct `/search` visit with no procedure selected prompts for a choice instead of guessing one.
- **Verified sign-in** — Google sign-in gates hospital results, comparisons, and referral preparation. The chosen procedure survives sign-in, so context isn't lost.
- **Compare and refer** — compare hospitals side by side and prepare a referral from an available profile. If a referral save's response is lost, **Try again** reuses the same user-scoped request ID so the server can reconcile the attempt instead of creating a duplicate.
- **Administrator portal** — approved administrators edit hospital information and capability levels. Only the owner account manages administrator roles. Server-side checks protect every private request and edit.
- **Guided first visit** — a short, skippable welcome appears on each fresh page load, including direct secure links (skipped automatically when reduced motion is requested). Internal navigation doesn't replay it, and direct secure links retain their destination through the sign-in gate.
- **Demonstration-data safeguards** — the server refuses to pair a real patient profile with an illustrative hospital, keeping demo and real data from mixing.

## Tech Stack

| Part | Technology / location |
| --- | --- |
| Web app | React 19, TypeScript, Vite 7, Tailwind CSS 4 in `client/` |
| API and access control | Node.js, Express, tRPC, Google Identity Services token verification in `server/` |
| Data | MySQL, Drizzle ORM schema and migrations in `drizzle/` |
| Shared logic | Procedure scoring and data contracts in `shared/` |
| Deployment | One Render web service in `render.yaml`; Aiven MySQL, or a compatible MySQL service, configured externally |
| Optional activity log | Private Google Sheets webhook in `apps-script/`; the app works without it |

The source preserves the React/Vite/Express project layout inherited from Manus; runtime authentication, images, and data access do not require Manus services. There is no Android APK in this repository.

## Project Structure

```
client/         React + Vite frontend
server/         Express + tRPC API, Google auth verification
drizzle/        MySQL schema and migrations (Drizzle ORM)
shared/         Procedure scoring and data contracts shared by client and server
apps-script/    Optional Google Sheets activity-log webhook
render.yaml     Render web service definition
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 11.25.0
- A MySQL database (Aiven or compatible)
- A Google OAuth **Web application** client

### Installation

```bash
pnpm install --frozen-lockfile
cp env.example .env.local
```

Fill in the variables in `.env.local`; keep the file private and never commit it.

### Environment Variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MySQL connection string |
| `JWT_SECRET` | Yes | A new random secret, at least 32 bytes |
| `GOOGLE_CLIENT_ID` | Yes | Server-side OAuth client ID |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Same client ID, exposed to the browser |
| `DB_CA_CERT` | Recommended | Verifies Aiven TLS |
| `APP_ORIGIN` | Recommended | Exact production origin; restricts sign-in and state-changing requests |
| `DEV_ALLOWED_HOSTS` | Optional | For remote development previews |

`env.example` also lists the optional Sheets-webhook variables for the activity log. Server process variables take precedence over `.env.local`, then `.env`.

### Running Locally

```bash
pnpm db:migrate:verbose
pnpm dev
```

Open the address the server prints (normally `http://localhost:3000`) and add that origin to the Google client's Authorized JavaScript origins. Production uses the actual HTTPS origin instead.

## Testing and Building

```bash
pnpm check   # type-check
pnpm test    # unit tests
pnpm build   # production build
pnpm start   # run the production build
```

The build output is generated under `dist/` and is excluded from source; keep `pnpm-lock.yaml` for reproducible installs. The production process serves the site and API together. `/healthz` checks that the process responds, not that MySQL or Google sign-in work — verify those separately after deploying.

## Deployment

Follow [the Render and Aiven guide](DEPLOY_RENDER_AIVEN.md) for migrations, environment variables, Google origin configuration, and deployment checks. In short:

1. Provision an Aiven MySQL service (or compatible) and note its connection string and CA certificate.
2. Create a Render web service from `render.yaml` and set the required environment variables.
3. Add the deployed HTTPS origin to the Google OAuth client's Authorized JavaScript origins, and set `APP_ORIGIN` to match.
4. Confirm `/healthz`, sign-in, and a database-backed read and save all work against the live deployment — the local build and unit tests do not establish that the live Render/Aiven environment works.

## Data and Safety Notes

The five active hospitals start with *illustrative*, unverified capability scores; the wider directory is inactive, and the shared sample profile is non-clinical. **Rankings must not be used as clinical advice or for current availability.** The server refuses a real patient profile paired with an illustrative hospital. Real referrals require verified hospital data and a separate clinical approval workflow. New prepared handoffs do not duplicate patient details in the legacy `profileSnapshot` column, though older stored rows may still contain snapshots. Set retention, deletion, and publishing-consent policies before handling real patient information or publishing the supplied clinical photos.

## Build Timeline (24–30 September 2026)

> The breakdown below groups the work into a 7-day arc; adjust the specifics to match your own day-by-day log before submitting.

| Day | Date | Focus |
| --- | --- | --- |
| 1 | Thu 24 Sept | Project scaffold, procedure/hospital data model, and readiness scoring logic |
| 2 | Fri 25 Sept | Landing page procedure finder and the `/search` ranked-results experience |
| 3 | Sat 26 Sept | Google sign-in, session handling, and the owner/administrator role model |
| 4 | Sun 27 Sept | Render web service and Aiven MySQL provisioning; first deployment |
| 5 | Mon 28 Sept | Migration tooling hardened against partial/imported database states; schema reconciliation on deploy |
| 6 | Tue 29 Sept | Frontend revamp — landing page team section, `/search` UX fixes (procedure selection, comparison, referral retry flow) |
| 7 | Wed 30 Sept | Final QA across sign-in, search, referral, and admin flows; README and submission materials |

## Submission

| Field | Supply from |
| --- | --- |
| Team details | Confirmed entrant names, roles, and contact details |
| Deployed/live URL | The final HTTPS site origin after Render deployment |
| GitHub repository | The repository URL after pushing this source |
| Demo video | The shareable URL of the completed three-minute recording |
| Tech stack | The [Tech Stack](#tech-stack) table above |

In the demo video, show: the landing procedure finder, verified sign-in, ranked results/comparison, a demonstration referral, and owner/admin controls. State clearly that capability values are illustrative.

