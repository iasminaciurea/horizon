/**
 * IQ Fashion — storefront behaviour.
 * Plain ES module, no dependencies. All copy comes from window.IQ.strings (locale files).
 */

const IQ = window.IQ || { strings: {}, routes: {} };
const S = IQ.strings || {};
const R = IQ.routes || {};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatMoney(cents, format = IQ.moneyFormat || '{{amount}} lei') {
  const value = Number(cents) / 100;
  // Same as Liquid's money_without_trailing_zeros: whole amounts drop their decimals.
  const isWhole = Number(cents) % 100 === 0;
  const fmt = (n, decimals, thousands, decimal) => {
    const fixed = n.toFixed(isWhole ? 0 : decimals);
    const [whole, frac] = fixed.split('.');
    const withSep = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return frac ? withSep + decimal + frac : withSep;
  };
  return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
    switch (key) {
      case 'amount': return fmt(value, 2, ',', '.');
      case 'amount_no_decimals': return fmt(value, 0, ',', '.');
      case 'amount_with_comma_separator': return fmt(value, 2, '.', ',');
      case 'amount_no_decimals_with_comma_separator': return fmt(value, 0, '.', ',');
      case 'amount_with_apostrophe_separator': return fmt(value, 2, "'", '.');
      case 'amount_no_decimals_with_space_separator': return fmt(value, 0, ' ', ',');
      case 'amount_with_space_separator': return fmt(value, 2, ' ', ',');
      case 'amount_with_period_and_space_separator': return fmt(value, 2, ' ', '.');
      default: return fmt(value, 2, ',', '.');
    }
  });
}

/** Romanian plural categories: one (1), few (0, 2–19 mod 100), other. */
function pluralRo(n) {
  if (n === 1) return 'one';
  const m = n % 100;
  if (n === 0 || (m >= 1 && m <= 19)) return 'few';
  return 'other';
}

function lowStockText(n) {
  const cat = pluralRo(n);
  if (cat === 'one') return S.lastPiece;
  return (cat === 'few' ? S.lowStockFew : S.lowStockOther).replace('__N__', n);
}

function parseHTML(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

function sectionInner(html, id) {
  const doc = parseHTML(html);
  const wrap = doc.getElementById(`shopify-section-${id}`);
  return wrap ? wrap.innerHTML : doc.body.innerHTML;
}

let toastTimer;
function toast(message) {
  const el = $('[data-iq-toast]');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => { el.hidden = true; }, 300);
  }, 3200);
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

const openers = new WeakMap();

// Uses Horizon's html[scroll-lock], which also locks .page-wrapper where that is the scroll container.
function lockScroll() {
  document.documentElement.toggleAttribute('scroll-lock', $$('dialog[open]').some((d) => d.matches(':modal')));
}

function openDialog(dialog, opener) {
  if (!dialog || dialog.open) return;
  if (opener) openers.set(dialog, opener);
  dialog.showModal();
  dialog.classList.add('is-opening');
  requestAnimationFrame(() => dialog.classList.remove('is-opening'));
  lockScroll();
  dialog.dispatchEvent(new CustomEvent('iq:open'));
}

function closeDialog(dialog) {
  if (!dialog || !dialog.open) return;
  dialog.close();
}

function setupDialog(dialog) {
  if (dialog.dataset.iqReady) return;
  dialog.dataset.iqReady = '1';
  // Closing is detected from the `open` attribute (a microtask) rather than the `close` event,
  // which browsers queue as a task and may defer, leaving the page scroll-locked.
  new MutationObserver(() => {
    if (dialog.open) return;
    lockScroll();
    const opener = openers.get(dialog);
    openers.delete(dialog);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    dialog.dispatchEvent(new CustomEvent('iq:closed'));
  }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  // Click on the backdrop (the dialog element itself, outside its box) closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside || dialog.classList.contains('iq-modal') || dialog.classList.contains('iq-lightbox')) closeDialog(dialog);
  });
}

$$('dialog').forEach(setupDialog);

document.addEventListener('click', (e) => {
  const openBtn = e.target.closest('[data-iq-open]');
  if (openBtn) {
    const dialog = document.getElementById(openBtn.dataset.iqOpen);
    if (dialog instanceof HTMLDialogElement) {
      e.preventDefault();
      setupDialog(dialog);
      openDialog(dialog, openBtn);
    }
    return;
  }
  const closeBtn = e.target.closest('[data-iq-close]');
  if (closeBtn) {
    const dialog = closeBtn.closest('dialog');
    if (dialog) {
      e.preventDefault();
      closeDialog(dialog);
    }
  }
});

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

const CART_SECTION = 'iq-cart-drawer';
const cartDialog = () => document.getElementById('iq-cart-drawer');

function updateCartCount(count) {
  $$('[data-iq-cart-count]').forEach((el) => { el.textContent = count; });
  $$('[data-iq-cart-label]').forEach((el) => {
    const n = Number(count);
    const cat = pluralRo(n);
    const tpl = cat === 'one' ? S.cartCountOne : cat === 'few' ? S.cartCountFew : S.cartCountOther;
    el.setAttribute('aria-label', (tpl || S.cartCountOther || '').replace('__N__', n));
  });
}

function renderCart(sections) {
  const html = sections && sections[CART_SECTION];
  if (!html) return;
  const target = document.getElementById(`shopify-section-${CART_SECTION}`);
  if (!target) return;
  target.innerHTML = sectionInner(html, CART_SECTION);
  const cart = $('[data-iq-cart]', target);
  if (cart) updateCartCount(cart.dataset.itemCount);
  loadCartRecos();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status) throw new Error(data.description || data.message || S.error);
  return data;
}

async function cartAddForm(formData) {
  formData.append('sections', CART_SECTION);
  formData.append('sections_url', window.location.pathname);
  const res = await fetch(`${R.cartAdd}.js`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status) throw new Error(data.description || data.message || S.error);
  return data;
}

async function cartAddItems(items) {
  return postJSON(`${R.cartAdd}.js`, { items, sections: CART_SECTION, sections_url: window.location.pathname });
}

