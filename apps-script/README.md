# Optional activity sheet — setup

This logs the event name and role for sign-ins and mutations (referral
created, admin edits, etc.) to a Google Sheet via an Apps Script Web App.
Email addresses, names, and mutation inputs are not sent to the sheet. The
integration is optional; no Google Cloud project or service account is needed.

## 1. Create the sheet

1. Create a new Google Sheet (or use an existing one).
2. Keep **Share > General access > Restricted**. The server writes through
   the Apps Script endpoint; the sheet itself does not need public sharing.

## 2. Add the script

1. In the Sheet, open **Extensions > Apps Script**.
2. Delete the placeholder code and paste in the contents of `Code.gs` from
   this folder.
3. Change `WEBHOOK_SECRET` at the top to a random secret of at least 16
   characters (for example, locally run `openssl rand -hex 32`). The script
   refuses writes while this value is still `CHANGE_ME`.
4. Save the project. Keep the real secret out of the project archive.

## 3. Deploy as a Web App

1. Click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as**: "Me". Set **Who has access**: "Anyone".
4. Click **Deploy**, and authorize the script when prompted (it only needs
   access to this one spreadsheet).
5. Copy the **Web app URL** it gives you — it looks like
   `https://script.google.com/macros/s/AKfycb.../exec`.

## 4. Wire it up to the app

Set these two environment variables on the server (e.g. in `.env.local` or
your host's environment settings):

```
GOOGLE_SHEET_WEBHOOK_URL=<the Web app URL from step 3.5>
GOOGLE_SHEET_WEBHOOK_SECRET=<the same string you set as WEBHOOK_SECRET in Code.gs>
```

Restart the server. Sign-ins and mutations append timestamp, event, and role
rows to the "Activity" tab. If the tab still has the previous six-column
header, the script leaves its existing data intact and writes empty Email,
Name, and Details cells in new rows.

## Notes

- If `GOOGLE_SHEET_WEBHOOK_URL` is unset, logging is silently a no-op — the
  app works exactly as before.
- Set a matching, non-placeholder `GOOGLE_SHEET_WEBHOOK_SECRET` on the server.
- If an existing activity sheet was shared publicly, change its general access
  to **Restricted**.
- If the Apps Script is unreachable for any reason, logging fails silently
  and never breaks the request that triggered it.
- Whenever you change `Code.gs`, you need to create a **new deployment**
  (or use "Manage deployments > Edit > New version") for the change to take
  effect — editing the script alone doesn't update a live deployment.
