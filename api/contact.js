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

   DELIVERY: FORMSUBMIT
   Mail goes out through formsubmit.co, called SERVER TO SERVER from here. That
   placement is the whole security story: FormSubmit is normally wired up by
   pointing a <form action> straight at it, which publishes the destination
   address in the page source for every scraper on the internet. Called from
   this handler instead, the target never reaches the browser, and every check
   below still has to pass before FormSubmit is contacted at all — the endpoint
   is the gate it always was.

   The /ajax/ endpoint is used rather than the plain one because it answers
   with JSON. That is what lets a failed delivery stay a failure: the success
   state is only returned once FormSubmit has actually confirmed the send.

   No API key exists. FormSubmit authenticates by the target itself, which is
   why the target is an environment variable and not a literal in this file.

   SECRETS
   None are in this file and none reach the browser.
     FORMSUBMIT_TARGET     required. The address mail is delivered to, or the
                           random alias formsubmit.co issues after activation.
                           The alias is preferable: it delivers to the same
                           inbox without the address existing anywhere.
                           CONTACT_TO is accepted as a fallback name.
   Optional:
     ALLOWED_ORIGIN        defaults to the production host below
     RECAPTCHA_SECRET_KEY  turns on captcha verification; unset means off
     RECAPTCHA_MIN_SCORE   v3 score floor, defaults to 0.5

   ACTIVATION. FormSubmit will not deliver anything until the target has been
   confirmed once: the first submission triggers a confirmation mail to it, and
   the link in that mail has to be clicked. Until then this endpoint reports a
   delivery failure rather than a false success, which is correct — nothing has
   been delivered.
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
  TARGET: process.env.FORMSUBMIT_TARGET || process.env.CONTACT_TO,
});

/* reCAPTCHA v3, verified here and only here. A score the browser reports is
   worth nothing — the token is opaque and only Google can tell us what it is.

   FAIL-OPEN WHEN UNCONFIGURED, FAIL-CLOSED WHEN CONFIGURED.
   No RECAPTCHA_SECRET_KEY set means the feature is off and the other five
   layers stand on their own, so deploying this file does not silently break
   every form on the site the moment it lands. Once the secret IS set, a
   missing, malformed or low-scoring token is a 403. Those are the two
   behaviours you want; "configured but ignored" is the one you never do. */
async function verifyCaptcha(token, ip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;                       // feature off
  if (!token || typeof token !== 'string' || token.length > 4096) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== 'unknown') body.set('remoteip', ip);

  try {
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const j = await r.json();
    if (!j.success) return false;
    // v2 responses carry no score; only gate on it when Google sends one.
    const min = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
    if (typeof j.score === 'number' && j.score < min) return false;
    if (j.action && j.action !== 'contact') return false;
    return true;
  } catch (e) {
    // Google unreachable. Refusing every message because a third party is down
    // loses real enquiries; the other five layers still apply.
    console.error('[contact] captcha verify unreachable:', e.message);
    return true;
  }
}

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

/** Hand a flat set of named fields to FormSubmit and insist it confirms.
 *
 *  NO HTML IS BUILT HERE ANY MORE, and that is a security improvement rather
 *  than a loss. The old code assembled an HTML mail body and escaped every
 *  value on the way in; one missed call site was an injection into someone's
 *  mail client. FormSubmit renders the fields into its own table template, so
 *  there is no template here to inject into — the class of bug is gone rather
 *  than defended against.
 *
 *  _captcha:false because this is a server-to-server call: FormSubmit's own
 *  captcha is a browser challenge and there is no browser in this hop. The
 *  submission has already passed origin, rate limit, honeypot, timing,
 *  validation and duplicate checks before reaching this line.
 */
async function sendMail(cfg, subject, fields, replyTo) {
  const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(cfg.TARGET), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      _subject: subject,
      _replyto: replyTo,
      _template: 'table',
      _captcha: 'false',
      ...fields,
    }),
  });

  const raw = await res.text();
  let json = null;
  try { json = JSON.parse(raw); } catch (e) { /* handled below */ }

  // FormSubmit answers {"success":"true"} — a STRING, not a boolean — and 200s
  // some failures, so the status alone is not proof of delivery. Anything that
  // is not an explicit success is treated as a failure, which is what keeps the
  // success state honest.
  const ok = json && String(json.success) === 'true';
  if (!ok) throw new Error(`formsubmit ${res.status}: ${raw.slice(0, 200)}`);
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

  /* After validation, before anything that costs money. No point spending a
     round trip to Google on a submission that fails our own rules. */
  if (!(await verifyCaptcha(body.captcha, ip))) {
    hits.set(ip, seen.concat(now));
    return res.status(403).json({ ok: false, error: 'captcha', errors: { _form: t.generic } });
  }

  const v = result.values;

  /* The same person sending the same thing twice in ten minutes is a double
     click or an impatient retry, not two enquiries. Answered as success so the
     visitor sees the confirmation they expect. */
  const fingerprint = `${formId}|${v.email}|${v.phone}|${(v.message || '').slice(0, 120)}`;
  if (recent.has(fingerprint)) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  if (!cfg.TARGET) {
    console.error('[contact] FORMSUBMIT_TARGET is not set, cannot deliver');
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

  /* One flat object: FormSubmit renders each key as a row in its table, in the
     order given, so the field order here is the order in the mail. Underscore
     keys are FormSubmit's own directives and are added by sendMail. */
  const fields = {
    Name: v.name,
    Phone: v.phone,
    Email: v.email,
    Message: v.message || '-',
    ...meta,
  };

  try {
    await sendMail(cfg, `[${def.label}] ${v.name} - ${v.phone}`, fields, v.email);
  } catch (err) {
    // The provider's message can carry the target address; it goes to the
    // server log, never to the response.
    console.error('[contact] send failed:', err.message);
    return res.status(502).json({ ok: false, error: 'send', errors: { _form: t.generic } });
  }

  hits.set(ip, seen.concat(now));
  recent.set(fingerprint, now);
  return res.status(200).json({ ok: true });
};
