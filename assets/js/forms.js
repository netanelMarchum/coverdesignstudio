/* ==========================================================================
   The form controller. One script, every form on the site.
   --------------------------------------------------------------------------
   A form opts in with data-form="<id>", where the id is a key in the FORMS
   table in validate.js. That table is shared with the server, so a form the
   server does not know about cannot be submitted by accident.

   This file does presentation only: when to show an error, what the button
   says, what replaces the form on success. The rules themselves live in
   CDSValidate and the decision lives on the server. If this script is disabled,
   blocked or edited in DevTools, the endpoint behaves exactly the same.
   ========================================================================== */
(function () {
  'use strict';

  if (!window.CDSValidate) return;      // validator failed to load: leave the form alone
  const V = window.CDSValidate;

  const isEn = () => (document.documentElement.lang || 'he').toLowerCase().indexOf('en') === 0;
  const T = () => (isEn() ? V.MSG.en : V.MSG.he);

  const COPY = {
    he: { sending: 'שולח…', thanks: 'תודה רבה!', sent: 'הטופס נשלח בהצלחה', retry: 'שליחה חוזרת',
          verify: 'האימות נכשל. נא לרענן את העמוד ולנסות שוב.' },
    en: { sending: 'Sending…', thanks: 'Thank you!', sent: 'The form was sent successfully', retry: 'Send another',
          verify: 'Verification failed. Please refresh the page and try again.' },
  };
  const C = () => (isEn() ? COPY.en : COPY.he);

  /* ---- inline errors --------------------------------------------------
     The message is created next to the field it belongs to and wired with
     aria-describedby, so a screen reader announces the reason rather than just
     "invalid". role=alert makes it speak the moment it appears. */
  function errorNode(field) {
    const id = (field.name || 'f') + '-err-' + Math.random().toString(36).slice(2, 7);
    let el = field.parentNode.querySelector('.field-err');
    if (!el) {
      el = document.createElement('p');
      el.className = 'field-err';
      el.setAttribute('role', 'alert');
      el.id = id;
      field.insertAdjacentElement('afterend', el);
    }
    return el;
  }

  function setError(field, msg) {
    if (!field) return;
    const el = errorNode(field);
    el.textContent = msg;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', el.id);
    field.classList.add('is-invalid');
  }

  function clearError(field) {
    if (!field) return;
    const el = field.parentNode.querySelector('.field-err');
    if (el) el.textContent = '';
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    field.classList.remove('is-invalid');
  }

  /* ---- the success state ----------------------------------------------
     Replaces the form rather than sitting above it: leaving a filled-in form on
     screen after a successful send is what makes people submit twice. */
  function success(form) {
    const c = C();
    const box = document.createElement('div');
    box.className = 'form-done';
    box.setAttribute('role', 'status');
    box.innerHTML =
      '<svg class="form-done-tick" viewBox="0 0 52 52" aria-hidden="true" focusable="false">' +
      '<circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 15-16"/></svg>' +
      '<p class="form-done-title"></p><p class="form-done-note"></p>';
    box.querySelector('.form-done-title').textContent = c.thanks;
    box.querySelector('.form-done-note').textContent = c.sent;

    form.replaceWith(box);
    // Move focus to the confirmation so keyboard and screen-reader users are
    // told the send worked instead of being left on a control that vanished.
    box.tabIndex = -1;
    box.focus({ preventScroll: true });
  }

  /* ---- reCAPTCHA v3, loaded on demand ---------------------------------
     Google's script is ~200KB and this site's forms sit at the bottom of long
     pages, so loading it in the head would tax every visitor for a request
     most of them never make. It is fetched the first time someone touches a
     field instead: by the time the submit button is pressed it has long since
     arrived, and a visitor who only reads the page never pays for it.

     Invisible (v3), not the checkbox: the brief asks not to interrupt
     legitimate users, and there is no puzzle to style into the design system.

     Every failure path here resolves to null rather than throwing. The token
     is one layer of six, and a blocked Google CDN must not be able to take the
     contact form down; the server decides what a missing token means. */
  const SITE_KEY = (window.RECAPTCHA_SITE_KEY || '').trim();
  let captchaLoad = null;

  function loadCaptcha() {
    if (captchaLoad) return captchaLoad;
    if (!SITE_KEY) return (captchaLoad = Promise.resolve(null));
    captchaLoad = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(SITE_KEY);
      s.async = true;
      s.defer = true;
      s.onload = () => {
        if (window.grecaptcha && window.grecaptcha.ready) {
          window.grecaptcha.ready(() => resolve(window.grecaptcha));
        } else resolve(null);
      };
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
    return captchaLoad;
  }

  async function captchaToken() {
    try {
      const g = await loadCaptcha();
      if (!g) return null;
      return await g.execute(SITE_KEY, { action: 'contact' });
    } catch (e) { return null; }
  }

  function bind(form) {
    const formId = form.getAttribute('data-form');
    if (!formId || !V.FORMS[formId]) return;

    // One-shot warm-up. focusin covers keyboard and pointer alike.
    form.addEventListener('focusin', loadCaptcha, { once: true });

    const fields = V.FORMS[formId].fields;
    const btn = form.querySelector('[type="submit"]');
    const btnLabel = btn ? btn.textContent : '';
    const summary = form.querySelector('.form-msg');
    const openedAt = Date.now();
    let busy = false;

    const el = (n) => form.querySelector('[name="' + n + '"]');

    // Validate a field once it has been left, then live while it is being
    // corrected — not on every keystroke from empty, which reads as nagging.
    fields.forEach((n) => {
      const f = el(n);
      if (!f) return;
      f.addEventListener('blur', () => {
        if (!f.value.trim() && !f.required) return;
        const r = V[n](f.value, isEn() ? 'en' : 'he', n !== 'message');
        r.ok ? clearError(f) : setError(f, r.msg);
      });
      f.addEventListener('input', () => { if (f.classList.contains('is-invalid')) clearError(f); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;                       // no double submits while in flight

      const lang = isEn() ? 'en' : 'he';
      const data = { form: formId, lang, ts: openedAt, page: location.pathname, referrer: document.referrer };
      fields.forEach((n) => { const f = el(n); data[n] = f ? f.value : ''; });
      const hp = form.querySelector('.hp-field, .hp');
      data.website = hp ? hp.value : '';

      const check = V.form(formId, data, lang);
      fields.forEach((n) => (check.errors[n] ? setError(el(n), check.errors[n]) : clearError(el(n))));
      if (!check.ok) {
        const first = fields.map(el).find((f) => f && f.classList.contains('is-invalid'));
        if (first) first.focus();
        return;
      }

      busy = true;
      if (summary) { summary.textContent = ''; summary.removeAttribute('data-state'); }
      if (btn) { btn.disabled = true; btn.classList.add('is-loading'); btn.textContent = C().sending; }

      try {
        // Minted per submission, immediately before the request: v3 tokens
        // expire after two minutes, so one taken at page load would be stale
        // by the time a real person finished typing.
        const token = await captchaToken();
        if (token) data.captcha = token;

        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const out = await res.json().catch(() => ({}));

        if (res.ok && out.ok) { success(form); return; }

        if (out.errors) {
          fields.forEach((n) => (out.errors[n] ? setError(el(n), out.errors[n]) : clearError(el(n))));
        }
        if (res.status === 403 && out.error === 'captcha') {
          if (summary) { summary.textContent = C().verify; summary.setAttribute('data-state', 'err'); }
          return;
        }
        const msg = res.status === 429
          ? (lang === 'en' ? 'Too many messages. Please try again later.' : 'נשלחו יותר מדי הודעות. נא לנסות שוב מאוחר יותר.')
          : (out.errors && out.errors._form) || T().generic;
        if (summary) { summary.textContent = msg; summary.setAttribute('data-state', 'err'); }
      } catch (err) {
        if (summary) { summary.textContent = T().generic; summary.setAttribute('data-state', 'err'); }
      } finally {
        busy = false;
        if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); btn.textContent = btnLabel; }
      }
    });
  }

  document.querySelectorAll('form[data-form]').forEach(bind);
})();
