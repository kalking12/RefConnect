# RefConnect

RefConnect is a full-stack hospital-readiness and referral portal. Verified Google accounts sign in before viewing hospital readiness or referral workflows. The administrator portal is restricted to `osinusikalid@gmail.com`.

For independent hosting with Render and Aiven MySQL, follow [the deployment and data migration guide](DEPLOY_RENDER_AIVEN.md). The source still uses the original React/Vite/Express layout; it no longer needs Manus services at runtime.

## Local setup

Use Node.js 22+ and pnpm 11.25+.

```bash
pnpm install
cp env.example .env.local
```

Fill in the database URL, Google client ID, and a new random JWT secret in
`.env.local`, then create the database tables and start the site:

```bash
pnpm db:push
pnpm dev
```

Open the URL printed by the server, normally:

```text
http://localhost:3000
```

Server process variables take precedence over `.env.local`, then `.env`.
Set the Google client ID in both server and browser variables, and authorize
your site's origin for that client in Google Cloud.

### Environment variables

- `DATABASE_URL` — MySQL connection string. Required for persistent users, profiles, referrals, and admin changes.
- `DB_CA_CERT` — Aiven MySQL CA certificate (PEM) to verify the encrypted database connection. Set in both migration and web service environments.
- `JWT_SECRET` — unique random server-side secret of at least 32 bytes. The placeholder in `env.example` is rejected.
- `GOOGLE_CLIENT_ID` — server-side Google OAuth client ID.
- `VITE_GOOGLE_CLIENT_ID` — the same Google client ID exposed to the browser for Google Identity Services.
- `APP_ORIGIN` — recommended canonical site origin (for example `https://example.com`) for production Google sign-in requests.
- `DEV_ALLOWED_HOSTS` — optional comma-separated hostnames for remote development previews; local hosts work without it.
- `GOOGLE_SHEET_WEBHOOK_URL` and `GOOGLE_SHEET_WEBHOOK_SECRET` — optional private activity sheet. Only the event and role are logged. See `apps-script/README.md` for setup.

Google sign-in uses the Google Identity Services credential flow and a seven-day application session cookie. Only Google accounts with a verified email (`email_verified: true`) can sign in. Session cookies use `SameSite=Lax` and are marked `Secure` in production.

The only administrator is `osinusikalid@gmail.com` (see `ADMIN_EMAIL` in `shared/const.ts`). Other verified Google accounts receive the regular user role.
Google accounts start fresh: a matching email on an older Manus account does
not transfer that account's patient profiles or referral history.

On the first opening of a browser tab, a short RefConnect welcome animation
plays over the sign-in screen or dashboard. It can be skipped and does not
repeat during that tab's session. Reduced-motion users go directly to the
site. The animation does not change the Google sign-in requirement.

## Site photography

Four square PNGs are in `client/public/images/`: `hero-clinicians.png`,
`admin-theatre.png`, `procedure-consultation.png`, and
`admin-collaboration.png`. They are used in the home page and admin sidebar.
The depicted people are fictional; the images contain no patient records.
Site photographs under `/images` are served only to signed-in users. The
regenerated RefConnect logo and square symbol are local PNGs under
`client/public/brand/`; they are public so they appear on the sign-in screen.

## Checks

```bash
pnpm check
pnpm test
pnpm build
```

Keep `pnpm-lock.yaml` with the project for reproducible installs.