async function cartChange(line, quantity) {
  const data = await postJSON(`${R.cartChange}.js`, {
    line,
    quantity,
    sections: [CART_SECTION],
    sections_url: window.location.pathname,
  });
  renderCart(data.sections);
  // Shopify caps the quantity at the stock level without an error; say so.
  const item = data.items && data.items[line - 1];
  if (quantity > 0 && item && item.quantity < quantity) toast(S.maxStock);
}

function openCart(opener) {
  const d = cartDialog();
  if (!d) return;
  setupDialog(d);
  openDialog(d, opener);
  loadCartRecos();
}

let recosFor = null;
async function loadCartRecos() {
  const box = $('[data-iq-cart-recos]');
  if (!box || !box.dataset.productId || box.dataset.loaded === box.dataset.productId) return;
  const id = box.dataset.productId;
  if (recosFor === id && box.childElementCount) return;
  recosFor = id;
  box.dataset.loaded = id;
  const base = `${R.recommendations}?product_id=${id}&limit=${box.dataset.limit || 3}&section_id=iq-cart-recos`;
  try {
    let html = await (await fetch(`${base}&intent=complementary`)).text();
    let inner = sectionInner(html, 'iq-cart-recos');
    if (!inner.includes('iq-cart-recos__item')) {
      html = await (await fetch(`${base}&intent=related`)).text();
      inner = sectionInner(html, 'iq-cart-recos');
    }
    box.innerHTML = inner;
  } catch (e) {
    /* recommendations are optional */
  }
}

document.addEventListener('click', async (e) => {
  const opener = e.target.closest('[data-iq-cart-open]');
  if (opener) {
    e.preventDefault();
    openCart(opener);
    return;
  }
  const qtyBtn = e.target.closest('[data-iq-cart-qty]');
  if (qtyBtn) {
    const item = qtyBtn.closest('[data-line]');
    if (!item) return;
    qtyBtn.disabled = true;
    item.classList.add('is-loading');
    try {
      await cartChange(Number(item.dataset.line), Number(qtyBtn.dataset.iqCartQty));
    } catch (err) {
      toast(err.message);
      item.classList.remove('is-loading');
      qtyBtn.disabled = false;
    }
    return;
  }
  const addVariant = e.target.closest('[data-iq-add-variant]');
  if (addVariant) {
    addVariant.disabled = true;
    try {
      const data = await cartAddItems([{ id: Number(addVariant.dataset.iqAddVariant), quantity: 1 }]);
      renderCart(data.sections);
    } catch (err) {
      toast(err.message);
      addVariant.disabled = false;
    }
  }
});

/* ------------------------------------------------------------------ */
/* Quick add                                                           */
/* ------------------------------------------------------------------ */

async function openQuickAdd(url, size, opener) {
  const dialog = document.getElementById('iq-quick-add');
  if (!dialog) {
    window.location.href = url;
    return;
  }
  setupDialog(dialog);
  const slot = $('[data-iq-quick-slot]', dialog);
  slot.innerHTML = '<div class="iq-spinner"></div>';
  openDialog(dialog, opener);
  try {
    const sep = url.includes('?') ? '&' : '?';
    const html = await (await fetch(`${url}${sep}section_id=iq-quick-add`)).text();
    const doc = parseHTML(html);
    const content = $('[data-iq-quick-content]', doc);
    if (!content) throw new Error(S.error);
    const form = $('iq-product-form', content);
    if (form && size) form.dataset.preselectSize = size;
    slot.replaceChildren(document.importNode(content, true));
    $$('dialog', slot).forEach(setupDialog);
    const first = $('.iq-option__input:checked, .iq-product-form__add', slot);
    if (first) first.focus({ preventScroll: true });
  } catch (err) {
    closeDialog(dialog);
    window.location.href = url;
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-iq-quick-add]');
  if (!btn || btn.disabled) return;
  e.preventDefault();
  openQuickAdd(btn.dataset.iqQuickAdd, btn.dataset.iqSize || '', btn);
});

/* ------------------------------------------------------------------ */
/* Product form (product page + quick add)                             */
/* ------------------------------------------------------------------ */

