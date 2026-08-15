// Behaviour for the RFQ form on request-a-quote.html.
//
// Loaded from <head>, deliberately OUTSIDE the <x-dc> block. assets/support.js
// replaces <x-dc> with a React-rendered copy of its contents, which destroys
// the original nodes — so anything that binds directly to the form at parse
// time loses its listeners the moment the runtime renders. Wrapping that in
// DOMContentLoaded does not help either, because the re-render happens after.
//
// Everything here is therefore delegated to `document`, which survives any
// number of re-renders, and every lookup is scoped to the form rather than
// done by id.
//
// Two properties of the runtime shape the rest of this file. Both were
// measured on the live page, not assumed:
//
//   1. It renders more than once. The form appears at ~635ms and a second
//      pass resets field values at ~685ms, so anything applied once is
//      silently undone.
//   2. It drops valueless boolean attributes. `required` is present on five
//      fields in the source markup but never reaches the rendered DOM, so the
//      browser performs no constraint validation at all.

(function () {
  'use strict';

  var FORM_NAME = 'rfq';
  var LABEL_ATTR = 'data-default-label';
  var REQUIRED_FIELDS = ['product', 'destination', 'company', 'email', 'consent'];
  var WATCH_MS = 5000;

  function isRfqForm(el) {
    return !!el && el.tagName === 'FORM' && el.getAttribute('name') === FORM_NAME;
  }

  function rfqForm() {
    return document.querySelector('form[name="' + FORM_NAME + '"]');
  }

  function submitButton(form) {
    return form.querySelector('button[type="submit"]');
  }

  // ---- constraint validation ----------------------------------------------
  // Restores the `required` the runtime discarded. Without it the browser
  // validates nothing and a buyer can submit a completely blank enquiry, which
  // arrives with no company and no email — a lead nobody can reply to.
  function enforceRequired(form) {
    form = form || rfqForm();
    if (!form) return;
    for (var i = 0; i < REQUIRED_FIELDS.length; i++) {
      var field = form.elements[REQUIRED_FIELDS[i]];
      if (field && !field.required) field.required = true;
    }
  }

  // ---- submit --------------------------------------------------------------
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!isRfqForm(form)) return;

    // Re-assert here too: this is the last moment before the data leaves, and
    // it covers any render pass that landed after the watch window closed.
    enforceRequired(form);
    if (!form.checkValidity()) {
      e.preventDefault();
      form.reportValidity();
      return;
    }

    // Netlify uses the `subject` field as the subject line of the notification
    // email. Left at its default every alert reads the same, so the export desk
    // cannot triage without opening each one.
    var subject = form.elements.subject;
    if (subject) {
      var product = (form.elements.product && form.elements.product.value) || 'Enquiry';
      var company = (form.elements.company && form.elements.company.value) || 'Unknown company';
      subject.value = 'New RFQ — ' + product + ' — ' + company;
    }

    var btn = submitButton(form);
    if (btn) {
      if (!btn.getAttribute(LABEL_ATTR)) btn.setAttribute(LABEL_ATTR, btn.textContent);
      btn.disabled = true;
      btn.textContent = 'Sending…';
    }
  });

  // 'invalid' does not bubble, so delegation needs the capture phase. Restores
  // the button if a submit attempt is rejected by constraint validation.
  document.addEventListener('invalid', function (e) {
    var field = e.target;
    if (!field || !isRfqForm(field.form)) return;

    var btn = submitButton(field.form);
    if (btn && btn.disabled) {
      btn.disabled = false;
      btn.textContent = btn.getAttribute(LABEL_ATTR) || btn.textContent;
    }
  }, true);

  // ---- ?product= prefill ---------------------------------------------------
  // Product-page CTAs link here as e.g. request-a-quote.html?product=Pomegranate
  // so the buyer does not meet an empty dropdown at the moment of conversion.

  function requestedProduct() {
    var match = /[?&]product=([^&#]*)/.exec(window.location.search);
    if (!match) return '';
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (err) {
      return '';
    }
  }

  var buyerChoseProduct = false;
  document.addEventListener('change', function (e) {
    var field = e.target;
    if (field && field.name === 'product' && isRfqForm(field.form)) {
      buyerChoseProduct = true;
    }
  }, true);

  function applyPrefill(value) {
    var form = rfqForm();
    var select = form && form.elements.product;
    // Never override a choice the buyer has made, and never re-set a value
    // that is already in place.
    if (!select || buyerChoseProduct || select.value) return;

    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === value) {
        select.value = value;
        return;
      }
    }
    // An unrecognised ?product= leaves the dropdown untouched rather than
    // pushing a value the <select> cannot represent.
  }

  // ---- keep both applied across the runtime's render passes ----------------
  var wanted = requestedProduct();

  function reapply() {
    enforceRequired();
    if (wanted) applyPrefill(wanted);
  }

  reapply();

  var observer = new MutationObserver(reapply);
  observer.observe(document, { childList: true, subtree: true });

  // Bounded: long enough to outlast the runtime's render passes, short enough
  // not to watch the document for the life of the page. The submit handler
  // re-asserts `required` afterwards, so nothing depends on this staying open.
  setTimeout(function () {
    observer.disconnect();
    reapply();
  }, WATCH_MS);
})();
