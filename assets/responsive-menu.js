/**
 * Padmini Resources — mobile nav toggle.
 *
 * Two constraints from the stack shape this file:
 *
 *  1. dc-runtime fetches React from unpkg and only then mounts the page into
 *     #dc-root, so the header does not exist at DOMContentLoaded. Anything
 *     that queries for the button at load time finds nothing. Every listener
 *     here is therefore delegated to `document`, which exists immediately and
 *     keeps working no matter when (or how often) React renders.
 *
 *  2. React owns every node inside #dc-root and will discard direct DOM
 *     mutations on re-render. The open/closed flag therefore lives as a class
 *     on <html> — outside the React root — so it survives re-renders.
 *
 * No dependencies, no build step, runs before or after React with equal
 * success.
 */
(function () {
  'use strict';

  var OPEN_CLASS = 'pr-nav-open';
  // Must match the breakpoint in responsive.css section 3 that reveals the
  // burger and turns the nav into a dropdown. If they disagree, resizing can
  // strand the panel open with no visible control to close it.
  var MOBILE_QUERY = '(max-width: 1024px)';
  var BURGER_SELECTOR = '[data-pr-burger]';
  var HEADER_SELECTOR = 'header[data-screen-label="Header"]';
  var NAV_LINK_SELECTOR = HEADER_SELECTOR + ' nav a';

  var root = document.documentElement;

  function closestFrom(target, selector) {
    if (!target || typeof target.closest !== 'function') return null;
    return target.closest(selector);
  }

  function isOpen() {
    return root.classList.contains(OPEN_CLASS);
  }

  function setOpen(open) {
    if (open) root.classList.add(OPEN_CLASS);
    else root.classList.remove(OPEN_CLASS);

    // Re-synced on every toggle rather than held in a variable, because a
    // React re-render can replace the button element underneath us.
    var burgers = document.querySelectorAll(BURGER_SELECTOR);
    for (var i = 0; i < burgers.length; i++) {
      burgers[i].setAttribute('aria-expanded', open ? 'true' : 'false');
      burgers[i].setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  }

  document.addEventListener('click', function (e) {
    var burger = closestFrom(e.target, BURGER_SELECTOR);
    if (burger) {
      e.preventDefault();
      setOpen(!isOpen());
      return;
    }

    if (!isOpen()) return;

    // Navigating to a same-page anchor leaves the panel covering the target,
    // so close on any menu link — in-page or cross-page.
    if (closestFrom(e.target, NAV_LINK_SELECTOR)) {
      setOpen(false);
      return;
    }

    // Tap anywhere outside the header dismisses the panel.
    if (!closestFrom(e.target, HEADER_SELECTOR)) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.keyCode !== 27) return;
    if (!isOpen()) return;
    setOpen(false);
    var burger = document.querySelector(BURGER_SELECTOR);
    if (burger && typeof burger.focus === 'function') burger.focus();
  });

  // Rotating to landscape or resizing past the breakpoint hides the button
  // that would otherwise be the only way to close the panel.
  if (typeof window.matchMedia === 'function') {
    var mq = window.matchMedia(MOBILE_QUERY);
    var onBreakpointChange = function () {
      if (!mq.matches && isOpen()) setOpen(false);
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onBreakpointChange);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(onBreakpointChange); // Safari < 14
    }
  }
})();