class IqProductForm extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.variants = JSON.parse($('[data-iq-variants]', this)?.textContent || '[]');
    this.form = $('form', this);
    this.idInput = $('[data-iq-variant-id]', this);
    this.addBtn = $('[data-iq-add]', this);
    this.buyBtn = $('[data-iq-buy-now]', this);
    this.lowEl = $('[data-iq-low-stock]', this);
    this.errorEl = $('[data-iq-form-error]', this);
    this.qtyInput = $('[data-iq-qty-input]', this);
    this.fieldsets = $$('[data-iq-option]', this);
    this.preorder = this.dataset.preorder === 'true';
    this.scope = this.closest('[data-iq-product], [data-iq-quick-content]') || this;

    // No native swatch colour set: use the value name when it is a CSS colour (Green, Gold, Beige…).
    $$('[data-iq-color-name]', this).forEach((sw) => {
      const name = sw.dataset.iqColorName.replace(/\s+/g, '');
      if (window.CSS && CSS.supports('color', name)) {
        sw.style.backgroundColor = name;
        sw.textContent = '';
      }
    });

    this.addEventListener('change', (e) => {
      if (e.target.matches('.iq-option__input')) this.update(e.target);
    });
    $('[data-iq-qty-dec]', this)?.addEventListener('click', () => this.stepQty(-1));
    $('[data-iq-qty-inc]', this)?.addEventListener('click', () => this.stepQty(1));
    this.form?.addEventListener('submit', (e) => this.onSubmit(e));

    const pre = this.dataset.preselectSize;
    if (pre) {
      const sizeSet = this.fieldsets.find((f) => f.dataset.kind === 'size');
      const radio = sizeSet && $$('.iq-option__input', sizeSet).find((r) => r.value === pre);
      if (radio && !radio.disabled) radio.checked = true;
    }
    this.update(null, true);
  }

  stepQty(delta) {
    if (!this.qtyInput) return;
    const next = Math.max(1, (parseInt(this.qtyInput.value, 10) || 1) + delta);
    this.qtyInput.value = next;
    this.qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  selected() {
    return this.fieldsets.map((f) => $('.iq-option__input:checked', f)?.value ?? null);
  }

  findVariant(options) {
    return this.variants.find((v) => v.options.every((o, i) => o === options[i])) || null;
  }

  refreshAvailability() {
    const sel = this.selected();
    this.fieldsets.forEach((f, idx) => {
      $$('.iq-option__input', f).forEach((radio) => {
        let ok;
        if (f.dataset.kind === 'size') {
          // A size is available when it exists in stock together with the other selected options.
          const probe = sel.slice();
          probe[idx] = radio.value;
          ok = this.variants.some((v) => v.available && v.options.every((o, i) => o === probe[i]));
          radio.disabled = !ok;
        } else {
          ok = this.variants.some((v) => v.available && v.options[idx] === radio.value);
        }
        radio.closest('.iq-option__item')?.classList.toggle('is-unavailable', !ok);
      });
    });
    // If the checked size became unavailable (e.g. after a colour change), pick the first available one.
    const sizeSet = this.fieldsets.find((f) => f.dataset.kind === 'size');
    if (sizeSet) {
      const checked = $('.iq-option__input:checked', sizeSet);
      if (!checked || checked.disabled) {
        const firstOk = $$('.iq-option__input', sizeSet).find((r) => !r.disabled);
        if (firstOk) firstOk.checked = true;
      }
    }
  }

  update(changed, initial = false) {
    if (this.fieldsets.length) this.refreshAvailability();
    this.fieldsets.forEach((f) => {
      const checked = $('.iq-option__input:checked', f);
      const label = $('[data-iq-option-value]', f);
      if (label && checked) label.textContent = checked.dataset.label || checked.value;
    });
    const variant = this.fieldsets.length ? this.findVariant(this.selected()) : this.variants[0];
    this.variant = variant;
    if (variant && this.idInput) this.idInput.value = variant.id;

    const available = Boolean(variant && variant.available);
    const label = !variant || !available ? S.soldOut : this.preorder ? S.preorder : S.addToCart;
    $$('[data-iq-add-label]', this.scope).forEach((el) => { el.textContent = label; });
    if (this.addBtn) this.addBtn.disabled = !available;
    if (this.buyBtn) this.buyBtn.disabled = !available;

    if (variant) this.renderPrice(variant);

    if (this.lowEl) {
      if (variant && variant.low) {
        this.lowEl.textContent = lowStockText(variant.low);
        this.lowEl.hidden = false;
      } else {
        this.lowEl.textContent = '';
        this.lowEl.hidden = true;
      }
    }

    if (!initial && variant && this.dataset.context === 'main') {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    }

    this.dispatchEvent(new CustomEvent('iq:variant-change', { bubbles: true, detail: { variant, initial } }));
  }

  renderPrice(variant) {
    $$('[data-iq-price]', this.scope).forEach((wrap) => {
      const cur = $('[data-iq-price-current]', wrap);
      const cmp = $('[data-iq-price-compare]', wrap);
      const sav = $('[data-iq-price-savings]', wrap);
      const onSale = variant.compare_at_price > variant.price;
      if (cur) cur.textContent = formatMoney(variant.price);
      if (cmp) {
        cmp.hidden = !onSale;
        const hidden = cmp.querySelector('.iq-visually-hidden');
        cmp.textContent = formatMoney(variant.compare_at_price);
        if (hidden) cmp.prepend(hidden);
      }
      if (sav) {
        sav.hidden = !onSale;
        sav.textContent = (S.savings || '').replace('__A__', formatMoney(variant.compare_at_price - variant.price));
      }
      wrap.classList.toggle('iq-price--sale', onSale);
    });
    const badge = $('[data-iq-gallery-badge]', this.scope);
    if (badge) {
      const onSale = variant.compare_at_price > variant.price;
      badge.hidden = !onSale;
      if (onSale) badge.textContent = `−${Math.round(((variant.compare_at_price - variant.price) * 100) / variant.compare_at_price)}%`;
    }
  }

  async onSubmit(e) {
    e.preventDefault();
    if (!this.variant || !this.variant.available) return;
    const submitter = e.submitter;
    const buyNow = submitter && submitter.hasAttribute('data-iq-buy-now');
    const buttons = [this.addBtn, this.buyBtn, submitter].filter(Boolean);
    buttons.forEach((b) => { b.disabled = true; b.classList.add('is-loading'); });
    if (this.errorEl) this.errorEl.hidden = true;
    const fd = new FormData(this.form);
    fd.delete('return_to');
    try {
      const data = await cartAddForm(fd);
      if (buyNow) {
        window.location.href = '/checkout';
        return;
      }
      renderCart(data.sections);
      const quick = this.closest('dialog');
      if (quick) closeDialog(quick);
      openCart(submitter || this.addBtn);
    } catch (err) {
      if (this.errorEl) {
        this.errorEl.textContent = err.message;
        this.errorEl.hidden = false;
      } else {
        toast(err.message);
      }
    } finally {
      buttons.forEach((b) => b.classList.remove('is-loading'));
      const ok = Boolean(this.variant && this.variant.available);
      if (this.addBtn) this.addBtn.disabled = !ok;
      if (this.buyBtn) this.buyBtn.disabled = !ok;
      if (submitter) submitter.disabled = !ok;
    }
  }
}
customElements.define('iq-product-form', IqProductForm);

/* ------------------------------------------------------------------ */
/* Product gallery                                                     */
/* ------------------------------------------------------------------ */

