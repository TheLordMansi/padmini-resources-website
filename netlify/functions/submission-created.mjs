// Netlify auto-invokes this function (by name) on every verified, non-spam
// submission to any form on the site. Payload shape:
//   { payload: { id, created_at, form_name, data: {...} } }

// TIMEOUT INVARIANT — do not break this:
//   max(SHEET_TIMEOUT_MS, WHATSAPP_TIMEOUT_MS) + ALERT_TIMEOUT_MS < 10000
//
// Netlify kills a synchronous function at 10s. The Sheet and WhatsApp calls
// race in parallel, then the alert is sent afterwards, so the worst case is
// the slower of the two plus the alert. With the previous 8000/8000/8000 that
// was 16s: the function was killed before the alert POST completed, meaning
// the alarm was silenced by exactly the failure it exists to report. Anyone
// raising a timeout must re-check this line first.
const SHEET_TIMEOUT_MS = 6000;
const WHATSAPP_TIMEOUT_MS = 4000;
const ALERT_TIMEOUT_MS = 2500; // worst case 6000 + 2500 = 8.5s

// The form this function is meant to act on. Anything else — notably the
// agency-alerts form this function itself posts to — is ignored.
const RFQ_FORM_NAME = 'rfq';

// CallMeBot answers HTTP 200 with the failure written into the response body,
// so an unactivated or invalid key looks identical to success if you only
// check the status. These are the markers seen in its error responses.
// TODO(stage 6): once a real success body is observed during live testing,
// tighten this into a positive assertion rather than a blocklist.
const WHATSAPP_ERROR_MARKERS = /error|not valid|invalid|not activated|denied|missing/i;

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function postToSheet(data) {
  const url = process.env.SHEET_WEBHOOK_URL;
  const secret = process.env.SHEET_SHARED_SECRET;
  if (!url || !secret) throw new Error('Sheet webhook not configured');

  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, action: 'append', data }),
    },
    SHEET_TIMEOUT_MS
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok !== true) {
    throw new Error(`Sheet append failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function pingWhatsApp(data) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) throw new Error('CallMeBot not configured');

  // Reduced-PII message: no email/phone in transit over the unofficial relay.
  const text = `New RFQ: ${data.product || 'N/A'} -> ${data.destination || 'N/A'} from ${data.company || 'N/A'}. Check email/Sheet for full details.`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;

  const res = await fetchWithTimeout(url, { method: 'GET' }, WHATSAPP_TIMEOUT_MS);
  const body = await res.text().catch(() => '');

  if (!res.ok) {
    throw new Error(`WhatsApp ping failed: ${res.status} ${body.slice(0, 200)}`);
  }
  // The status was 200 — the body is the only thing that distinguishes a
  // delivered message from a rejected one.
  if (WHATSAPP_ERROR_MARKERS.test(body)) {
    throw new Error(`WhatsApp ping rejected (HTTP 200): ${body.slice(0, 200)}`);
  }
  return body;
}

// Deliberately independent of the Sheet/Apps Script path: this POSTs to
// Netlify's own Forms pipeline (the "agency-alerts" hidden form registered
// in alerts.html), so the alert still gets through even when Google's
// endpoint is the thing that's down. process.env.URL is injected by
// Netlify automatically — no new secret needed.
async function sendAgencyAlert(subject, message, submissionId, createdAt) {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!siteUrl) {
    console.error('submission-created: no site URL available, cannot send agency alert');
    return;
  }

  const params = new URLSearchParams();
  params.set('form-name', 'agency-alerts');
  params.set('subject', subject);
  params.set('message', message);
  params.set('submission_id', submissionId);
  params.set('created_at', createdAt);

  try {
    const res = await fetchWithTimeout(
      `${siteUrl}/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      },
      ALERT_TIMEOUT_MS
    );
    if (!res.ok) {
      console.error('submission-created: agency-alerts form POST returned', res.status);
    }
  } catch (err) {
    // Nowhere further to escalate for free — this is the last line of visibility.
    console.error('submission-created: agency alert itself failed to send:', err);
  }
}

