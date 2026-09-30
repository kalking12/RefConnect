# Move RefConnect to Render and Aiven MySQL

This project is one Node/Express web service serving the Vite site and API, with
a separate MySQL database. `render.yaml` configures the Render web service.
The database export, credentials, and deployed site URL are **not** in this
archive. This guide covers a fresh setup or restored database; it does not
verify the state of a live deployment.

The shipped hospital capability scores are illustrative and the shared
referral profile is for demonstration. The server blocks real patient profiles
from being referred to illustrative destinations. Migrating and deploying
this code does not establish verified clinical readiness; an operational
referral launch needs verified destination data and an approval workflow.
New prepared handoffs no longer duplicate patient details in
`profileSnapshot`; the legacy non-null column receives empty JSON. Previously
stored snapshots remain in database backups and restored rows, so review those
under a retention and deletion policy before handling real patient data.

## 1. Preserve and move the existing database

1. Keep the Manus site and database running while you migrate. Obtain a full
   MySQL backup or the database's connection details from your current host.
   Keep the backup private; it may contain patient and referral data.
2. Create an Aiven for MySQL service on the plan you have chosen. Check that the
   current database fits that plan's [storage limits](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier)
   before importing it.
3. If the Manus database is reachable from the public internet, Aiven Console
   > your MySQL service > Service settings > Import database can migrate an
   external MySQL database. Choose its one-time snapshot option if the source
   does not support continuous replication. Import into an empty target.
4. If the source is private, export a SQL backup through the Manus database
   tools and restore it with a MySQL client configured for TLS to Aiven. Do not
   create fresh RefConnect tables on Aiven before restoring the backup.
5. Compare table counts in both databases, including `users`, `hospitals`,
   `patientProfiles`, and `referralHandoffs`. Check the schema and migration
   history before applying any project migrations to the restored database.
   `pnpm db:migrate:verbose` runs `scripts/migrate.mjs` against `DATABASE_URL`
   and repairs missing tables or simple columns when migration history is
   inconsistent. Use it only after confirming the restored database state.

Aiven's migration guide: https://aiven.io/docs/products/mysql/howto/migrate-db-to-aiven-via-console

The Google account subject (`googleSub`) is the account key. Existing records
remain attached to their original account; a legacy account sharing an email
address is not automatically linked to a newly verified Google account.
The database also stores administrator roles. Preserve the `users` table when
moving data. `osinusikalid@gmail.com` is the initial owner; other users must
sign in with Google once before the owner can grant administrator access.
This version adds `users.adminApprovedAt` in `drizzle/0008_superb_anthem.sql`.
Apply that migration to the restored database **before starting this version
of the server**. Existing non-owner admin flags remain unapproved and cannot
grant access. If the source database's migration history does not match this
project, review it and apply the single new column migration carefully rather
than rerunning all previous migrations.

## 2. Connect the app to Aiven

In Aiven's MySQL service overview, copy the service URI for `DATABASE_URL` and
download the **CA Certificate**. The app uses `DB_CA_CERT` to verify TLS for
both its runtime database pool and Drizzle migrations. Paste the entire PEM,
including its BEGIN/END lines, into the Render environment variable. Literal
newlines or escaped `\n` line breaks are accepted. Keep the database URI
private.

## 3. Deploy on Render

1. Put the contents of this project folder at the root of a private Git
   repository. Do not commit `.env.local` or database backups.
2. In Render, create a **Blueprint** from that repository. Render reads
   `render.yaml`, runs the supplied `scripts/migrate.mjs` before building the
   app, and starts the single web service. It generates `JWT_SECRET`
   automatically. Keep a backup before any production migration.
3. When prompted, enter `DATABASE_URL`, `DB_CA_CERT`, `GOOGLE_CLIENT_ID`, and
   `VITE_GOOGLE_CLIENT_ID`. Both Google variables use the same Google OAuth
   **Web application** client ID. `VITE_GOOGLE_CLIENT_ID` must be present for
   the build; it is a browser-visible client ID, not a secret.
4. Note the assigned `https://...onrender.com` address. In Google Cloud, add
   that exact origin under the client ID's Authorized JavaScript origins.
   Add `APP_ORIGIN` in Render's Environment page with that exact origin
   (scheme and hostname, no path; include a non-default port if used) and
   choose **Save, rebuild, and deploy**.
5. Visit `/healthz` to confirm the process is up; that endpoint does not check
   the database or Google settings. Then check the short welcome on each fresh page load, public introduction,
   procedure finder, sign-in when requesting results, verified user access,
   admin-only portal, rotating hero photos, and a restored referral record before
   switching traffic away from Manus.
6. Test the built site at its production address, including a direct visit to
   `/admin` and a page reload there. Confirm an anonymous request to a private
   `/images/...` URL receives 401. This version does not ship a private image,
   so a signed-in request to a nonexistent `/images/...` file should receive
   404. Test as a regular user, an administrator, and the owner. Use a real
   migrated record to check a read
   and a save. `/healthz` alone cannot establish database or sign-in readiness.

If you change `VITE_GOOGLE_CLIENT_ID`, choose **Save, rebuild, and deploy**:
Vite embeds that value at build time. Other server-only environment changes
need a restart or deploy. Allow time for a cold start during testing if the
chosen Render plan sleeps after inactivity.

Render deployment guide: https://render.com/docs/deploy-node-express-app
Google setup: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

## 4. Optional Bitly sharing link

After the Render address is final, you can create a `bit.ly/...` link pointing
to it. Bitly redirects visitors to the Render site; Google Cloud should
authorize the **Render** origin, not `bit.ly`. A free Bitly link can show an
[interstitial advertisement](https://support.bitly.com/hc/en-us/articles/32874287800333-Why-are-there-ads-on-my-links)
before your welcome animation. Share the direct Render URL when a clean first
impression matters. Link editing depends on the current Bitly account and
plan; check that before publishing a short link.

## Android APK wrapper

This archive does not include an Android project or an APK. The website must
first run from a stable HTTPS origin with its API on that same origin. Keep
`APP_ORIGIN` and the Google Web client ID's Authorized JavaScript origin set
to that actual site origin. `VITE_GOOGLE_CLIENT_ID` is embedded in the web
build. A `bit.ly` redirect is only a sharing link and cannot replace the site
origin in these settings.

For a browser-based Android package, use a Trusted Web Activity (or an Android
Custom Tab) opening the deployed HTTPS site, then test sign-in, cookie
persistence, deep links, and connection loss on the target devices. A Trusted
Web Activity needs Digital Asset Links verification for your domain, Android
package name, and signing certificate. Those package-specific values are not
known to this web repository. Google does not support sign-in through an
embedded Android WebView, even if that WebView opens the remote HTTPS URL.
Loading a local `file://` copy would also have the wrong origin for this
site's API POST checks and for Google's Authorized JavaScript origins. If a
native WebView wrapper is required, it needs a separately designed native
Google sign-in and server session handoff; the current JavaScript button
cannot simply be reused there.

Sign-in, live hospital readiness, and edits need a connection. The loaded app
shows an offline notice, but this project has no service worker or offline
patient-data cache. A cold start without network is not supported. Do not
assume a successful Vite preview or browser build proves the APK's Google
sign-in or session behavior; run the checks in the actual wrapper before
distribution.

References: [Google Sign-In best practices](https://developers.google.com/identity/siwg/best-practices),
[Google web origin setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid),
and [Android Trusted Web Activities](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities).
