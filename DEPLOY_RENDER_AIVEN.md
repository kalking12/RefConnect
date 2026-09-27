# Move RefConnect to Render and Aiven MySQL

This project is one Node/Express web service serving the Vite site and API, with
a separate MySQL database. `render.yaml` configures a free Render web service.
The database export, credentials, and deployed site URL are **not** in this
archive. The existing Manus data has not been transferred yet.

## 1. Preserve and move the existing database

1. Keep the Manus site and database running while you migrate. Obtain a full
   MySQL backup or the database's connection details from your current host.
   Keep the backup private; it may contain patient and referral data.
2. Create an Aiven for MySQL service on the Free plan. Check that the current
   database fits Aiven's 1 GB free storage limit before importing it.
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
   `pnpm db:migrate` runs the existing migrations against `DATABASE_URL`; use
   it only after confirming which migrations the source database already has.

Aiven's migration guide: https://aiven.io/docs/products/mysql/howto/migrate-db-to-aiven-via-console

The Google account subject (`googleSub`) is the account key. Existing records
remain attached to their original account; a legacy account sharing an email
address is not automatically linked to a newly verified Google account.

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
   `render.yaml`, builds the app, and starts the single web service. It
   generates `JWT_SECRET` automatically.
3. When prompted, enter `DATABASE_URL`, `DB_CA_CERT`, `GOOGLE_CLIENT_ID`, and
   `VITE_GOOGLE_CLIENT_ID`. Both Google variables use the same Google OAuth
   **Web application** client ID. `VITE_GOOGLE_CLIENT_ID` must be present for
   the build; it is a browser-visible client ID, not a secret.
4. Note the assigned `https://...onrender.com` address. In Google Cloud, add
   that exact origin under the client ID's Authorized JavaScript origins.
   Add `APP_ORIGIN` in Render's Environment page with the same origin and
   choose **Save, rebuild, and deploy**.
5. Visit `/healthz` to confirm the process is up; that endpoint does not check
   the database or Google settings. Then check the welcome, sign-in, verified user access,
   admin-only portal, site photos, and a restored referral record before
   switching traffic away from Manus.

If you change `VITE_GOOGLE_CLIENT_ID`, choose **Save, rebuild, and deploy**:
Vite embeds that value at build time. Other server-only environment changes
need a restart or deploy. Render's free web service can sleep after inactivity.

Render deployment guide: https://render.com/docs/deploy-node-express-app
Google setup: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

## 4. Optional Bitly sharing link

After the Render address is final, you can create a `bit.ly/...` link pointing
to it. Bitly redirects visitors to the Render site; Google Cloud should
authorize the **Render** origin, not `bit.ly`. A free Bitly link can show an
advertisement page before your welcome animation and its destination cannot
be changed on the Free plan. Share the direct Render URL when a clean first
impression matters.
