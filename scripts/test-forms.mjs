// Exercises the shared validator against every case in the brief.
// Run: npm run test:forms   (also runs inside `npm run verify`)

import '../api/_lib/validate.js';
const V = globalThis.CDSValidate;

let pass = 0;
const fails = [];

function check(label, got, want) {
  if (got === want) { pass++; return; }
  fails.push(`${label}\n      expected ${want ? 'ACCEPT' : 'REJECT'}, got ${got ? 'ACCEPT' : 'REJECT'}`);
}
const ok = (label, fn, input) => check(label, fn(input, 'he').ok, true);
const no = (label, fn, input) => check(label, fn(input, 'he').ok, false);

/* ---- phone: exactly 10 digits, Israeli mobile, 05 prefix ---------------- */
ok('phone plain', V.phone, '0501234567');
ok('phone hyphens', V.phone, '052-123-4567');
ok('phone spaces', V.phone, '054 123 4567');
ok('phone +972', V.phone, '+972501234567');
ok('phone +972 spaced', V.phone, '+972 50 123 4567');
ok('phone 00972', V.phone, '00972521234567');
ok('phone no trunk zero', V.phone, '972541234567');
ok('phone padded', V.phone, '   0581234567   ');
no('phone 9 digits', V.phone, '050123456');
no('phone 11 digits', V.phone, '05012345678');
no('phone landline 03', V.phone, '0312345678');
no('phone 04 prefix', V.phone, '0412345678');
no('phone letters', V.phone, '05012abcde');
no('phone hebrew letters', V.phone, 'טלפון שלי');
no('phone all same digit', V.phone, '0500000000');
no('phone repeated tail', V.phone, '0511111111');
no('phone empty', V.phone, '');
no('phone spaces only', V.phone, '     ');
no('phone symbols', V.phone, '!!!!!!!!!!');

/* ---- email -------------------------------------------------------------- */
ok('email simple', V.email, 'a@b.co');
ok('email normal', V.email, 'netanel@studiocoverdesign.com');
ok('email plus tag', V.email, 'user+tag@gmail.com');
ok('email subdomain', V.email, 'x@mail.example.co.il');
ok('email trims + lowercases domain', V.email, '  User@GMAIL.COM  ');
no('email no at', V.email, 'not-an-email');
no('email no tld', V.email, 'a@b');
no('email double dot', V.email, 'a@b..com');
no('email leading dot domain', V.email, 'a@.com');
no('email space inside', V.email, 'a b@c.com');
no('email numeric tld', V.email, 'a@b.c0m');
no('email disposable', V.email, 'x@mailinator.com');
no('email disposable 2', V.email, 'x@10minutemail.com');
no('email empty', V.email, '');
no('email injection', V.email, 'a@b.com,c@d.com');

check('email domain lowercased', V.email('User@GMAIL.COM', 'he').value, 'User@gmail.com');

/* ---- name --------------------------------------------------------------- */
ok('name hebrew', V.name, 'נתנאל כהן');
ok('name english', V.name, 'Netanel Cohen');
ok('name hyphen', V.name, 'Anne-Marie O’Neill');
ok('name geresh', V.name, "ר׳ יעקב");
ok('name gershayim', V.name, 'צה״ל');
ok('name trims', V.name, '   דוד   לוי   ');
no('name empty', V.name, '');
no('name digits only', V.name, '12345');
no('name with digits', V.name, 'David 123');
no('name single char', V.name, 'א');
no('name symbols', V.name, '!!!@@@###');
no('name mashing', V.name, 'aaaaaaaa');
no('name html', V.name, '<script>alert(1)</script>');
no('name url', V.name, 'http://spam.ru');

check('name collapses spaces', V.name('  דוד   לוי  ', 'he').value, 'דוד לוי');

/* ---- message ------------------------------------------------------------ */
ok('message empty (optional)', (v, l) => V.message(v, l, false), '');
ok('message normal', (v, l) => V.message(v, l, false), 'רוצה עטיפה לסינגל חדש');
ok('message one link', (v, l) => V.message(v, l, false), 'the track: https://open.spotify.com/track/x');
no('message two links', (v, l) => V.message(v, l, false), 'http://a.com and http://b.com');
no('message html', (v, l) => V.message(v, l, false), 'hi <img src=x onerror=alert(1)>');
no('message script url', (v, l) => V.message(v, l, false), 'javascript:alert(1)');
no('message handler', (v, l) => V.message(v, l, false), 'x onclick=alert(1)');
no('message too long', (v, l) => V.message(v, l, false), 'a'.repeat(1200));

/* ---- whole-form + spam shapes ------------------------------------------- */
const good = { name: 'נתנאל כהן', phone: '052-123-4567', email: 'a@b.com', message: 'שלום' };
for (const id of Object.keys(V.FORMS)) {
  check(`form ${id} accepts a valid submission`, V.form(id, good, 'he').ok, true);
}
check('unknown form id rejected', V.form('nope', good, 'he').ok, false);
check('empty submission rejected', V.form('contact', {}, 'he').ok, false);
check('partial submission rejected', V.form('contact', { name: 'נתנאל כהן' }, 'he').ok, false);

const spam = V.form('contact', { name: 'aaaaaaa', phone: '111', email: 'x@mailinator.com', message: 'http://a.ru http://b.ru' }, 'he');
check('spam submission rejected', spam.ok, false);
check('spam reports every bad field', Object.keys(spam.errors).length, 4);

// The message a visitor sees must never be blank.
for (const id of Object.keys(V.FORMS)) {
  const r = V.form(id, {}, 'he');
  check(`form ${id} returns a message for every error`,
    Object.values(r.errors).every((m) => typeof m === 'string' && m.length > 4), true);
}
for (const lang of ['he', 'en']) {
  check(`${lang} messages all present`,
    Object.values(V.MSG[lang]).every((m) => typeof m === 'string' && m.length > 4), true);
}

/* ---- report -------------------------------------------------------------- */
if (fails.length) {
  console.error(`form tests FAILED — ${fails.length} of ${pass + fails.length}\n`);
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`form tests ok — ${pass} assertions across ${Object.keys(V.FORMS).length} forms`);