class IqGallery extends HTMLElement {
  connectedCallback() {
    this.track = $('[data-iq-gallery-track]', this);
    this.thumbs = $$('[data-iq-gallery-thumb]', this);
    this.thumbs.forEach((t) => t.addEventListener('click', () => this.goTo(t.dataset.iqGalleryThumb)));
    $('[data-iq-gallery-zoom]', this)?.addEventListener('click', (e) => this.zoom(e.currentTarget));
    if (this.track) {
      let raf;
      this.track.addEventListener('scroll', () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => this.syncThumbs());
      }, { passive: true });
    }
    const section = this.closest('[data-iq-product]');
    section?.addEventListener('iq:variant-change', (e) => {
      const v = e.detail.variant;
      if (v && v.media_id && !e.detail.initial) this.goTo(String(v.media_id));
    });
  }

  slides() { return $$('.iq-gallery__slide', this.track); }

  currentIndex() {
    const w = this.track.clientWidth || 1;
    return Math.round(this.track.scrollLeft / w);
  }

  goTo(mediaId) {
    const slide = this.slides().find((s) => s.dataset.mediaId === String(mediaId));
    if (!slide) return;
    this.track.scrollTo({ left: slide.offsetLeft, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    this.setActive(mediaId);
  }

  setActive(mediaId) {
    this.thumbs.forEach((t) => {
      const on = t.dataset.iqGalleryThumb === String(mediaId);
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  syncThumbs() {
    const slide = this.slides()[this.currentIndex()];
    if (slide) this.setActive(slide.dataset.mediaId);
  }

  zoom(opener) {
    const slide = this.slides()[this.currentIndex()];
    const img = slide && $('img', slide);
    if (!img) return;
    let src = img.currentSrc || img.src;
    const srcset = img.getAttribute('srcset');
    if (srcset) src = srcset.split(',').pop().trim().split(' ')[0];
    openLightbox({ image: src, alt: img.alt }, opener);
  }
}
customElements.define('iq-gallery', IqGallery);

/* ------------------------------------------------------------------ */
/* Sticky add to cart                                                  */
/* ------------------------------------------------------------------ */

class IqStickyAtc extends HTMLElement {
  connectedCallback() {
    this.form = document.getElementById(this.dataset.formId);
    this.productForm = this.form?.closest('iq-product-form');
    if (!this.form || !this.productForm) return;
    this.sheet = $('.iq-sticky__sheet', this);
    this.sizeBtn = $('[data-iq-sticky-size]', this);
    this.sizeLabel = $('[data-iq-sticky-size-label]', this);
    this.sizesBox = $('[data-iq-sticky-sizes]', this);
    this.buildSizes();

    this.sizeBtn?.addEventListener('click', () => this.toggleSheet());
    $$('[data-iq-sticky-close]', this).forEach((b) => b.addEventListener('click', () => this.toggleSheet(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.sheet && !this.sheet.hidden) {
        this.toggleSheet(false);
        this.sizeBtn?.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (this.sheet && !this.sheet.hidden && !this.contains(e.target)) this.toggleSheet(false);
    });
    this.productForm.addEventListener('iq:variant-change', () => this.sync());

    const target = $('[data-iq-buy-buttons]', this.productForm);
    if (target) {
      this.io = new IntersectionObserver(([entry]) => {
        // Hidden while the in-page buttons are visible; shown once they scroll out of view.
        const show = !entry.isIntersecting;
        this.setVisible(show);
      }, { threshold: 0 });
      this.io.observe(target);
    }
    this.sync();
  }

  disconnectedCallback() { this.io?.disconnect(); }

  setVisible(show) {
    this.hidden = !show;
    this.classList.toggle('is-visible', show);
    document.body.classList.toggle('iq-has-sticky', show);
    if (!show) this.toggleSheet(false);
  }

  sizeFieldset() { return $$('[data-iq-option]', this.productForm).find((f) => f.dataset.kind === 'size'); }

  buildSizes() {
    const set = this.sizeFieldset();
    if (!set || !this.sizesBox) return;
    this.sizesBox.replaceChildren();
    $$('.iq-option__input', set).forEach((radio) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'iq-size-btn';
      b.textContent = radio.dataset.label || radio.value;
      b.dataset.value = radio.value;
      b.addEventListener('click', () => {
        if (radio.disabled) return;
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      });
      this.sizesBox.append(b);
    });
  }

  sync() {
    const set = this.sizeFieldset();
    if (set && this.sizesBox) {
      $$('.iq-option__input', set).forEach((radio) => {
        const b = $$('button', this.sizesBox).find((x) => x.dataset.value === radio.value);
        if (!b) return;
        b.disabled = radio.disabled;
        b.setAttribute('aria-pressed', radio.checked ? 'true' : 'false');
        const name = radio.dataset.label || radio.value;
        b.setAttribute('aria-label', radio.disabled ? `${name} — ${S.soldOut}` : name);
      });
      const checked = $('.iq-option__input:checked', set);
      if (checked && this.sizeLabel) this.sizeLabel.textContent = (S.sizeSelected || '').replace('__S__', checked.dataset.label || checked.value);
    }
    const add = $('[data-iq-sticky-add]', this);
    const v = this.productForm.variant;
    if (add) add.disabled = !(v && v.available);
    const price = $('[data-iq-price]', this);
    if (price && v) {
      const cur = $('[data-iq-price-current]', price);
      const cmp = $('[data-iq-price-compare]', price);
      if (cur) cur.textContent = formatMoney(v.price);
      if (cmp) {
        cmp.hidden = !(v.compare_at_price > v.price);
        cmp.textContent = formatMoney(v.compare_at_price);
      }
      price.classList.toggle('iq-price--sale', v.compare_at_price > v.price);
    }
  }

  toggleSheet(force) {
    if (!this.sheet) return;
    const open = force ?? this.sheet.hidden;
    this.sheet.hidden = !open;
    this.sizeBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) $('button:not(:disabled)', this.sizesBox)?.focus();
  }
}
customElements.define('iq-sticky-atc', IqStickyAtc);

/* ------------------------------------------------------------------ */
/* Header + mega menu                                                  */
/* ------------------------------------------------------------------ */

class IqHeader extends HTMLElement {
  connectedCallback() {
    this.toggles = $$('[data-iq-mega-toggle]', this);
    this.hoverable = window.matchMedia('(hover: hover) and (min-width: 768px)');
    this.toggles.forEach((btn) => {
      btn.addEventListener('click', () => this.toggle(btn));
      const item = btn.closest('li');
      item.addEventListener('mouseenter', () => {
        if (!this.hoverable.matches) return;
        clearTimeout(this.leaveTimer);
        this.enterTimer = setTimeout(() => this.open(btn), 90);
      });
      item.addEventListener('mouseleave', () => clearTimeout(this.enterTimer));
    });
    this.addEventListener('mouseleave', () => {
      if (!this.hoverable.matches) return;
      clearTimeout(this.enterTimer);
      this.leaveTimer = setTimeout(() => this.closeAll(), 220);
    });
    this.addEventListener('mouseenter', () => clearTimeout(this.leaveTimer));
    this.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = this.toggles.find((b) => b.getAttribute('aria-expanded') === 'true');
      if (open) {
        this.closeAll();
        open.focus();
      }
    });
    this.addEventListener('focusout', (e) => {
      if (!this.contains(e.relatedTarget)) this.closeAll();
    });
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) this.closeAll();
    });
    if (this.dataset.sticky !== 'false') this.setupSticky();
  }

  /* Sticky on scroll up. Horizon scrolls the window below 990px and .page-wrapper above,
     so both are watched. */
  setupSticky() {
    this.wrapper = this.closest('.shopify-section') || this.parentElement;
    this.pageWrapper = document.querySelector('.page-wrapper');
    this.stuck = false;
    this.lastY = this.currentY();
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        this.updateSticky();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.pageWrapper?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      this.measure();
      this.updateSticky();
    });
    this.measure();
    this.updateSticky();
  }

  currentY() {
    return Math.max(window.scrollY || 0, this.pageWrapper ? this.pageWrapper.scrollTop : 0);
  }

  measure() {
    // The section wrapper stays in the page flow, so it marks where the header normally sits.
    this.naturalTop = this.wrapper.getBoundingClientRect().top + this.currentY();
    this.headerHeight = this.offsetHeight;
  }

  updateSticky() {
    const y = this.currentY();
    if (y <= this.naturalTop) {
      if (this.stuck) this.setStuck(false);
      this.lastY = y;
      return;
    }
    const pastHeader = y > this.naturalTop + this.headerHeight;
    if (!this.stuck) {
      // Already scrolled out of view: stick hidden, without sliding.
      this.setStuck(true, pastHeader);
      this.lastY = y;
      return;
    }
    const delta = y - this.lastY;
    if (Math.abs(delta) < 4) return;
    this.lastY = y;
    const megaOpen = this.toggles.some((b) => b.getAttribute('aria-expanded') === 'true');
    const hide = delta > 0 && pastHeader && !megaOpen;
    this.classList.toggle('is-hidden', hide);
  }

  setStuck(on, hidden = false) {
    this.stuck = on;
    if (on) {
      if (!this.classList.contains('iq-header--transparent')) this.wrapper.style.minHeight = `${this.headerHeight}px`;
      this.classList.add('no-transition');
      this.classList.toggle('is-hidden', hidden);
      this.classList.add('is-stuck');
      void this.offsetHeight;
      requestAnimationFrame(() => this.classList.remove('no-transition'));
    } else {
      this.classList.remove('is-stuck', 'is-hidden');
      this.wrapper.style.minHeight = '';
    }
    this.syncSolid();
  }

  syncSolid() {
    const megaOpen = this.toggles.some((b) => b.getAttribute('aria-expanded') === 'true');
    this.classList.toggle('is-solid', megaOpen || Boolean(this.stuck));
  }

  panelFor(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }

  open(btn) {
    this.toggles.forEach((b) => { if (b !== btn) this.setOpen(b, false); });
    this.setOpen(btn, true);
  }

  toggle(btn) {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    if (isOpen) this.setOpen(btn, false);
    else this.open(btn);
  }

  setOpen(btn, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    const panel = this.panelFor(btn);
    if (panel) panel.hidden = !open;
    this.syncSolid();
  }

  closeAll() { this.toggles.forEach((b) => this.setOpen(b, false)); }
}
customElements.define('iq-header', IqHeader);

