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

(function () {
  'use strict';

  var FORM_NAME = 'rfq';
  var LABEL_ATTR = 'data-default-label';

  function isRfqForm(el) {
    return !!el && el.tagName === 'FORM' && el.getAttribute('name') === FORM_NAME;
  }

  function submitButton(form) {
    return form.querySelector('button[type="submit"]');
  }

  // ---- notification subject ------------------------------------------------
  // Netlify uses the `subject` field as the subject line of the notification
  // email. Left at its default every alert reads the same, so the export desk
  // cannot triage without opening each one.
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!isRfqForm(form) || !form.checkValidity()) return;

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
  // The <select> does not exist when this file runs, so watch for it.

  function requestedProduct() {
    var match = /[?&]product=([^&#]*)/.exec(window.location.search);
    if (!match) return '';
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (err) {
      return '';
    }
  }

  // The runtime renders this page more than once. Measured on the live site:
  // the <select> appears at ~635ms, and a second pass resets its value at
  // ~685ms. A one-shot prefill is therefore applied and then silently undone,
  // so keep re-applying across a bounded window rather than stopping at the
  // first success.

  var buyerChoseProduct = false;
  document.addEventListener('change', function (e) {
    var field = e.target;
    if (field && field.name === 'product' && isRfqForm(field.form)) {
      buyerChoseProduct = true;
    }
  }, true);

  function applyPrefill(value) {
    var select = document.querySelector('form[name="' + FORM_NAME + '"] select[name="product"]');
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

  var wanted = requestedProduct();
  if (wanted) {
    applyPrefill(wanted);
    var observer = new MutationObserver(function () { applyPrefill(wanted); });
    observer.observe(document, { childList: true, subtree: true });
    // Bounded: long enough to outlast the runtime's render passes, short
    // enough not to watch the document for the life of the page.
    setTimeout(function () { observer.disconnect(); }, 5000);
  }
})();
