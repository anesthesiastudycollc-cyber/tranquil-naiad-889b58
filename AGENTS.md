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
│   │   ├── marketplaces.ts         # Etsy/Shopify credentials, token refresh, API clients
│   │   ├── marketplace-sync.ts     # Matches live listings to maps, replaces their photos
│   │   ├── tokens.ts               # HMAC-signed download links
│   │   └── fulfilment.ts           # Resolves a paid Stripe session to catalog items
│   ├── functions/                  # catalog, mind-maps, mind-maps-export, checkout, order,
│   │                               #   download, setup-check, marketplace-sync
│   └── database/migrations/        # Applied automatically by Netlify at deploy
├── assets/
│   ├── mind-maps/                  # Mind map artwork — SOURCE ONLY, never served
│   ├── previews/                   # Generated 560px blurred — this site's imagery
│   └── listing-images/             # Generated 2000px blurred — for Etsy/Shopify upload
├── scripts/
│   └── generate-previews.mjs       # Rebuilds both generated folders from the artwork
├── db/                             # Drizzle schema + client for the order ledger
├── scripts/
│   ├── build-previews.mjs          # Burns blur + watermark into previews at deploy time
│   └── font5x7.mjs                 # Bitmap font the watermark is drawn from
├── assets/mind-maps/               # SOURCE artwork — never published as-is
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
- **A live marketplace listing image can only be fixed through that marketplace's API.** Etsy and
  Shopify listings display a file uploaded to them at creation time and hosted by them, so changing
  the export only affects listings created *from* the export afterwards. Two things address this:
  `assets/listing-images/` holds 2000px blurred copies at Etsy's requested size for manual
  re-upload, and `/api/marketplace-sync` pushes them through the Etsy and Shopify APIs. Never tell
  the owner that an ordinary code change has fixed a live listing — only a sync run or a manual
  re-upload does.
- **`/api/marketplace-sync` writes to a live shop, so it is guarded three ways.** It requires
  `MARKETPLACE_SYNC_TOKEN` (compared without early exit) and 401s otherwise; it is a dry run unless
  the request is a POST carrying `confirm=1`; and it replaces only the primary photo unless
  `scope=all`. It matches a listing to a map by SKU (`map-05`, which the export writes) with a
  normalised-title fallback, and reports anything unmatched or ambiguous rather than guessing —
  putting the wrong artwork on a listing is worse than leaving it sharp. Writes are batched
  (`limit`, default 10) because Etsy rate-limits and a function invocation is time-boxed.
- **Etsy's durable credential is the refresh token, not the access token.** Access tokens last an
  hour, and Etsy rotates the refresh token on every use, so `etsyAccessToken()` persists the rotated
  value to the `marketplace-tokens` Blobs store and prefers it over `ETSY_REFRESH_TOKEN`. Without
  that the environment variable goes stale and the sync starts failing weeks later for no visible
  reason. A failed refresh clears the stored copy so the fallback is the variable the owner can
  actually replace.
- **Shopify images are replaced with `fileUpdate`, not by upload-and-delete.** The REST product
  image endpoints are retired, and swapping `originalSource` behind an existing media id keeps the
  media's position — uploading a new image and deleting the old one moves the product's featured
  photo to the end. `SHOPIFY_API_VERSION` overrides the pinned version when Shopify retires one.
- **Keep dependencies few and deliberate.** The site was originally dependency-free; npm exists now
  only because payments and digital delivery require it (Stripe, Netlify Blobs, Netlify Database),
  and `sharp`, which runs at build time only to watermark previews. Hold that line — no bundlers,
  no CDN scripts, no UI libraries.
- **Preview protection is burned into the pixels at build time, never done in CSS.** The Netlify
  build runs `scripts/build-previews.mjs`, which rewrites every file in `assets/mind-maps/` in the
  disposable build workspace as a downscaled, blurred, watermarked copy, so the deploy only ever
  contains protected images. Doing it in CSS — as the gallery once did — protects nothing: the rule
  can be switched off in devtools, and it does not apply at all to the image's own URL or to a
  `/.netlify/images?url=…&w=4000` request. For the same reason, do not add a lightbox or any
  "view larger" affordance that reaches for a second, cleaner source. The watermark is drawn from a
  hand-coded bitmap font (`scripts/font5x7.mjs`) rather than a typeface, because a build machine
  with no fonts installed would silently render a blank watermark and publish naked artwork.
  `--deploy` refuses to run unless git holds a clean copy of the artwork it is about to overwrite.
- **The marketplace listing photo is a square crop of the middle of the map**, written to
  `assets/mind-maps/listing/` by the same script. Blur hides the fine print, but a full-frame photo
  still gives away the layout, which is the thing being sold. Blur sigma is scaled by magnification
  (`blurFor()`), so the crop is no more legible than the wide preview despite being enlarged. The
  gallery on `mind-maps.html` deliberately keeps the wide variant — a shopper on our own site has
  already found the product page and needs to see what shape the map is.
- **Every marketplace image URL comes from `listingImageUrl()` in `netlify/lib/mind-maps.ts`**, and
  resolves to `/assets/listing-images/<file>.jpg`. Both the `Image Src` / `Image URL` columns of
  `/api/mind-maps-export` and the photo `/api/marketplace-sync` uploads call it, so a sheet and a
  sync can never disagree about which picture a map has. Never point a marketplace column at
  `/assets/mind-maps/...`: `netlify.toml` rewrites that path to `assets/previews/` with `force`, so
  anything under it that has no same-named preview — the `listing/` crops included — 404s.
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
- **Shopify and Etsy listing *content* is synced by export file; only the *image* is synced by API.**
  `/api/mind-maps-export` generates upload sheets from the same list the site sells from, and the
  owner reviews the file before uploading. A full content sync would rewrite live titles, prices,
  and descriptions unattended — still deliberately not done. `/api/marketplace-sync` is the narrow
  exception, added at the owner's explicit request after three asks: it changes listing photos and
  nothing else, because a sharp listing photo is the one thing a code change genuinely could not
  fix and it was costing sales.
- **Shopify and Etsy are synced by export file, not by API.** `/api/mind-maps-export` generates
  upload sheets from the same list the site sells from. A live sync would need per-marketplace app
  credentials and would rewrite live listings unattended — deliberately not done. It also means
  listings already published on a marketplace keep whichever photo was uploaded at the time —
  nothing in this repo can retroactively protect them; the shop owner has to replace the photo.
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
