# AGENTS.md — Anesthesia Study Co. LLC Website

## Project Architecture

Static HTML pages plus a small set of Netlify Functions that run the digital storefront.
No frontend framework and no bundler for the pages themselves.

```
/
├── index.html                      # Landing page
├── store.html                      # Digital store (renders itself from /api/catalog)
├── mind-maps.html                  # Mind map collection (renders itself from /api/mind-maps)
├── thank-you.html                  # Post-payment instant downloads
├── privacy.html                    # Privacy policy (Apple App Store support URL)
├── STRIPE-SETUP.md                 # Plain-language payment setup guide for the shop owner
├── MIND-MAPS-SETUP.md              # Plain-language setup guide written for the shop owner
├── netlify/
│   ├── lib/
│   │   ├── catalog.ts              # SOURCE OF TRUTH for products and prices
│   │   ├── mind-maps.ts            # SOURCE OF TRUTH for the individual mind maps
│   │   ├── stripe.ts               # Stripe client + not-configured handling
│   │   ├── tokens.ts               # HMAC-signed download links
│   │   └── fulfilment.ts           # Resolves a paid Stripe session to catalog items
│   ├── functions/                  # catalog, mind-maps, mind-maps-export, checkout, order,
│   │                               #   download, setup-check
│   └── database/migrations/        # Applied automatically by Netlify at deploy
├── assets/
│   ├── mind-maps/                  # Mind map artwork — SOURCE ONLY, never served
│   ├── previews/                   # Generated 560px blurred — this site's imagery
│   └── listing-images/             # Generated 2000px blurred — for Etsy/Shopify upload
├── scripts/
│   └── generate-previews.mjs       # Rebuilds both generated folders from the artwork
├── db/                             # Drizzle schema + client for the order ledger
├── netlify.toml
├── README.md
└── AGENTS.md
```

## Coding Conventions

- Page styles are **inline `<style>` blocks** inside each HTML file — no external CSS files.
- CSS custom properties (`--cyan`, `--purple`, `--card`, etc.) are re-declared in `:root` per page.
  Each file stays self-contained rather than sharing a stylesheet.
- Page JavaScript is inline, vanilla, and dependency-free. `store.html`, `mind-maps.html`, and
  `thank-you.html` carry real logic (cart, checkout, download rendering); `index.html` and
  `privacy.html` have only the footer-year script.
- Functions are `.mts` with in-code `config.path` routing under `/api/*`. Shared helpers live in
  `netlify/lib/*.ts` and are imported with a `.js` extension (`../lib/catalog.js`).
- Placeholder social links are rendered as `<span class="btn soon">` elements — swap to `<a>` tags
  when real URLs are available.

## Non-Obvious Decisions

- **Product imagery is obscured in the file, never in CSS.** `assets/mind-maps/` holds the artwork
  and is never served: `netlify.toml` rewrites `/assets/mind-maps/*` to `/assets/previews/*`, whose
  files are downscaled, Gaussian-blurred, and watermarked by `scripts/generate-previews.mjs`. Every
  public surface points at a generated copy — the gallery, the eight landing page cards, the Stripe
  Checkout line item image, and the export image columns. The CSS `filter: blur()` still on
  `mind-maps.html` is cosmetic only and must never be the thing relied on; a CSS filter runs after
  the sharp bytes have already reached the browser. The rewrite fails safe: a file with no generated
  preview 404s rather than falling through to the artwork. `sharp` is intentionally not in
  `package.json` — install it with `--no-save` for the run, and commit the regenerated output.
- **A marketplace listing image cannot be fixed from this repo.** Etsy and Shopify listings display
  a file uploaded to them at creation time and hosted by them, so changing the export only affects
  listings created *from* the export afterwards. `assets/listing-images/` exists for this: 2000px
  blurred copies at Etsy's requested size, for the shop owner to re-upload by hand. Do not tell the
  owner that a code change has fixed a live listing.
