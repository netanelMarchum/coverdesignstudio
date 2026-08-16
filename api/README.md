# Form handling

One endpoint, one validator, five forms.

```
api/contact.js        the endpoint — every form posts here
api/_lib/validate.js  the rules (source of truth)
assets/js/validate.js generated copy of the above, for the browser
assets/js/forms.js    the client controller — binds every form[data-form]
```

## Before it can send mail

Two environment variables in **Vercel → Project → Settings → Environment Variables**.
Nothing else needs to change, and neither value ever reaches the browser.

| Variable | Required | What it is |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | API key from [resend.com](https://resend.com) (free tier covers this volume) |
| `CONTACT_TO` | yes | where submissions are delivered, e.g. `office@studiocoverdesign.com` |
| `CONTACT_FROM` | no | verified sender. Defaults to Resend's sandbox address, which only delivers to the account owner — set a real one once your domain is verified |
| `ALLOWED_ORIGIN` | no | defaults to `https://studiocoverdesign.com` |

Until `RESEND_API_KEY` and `CONTACT_TO` are set the endpoint answers `500` and
logs why. Everything before the send — validation, rate limiting, spam checks —
runs regardless, so the failure is loud and local rather than silent.

Any provider works: `sendMail()` in `api/contact.js` is the only function that
knows about Resend. Swapping to Postmark or SES is that one function.

## Adding a form

1. Add a row to `FORMS` in `api/_lib/validate.js`.
2. `npm run build:forms`
3. Give the `<form>` a `data-form="<id>"` and a honeypot input.

That is the whole procedure. Validation, sanitisation, rate limiting, duplicate
detection, mail and error handling are already shared — there is no per-form
code anywhere.

## Checks

```
npm run test:forms      75 assertions on the validator
npm run test:endpoint   26 assertions driving the real handler
npm run verify          both, plus lint, types, design system, build
```

`npm run check:design` also fails the build if `assets/js/validate.js` has
drifted from `api/_lib/validate.js`, if a form is unregistered or missing its
honeypot, or if anything that looks like an API key appears in browser code.

## What is deliberately not here

**No CAPTCHA.** The honeypot, the fill-time trap, the per-IP rate limit and
duplicate detection cover the traffic a site this size gets, and every CAPTCHA
costs real conversions. If genuine spam gets through, add Turnstile — it is
invisible for almost all visitors, unlike reCAPTCHA.

**No CSRF token.** There is no session and no cookie, so there is nothing to
ride: the endpoint acts on nobody's behalf. A token embedded in a static page
would be readable by anyone anyway. The origin check is what actually applies.

**Rate limiting is per-instance.** Serverless instances do not share memory, so
a spread-out attacker gets more than five per hour. It stops the realistic case
— one script hammering one warm instance — with nothing to provision. If it ever
needs to be exact, move the two `Map`s to Vercel KV; nothing else changes.
