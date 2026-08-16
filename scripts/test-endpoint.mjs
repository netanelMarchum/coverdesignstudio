// Drives the real api/contact.js handler with fake req/res objects, so the
// anti-abuse layers are exercised rather than assumed. Mail sending is stubbed
// — the one thing that needs live credentials — and everything up to it is real.
//
// Run: npm run test:endpoint

import handler from '../api/contact.js';

process.env.ALLOWED_ORIGIN = 'https://studiocoverdesign.com';
process.env.FORMSUBMIT_TARGET = 'office@example.com';

// Stub the provider call, answering exactly as formsubmit.co/ajax does —
// including `success` being the STRING "true", which is what the handler has
// to cope with. Also proves the target never appears in a response.
let sent = [];
let providerReply = { status: 200, body: JSON.stringify({ success: 'true' }) };
globalThis.fetch = async (url, opts) => {
  sent.push({ url, body: JSON.parse(opts.body) });
  return {
    ok: providerReply.status < 400,
    status: providerReply.status,
    text: async () => providerReply.body,
  };
};

function call(body, { origin = 'https://studiocoverdesign.com', method = 'POST', ip = '1.2.3.4' } = {}) {
  const req = {
    method,
    headers: { origin, 'x-forwarded-for': ip, 'user-agent': 'test' },
    body,
    socket: { remoteAddress: ip },
    on() {},
  };
  let status = 200;
  const res = {
    setHeader() {},
    status(s) { status = s; return res; },
    json(payload) { res.payload = payload; return res; },
  };
  return handler(req, res).then(() => ({ status, body: res.payload }));
}

const OLD = Date.now() - 60_000;   // opened a minute ago: past the timing trap
const good = (over = {}) => ({
  form: 'contact', lang: 'he', ts: OLD,
  name: 'נתנאל כהן', phone: '052-123-4567', email: 'a@b.com', message: 'שלום',
  ...over,
});

let pass = 0;
const fails = [];
const check = (label, got, want) => {
  if (got === want) pass++;
  else fails.push(`${label} — expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
};

const r = [];
r.push(['GET is refused', (await call(good(), { method: 'GET' })).status, 405]);
r.push(['foreign origin refused', (await call(good(), { origin: 'https://evil.example' })).status, 403]);
r.push(['unknown form id refused', (await call(good({ form: 'nope' }), { ip: '9.9.9.1' })).status, 400]);
r.push(['bad phone refused', (await call(good({ phone: '123' }), { ip: '9.9.9.2' })).status, 400]);
r.push(['bad email refused', (await call(good({ email: 'nope' }), { ip: '9.9.9.3' })).status, 400]);
r.push(['empty body refused', (await call({ form: 'contact', ts: OLD }, { ip: '9.9.9.4' })).status, 400]);

// The honeypot and the timing trap answer 200 and send nothing — a bot that is
// told it failed just learns to stop tripping the trap.
sent = [];
r.push(['honeypot answers ok', (await call(good({ website: 'x' }), { ip: '9.9.9.5' })).status, 200]);
r.push(['honeypot sends no mail', sent.length, 0]);

sent = [];
r.push(['too-fast answers ok', (await call(good({ ts: Date.now() }), { ip: '9.9.9.6' })).status, 200]);
r.push(['too-fast sends no mail', sent.length, 0]);

// A real submission.
sent = [];
const okRes = await call(good(), { ip: '5.5.5.1' });
r.push(['valid submission accepted', okRes.status, 200]);
r.push(['valid submission sends one mail', sent.length, 1]);
r.push(['mail goes to the configured target', /formsubmit\.co\/ajax\/office%40example\.com$/.test(sent[0]?.url || ''), true]);
r.push(['reply-to is the enquirer', sent[0]?.body._replyto, 'a@b.com']);
r.push(['subject names the form', /Contact — Home/.test(sent[0]?.body._subject || ''), true]);
r.push(['provider captcha disabled for server-to-server', sent[0]?.body._captcha, 'false']);
r.push(['phone normalised in mail', sent[0]?.body.Phone, '0521234567']);
r.push(['form id recorded', /contact/.test(sent[0]?.body.Form || ''), true]);
r.push(['timestamp recorded', /Jerusalem/.test(sent[0]?.body.Submitted || ''), true]);

// Duplicate: same payload, same person, inside the window.
sent = [];
const dup = await call(good(), { ip: '5.5.5.1' });
r.push(['duplicate answers ok', dup.status, 200]);
r.push(['duplicate flagged', dup.body.duplicate, true]);
r.push(['duplicate sends no second mail', sent.length, 0]);

// Rate limit: five per IP per hour, and failed attempts count.
let last;
for (let i = 0; i < 8; i++) {
  last = await call(good({ message: 'x' + i }), { ip: '7.7.7.7' });
}
r.push(['rate limit trips', last.status, 429]);

// Injection attempts are rejected outright rather than sanitised through.
r.push(['script in name refused', (await call(good({ name: '<script>alert(1)</script>' }), { ip: '9.9.9.7' })).status, 400]);
r.push(['html in message refused', (await call(good({ message: '<img src=x onerror=alert(1)>' }), { ip: '9.9.9.8' })).status, 400]);

// The destination address must never reach the caller.
const leak = JSON.stringify(okRes.body) + JSON.stringify(dup.body);
r.push(['no target address in any response', /office@example\.com/.test(leak), false]);

// A provider failure must stay a failure. This is the one that stops a broken
// mailbox, or an unactivated FormSubmit target, from showing a success state.
providerReply = { status: 200, body: JSON.stringify({ success: 'false', message: 'not activated' }) };
const notActivated = await call(good({ email: 'z@b.com' }), { ip: '9.9.9.20' });
r.push(['provider refusal is not a success', notActivated.status, 502]);
r.push(['provider refusal reports no ok', notActivated.body.ok, false]);
providerReply = { status: 500, body: 'upstream boom' };
const upstream = await call(good({ email: 'y@b.com' }), { ip: '9.9.9.21' });
r.push(['provider 500 is not a success', upstream.status, 502]);
providerReply = { status: 200, body: JSON.stringify({ success: 'true' }) };

for (const [label, got, want] of r) check(label, got, want);

if (fails.length) {
  console.error(`endpoint tests FAILED — ${fails.length} of ${pass + fails.length}\n`);
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`endpoint tests ok — ${pass} assertions`);