- **Keep dependencies few and deliberate.** The site was originally dependency-free; npm exists now
  only because payments and digital delivery require it (Stripe, Netlify Blobs, Netlify Database).
  Hold that line — no bundlers, no CDN scripts, no UI libraries.
- **Prices live only in `netlify/lib/catalog.ts` and `netlify/lib/mind-maps.ts`.** The browser posts
  product **ids** to `/api/checkout`; the server looks each one up and builds the Stripe line items.
  Never accept a price, name, or quantity from the client — that is the whole reason the storefront
  fetches `/api/catalog` and the mind map page fetches `/api/mind-maps` instead of hardcoding
  products in HTML.
- **Mind maps are catalog products that skip the catalog listing.** `mind-maps.ts` products resolve
  through `getProduct()` so checkout, fulfilment, and download treat them normally, but they are
  excluded from `publicCatalog()` — 89 two-dollar items would bury the study guides on `store.html`.
- **The 5-for-$9 mind map saving is applied as a Stripe discount, not a bundle line item.** Each map
  stays its own $2 line so a paid line always names exactly one product, which is what fulfilment
  reads to decide download entitlement. A bundle line item would cover five products at once and
  break that mapping. Stripe rejects `discounts` alongside `allow_promotion_codes`, so the automatic
  saving takes precedence over promo codes when it applies.
- **Shopify and Etsy are synced by export file, not by API.** `/api/mind-maps-export` generates
  upload sheets from the same list the site sells from. A live sync would need per-marketplace app
  credentials and would rewrite live listings unattended — deliberately not done.
- **Stripe is the authority on entitlement, not the database.** `/api/download` re-retrieves the
  Checkout session and confirms it paid for that exact product. The `orders` table is a ledger for
  bookkeeping only, and its write in `/api/order` is deliberately best-effort inside a `try/catch`
  so a database problem can never block a paying customer's download.
- **Download links are stateless HMAC tokens** (30-day expiry), so there is no session store to
  maintain. `DOWNLOAD_SIGNING_SECRET` should be set explicitly; the fallback derives a key from
  `STRIPE_SECRET_KEY`, which couples link validity to Stripe key rotation.
- **`/api/setup-check` is the owner-facing configuration report** — it verifies the Stripe key by
  calling Stripe rather than by checking the variable exists, and lists product files still missing
  from Blobs. It is unlinked from the site nav and must never render a key or any part of one.
- **The store degrades gracefully.** Without `STRIPE_SECRET_KEY` the catalog still renders and the
  page explains that card checkout is off, pointing customers at Etsy and email. Endpoints return
  503 with an actionable message rather than throwing.
- **`/api/download` returns HTML, not JSON,** on error — it is followed directly by a browser from a
  download button, so a human reads the failure.
- **Product files are not in the repo.** They live in the `digital-products` Netlify Blobs store,
  keyed by each catalog entry's `blobKey`. A missing file yields a clear support message after a
  successful payment rather than a hard error.
- **Category deep-links** (`store.html#one-pagers`) are resolved in JavaScript after the catalog
  fetch, because the product sections do not exist in the initial HTML. Adding a category to
  `CATEGORIES` makes its anchor work automatically.
- **Privacy policy effective date** is currently `2026-07-25`, bumped when on-site card payments were
  added. Update it manually whenever the policy content changes.
- **Apple Support URL** points to `https://anesthesiastudyco.com/#support` — required for iOS App
  Store listing. Do not remove the `#support` anchor or the support section `id`.
- **Educational disclaimer** ("not medical advice") appears in the landing hero, the store page, and
  the privacy policy — keep all three in sync if wording changes.
- The `<footer>` year is set dynamically via a small inline `<script>` on every page.

## Key URLs

- Etsy shop: `https://www.etsy.com/shop/AnesthesiaStudyCo?ref=seller-platform-mcnav`
- Support email: `admin@anesthesiastudyco.com`
- Domain: `https://anesthesiastudyco.com`