class IqMenuDrawer extends HTMLElement {
  connectedCallback() {
    this.rootTitle = $('[data-iq-level-title-root]', this);
    this.levelTitle = $('[data-iq-level-title]', this);
    this.back = $('[data-iq-level-back]', this);
    this.root = $('[data-iq-level="root"]', this);
    $$('[data-iq-level-open]', this).forEach((btn) => btn.addEventListener('click', () => this.show(btn)));
    this.back?.addEventListener('click', () => this.reset(true));
    this.closest('dialog')?.addEventListener('iq:closed', () => this.reset());
  }

  show(btn) {
    const level = document.getElementById(btn.dataset.iqLevelOpen);
    if (!level) return;
    this.lastBtn = btn;
    this.root.hidden = true;
    level.hidden = false;
    this.rootTitle.hidden = true;
    this.levelTitle.textContent = btn.dataset.iqLevelLabel;
    this.levelTitle.hidden = false;
    this.back.hidden = false;
    this.back.focus();
  }

  reset(focus = false) {
    $$('[data-iq-level]:not([data-iq-level="root"])', this).forEach((l) => { l.hidden = true; });
    this.root.hidden = false;
    this.rootTitle.hidden = false;
    this.levelTitle.hidden = true;
    this.back.hidden = true;
    if (focus && this.lastBtn) this.lastBtn.focus();
  }
}
customElements.define('iq-menu-drawer', IqMenuDrawer);

/* ------------------------------------------------------------------ */
/* Search panel                                                        */
/* ------------------------------------------------------------------ */

class IqSearch extends HTMLElement {
  connectedCallback() {
    this.input = $('[data-iq-search-input]', this);
    this.empty = $('[data-iq-search-empty]', this);
    this.results = $('[data-iq-search-results]', this);
    this.clearBtn = $('[data-iq-search-clear]', this);
    this.limit = this.dataset.limit || 4;
    let t;
    this.input?.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => this.search(this.input.value.trim()), 220);
    });
    this.clearBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.input.value = '';
      this.search('');
      this.input.focus();
    });
    $$('[data-iq-search-term]', this).forEach((b) =>
      b.addEventListener('click', () => {
        this.input.value = b.dataset.iqSearchTerm;
        this.search(this.input.value);
        this.input.focus();
      })
    );
    const dialog = this.closest('dialog');
    dialog?.addEventListener('iq:open', () => setTimeout(() => this.input?.focus(), 30));
  }

  async search(q) {
    this.controller?.abort();
    const has = q.length > 0;
    if (this.clearBtn) this.clearBtn.hidden = !has;
    if (!has) {
      this.results.hidden = true;
      this.results.innerHTML = '';
      this.empty.hidden = false;
      return;
    }
    this.controller = new AbortController();
    const params = new URLSearchParams({
      q,
      section_id: 'iq-predictive-search',
      'resources[type]': 'product,collection',
      'resources[limit]': this.limit,
      'resources[limit_scope]': 'each',
      'resources[options][unavailable_products]': 'last',
    });
    try {
      const res = await fetch(`${R.predictiveSearch}?${params}`, { signal: this.controller.signal });
      const html = await res.text();
      this.results.innerHTML = sectionInner(html, 'iq-predictive-search');
      this.results.hidden = false;
      this.empty.hidden = true;
    } catch (e) {
      if (e.name !== 'AbortError') {
        this.results.hidden = true;
        this.empty.hidden = false;
      }
    }
  }
}
customElements.define('iq-search', IqSearch);

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

