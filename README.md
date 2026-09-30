# RefConnect

RefConnect is a full-stack hospital-readiness and referral portal. The introduction, procedure finder, and About/founders section are public. Selecting a procedure and choosing **View hospitals** opens the secure search: verified Google accounts sign in before viewing hospital readiness or preparing referrals. The initial administrator and permanent owner is `osinusikalid@gmail.com`.

This build is a demonstration. The five active hospitals start with
illustrative capability scores, the wider directory is inactive, and the
shared referral profile is a non-clinical sample. The server rejects a real
patient profile paired with an illustrative destination. Real referrals need
verified hospital readiness data and a separate approval workflow before this
can be used for clinical operations.

New prepared referral rows keep the profile ID, destination, and procedure but
do not copy the patient's name, reference, or condition into the legacy
`profileSnapshot` column; it receives empty JSON. Existing database rows are
unchanged and may contain older snapshots. Set a retention and deletion policy
before importing or using real patient records.

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
pnpm db:migrate:verbose
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
- `APP_ORIGIN` — canonical site origin (for example `https://example.com`, with no path) for production sign-in and state-changing API requests. It must match the address users actually open.
- `DEV_ALLOWED_HOSTS` — optional comma-separated hostnames for remote development previews; local hosts work without it.
- `GOOGLE_SHEET_WEBHOOK_URL` and `GOOGLE_SHEET_WEBHOOK_SECRET` — optional private activity sheet. Only the event and role are logged. See `apps-script/README.md` for setup.

Google sign-in uses the Google Identity Services credential flow and a seven-day application session cookie. Only Google accounts with a verified email (`email_verified: true`) can sign in. Session cookies use `SameSite=Lax` and are marked `Secure` in production.

The initial administrator is `osinusikalid@gmail.com` (see `ADMIN_EMAIL` in `shared/const.ts`). Other verified Google accounts start with the regular user role. The owner can promote registered, verified Google accounts to administrator and revoke their administrator role in the Admin portal. New administrators can edit hospital capability values and profiles but cannot grant roles; the owner account cannot be demoted through the app. An account must complete its first Google sign-in before it can appear in the owner's user list. Role changes are stored in MySQL and checked on each authenticated server request. The nullable `adminApprovedAt` column requires migration `0008_superb_anthem.sql` before this version runs against an existing database; old non-owner admin flags alone do not grant access.
Google accounts start fresh: a matching email on an older Manus account does
not transfer that account's patient profiles or referral history.
The first verified Google sign-in creates the user's RefConnect account
automatically; the same button handles later sign-ins. Visitors can read the
public introduction, choose a procedure, and read About/founders content without
signing in. Clicking **View hospitals** keeps the selected procedure in the
URL, opens the sign-in prompt, then shows protected results after sign-in. The
administrator link similarly prompts for sign-in, with role authorization
still checked by the server. Patient profiles, hospital values, and referral
actions do not mount or load for signed-out visitors.

On the first public landing visit in a browser tab, a 3.2-second RefConnect
welcome animation draws and reveals the brand, then fades into the public
introduction. It can be skipped and does not repeat during that tab's session.
Reduced-motion users go directly to the page. A direct secure-search or admin
link shows its sign-in prompt immediately.

## Site photography

The public landing uses five optimized rotating hero images, a stable About
image, and portraits of the two founders, Khalid Osinusi and Morayo Akinbile,
under `client/public/site/`. The brand mark and clinical clothing have been
adapted to the blue palette. One hero image is newly generated; the other
clinical images were adapted from supplied source photos. The two uncaptioned images showing identifiable patients and the
image naming a specific hospital were deliberately not used. Confirm consent
and publishing rights for the selected people and clinical images before
public deployment. The sign-in preview uses the existing public clinician
image under `client/public/preview/`; no patient or hospital records are in
that image. The `/images` path remains reserved for signed-in imagery and is
protected by the server. RefConnect logo assets are in `client/public/brand/`,
including a small SVG favicon.

## Interface

The public page flows from introduction to procedure selection to About/founders.
The secure search page immediately ranks hospitals for the procedure chosen on
the landing page. A direct `/search` visit without a procedure asks the user to
choose one, and the full selector sits behind **Change procedure** after a
choice. A fixed comparison pill opens the selected hospitals while scrolling.
The referral button stays **Prepare referral**; the dialog explains demo and
availability limits. Its inactive hospital directory is collapsed until
requested. The administrator portal uses explicit capability
levels, a hospital profile editor that keeps unsaved drafts when changing
hospitals, and owner-only account role management. Navigation is available in
the header or sidebar according to screen size. Data load failures and empty
lists are shown directly in the relevant screen.

The app shows an offline notice and retries read requests once. A stalled
read request times out after 90 seconds so its screen can show a retry option.
Sign-in, current hospital data, and saving changes require a connection.
Writes are not automatically retried. If a referral response is lost, the
**Try again** action reuses the same user-scoped request ID and the server
reconciles an existing record before inserting; the same attempt cannot be
reused for a different profile, hospital, or procedure. Repeated failure asks
an administrator to check its status. Administrator changes still require
status verification after an uncertain response. Patient and referral
information is not cached for offline use; the browser keeps a referral
operation ID indexed by the selected record IDs in tab session storage until
confirmation, without names or clinical details.

## Android APK integration

This repository builds a website, not an Android package. If packaging the
deployed site as an APK, use an HTTPS browser-based shell such as a Trusted Web
Activity and test Google sign-in on the actual devices. An embedded Android
WebView is not supported for Google's sign-in flow. A Trusted Web Activity
also needs a site-to-app Digital Asset Links association configured for the
APK's package name and signing certificate. See [the deployment guide](DEPLOY_RENDER_AIVEN.md#android-apk-wrapper)
for the production checklist.

## Checks

```bash
pnpm check
pnpm test
pnpm build
```

Keep `pnpm-lock.yaml` with the project for reproducible installs.
