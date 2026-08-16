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
    he: { sending: 'שולח…', thanks: 'תודה רבה!', sent: 'ההודעה נשלחה בהצלחה.', retry: 'שליחה חוזרת' },
    en: { sending: 'Sending…', thanks: 'Thank you!', sent: 'Your message has been sent successfully.', retry: 'Send another' },
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

  function bind(form) {
    const formId = form.getAttribute('data-form');
    if (!formId || !V.FORMS[formId]) return;

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