class IqTabs extends HTMLElement {
  connectedCallback() {
    this.tabs = $$('[role="tab"]', this);
    this.tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => this.select(i));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % this.tabs.length;
        if (e.key === 'ArrowLeft') next = (i - 1 + this.tabs.length) % this.tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = this.tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          this.select(next, true);
        }
      });
    });
  }

  select(index, focus = false) {
    this.tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
      if (on && focus) tab.focus();
    });
  }
}
customElements.define('iq-tabs', IqTabs);

/* ------------------------------------------------------------------ */
/* Video coverflow                                                     */
/* ------------------------------------------------------------------ */

class IqReels extends HTMLElement {
  connectedCallback() {
    this.slides = $$('[data-iq-reel]', this);
    this.dots = $$('[data-iq-reel-dot]', this);
    this.interval = Number(this.dataset.interval) || 3800;
    this.active = 0;
    this.paused = false;
    if (!this.slides.length) return;

    this.slides.forEach((slide, i) => {
      $('[data-iq-reel-trigger]', slide)?.addEventListener('click', () => {
        if (i === this.active) this.openActive(slide);
        else this.go(i);
      });
    });
    this.dots.forEach((d, i) => d.addEventListener('click', () => this.go(i)));

    this.addEventListener('mouseenter', () => this.pause(true));
    this.addEventListener('mouseleave', () => this.pause(false));
    this.addEventListener('focusin', () => this.pause(true));
    this.addEventListener('focusout', (e) => { if (!this.contains(e.relatedTarget)) this.pause(false); });
    document.addEventListener('visibilitychange', () => this.tick());
    reducedMotion.addEventListener?.('change', () => this.render());

    // Swipe on touch screens.
    let x0 = null;
    this.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    this.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) this.go(this.active + (dx < 0 ? 1 : -1));
      x0 = null;
    });

    this.io = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
      this.render();
    }, { threshold: 0.25 });
    this.io.observe(this);
    this.render();
  }

  disconnectedCallback() {
    this.io?.disconnect();
    clearTimeout(this.timer);
  }

  go(i) {
    const n = this.slides.length;
    this.active = ((i % n) + n) % n;
    this.render();
  }

  pause(p) {
    this.paused = p;
    this.tick();
  }

  offset(i) {
    const n = this.slides.length;
    let d = i - this.active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  }

  render() {
    this.slides.forEach((slide, i) => {
      const d = this.offset(i);
      slide.dataset.d = Math.abs(d) > 2 ? (d > 0 ? 'far' : '-far') : String(d);
      const isActive = d === 0;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', Math.abs(d) > 2 ? 'true' : 'false');
      const trigger = $('[data-iq-reel-trigger]', slide);
      if (trigger) trigger.tabIndex = Math.abs(d) > 2 ? -1 : 0;
      const link = $('.iq-reel__product', slide);
      if (link && link.tagName === 'A') link.tabIndex = isActive ? 0 : -1;
      const video = $('video', slide);
      if (!video) return;
      // Only the active clip ever calls play(); the others stay on their poster.
      if (isActive && this.inView && !reducedMotion.matches) {
        if (video.preload === 'none') video.preload = 'auto';
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
    this.dots.forEach((dot, i) => dot.setAttribute('aria-current', i === this.active ? 'true' : 'false'));
    this.tick();
  }

  tick() {
    clearTimeout(this.timer);
    const lightboxOpen = document.getElementById('iq-lightbox')?.open;
    if (this.paused || !this.inView || document.hidden || reducedMotion.matches || lightboxOpen || this.slides.length < 2) return;
    this.timer = setTimeout(() => this.go(this.active + 1), this.interval);
  }

  openActive(slide) {
    const src = slide.dataset.fullSrc;
    if (!src) return;
    $('video', slide)?.pause();
    openLightbox({ video: src, caption: slide.dataset.caption }, $('[data-iq-reel-trigger]', slide));
    const lb = document.getElementById('iq-lightbox');
    lb?.addEventListener('iq:closed', () => this.render(), { once: true });
  }
}
customElements.define('iq-reels', IqReels);

/* ------------------------------------------------------------------ */
/* Lightbox                                                            */
/* ------------------------------------------------------------------ */

function openLightbox({ video, image, alt = '', caption = '' }, opener) {
  const lb = document.getElementById('iq-lightbox');
  if (!lb) return;
  setupDialog(lb);
  const stage = $('[data-iq-lightbox-stage]', lb);
  const cap = $('[data-iq-lightbox-caption]', lb);
  stage.replaceChildren();
  if (video) {
    const v = document.createElement('video');
    v.src = video;
    v.controls = true;
    v.playsInline = true;
    v.autoplay = true;
    v.className = 'iq-lightbox__video';
    stage.append(v);
  } else if (image) {
    const img = document.createElement('img');
    img.src = image;
    img.alt = alt;
    img.className = 'iq-lightbox__image';
    stage.append(img);
  }
  cap.textContent = caption || '';
  if (!lb.dataset.iqCleanup) {
    lb.dataset.iqCleanup = '1';
    lb.addEventListener('iq:closed', () => {
      $$('video', lb).forEach((v) => v.pause());
      $('[data-iq-lightbox-stage]', lb).replaceChildren();
    });
  }
  openDialog(lb, opener);
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-iq-lightbox-src]');
  if (!t) return;
  e.preventDefault();
  openLightbox({ video: t.dataset.iqLightboxSrc, caption: t.dataset.iqLightboxCaption }, t);
});

// Ambient (decorative) videos stop for reduced motion.
function syncAmbient() {
  $$('video[data-iq-ambient]').forEach((v) => {
    if (reducedMotion.matches) v.pause();
    else v.play().catch(() => {});
  });
}
syncAmbient();
reducedMotion.addEventListener?.('change', syncAmbient);

/* ------------------------------------------------------------------ */
/* Hotspots                                                            */
/* ------------------------------------------------------------------ */

