# IQ Fashion → Horizon: mapping document

Status: **draft for approval**. No Liquid has been written yet.
Sources: `BUILD-BRIEF.md`, `tokens.css`, all 15 artboards in `design/canvas.html` (markup + logic classes), Horizon v4.3.0 in this repo.

Legend
- **(a)** covered by an existing Horizon section/block, configured only
- **(b)** existing Horizon section/block that needs new settings or a small change
- **(c)** genuinely custom: new section, block or snippet
- ⚠ = conflict with Horizon's conventions, or a decision you need to make (collected in §10)

---

## 0. Global foundations

| Piece | Class | Horizon home | Notes |
|---|---|---|---|
| Jost font | (a) | Theme settings → Typography (`font_picker`) | Jost is in Shopify's font library, so no self-hosting needed. |
| Colour tokens | (b) ⚠ | Theme settings → Color schemes | The brief says to drop `tokens.css` in as hardcoded hex. A merchant can't edit hardcoded hex, so it breaks rule zero. Proposal: express the palette as Horizon colour schemes: **Ground** (#FAF9F7), **White** (cards, drawers), **Dark** (#2F2B27: hero, fur band), **Footer** (#1A1A1A), **Sunken** (#F0EEE9). Keep `assets/iqfashion-tokens.css` only for structural rules that aren't merchant choices: `.iq-card` alignment, `.iq-hero` sizing, reduced-motion. Its `--iq-*` vars would *read from* scheme vars, not hardcode hex. |
| Sale red / tag colours | (b) | Theme settings → Badges | Horizon has sale and sold-out badge colours. Add **Precomandă** and **Nou** badge colour pairs (§3). |
| Gutter 56/32/16, section gap 104/72/56, max 1800 | (b) ⚠ | Theme settings → Layout (page width + margins) | Horizon breaks at **750 / 990px**, while the design breaks at **768 / 1280px**. Changing Horizon's global breakpoints touches about 250 media queries and makes upstream updates painful. Proposal: use 750 as the "mobile" breakpoint (close to 768), and add a **1280** breakpoint only where the brief's table needs it (grid 4→3 cols, mega menu 7/6→4, gutter 56→32, section gap 104→72). |
| Letter-spacing (body / eyebrow / button) | (b) | Typography settings | Add three tracking ranges. |
| Romanian UI strings | (a) | `locales/ro.json` (exists) | Shopify picks `ro.json` once Romanian is the store's default language. New UI strings go in `ro.json` **and** `en.default.json` (required fallback). Shopify supports Romanian plural forms (`one` / `few` / `other`), which the low-stock copy needs. |
| Merchant content vs UI copy | — | — | Rule I'll apply: anything a merchant writes (headings, FAQ answers, addresses, campaign copy) is a **section/block setting**. Fixed UI microcopy ("Adaugă în coș", "Ultima bucată în stoc", aria labels) lives in **locale files**, which are still editable under *Edit default theme content*. No Romanian in Liquid. |

---

## 1. Header, announcement bar, navigation

