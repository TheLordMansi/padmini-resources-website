// Deploy target: Google Apps Script bound to the client's RFQ Google Sheet
// (Sheet → Extensions → Apps Script → paste this file → Deploy → Web app).
//
// One action, authenticated by a shared secret read from the JSON request
// BODY (Apps Script's doPost(e) has no access to HTTP headers):
//   action: "append" — append one RFQ row (idempotent, lock-protected)
//
// Failure alerting does NOT go through this script — it POSTs to a
// separate Netlify Form (see netlify/functions/submission-created.mjs and
// alerts.html) so alerts still work even when this endpoint is down.
//
// Required Script Properties (Project Settings → Script Properties):
//   SHARED_SECRET — must match SHEET_SHARED_SECRET in Netlify env vars
//
// Sheet must have a header row: Timestamp | Submission ID | Product |
// Destination | Quantity | Company | Email | WhatsApp | Message |
// Sample Requested | Consent | Status
//
// Redeploy discipline: when editing this script, use
// Manage deployments → Edit (pencil) → New version. Do NOT create a fresh
// "New deployment" — that mints a new Web App URL and silently breaks the
// already-configured SHEET_WEBHOOK_URL env var in Netlify.

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'locked' });
  }

  try {
    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonResponse({ ok: false, error: 'bad_json' });
    }

    var secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!secret || body.secret !== secret) {
      return jsonResponse({ ok: false, error: 'unauthorized' });
    }

    return handleAppend(body);
  } finally {
    lock.releaseLock();
  }
}

function handleAppend(body) {
  var data = body.data || {};
  var id = String(data.id || '');
  if (!id) {
    return jsonResponse({ ok: false, error: 'missing_id' });
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RFQs')
    || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Dedupe check happens INSIDE the lock, immediately before the write —
  // checking outside the lock would let two concurrent deliveries of the
  // same submission both read "not present" and both append.
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var existingIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingIds.length; i++) {
      if (String(existingIds[i][0]) === id) {
        return jsonResponse({ ok: true, duplicate: true });
      }
    }
  }

  var timestamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');

  var row = [
    timestamp,
    id,
    clean(data.product),
    clean(data.destination),
    clean(data.quantity),
    clean(data.company),
    clean(data.email),
    clean(data.whatsapp),
    clean(data.message),
    clean(data.sample_request),
    clean(data.consent),
    'New',
  ];

  sheet.appendRow(row);
  return jsonResponse({ ok: true });
}

// Google Sheets formula/CSV injection guard: a cell value starting with
// = + - @ is treated as a formula by Sheets/Excel unless neutralized.
function clean(value) {
  var s = (value === undefined || value === null) ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) {
    return "'" + s;
  }
  return s;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