class IqHotspots extends HTMLElement {
  connectedCallback() {
    this.spots = $$('[data-iq-spot]', this);
    this.cards = $$('[data-iq-spot-card]', this);
    this.spots.forEach((s) => s.addEventListener('click', () => this.select(s.dataset.iqSpot)));
  }

  select(n) {
    this.spots.forEach((s) => {
      const on = s.dataset.iqSpot === n;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    this.cards.forEach((c) => c.classList.toggle('is-active', c.dataset.iqSpotCard === n));
    const card = this.cards.find((c) => c.dataset.iqSpotCard === n);
    if (card && window.matchMedia('(max-width: 767px)').matches) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
customElements.define('iq-hotspots', IqHotspots);

/* ------------------------------------------------------------------ */
/* Product recommendations                                             */
/* ------------------------------------------------------------------ */

class IqRecommendations extends HTMLElement {
  connectedCallback() {
    if (this.querySelector('.iq-grid')) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      this.load();
    }, { rootMargin: '600px 0px' });
    io.observe(this);
  }

  async fetchInner(url) {
    const html = await (await fetch(url)).text();
    const doc = parseHTML(html);
    const el = $('iq-recommendations', doc);
    return el && el.querySelector('.iq-grid') ? el.innerHTML : '';
  }

  async load() {
    try {
      let inner = await this.fetchInner(this.dataset.url);
      if (!inner && this.dataset.fallbackUrl && this.dataset.fallbackUrl !== this.dataset.url) {
        inner = await this.fetchInner(this.dataset.fallbackUrl);
      }
      if (inner) this.innerHTML = inner;
      else this.closest('.iq-recos')?.setAttribute('hidden', '');
    } catch (e) {
      /* optional */
    }
  }
}
customElements.define('iq-recommendations', IqRecommendations);

/* ------------------------------------------------------------------ */
/* Collection filters                                                  */
/* ------------------------------------------------------------------ */

function setupFilters() {
  const panel = $('[data-iq-filters]');
  const form = $('[data-iq-filter-form]');
  const sort = $('[data-iq-sort]');
  const openBtn = $('[data-iq-filters-open]');

  function submitForm() {
    if (!form) return;
    const params = new URLSearchParams(new FormData(form));
    if (sort) params.set('sort_by', sort.value);
    for (const [k, v] of Array.from(params.entries())) if (v === '') params.delete(k);
    params.delete('page');
    window.location.href = `${form.action}?${params.toString()}`;
  }

  form?.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"]')) submitForm();
  });
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm();
  });
  $$('.iq-filter__price input', form || document).forEach((inp) => inp.addEventListener('change', submitForm));

  sort?.addEventListener('change', () => {
    if (form) {
      submitForm();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', sort.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    }
  });

  if (!panel || !openBtn) return;
  const mq = window.matchMedia('(min-width: 1280px)');
  const close = () => {
    panel.classList.remove('is-open');
    panel.removeAttribute('role');
    panel.removeAttribute('aria-modal');
    openBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.removeAttribute('scroll-lock');
    openBtn.focus();
  };
  openBtn.addEventListener('click', () => {
    panel.classList.add('is-open');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    openBtn.setAttribute('aria-expanded', 'true');
    document.documentElement.setAttribute('scroll-lock', '');
    $('input, button, a', panel)?.focus();
  });
  $('[data-iq-filters-close]', panel)?.addEventListener('click', close);
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
    if (e.key === 'Tab' && panel.classList.contains('is-open')) {
      const f = $$('a[href], button:not([disabled]), input:not([disabled]), select', panel).filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  mq.addEventListener?.('change', () => { if (mq.matches && panel.classList.contains('is-open')) close(); });
}
setupFilters();

/* ------------------------------------------------------------------ */
/* Map embed (loads only after the visitor asks)                       */
/* ------------------------------------------------------------------ */

class IqMapEmbed extends HTMLElement {
  connectedCallback() {
    $('[data-iq-map-load]', this)?.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = this.dataset.src;
      iframe.title = this.dataset.title || 'Google Maps';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.className = 'iq-map__iframe';
      this.replaceChildren(iframe);
    });
  }
}
customElements.define('iq-map-embed', IqMapEmbed);

/* ------------------------------------------------------------------ */
/* Wishlist (stored in the visitor's browser)                          */
/* ------------------------------------------------------------------ */

const WL_KEY = 'iq:wishlist';
const Wishlist = {
  read() {
    try {
      const v = JSON.parse(localStorage.getItem(WL_KEY) || '[]');
      return Array.isArray(v) ? v.filter((x) => x && typeof x.h === 'string') : [];
    } catch (e) {
      return [];
    }
  },
  write(list) {
    try { localStorage.setItem(WL_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent('iq:wishlist', { detail: list }));
  },
  has(h) { return this.read().some((x) => x.h === h); },
  add(h, v) {
    const list = this.read().filter((x) => x.h !== h);
    list.unshift({ h, v: v || null });
    this.write(list);
  },
  remove(h) { this.write(this.read().filter((x) => x.h !== h)); },
  toggle(h, v) {
    if (this.has(h)) { this.remove(h); return false; }
    this.add(h, v);
    return true;
  },
};

function syncWishlistUI() {
  const list = Wishlist.read();
  $$('[data-iq-wishlist-count]').forEach((el) => {
    el.textContent = list.length;
    el.hidden = list.length === 0;
  });
  $$('[data-iq-wishlist-toggle]').forEach((btn) => {
    const on = list.some((x) => x.h === btn.dataset.iqWishlistToggle);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? S.wishlistRemove : S.wishlistAdd);
    btn.classList.toggle('is-active', on);
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-iq-wishlist-toggle]');
  if (!btn) return;
  const form = btn.closest('iq-product-form');
  const variantId = form?.variant?.id;
  const added = Wishlist.toggle(btn.dataset.iqWishlistToggle, variantId);
  toast(added ? S.wishlistAdded : S.wishlistRemoved);
});
document.addEventListener('iq:wishlist', syncWishlistUI);
window.addEventListener('storage', (e) => { if (e.key === WL_KEY) syncWishlistUI(); });
syncWishlistUI();

