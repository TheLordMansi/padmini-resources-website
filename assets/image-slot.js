// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — read-only image placeholder.
 *
 * Displays the photo saved for the slot's id in the image-slots.state.json
 * sidecar (fetched once per page). There is no upload, browse, drag-and-drop
 * or reframe behaviour: visitors never get a file picker, and the component
 * never writes anything back.
 *
 * Attributes:
 *   id           Key into image-slots.state.json. Every slot needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape`.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover the saved crop (s, x, y) from the sidecar applies.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.
 *   src          Optional fallback image URL, shown when the sidecar has no
 *                photo for this id.
 *   credit       Optional attribution text, shown only while src is displayed.
 *   credit-href  Optional http(s) link for the credit overlay.
 */
/* END USAGE */

(() => {
  const STATE_FILE = 'image-slots.state.json';

  // ── Shared sidecar store (read-only) ────────────────────────────────────
  const subs = new Set();
  let slots = {};
  let loadP = null;

  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && typeof j === 'object') slots = j; })
      .catch(() => {})
      .then(() => { subs.forEach((fn) => fn()); });
    return loadP;
  }

  const S_MAX = 5;
  const clampS = (s) => Math.max(1, Math.min(S_MAX, s));

  // Pre-reframe sidecars stored a bare data-URL string; newer ones store
  // {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? { u: v, s: 1, x: 0, y: 0 } : v;
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet =
    ':host{display:inline-block;position:relative;vertical-align:top;' +
    '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' +
    '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
    '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' +
    '  -webkit-user-drag:none;user-select:none}' +
    '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
    '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' +
    '  user-select:none}' +
    '.empty svg{opacity:.45}' +
    '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' +
    '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25)}' +
    ':host([data-filled]) .ring{display:none}' +
    '.credit{position:absolute;left:6px;bottom:6px;max-width:calc(100% - 12px);display:none;' +
    '  padding:3px 7px;border-radius:5px;background:rgba(0,0,0,.55);color:#fff;' +
    '  font:10px/1.2 system-ui,-apple-system,sans-serif;text-decoration:none;' +
    '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(6px)}' +
    '.credit[href]:hover{background:rgba(0,0,0,.8);text-decoration:underline}' +
    ':host([data-filled][data-credit]) .credit{display:block}';

  const icon =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' +
    '<path d="m21 15-5-5L5 21"/></svg>';

  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id', 'credit', 'credit-href'];
    }

    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>' + stylesheet + '</style>' +
        '<div class="frame" part="frame">' +
        // lazy + async decode: several slots point at multi-hundred-KB images,
        // and decoding them all on load stalls the main thread on a phone.
        '  <img part="image" alt="" draggable="false" loading="lazy" decoding="async" style="display:none">' +
        '  <div class="empty" part="empty">' + icon + '<div class="cap"></div></div>' +
        '  <div class="ring" part="ring"></div>' +
        '</div>' +
        // Outside .frame so the frame's overflow/clip-path can't cut it off.
        '<a class="credit" part="credit" target="_blank" rel="noopener noreferrer"></a>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._credit = root.querySelector('.credit');
      this._view = { s: 1, x: 0, y: 0 };
      this._subFn = () => this._render();
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
    }

    connectedCallback() {
      subs.add(this._subFn);
      // Re-render on size change so the crop tracks the frame aspect.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }

    disconnectedCallback() {
      subs.delete(this._subFn);
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
    }

    attributeChangedCallback() { if (this.shadowRoot) this._render(); }

    // Cover-baseline geometry. Null until the img has loaded or when the slot
    // has no layout box (ResizeObserver fires 0×0 under display:none).
    _geom() {
      const iw = this._img.naturalWidth, ih = this._img.naturalHeight;
      const fw = this.clientWidth, fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return { iw, ih, fw, fh, base: Math.max(fw / iw, fh / ih) };
    }

    _clampView() {
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }

    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline with the saved crop; all frame-% so a responsive
      // resize keeps the same framing.
      const k = g.base * this._view.s;
      this._img.style.width = (g.iw * k / g.fw * 100) + '%';
      this._img.style.height = (g.ih * k / g.fh * 100) + '%';
      this._img.style.left = (50 + this._view.x) + '%';
      this._img.style.top = (50 + this._view.y) + '%';
      this._img.style.objectFit = '';
    }

    _render() {
      // Shape / mask.
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';
      else if (shape === 'pill') radius = '9999px';
      else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Only accept data:image/ URLs from the sidecar; `src` is author-controlled.
      let stored = this.id ? getSlot(this.id) : null;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      const userUrl = (stored && stored.u) || null;
      const url = userUrl || srcAttr;
      this._view = {
        s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
        x: stored && Number.isFinite(stored.x) ? stored.x : 0,
        y: stored && Number.isFinite(stored.y) ? stored.y : 0,
      };
      this._cap.textContent = this.getAttribute('placeholder') || '';
      if (url) {
        if (this._img.getAttribute('src') !== url) this._img.src = url;
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }

      // Credit belongs to the author src, so a saved photo hides it.
      const credit = this.getAttribute('credit');
      const showCredit = !!(url && credit && !userUrl);
      if (showCredit) {
        this._credit.textContent = credit;
        let href = '';
        const rawHref = this.getAttribute('credit-href') || '';
        if (rawHref) {
          try {
            const u = new URL(rawHref, document.baseURI);
            if (u.protocol === 'http:' || u.protocol === 'https:') href = u.href;
          } catch {}
        }
        if (href) this._credit.setAttribute('href', href);
        else this._credit.removeAttribute('href');
      } else {
        this._credit.textContent = '';
        this._credit.removeAttribute('href');
      }
      this.toggleAttribute('data-credit', showCredit);
    }
  }

  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
