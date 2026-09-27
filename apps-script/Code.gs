/**
 * RefConnect activity log receiver.
 *
 * Paste this into the Apps Script editor of the Google Sheet you want to use
 * as the optional activity log (Extensions > Apps Script), then deploy it as a
 * Web App. See README.md in this folder for the full step-by-step.
 */

// Set this to the same value you put in GOOGLE_SHEET_WEBHOOK_SECRET on the
// server. Anyone who knows this value could write rows to your sheet, so
// keep it out of any public repo — set it here directly, not by pasting the
// real value into a file you'll commit.
var WEBHOOK_SECRET = "CHANGE_ME";

var SHEET_NAME = "Activity";
var HEADERS = ["Timestamp", "Event", "Role"];

function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse_({ ok: false, error: "Invalid JSON" });
  }

  // A deployment with the template secret must never accept writes.
  if (
    typeof WEBHOOK_SECRET !== "string" ||
    WEBHOOK_SECRET === "CHANGE_ME" ||
    WEBHOOK_SECRET.length < 16 ||
    !payload ||
    payload.secret !== WEBHOOK_SECRET
  ) {
    return jsonResponse_({ ok: false, error: "Unauthorized" });
  }

  var sheet = getOrCreateSheet_();
  var timestamp = asSheetText_(payload.timestamp || new Date().toISOString());
  var event = asSheetText_(payload.event);
  var role = asSheetText_(payload.role);
  var legacyColumns = sheet.getRange(1, 3).getValue() === "Email" &&
    sheet.getRange(1, 5).getValue() === "Role";
  sheet.appendRow(legacyColumns
    ? [timestamp, event, "", "", role, ""]
    : [timestamp, event, role]);

  return jsonResponse_({ ok: true });
}

function asSheetText_(value) {
  var text = String(value == null ? "" : value);
  // Google Sheets interprets leading =, +, -, and @ as formulas.
  return /^\s*[=+\-@]/.test(text) ? "'" + text : text;
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
