# IQ Fashion — Shopify theme build brief

Base theme: https://github.com/Shopify/horizon
Design prototype (canvas): https://claude.ai/code/artifact/b5dbecff-e02e-4bf5-affa-929a11ffdfe1
Design system: https://claude.ai/code/artifact/d48983a7-7fcb-4958-a73a-9945da124688
Tokens: ./tokens.css

Store: iqfashion.ro · ELVE STYLE SRL · Shopify **Basic** · RON · Romanian only

---

## 1. Rule zero — everything must be editable

Map every part of this design onto Horizon's existing sections and blocks
BEFORE building anything custom. Only build new where Horizon has no equivalent.

Every piece of content is a theme setting or block. Never hardcoded Liquid.
If you hardcode a string a merchant would plausibly want to change, that's a bug.

Use native Shopify features rather than reimplementing them:
- Mega menu structure -> Navigation (linklists)
- Category photos -> each collection's image field
- Sizes and stock -> variants
- Footer links -> menus

Deliver a mapping document first — for each piece of the design, say whether it is
(a) covered by an existing Horizon section, (b) a Horizon section needing new
settings, or (c) genuinely custom. Flag where the design conflicts with Horizon's
conventions. Wait for approval before writing Liquid.

---

## 2. Artboards

Desktop: Main · Colectie · Produs · Contact · Favorite · MegaMenu · Cautare · Checkout
Mobile:  MainMobil · ColectieMobil · ProdusMobil · ContactMobil · FavoriteMobil ·
         CautareMobil · MeniuMobil

Each is a .dc.html file: markup plus a logic class driving real state. Read the
logic, not just the markup — it defines hover swaps, quick-add, size selection,
pagination and the carousel.

---

## 3. Components

### Product card (one component, every page)
- Image 3:4. Hover swaps to second image. Quick-add "+" bottom-right on hover;
  always visible on mobile.
- Order: title, price (sale red + struck original), size pills. Left aligned.
- Last row pins to card bottom (see .iq-card in tokens.css). Cards must align
  across a row regardless of title length.
- Clicking a size pill opens quick-add with that size preselected.
- Out-of-stock pills are disabled and visible, never hidden.

### Quick-add modal + cart drawer
- Size list comes from the opened product's variants, not a fixed list.
- CTA reads "Precomandă" when the product is pre-order.
- Includes "Cumpără acum" -> checkout.
- Cart drawer shows recommendations.

### Product page
- Gallery, variant pickers, quantity stepper, Add to cart, Buy now, wishlist.
- "Ghid de mărimi" opens a modal with the size chart image (file: 33333.png).
- Low-stock line ONLY when selected variant has < 5 units.
  1 unit -> "Ultima bucată în stoc"; otherwise "Ultimele N bucăți în stoc".
  Threshold must be a theme setting.
- Sticky bar: thumbnail · price · size selector · Add to cart only.
  Hide via IntersectionObserver while the in-page button is visible.
  Share quantity state between the two.

### Mega menu
- Photo tiles only, no text link column. Portrait 3:4, captions in caps.
- Column count derived from item count so rows stay even (14 -> 7, 12 -> 6).

### Search
- Empty: popular searches + recommended products.
- Results: product list left, collection tiles right (portrait).
- Mobile stacks; collections become a horizontal scroller.

### Homepage
- Hero sized so category pills are visible without scrolling (.iq-hero).
- Announcement bar is a marquee; messages as blocks.
- Video row is a coverflow carousel: only the centre clip plays, auto-advances,
  neighbours scaled down and faded. Only the active <video> calls play(); others
  stay on poster. Pause on hover and prefers-reduced-motion.
- Fur band: dark, full-bleed, with a collection cover tile.
- FAQ accordion with +/- icons.
- Newsletter inside the footer, on black.

### Collection
- Numbered pagination, NOT load-more or infinite scroll.
- Real <a href> with ?page=N so Google can index.

---

## 4. Responsive

Designed at 1440 and 390. Between those:

| Section | >=1280 | 768–1279 | <768 |
|---|---|---|---|
| Product grid | 4 cols | 3 cols | 2 cols |
| Fur band | cover + 3, then 5 | cover + 2, then 3 | carousel, 2:3 images |
| Mega menu | 7/6 cols | 4 cols | drawer (see MeniuMobil) |
| Video carousel | 5 visible | 3 visible | 1 + peek, dots |
| Search panel | 2 columns | 2 columns | stacked |
| Product page | gallery + column | gallery + column | stacked, sticky bar |
| Gutter | 56px | 32px | 16px |
| Section gap | 104px | 72px | 56px |

Sticky bars appear below 1280 on product pages too.

---

## 5. Constraints — respect, don't design around

- **Shopify Basic**: checkout and thank-you page are NOT customisable beyond
  checkout branding settings. The Checkout artboard is a branding reference only.
  Do not build a custom checkout.
- All prototype imagery is placeholders with crop specs in the text. Wire up
  image settings; the merchant supplies files.
- 26 of 28 collections have no image set in Shopify. The photo-led mega menu and
  search depend on them.
- ANPC SAL + SOL badges in the footer, linking to https://anpc.ro/ce-este-sal/
  and https://ec.europa.eu/consumers/odr (target=_blank rel=nofollow).
  Legal requirement. Also add trader identification (ELVE STYLE SRL, CUI, J-number)
  to the footer or Termeni și condiții.
- Romanian only. All strings through locale files.
- No cookie consent banner exists yet. GDPR requires one before analytics loads.

---

## 6. Acceptance checks

1. Every section appears in the theme editor with meaningful settings
2. Adding a collection to the menu requires no code change
3. Product cards align at the bottom across a row with mixed title lengths
4. Low-stock line respects the threshold setting and the selected variant
5. Sticky bar and in-page add-to-cart never show simultaneously
6. Hero image has explicit dimensions and fetchpriority="high"
7. Keyboard + screen reader work for quick-add, size pills, mega menu, drawer
8. No hardcoded Romanian strings outside locale files