class IqWishlist extends HTMLElement {
  connectedCallback() {
    this.grid = $('[data-iq-wishlist-grid]', this);
    this.emptyEl = $('[data-iq-wishlist-empty]', this);
    this.actions = $('[data-iq-wishlist-actions]', this);
    this.label = $('[data-iq-wishlist-label]', this);
    this.importShared();
    this.render();
    $('[data-iq-wishlist-add-all]', this)?.addEventListener('click', (e) => this.addAll(e.currentTarget));
    $('[data-iq-wishlist-share]', this)?.addEventListener('click', () => this.share());
    this.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-iq-wishlist-remove]');
      if (rm) {
        Wishlist.remove(rm.dataset.iqWishlistRemove);
        rm.closest('[data-iq-wishlist-item]')?.remove();
        this.updateLabel();
        return;
      }
      const buy = e.target.closest('[data-iq-wishlist-buy]');
      if (buy) this.buy(buy);
    });
  }

  importShared() {
    const shared = new URL(window.location.href).searchParams.get('lista');
    if (!shared) return;
    const handles = shared.split(',').map((h) => h.trim()).filter((h) => /^[a-z0-9-]+$/i.test(h)).slice(0, 50);
    handles.reverse().forEach((h) => { if (!Wishlist.has(h)) Wishlist.add(h); });
    const url = new URL(window.location.href);
    url.searchParams.delete('lista');
    window.history.replaceState({}, '', url.toString());
  }

  updateLabel() {
    const n = this.grid.children.length;
    const text = n === 0 ? S.wishlistCountZero : n === 1 ? S.wishlistCountOne : (S.wishlistCount || '').replace('__N__', n);
    if (this.label) this.label.textContent = text;
    this.emptyEl.hidden = n > 0;
    this.actions.hidden = n === 0;
  }

  async render() {
    const list = Wishlist.read();
    this.grid.replaceChildren();
    const root = (R.root || '/').replace(/\/$/, '');
    const items = await Promise.all(
      list.map(async (entry) => {
        try {
          const res = await fetch(`${root}/products/${encodeURIComponent(entry.h)}?section_id=iq-wishlist-card`);
          if (!res.ok) return null;
          const doc = parseHTML(await res.text());
          const li = $('[data-iq-wishlist-item]', doc);
          if (!li) return null;
          const variants = JSON.parse($('[data-iq-wishlist-variants]', li)?.textContent || '{}');
          const vid = entry.v && variants[entry.v] ? String(entry.v) : null;
          if (vid) {
            li.dataset.variant = vid;
            const vt = $('[data-iq-wishlist-variant]', li);
            if (vt) vt.textContent = variants[vid].title;
          }
          const notify = $('[data-iq-wishlist-notify]', li);
          if (notify) notify.href = this.dataset.notifyUrl || '/pages/contact';
          return document.importNode(li, true);
        } catch (e) {
          return null;
        }
      })
    );
    items.filter(Boolean).forEach((li) => this.grid.append(li));
    this.updateLabel();
  }

  async buy(btn) {
    const li = btn.closest('[data-iq-wishlist-item]');
    const variant = li.dataset.variant || (li.dataset.single === 'true' ? li.dataset.firstVariant : null);
    if (!variant) {
      openQuickAdd(btn.dataset.url, '', btn);
      return;
    }
    btn.disabled = true;
    try {
      const data = await cartAddItems([{ id: Number(variant), quantity: 1 }]);
      renderCart(data.sections);
      openCart(btn);
    } catch (err) {
      openQuickAdd(btn.dataset.url, '', btn);
    } finally {
      btn.disabled = false;
    }
  }

  async addAll(btn) {
    const items = $$('[data-iq-wishlist-item]', this.grid)
      .filter((li) => li.dataset.available === 'true')
      .map((li) => ({ id: Number(li.dataset.variant || li.dataset.firstVariant), quantity: 1 }))
      .filter((x) => x.id);
    if (!items.length) return;
    btn.disabled = true;
    try {
      const data = await cartAddItems(items);
      renderCart(data.sections);
      openCart(btn);
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async share() {
    const handles = Wishlist.read().map((x) => x.h).join(',');
    const url = new URL(window.location.href);
    url.searchParams.set('lista', handles);
    const link = url.toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      toast(S.wishlistCopied);
    } catch (e) {
      /* user cancelled */
    }
  }
}
customElements.define('iq-wishlist', IqWishlist);

/* ------------------------------------------------------------------ */
/* Horizon cart page: keep the header count in sync                    */
/* ------------------------------------------------------------------ */

// The /cart page still uses Horizon's main-cart section, which updates quantities with its own
// code. Re-read the cart after it re-renders so the IQ header count never goes stale.
if (document.body.classList.contains('template-cart')) {
  const main = document.getElementById('MainContent');
  let t;
  if (main) {
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(async () => {
        try {
          const cart = await (await fetch(`${R.cart}.js`, { headers: { Accept: 'application/json' } })).json();
          updateCartCount(cart.item_count);
        } catch (e) {
          /* ignore */
        }
      }, 400);
    }).observe(main, { childList: true, subtree: true });
  }
}

/* ------------------------------------------------------------------ */
/* Hero: fill the first screen                                         */
/* ------------------------------------------------------------------ */

// Announcement bar + hero + quick links end exactly at the bottom edge of the screen.
function sizeHero() {
  $$('.iq-hero--fit').forEach((hero) => {
    const section = hero.closest('.shopify-section');
    const main = document.getElementById('MainContent');
    if (!section || !main || main.firstElementChild !== section) return;
    const group = document.getElementById('header-group');
    let offset = group ? group.offsetHeight : 0;
    const next = section.nextElementSibling;
    if (next && next.querySelector('.iq-pills-section')) offset += next.offsetHeight;
    hero.style.setProperty('--iq-hero-offset', `${offset}px`);
  });
}
sizeHero();
let heroTimer;
window.addEventListener('resize', () => {
  clearTimeout(heroTimer);
  heroTimer = setTimeout(sizeHero, 100);
});
document.fonts?.ready.then(sizeHero);

/* ------------------------------------------------------------------ */
/* Theme editor                                                        */
/* ------------------------------------------------------------------ */

document.addEventListener('shopify:section:load', (e) => {
  sizeHero();
  $$('dialog', e.target).forEach(setupDialog);
  if (e.target.querySelector('[data-iq-filters]')) setupFilters();
  syncWishlistUI();
  syncAmbient();
});