export default async (req) => {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error('submission-created: invalid JSON body', err);
    return new Response('ok', { status: 200 });
  }

  const payload = body.payload || {};
  const raw = payload.data || {};
  const submissionId = payload.id || '';
  const createdAt = payload.created_at || new Date().toISOString();

  // sendAgencyAlert() posts to a form on this same site, which re-invokes this
  // function. Without a guard, one outage becomes an infinite loop that burns
  // the monthly submission quota. Previously this was prevented only by
  // accident — the alert payload happens to carry no company/email.
  //
  // Fails OPEN on an unknown form name: if Netlify ever changes the payload
  // shape, we would rather process an unexpected submission than silently drop
  // every RFQ. The loop stays impossible because the alert calls below require
  // a POSITIVE match on the form name, never merely the absence of one.
  const formName = payload.form_name || raw['form-name'] || '';
  const isRfq = formName === RFQ_FORM_NAME;
  if (formName && !isRfq) {
    return new Response('ok', { status: 200 });
  }

  const data = {
    id: submissionId,
    created_at: createdAt,
    product: raw.product || '',
    destination: raw.destination || '',
    quantity: raw.quantity || '',
    company: raw.company || '',
    email: raw.email || '',
    whatsapp: raw.whatsapp || '',
    message: raw.message || '',
    sample_request: raw.sample_request || '',
    consent: raw.consent || '',
  };

  // A field rename upstream would land here forever: every RFQ would skip the
  // Sheet and WhatsApp silently, and a console line on a low-traffic site is
  // read by nobody. Alert on it — but only on a positive form-name match, so
  // this can never fire in response to our own alert.
  if (!submissionId || !data.company || !data.email) {
    console.error('submission-created: missing required fields, skipping side effects', data);
    if (isRfq) {
      await sendAgencyAlert(
        `RFQ pipeline alert — malformed submission ${submissionId || '(no id)'}`,
        `An RFQ submission arrived without the fields this function needs, so it was NOT written to the Sheet and no WhatsApp ping was sent.\n\n` +
          `submission id: ${submissionId || '(missing)'}\ncompany: ${data.company || '(missing)'}\nemail: ${data.email || '(missing)'}\n\n` +
          `This usually means a field was renamed on the form. The Netlify Forms entry itself is safe — check the dashboard submissions list for the raw data.`,
        submissionId,
        createdAt
      );
    }
    return new Response('ok', { status: 200 });
  }

  const [sheetResult, whatsappResult] = await Promise.allSettled([
    postToSheet(data),
    pingWhatsApp(data),
  ]);

  // Severity routing. The Sheet is the working copy the client actually uses,
  // so losing a write is worth an email. CallMeBot is an unofficial free relay
  // with no SLA that will fail routinely — alerting on it would fill the inbox
  // with noise until the one alert that matters gets filtered away.
  if (whatsappResult.status === 'rejected') {
    console.error('submission-created: WhatsApp ping failed (not alerted):', whatsappResult.reason);
  }

  if (sheetResult.status === 'rejected') {
    console.error('submission-created: Sheet write failed', sheetResult.reason);
    await sendAgencyAlert(
      `RFQ pipeline alert — Sheet write failed for ${submissionId}`,
      `The Google Sheet write failed for RFQ submission ${submissionId} (${data.company}, ${createdAt}):\n\n${sheetResult.reason}\n\n` +
        `The Netlify Forms entry itself is safe — check the Netlify dashboard submissions list for the raw data and add the row by hand if needed.`,
      submissionId,
      createdAt
    );
  }

  // Always 200: Netlify does not retry submission-created, and this function
  // must never block or fail the buyer's already-completed form submission.
  return new Response('ok', { status: 200 });
};
