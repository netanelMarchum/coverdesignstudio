/* Public runtime config for the contact forms.
   --------------------------------------------------------------------------
   A reCAPTCHA SITE key is public by design — it is sent to every visitor and
   is useless on its own. The SECRET key is what verifies a token, and it lives
   only in RECAPTCHA_SECRET_KEY on the server. Never put it here.

   Leave this empty and the forms work exactly as they do today: the endpoint
   still has origin checking, rate limiting, the honeypot, the timing gate,
   full server-side validation and duplicate detection. Fill it in and
   reCAPTCHA becomes a sixth layer on top.

   Both halves have to be set together. A site key here with no secret on the
   server means tokens are minted and never checked; a secret on the server
   with nothing here means every submission is rejected as unverified. */
window.RECAPTCHA_SITE_KEY = '';
