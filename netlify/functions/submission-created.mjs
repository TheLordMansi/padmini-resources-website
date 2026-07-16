// Netlify auto-invokes this function (by name) on every verified, non-spam
// submission to any form on the site. Payload shape: { payload: { id, created_at, data: {...} } }

const SHEET_TIMEOUT_MS = 8000;
const WHATSAPP_TIMEOUT_MS = 8000;
const ALERT_TIMEOUT_MS = 8000;

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
    throw new Error(`WhatsApp ping failed: ${res.status} ${body}`);
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

  if (!submissionId || !data.company || !data.email) {
    console.error('submission-created: missing required fields, skipping side effects', data);
    return new Response('ok', { status: 200 });
  }

  const [sheetResult, whatsappResult] = await Promise.allSettled([
    postToSheet(data),
    pingWhatsApp(data),
  ]);

  const failures = [];
  if (sheetResult.status === 'rejected') {
    failures.push(`Sheet: ${sheetResult.reason}`);
  }
  if (whatsappResult.status === 'rejected') {
    failures.push(`WhatsApp: ${whatsappResult.reason}`);
  }

  if (failures.length > 0) {
    console.error('submission-created: side-effect failure(s)', failures);
    await sendAgencyAlert(
      `RFQ pipeline alert — submission ${submissionId}`,
      `One or more side-effects failed for RFQ submission ${submissionId} (${data.company}, ${createdAt}):\n\n${failures.join('\n')}\n\nThe Netlify Forms entry itself is safe — check the Netlify dashboard submissions list for the raw data.`,
      submissionId,
      createdAt
    );
  }

  // Always 200: Netlify does not retry submission-created, and this function
  // must never block or fail the buyer's already-completed form submission.
  return new Response('ok', { status: 200 });
};