| Piece | Class | Horizon home | Notes |
|---|---|---|---|
| Announcement bar as **marquee**, messages as blocks | (b) ⚠ | `header-announcements` + `_announcement` blocks | Horizon's announcement bar is a **slider**. Its `marquee` section is `disabled_on: header` groups, so it can't sit above the header. Proposal: add a `display: slider \| marquee` setting to `header-announcements` and reuse its `_announcement` blocks. Dot separators come from CSS; pause on hover and under reduced motion. |
| Header layout: search icon + "Caută" label left, centred logo, account / wishlist / cart right, nav row centred below | (a) | `header` (rows + `_header-logo` + `_header-menu`) | Horizon's header rows support this layout. The "Caută" text label next to the icon is new (**b**: a show-label toggle). |
| Transparent header over the homepage hero, solid when the menu is open | (a) | `enable_transparent_header_home` + `text_color_transparent_home` | Already native. |
| Wishlist icon in header | (c) | — | Part of the wishlist feature (§7). |
| "Reduceri" nav item and "Black Friday" tile in red | (b) | `_header-menu` | New setting: *"Highlighted menu items (comma-separated titles)"* plus a highlight colour. A Shopify menu item has no colour field, so this is the least-code route. |
| **Mega menu**: photo tiles only, 3:4, caps captions | (b) | `_header-menu` → `menu_style: collection_images` → `snippets/mega-menu-list.liquid` | Horizon already renders a photo per collection link, and falls back to the **first product image** when the collection has no image. That covers the 26 / 28 missing images (see ⚠ in §10). Changes needed: (1) a 3:4 ratio option for collection-image mode; (2) **column count derived from item count**, replacing Horizon's fixed 8-col grid (`≤4 → n`, `%7 → 7`, `%6 → 6`, `%5 → 5`, else 6), and 4 cols at 768–1279; (3) caption case/size settings. Menu content stays 100% in **Navigation**, so adding a collection to the menu needs no code (acceptance check 2). |
| Mega menu items with a single child (e.g. "Mărimi mari" → 1 tile) | ⚠ | — | The design opens a one-tile panel. I'd make those plain top-level links with no children. That's your menu-content decision, and needs no code. |
| **MeniuMobil** drawer: level 1 list; level 2 has 2 featured photo tiles, a "Tot din X" link, then text sub-links; utility links + showroom block at the bottom of level 1 | (b) | `snippets/header-drawer.liquid` | Horizon's drawer already supports featured collection images in submenus. Add: (1) a "View all in X" link (parent link URL, label from locale); (2) a **secondary menu** picker for the utility links (Contact, Lista de dorințe, Contul meu, Ghid de mărimi, Livrare și retur), using a Shopify menu, not hardcoded; (3) a rich-text "drawer footer" setting for the showroom address / hours / email. |
| Nav inconsistency between artboards | ⚠ | — | The Main and MeniuMobil artboards show 8 top items; the MegaMenu artboard shows 6 (no Rochii, no Paltoane & Geci). Since the menu lives in Navigation this isn't a code issue. Tell me which is canonical and I'll seed that menu structure in the docs only. |

---

## 2. Homepage (Main / MainMobil), top to bottom

