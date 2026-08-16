// Deploy target: Google Apps Script bound to the client's RFQ Google Sheet
// (Sheet → Extensions → Apps Script → paste this file → Deploy → Web app).
//
// One action, authenticated by a shared secret read from the JSON request
// BODY (Apps Script's doPost(e) has no access to HTTP headers):
//   action: "append" — append one RFQ row (idempotent, lock-protected),
//                      then send the buyer an acknowledgement email
//
// The acknowledgement goes out via MailApp from the account that owns this
// Sheet. Set SEND_BUYER_ACK to false to disable it without removing the code.
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

  // Only after the row is safely written, and never on the duplicate path
  // above — a retried delivery must not send the buyer a second receipt.
  sendBuyerAck(data);

  return jsonResponse({ ok: true });
}

// ---- buyer acknowledgement --------------------------------------------------
// Sends from the Sheet owner's own Gmail (consumer quota ~100 recipients/day),
// so there is no email service to buy and no DNS records to configure.
//
// Deliberately worded as a RECEIPT, not a reply: request-a-quote.html promises
// "answered by a named export manager, not an auto-responder", so this must
// confirm arrival without pretending to be that answer.
var SEND_BUYER_ACK = true;
var ACK_FROM_NAME = 'Padmini Resources';
var EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

function sendBuyerAck(data) {
  if (!SEND_BUYER_ACK) return;

  var to = String(data.email || '').trim();
  if (!EMAIL_RE.test(to)) return;

  var body = [
    'Thank you - we have received your enquiry.',
    '',
    'What you sent us:',
    '  Product:     ' + (data.product || '-'),
    '  Destination: ' + (data.destination || '-'),
    '  Quantity:    ' + (data.quantity || '-'),
    '  Company:     ' + (data.company || '-'),
    '',
    'One of our export managers will read this personally and reply with a firm',
    'offer within 24 hours (Mon-Sat). This message is only a confirmation that',
    'your enquiry reached us - it is not the offer itself.',
    '',
    'If you need to add anything, just reply to this email.',
    '',
    ACK_FROM_NAME,
  ].join('\n');

  try {
    MailApp.sendEmail({
      to: to,
      subject: 'We have received your enquiry - ' + ACK_FROM_NAME,
      body: body,
      name: ACK_FROM_NAME,
    });
  } catch (err) {
    // Never let a failed courtesy email fail the append. The row is the thing
    // that must not be lost; the receipt is a nicety.
    Logger.log('sendBuyerAck failed: ' + err);
  }
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
