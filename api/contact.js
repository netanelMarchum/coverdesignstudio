/* ==========================================================================
   The one form endpoint. Every form on the site posts here.
   --------------------------------------------------------------------------
   POST /api/contact   { form, name, phone, email, message, website, ts }
   → 200 { ok:true }
   → 400 { ok:false, errors:{field:msg} }
   → 429 { ok:false, error:'rate' }

   ORDER MATTERS. The checks below run cheapest-first and each one returns
   before the next runs, so a flood costs almost nothing: method, origin,
   size, rate, honeypot, timing, validation, duplicate, then — only then — the
   one operation that costs money and can be abused, sending mail.

   WHAT THE BROWSER CANNOT SKIP
   assets/js/validate.js is a copy of api/_lib/validate.js and exists to show
   errors instantly. It is not a gate. Everything it does is done again here
   against the raw body, so curl-ing this endpoint directly gets the same
   answers as the form does. There is no code path that trusts the client.

   SECRETS
   None are in this file and none reach the browser. Two environment variables,
   set in the Vercel dashboard:
     RESEND_API_KEY   the mail provider key
     CONTACT_TO       where submissions are delivered
   Optional:
     CONTACT_FROM     verified sender, defaults to onboarding@resend.dev
     ALLOWED_ORIGIN   defaults to the production host below
   ========================================================================== */

import './_lib/validate.js';

const V = globalThis.CDSValidate;

/* Read per request, not once at import.
   A module-level `const KEY = process.env.…` is captured when the instance cold-
   starts, so rotating a key or fixing a typo in the dashboard does nothing until
   every warm instance happens to recycle. Reading it here also means the config
   is observable to the tests, which is how the paths below get exercised. */
const config = () => ({
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'https://studiocoverdesign.com',
  TO: process.env.CONTACT_TO,
  FROM: process.env.CONTACT_FROM || 'Studio Cover Design <onboarding@resend.dev>',
  KEY: process.env.RESEND_API_KEY,
});

const MAX_BODY = 8 * 1024;        // a form this size cannot legitimately exceed it
const MIN_FILL_MS = 2500;         // nobody reads and types a form faster than this
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP_HOUR = 5;
const DUPLICATE_MS = 10 * 60 * 1000;

/* Rate-limit state.
   In memory, deliberately, and with a stated ceiling: a serverless instance is
   not shared, so a determined attacker spread across many cold starts gets more
   than five. It still stops the case this actually sees — one script hammering
   one warm instance — with no external dependency and nothing to provision.
   If this ever needs to be exact, the upgrade is Vercel KV or Upstash and the
   two Maps below become one store; nothing else in this file changes. */
const hits = new Map();       // ip → number[] timestamps
const recent = new Map();     // fingerprint → timestamp

function sweep(now) {
  for (const [k, arr] of hits) {
    const keep = arr.filter((t) => now - t < WINDOW_MS);
    if (keep.length) hits.set(k, keep); else hits.delete(k);
  }
  for (const [k, t] of recent) if (now - t > DUPLICATE_MS) recent.delete(k);
}

const clientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';

/** Escape for the HTML mail body. The submission is untrusted text and it is
 *  about to be rendered in someone's mail client. */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > MAX_BODY) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

