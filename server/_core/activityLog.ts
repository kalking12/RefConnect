import { ENV } from "./env";

/**
 * Fire-and-forget logger that appends one non-identifying row per action to a
 * Google Sheet, via a Google Apps Script "Web App" endpoint (see
 * /apps-script/Code.gs for the script to paste into the Sheet).
 *
 * This never throws and never blocks the request that triggered it — a
 * logging failure (missing config, network error, sheet down) must not break
 * sign-in, referrals, or anything else in the app.
 */
export function logActivity(entry: { event: string; role?: string | null }): void {
  if (!ENV.sheetWebhookUrl) return;

  const body = {
    secret: ENV.sheetWebhookSecret || undefined,
    timestamp: new Date().toISOString(),
    event: entry.event,
    role: entry.role ?? "",
  };

  fetch(ENV.sheetWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((error) => {
    console.warn("[ActivityLog] Failed to log to sheet:", error);
  });
}