| # | Piece | Class | Horizon home | Notes |
|---|---|---|---|---|
| 1 | Hero: dark campaign photo, eyebrow, H1, text, 2 CTAs; sized so the pills below are visible | (b) | `hero` + `text` / `button` blocks | `hero` already passes `fetchpriority` and `image_tag` emits width/height (acceptance check 6). Add a `.iq-hero` height preset (`76svh`, min 560, max 820) and a separate mobile image (1080×1620 crop). Mobile hides the second CTA and uses shorter copy: proposal is a "hide on mobile" toggle on the button block, and the same text on both. ⚠ if you need different mobile copy. |
| 2 | "În tendințe" pill links | (b) | Generic `section` + `text` + `button` blocks | Add a **pill** button style (1px border, small padding). Alternative: a menu picker so pills are managed in Navigation. Tell me which you prefer; I lean to the **menu picker**. |
| 3 | "Alege după ocazie": 4 portrait tiles with caps captions + "Vezi toate" link | (a)/(b) | `collection-list` | Works if each occasion is a **collection** (Seară & Cocktail, Nuntă & Cununie, Birou & Zi, Mărimi mari). Needs a 3:4 ratio and caps caption options. ⚠ If occasions aren't collections, I'll use `section` + image/link blocks instead. |
| 4 | "Alese de clientele noastre": **tabbed** product grid (Cele mai vândute / Noutăți / Rochii de seară / Blănuri / Paltoane), 8 cards, "Vezi toate produsele" | (c) | New section `iq-product-tabs` (reuses Horizon's product card) | Horizon's `product-list` shows one collection, with no tabs. Each tab is a block with a collection picker and an optional label override. Tabs follow the ARIA tabs pattern. Inactive panels load on first click via the Section Rendering API, so the first paint stays light. The button links to the active tab's collection. |
| 5 | Video **coverflow** ("Vezi cum cade materialul"): centre plays, auto-advances (3.8s), neighbours scaled + faded, click centre → lightbox with sound + controls, each clip links a product | (c) | New section `iq-video-reels` + block `iq-reel` (video, poster, product) | Per the brief: only the active `<video>` calls `play()`; others stay on poster; pause on hover, on tab hidden, and under `prefers-reduced-motion`. 5 visible ≥1280, 3 at 768–1279, 1 + peek + dots on mobile. Videos are Shopify-hosted (`video` setting). |
| 6 | **Fur band**: dark full-bleed, eyebrow + H2 + paragraph, collection cover tile (gradient + title + link), then products: cover + 3, then 5 | (c) | New section `iq-collection-band` (reuses product card; collection picker supplies tile image, title and products) | The cover tile uses the collection's own image field (native). Layout per the brief's table: cover+3 / 5 at ≥1280, cover+2 / 3 mid, carousel with **2:3** images on mobile. Uses the Dark colour scheme, so card text and pills invert via scheme vars. ⚠ The design uses an "Ultima bucată" flag on cards here (see §3). |
| 7 | **Hotspots** ("Ținuta completă"): photo with numbered dots + side list of 3 product cards, active one outlined, "Cumpără toată ținuta" | (b) | `product-hotspots` + `_hotspot-product` | Horizon shows hotspot popovers on the image only. Add a **side list** layout option: dots numbered and synced with the list, and an optional CTA (label + link). Each card has an optional eyebrow ("Rochia", "Pe deasupra", "Accesoriu") as a text setting on the hotspot block. |
| 8 | Reviews (Judge.me): "4,8 din 5 — X recenzii", stars, 3 review cards | (a) ⚠ | Judge.me **app block** in a `section` | Review content can only come from Judge.me. The custom card styling in the design depends on which Judge.me widget you have (Featured Carousel / Reviews Carousel are paid tiers). The store-wide headline rating comes from Judge.me's all-reviews badge, not theme data. I'll style Judge.me's output to match; I won't rebuild reviews. |
| 9 | Showroom block: vertical 9:16 video (click → lightbox) + eyebrow / H2 / text + address, hours, email with icons + "Vezi pe Google Maps" / "Contactează-ne" | (b) | `media-with-content` + `text` / `icon` / `button` blocks | Horizon handles the layout. Add an optional **open in lightbox** behaviour on the video, sharing the lightbox from #5. |
| 10 | FAQ accordion with +/− icons, centred heading | (a) | `section` + `accordion` (`icon: plus`) + `_accordion-row` | Horizon's accordion already has a plus icon option. I'll check it turns into a minus when open; if not, that's a one-line CSS change. |
| 11 | 4 icons + text (Livrare rapidă, Retur 14 zile, Plată securizată, 30 de ani) | (a) | `section` + `group` + `icon` + `text` blocks | Native. |
| 12 | Newsletter inside the footer, on black | (a) ⚠ | `footer` + `email-signup` block, Footer colour scheme | Native. ⚠ The "10% la prima comandă" code must be sent by a Shopify Email / Flow automation; the theme only collects the address. |

---

## 3. Product card (one component, every grid)

Horizon: `blocks/_product-card.liquid` with child blocks (gallery, title, price, swatches, …) and `snippets/quick-add.liquid`.

| Piece | Class | Notes |
|---|---|---|
| Image 3:4, hover swaps to second image | (a) | `_product-card-gallery` `image_ratio` + theme setting `show_second_image_on_hover`. |
| Quick-add "+" bottom-right on hover, always visible on mobile | (b) | Horizon has `quick_add` + `mobile_quick_add`. Restyle the button as the "+" square (56px desktop / 48px in the fur band). |
| Order: title → price (sale red + struck original) → size pills, left aligned | (a) | Block order in the card is merchant-arrangeable; `price` already shows compare-at. |
| Last row pins to the bottom, cards align across a row | (b) | Apply the `.iq-card` flex rules to Horizon's card (acceptance check 3). |
| **Size pills from variants**; out-of-stock pills disabled and visible; clicking a pill opens quick-add with that size preselected | (c) | New card block `_product-card-sizes`. It reads the option named by a setting (default "Mărime") and marks a size available if *any* variant with that size is available. Pills are `<button>`s with `aria-label` "Mărimea M" / "Mărimea M — stoc epuizat" (locale) and `aria-disabled` on sold-out sizes. Click opens Horizon's quick-add modal with the option preselected (small JS hook into `quick-add-component`). Single-size products show a "Mărime universală" pill (locale). |
| Badges: **sale** (−59%, red), **Precomandă** (dark), **Nou**, **Stoc epuizat** (white + border), "Ultima bucată" flag | (b) ⚠ | Horizon has sale + sold-out badges. Add Precomandă and Nou, with colours as theme settings. "−59%" percentage: badge setting *show sale as percentage*. "Ultima bucată" reuses the low-stock threshold logic at product level. ⚠ How is **pre-order** and **new** identified? See §10. |
| Colour swatches on card | — | The artboard logic computes them but the markup never renders them. I'll leave them off; the `swatches` block can be added in the editor if you want them. |

---

## 4. Quick-add modal + cart drawer

| Piece | Class | Horizon home | Notes |
|---|---|---|---|
| Modal: image, eyebrow "Adăugare rapidă", title, price/compare, colour swatches, size buttons (struck-through when sold out), "Ghid de mărimi", qty stepper, CTA, "Cumpără acum", "Vezi toate detaliile", delivery note | (b) | `snippets/quick-add-modal.liquid` (renders the product's own variant picker, so sizes come from **variants**, as the brief requires) | Additions: preselected size from the pill; size guide link (§5); "Cumpără acum"; "Vezi toate detaliile" link; delivery note as a theme setting (shared with the PDP). Mobile is a **bottom sheet** ("FOAIE DE JOS"): CSS variant of the same dialog. |
| CTA reads "Precomandă" for pre-order products | (b) | `add-to-cart-button` | Driven by the pre-order flag (§10). Label in locales. |
| "Cumpără acum" → checkout | (b) ⚠ | `buy-buttons` | Horizon offers **accelerated checkout** (Shop Pay / dynamic button), which isn't the plain "add this and go to checkout" button in the design. Proposal: a plain button that submits the same form with `return_to=/checkout`. It works with ramburs (cash on delivery) and every payment method. The accelerated checkout block stays available as an option. |
| Cart drawer: header with count, free-shipping progress ("Mai ai 105 lei până la livrarea gratuită"), line items with stepper, **recommendations** ("Îți recomandăm" with "Adaugă"), subtotal, tax note, "Finalizează comanda", "Continuă cumpărăturile" | (b) | `cart-drawer-section` + `_cart-products` / `_cart-summary` | Add: (1) a free-shipping bar with the **threshold as a setting**. ⚠ It must be kept in sync by hand with the shipping rate in admin; Liquid can't read shipping rates. (2) A recommendations strip: Product Recommendations API (`intent=complementary`, falling back to `related`) for the first cart item, with count and heading settings. (3) A "Continuă cumpărăturile" button. |

---

## 5. Product page (Produs / ProdusMobil)

Horizon: `sections/product-information.liquid` (blocks: gallery, title, price, variant-picker, buy-buttons, product-inventory, accordion, …).

| Piece | Class | Notes |
|---|---|---|
| Breadcrumb (Acasă / Rochii / Rochii de seară / product) | (c) ⚠ | Horizon has **no breadcrumbs**. New block `breadcrumbs`, usable on product + collection templates, with BreadcrumbList JSON-LD. Products have no single parent collection, so the trail uses the collection in the URL when there is one, otherwise a product metafield / first collection. ⚠ Confirm you want this. |
| Gallery: main + 4 thumbnails, zoom button, sale badge | (a) | `_product-media-gallery` (thumbnail layout + zoom). |
| Eyebrow "IQ Fashion · Rochii de seară" | (a) | `text` block with dynamic sources (vendor · type). |
| Rating "34 de recenzii" | (a) | Judge.me app block / `review` block. |
| Price + compare-at + "Economisești 1.150 lei" | (b) | `price` block: add a *show savings amount* setting (locale string with `{{ amount }}`). |
| Colour swatches + size buttons, sold-out sizes struck through | (a) | `variant-picker` (swatches for colour, buttons for size). |
| "Ghid de mărimi" next to the "Mărime:" label → modal with the size-chart image | (b) | Horizon's `popup-link` opens a page in a modal, but the brief wants an **image**. Proposal: a global theme setting `size_guide_image` (the 33333.png chart), optionally overridden per product via a metafield, plus a rich-text note. The link renders inside the variant picker's size label (needs a small hook in `variant-main-picker`). The same modal is reused from quick-add. |
| Quantity stepper + Add to cart + Buy now + wishlist heart in one row | (b) | `buy-buttons` + `quantity`. Buy now: as in §4. Heart: §7. |
| **Low-stock** line, only when the selected variant has < threshold units; "Ultima bucată în stoc" / "Ultimele N bucăți în stoc" | (b) ⚠ | `product-inventory` already reads the *selected* variant and has `inventory_threshold`. Changes: (1) comparison: Horizon uses `≤ threshold`, the brief says `< 5`. I'll keep Horizon's `≤` and default the setting to **4**, so the editor label stays honest; or I switch to `<`, your call. (2) Plural copy in `ro.json`, using `one` → "Ultima bucată în stoc" and `few/other` → "Ultimele {{ count }} bucăți în stoc". (3) Hide the line entirely when not low (design shows nothing otherwise, while Horizon shows "In stock"). (4) Confirm it re-renders on variant change (acceptance check 4). |
| Guarantees: delivery / return / showroom with Maps + Contact buttons | (a) | `text` + `icon` + `button` blocks in a `group`. |
| Details accordion: Descriere / Material și îngrijire / Livrare și retur | (a) | `accordion`: Descriere = product description; Material = product metafield (dynamic source); Livrare = shared text. |
| "Merge bine cu" (mobile) | (a) ⚠ | `product-recommendations` with `intent: complementary`. ⚠ Complementary products must be set in the **Search & Discovery** app. Only the mobile artboard shows this section; there's an empty "Completează ținuta" comment on desktop. I'll show it on both unless you say otherwise. |
| Reviews section | (a) | Judge.me app block. |
| **Sticky bar**: thumbnail · price (+ compare) · size selector · Add to cart, hidden while the in-page button is visible, sharing quantity | (b) | Horizon's `sticky-add-to-cart` already uses IntersectionObserver on the buy buttons and mirrors quantity (acceptance check 5). Add: a **size selector**: a popover on desktop, a bottom sheet ("Alege mărimea" + "Gata") on mobile, bound to the main variant picker so state stays single-sourced. Show it at all widths, per brief §4. Drop the variant title line, which the design doesn't show. |

---

## 6. Collection page (Colectie / ColectieMobil)

Horizon: `sections/main-collection.liquid` + `filters` block + `snippets/pagination-controls.liquid`.

| Piece | Class | Notes |
|---|---|---|
| Breadcrumb, H1, description, "1.898 produse" | (a)+(c) | `collection-title` / `_collection-info`; breadcrumb from §5. |
| Filter sidebar: Mărime, Culoare, Lungime, Ocazie, Preț, Disponibilitate; active chips + "Șterge tot" | (a) ⚠ | Native Storefront filtering, configured in **Search & Discovery**. Mărime/Culoare are variant options; Preț and Disponibilitate are native. ⚠ **Lungime** and **Ocazie** need product **metafields** filled per product. ⚠ "Doar reduceri" isn't a native filter; it needs a metafield or tag-based filter, or a separate Reduceri collection. Mobile: "Filtre" / "Sortează" bar opens Horizon's filter drawer (native). |
| Sort: Cele mai vândute / Cele mai noi / Preț ↑ / Preț ↓ / **Reducere mare** | (a) ⚠ | The first four are native Shopify sorts. **"Reducere mare" (biggest discount) doesn't exist** in Shopify sorting, so I'll drop it. |
| **Numbered pagination** with real `<a href="?page=N">`, "Produsele 1–48 din 1.898" | (a)+(b) | Horizon already renders numbered links with `paginate.parts` hrefs when `enable_infinite_scroll` is **false**. Changes: set the default to false in the template (the setting itself defaults to true); raise `products_per_page` max from 36 to **48** to match the design; add the range label (locale). |
| Grid 4 / 3 / 2 cols at ≥1280 / 768–1279 / <768 | (b) | Horizon grid columns setting + the 1280 breakpoint from §0. |
| SEO guide text below the grid ("Cum alegi rochia…") | (b) | A collection **metafield** (rich text) shown by a `text` block with a dynamic source, so each collection gets its own text. |

---

## 7. Wishlist (Favorite / FavoriteMobil)

| Piece | Class | Notes |
|---|---|---|
| Wishlist page: count, "Adaugă tot în coș", "Trimite lista", cards with remove (×), chosen variant text, sold-out → "Anunță-mă când revine", empty state, "Ți-ar putea plăcea" recommendations | (c) ⚠ | **Shopify has no native wishlist.** Two routes: **A. App** (Swym, Wishlist King, …) adds accounts sync, share-list and back-in-stock emails, and is themed via its app blocks. **B. Custom, theme-only**: localStorage list of product handles + variant; a `page.wishlist` template renders the products via the Section Rendering API. "Trimite lista" shares a URL with handles in the query; empty state and recommendations are settings. Limits of B: per-device only, and **no** back-in-stock emails ("Anunță-mă când revine" needs an app either way). I recommend **A** if back-in-stock matters, otherwise B. Your decision. |
| Heart icons (header, PDP) | (c) | Built for whichever route you pick. |

---

## 8. Search, contact, checkout

| Piece | Class | Horizon home | Notes |
|---|---|---|---|
| Search panel, empty state: **popular searches** (left) + recommended products (right) | (b) | `predictive-search-empty` + `snippets/predictive-search-empty-state.liquid` | Horizon's empty state shows products from `empty_state_collection`, which covers the recommended products. Add a "Popular searches" setting: a menu picker, so terms are managed in Navigation. |
| Results: product list left, **collection tiles right (portrait)**; "Vezi toate cele 189 de rezultate" | (b) | `predictive-search` | Horizon renders products + a collections carousel stacked. Change the desktop layout to 2 columns with portrait collection cards. Mobile: stacked, collections as a horizontal scroller (Horizon's carousel already scrolls). Collection tiles depend on collection images (same fallback as the mega menu). |
| Full search results page | (a) | `search-results` | Turn off infinite scroll for consistency. |
| Contact: form (Nume, Telefon, E-mail*, Comentariu*), required privacy consent, info panel, socials, map + showroom, 3 shortcut cards | (a)+(b) ⚠ | `page.contact` template + `contact-form` | The fields match Horizon's form exactly. Add a required **consent checkbox** with a rich-text label (b). ⚠ **Google Maps embed sets third-party cookies**, so it must not load before consent. Proposal: a static map image + "Deschide în Google Maps" link by default, with the embed loading only after consent. Shortcut cards: `group` + link blocks (a). |
| Checkout | n/a ⚠ | Checkout editor (branding) | Shopify Basic: branding only (logo, colours, Jost font, button style). The artboard's 3-step "Date / Livrare / Plată" layout **can't be reproduced**: Shopify's one-page checkout is fixed. The "Precomandă · 7 zile" line label would need a line-item property added at add-to-cart; I can add that if you want it. No theme code goes into checkout. |

---

## 9. Footer & legal

| Piece | Class | Notes |
|---|---|---|
| Logo text, description, social icons | (a) | `logo` / `text` / `social-links` blocks (social URLs from theme settings). |
| Link columns Cumpără / Ajutor / Legal | (a) | `menu` blocks: three Shopify **menus** (brief requirement). |
| ANPC **SAL** + **SOL** badges (`target="_blank" rel="nofollow"`) | (c) small | New footer block `legal-badges`: two image settings (merchant uploads the official SVGs). The URLs are pre-filled with the required addresses and the link attributes are fixed in code. It's a legal requirement, so the block's preset ships in the footer by default. |
| Trader identification (ELVE STYLE SRL, CUI, Nr. Reg. Com. J…) | (a) | `text` block in the footer bottom row. I need the real CUI and J-number from you; I won't invent them. |
| Copyright "© 2026 IQ Fashion… Website realizat de Clinica de marketing" | (a) | `footer-copyright` + text; year is dynamic. |
| **Cookie consent** | (a) ⚠ | Use **Shopify's native cookie banner** (Settings → Customer privacy). It's free on Basic, works with the Customer Privacy API, and Shopify's Google/Meta channels already respect it. Building one in the theme would duplicate it and could leak analytics before consent. I'll style it to match and make sure nothing custom (video embeds, Maps) loads before consent. No theme banner. |

---

## 10. Decisions I need from you (all the ⚠ items)

1. **Tokens → colour schemes** (§0): OK to express the palette as Horizon colour schemes instead of hardcoded hex?
2. **Breakpoints** (§0): keep Horizon's 750 as "mobile" and add 1280 only where needed, instead of retrofitting 768?
3. **Pre-order and "Nou" flags** (§3/§4): how should the theme tell a product is pre-order? Options: product tag `precomanda`, a boolean product metafield `custom.precomanda`, or "selling when out of stock" (`inventory_policy: continue`) on a 0-stock variant. I recommend the **metafield** (explicit, editable per product). For "Nou": tag `nou`, or "created within N days" as a theme setting.
4. **Canonical main menu** (§1): 8 items (Main / MeniuMobil) or 6 (MegaMenu)? And should single-child items become plain links?
5. **Occasions** (§2.3): are Seară & Cocktail / Nuntă & Cununie / Birou & Zi real collections?
6. **Trending pills** (§2.2): button blocks or a Navigation menu?
7. **Wishlist** (§7): app (A) or theme-only localStorage (B)?
8. **Low-stock comparison** (§5): keep Horizon's `≤` with default 4, or switch to strict `<` with default 5?
9. **Breadcrumbs** (§5/§6): build them (custom)?
10. **Filters** (§6): you'll need product metafields for *Lungime* and *Ocazie*. "Doar reduceri" filter and "Reducere mare" sort aren't native; OK to drop the sort, and make "reduceri" a collection?
11. **Collection images** (brief §5): Horizon's fallback (first product image) makes the photo menu and search work today, but the crops will be inconsistent. Should I add a theme-wide **placeholder image** setting as a further fallback? Uploading real 600×800 collection images remains the proper fix.
12. **Trader data**: CUI and J-number for the footer.
13. **Judge.me plan**: which widgets you have, since that decides how closely the review cards can match.

---

## 11. Build summary

| Class | Count | Items |
|---|---|---|
| **(a)** configure only | ~20 | Hero base, transparent header, header layout, collection list, accordion FAQ, icon row, media-with-content, footer menus / newsletter / social, gallery, variant picker, accordion details, product recommendations, filters, sorting, numbered pagination, contact form, search results, Shopify cookie banner, checkout branding |
| **(b)** extend Horizon | ~17 | Colour schemes / tracking / layout settings, announcement marquee mode, menu highlight, mega menu ratio + column logic, drawer view-all + secondary menu + footer text, hero sizing + mobile image, pill button style, hotspots side list, card quick-add style + alignment + extra badges, quick-add additions, Buy now, cart drawer free-shipping + recommendations, price savings, size guide image modal, low-stock copy/visibility, sticky bar size selector, collection range label + per-page 48 + SEO metafield text, search 2-column layout + popular searches, contact consent |
| **(c)** custom | 7 | `iq-product-tabs`, `iq-video-reels` (+ lightbox), `iq-collection-band`, `_product-card-sizes`, `breadcrumbs`, `legal-badges`, wishlist (route B, or app theming for A) |

Proposed build order once approved: foundations (§0) → product card + quick-add (used everywhere) → header / mega menu / drawer → PDP → collection → homepage sections → cart drawer → search → footer / legal → wishlist → contact. I'd check each step against the acceptance criteria as I go.
