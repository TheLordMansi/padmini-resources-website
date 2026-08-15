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

  // Returns true once the form exists — i.e. there is no longer any reason to
  // keep watching, whether or not a value was actually applied.
  function applyPrefill(value) {
    var select = document.querySelector('form[name="' + FORM_NAME + '"] select[name="product"]');
    if (!select) return false;

    // Never override a choice the buyer has already made.
    if (!select.value) {
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
          select.value = value;
          break;
        }
      }
      // An unrecognised ?product= leaves the dropdown untouched rather than
      // pushing a value the <select> cannot represent.
    }
    return true;
  }

  var wanted = requestedProduct();
  if (wanted && !applyPrefill(wanted)) {
    var observer = new MutationObserver(function () {
      if (applyPrefill(wanted)) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    // Never observe indefinitely, even if the form never renders.
    setTimeout(function () { observer.disconnect(); }, 10000);
  }
})();