async function sendMail(cfg, subject, html, text, replyTo) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: cfg.FROM, to: [cfg.TO], subject, html, text, reply_to: replyTo }),
  });
  if (!res.ok) throw new Error(`mail ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export default async function handler(req, res) {
  const cfg = config();
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method' });
  }

  /* Origin check. There is no session and no cookie here, so there is no CSRF
     token to verify — and a token stored in a static page would be readable by
     anyone anyway. What actually protects this endpoint is that it does nothing
     on the user's behalf: it has no session to ride. The origin check is the
     honest measure available, and it stops the endpoint being posted to from
     someone else's page. */
  const origin = req.headers.origin || '';
  if (origin && origin !== cfg.ALLOWED_ORIGIN && !/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return res.status(403).json({ ok: false, error: 'origin' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return res.status(413).json({ ok: false, error: 'body' });
  }

  const now = Date.now();
  sweep(now);

  const ip = clientIp(req);
  const seen = hits.get(ip) || [];
  if (seen.length >= MAX_PER_IP_HOUR) {
    return res.status(429).json({ ok: false, error: 'rate' });
  }

  const lang = body.lang === 'en' ? 'en' : 'he';
  const t = V.MSG[lang];

  /* Honeypot. A field that is off-screen and aria-hidden, so no human and no
     screen reader ever fills it. Answer 200: a bot that is told it failed
     learns to stop filling it. */
  if (V.tidy(body.website, 200)) {
    return res.status(200).json({ ok: true });
  }

  // Submitted faster than a person can read the form.
  const openedAt = Number(body.ts);
  if (Number.isFinite(openedAt) && now - openedAt < MIN_FILL_MS) {
    return res.status(200).json({ ok: true });
  }

  const formId = String(body.form || '').slice(0, 32);
  const def = V.FORMS[formId];
  if (!def) return res.status(400).json({ ok: false, errors: { _form: t.generic } });

  const result = V.form(formId, body, lang);
  if (!result.ok) {
    // A failed attempt still counts: validation is not a free retry loop.
    hits.set(ip, seen.concat(now));
    return res.status(400).json({ ok: false, errors: result.errors });
  }

  const v = result.values;

  /* The same person sending the same thing twice in ten minutes is a double
     click or an impatient retry, not two enquiries. Answered as success so the
     visitor sees the confirmation they expect. */
  const fingerprint = `${formId}|${v.email}|${v.phone}|${(v.message || '').slice(0, 120)}`;
  if (recent.has(fingerprint)) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  if (!cfg.KEY || !cfg.TO) {
    console.error('[contact] RESEND_API_KEY or CONTACT_TO is not set — cannot deliver');
    return res.status(500).json({ ok: false, error: 'config', errors: { _form: t.generic } });
  }

  const when = new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jerusalem',
  }).format(new Date(now));

  const meta = {
    'Form': `${def.label}  (${formId})`,
    'Submitted': `${when}  (Asia/Jerusalem)`,
    'Page': V.tidy(body.page, 200) || '—',
    'Referrer': V.tidy(body.referrer, 200) || '—',
    'Language': lang === 'en' ? 'English' : 'עברית',
    'IP': ip,
    'User agent': V.tidy(req.headers['user-agent'], 200) || '—',
  };

  const rows = [
    ['Name', v.name], ['Phone', v.phone], ['Email', v.email],
    ['Message', v.message || '—'],
  ];

  const html =
    `<div style="font:15px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#161316">` +
    `<h2 style="margin:0 0 4px;font-size:18px">${esc(def.label)}</h2>` +
    `<p style="margin:0 0 18px;color:#6b6b6b;font-size:13px">${esc(when)}</p>` +
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:640px">` +
    rows.map(([k, val]) =>
      `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;color:#6b6b6b;white-space:nowrap">${esc(k)}</td>` +
      `<td style="padding:8px 0;border-bottom:1px solid #eee"><strong>${esc(val)}</strong></td></tr>`).join('') +
    `</table>` +
    `<p style="margin:22px 0 6px;font-size:12px;color:#6b6b6b">Metadata</p>` +
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;color:#6b6b6b">` +
    Object.entries(meta).map(([k, val]) =>
      `<tr><td style="padding:3px 12px 3px 0;white-space:nowrap">${esc(k)}</td><td>${esc(val)}</td></tr>`).join('') +
    `</table></div>`;

  const text =
    rows.map(([k, val]) => `${k}: ${val}`).join('\n') + '\n\n---\n' +
    Object.entries(meta).map(([k, val]) => `${k}: ${val}`).join('\n');

  try {
    await sendMail(cfg, `[${def.label}] ${v.name} — ${v.phone}`, html, text, v.email);
  } catch (err) {
    // The provider's message can carry the key or the recipient; it goes to the
    // server log, never to the response.
    console.error('[contact] send failed:', err.message);
    return res.status(502).json({ ok: false, error: 'send', errors: { _form: t.generic } });
  }

  hits.set(ip, seen.concat(now));
  recent.set(fingerprint, now);
  return res.status(200).json({ ok: true });
};
