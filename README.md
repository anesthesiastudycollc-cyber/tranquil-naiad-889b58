# Anesthesia Study Co. LLC Website

A marketing website and digital storefront for **Anesthesia Study Co. LLC**, an educational anesthesia tools and study resources business.

## What It Is

- **index.html** — Landing page with hero, purchase buttons, app overview, marketplace links, social, about, and support sections
- **store.html** — Digital store: pick mind maps, study guides, cram sheets and quick references, bundles, or interactive resources and pay by card
- **mind-maps.html** — The individual mind map collection: browse previews, buy one for $2.00 or any five for $9.00, and pay by card on site
- **thank-you.html** — Post-payment page that unlocks every purchased file immediately
- **privacy.html** — Privacy policy page (required for the Apple App Store support URL)
- **netlify/functions/** — Catalog, mind maps, channel export, checkout, order-fulfilment, and file-download endpoints
- **db/** — Drizzle schema for the order ledger (Netlify Database / Postgres)

New to the setup? **[STRIPE-SETUP.md](STRIPE-SETUP.md)** switches on card payments step by step,
and **[MIND-MAPS-SETUP.md](MIND-MAPS-SETUP.md)** covers uploading files, testing a purchase, and
syncing Shopify and Etsy — both written in plain language. Once deployed,
`/api/setup-check` reports what is and is not configured without revealing any key.

## Key Technologies

- Plain HTML5 with inline CSS — no frontend framework or bundler
- Netlify Functions (TypeScript) for checkout and digital delivery
- Stripe Checkout for card payments
- Netlify Blobs for the product files, Netlify Database for the order ledger
- Responsive dark glassmorphism design with cyan/purple/yellow brand colors

## Running Locally

```bash
npm install
netlify dev --port 8889
```

The static pages work without any configuration. The storefront loads its catalog from
`/api/catalog` and shows an explanatory banner when card checkout is not configured.

## Going Live: Three Steps

### 1. Set the environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes | Enables checkout. Until it is set, the store can be browsed but not bought from. |
| `DOWNLOAD_SIGNING_SECRET` | Recommended | Signs download links. If unset, a key is derived from `STRIPE_SECRET_KEY` — which means rotating the Stripe key invalidates every outstanding download link. |

```bash
netlify env:set STRIPE_SECRET_KEY "sk_live_..."
netlify env:set DOWNLOAD_SIGNING_SECRET "$(openssl rand -hex 32)"
```

Use a `sk_test_...` key plus Stripe's test cards to trial the whole flow before going live.

Visit `/api/setup-check` after deploying to confirm the configuration: it asks Stripe whether the
key actually authenticates, whether the account can take live charges, and which product files are
still missing from the blob store. It never renders a key or any part of one.

### 2. Upload the product files

Each catalog entry names a `blobKey`, and `/api/download` serves whatever is stored in the
`digital-products` blob store under that key. Until a file is uploaded, a customer who buys it still
completes payment and is shown a clear message asking them to email support — the purchase is never
silently lost, but it is also not instant, which is the whole point of a digital product.

`scripts/upload-downloads.mjs` stocks the store in one command. It is a dry run unless `--confirm`
is passed, because what it writes is live for real customers the moment it lands:

```bash
export NETLIFY_SITE_ID=...      # netlify status
export NETLIFY_AUTH_TOKEN=...   # Netlify → User settings → Applications

npm run downloads:upload                        # report what is missing, upload nothing
npm run downloads:upload -- --confirm           # upload it
npm run downloads:upload -- --only map-05       # one product
npm run downloads:upload -- --confirm --force   # replace keys already in the store
```

It looks for each product's file in one of two places:

| Products | Source | Notes |
| --- | --- | --- |
| The 89 individual mind maps | `assets/mind-maps/<blobKey>` | Already in the repository — nothing to stage |
| Everything else | `product-files/<blobKey>` | Git-ignored; drop the PDFs, HTML, and ZIPs in under exactly the names the dry run prints |

Run it **from a clean checkout, never from a Netlify build**. `previews:deploy` overwrites the
artwork folder in place with watermarked previews, so uploading from a build machine would sell
buyers the preview; the script refuses to run when `NETLIFY=true` or when git shows the artwork
modified, for exactly that reason.

Single files can still go up by hand, and `netlify blobs:list digital-products` verifies either way:

```bash
netlify blobs:set digital-products guide-pharmacology.pdf --input ./files/pharmacology.pdf
netlify blobs:list digital-products
```

### 3. Check the Stripe dashboard settings

Enable the payment methods you want, and turn on Stripe Tax if you need VAT or sales tax collected
on digital goods (this is not configured in code).

## Editing the Store

`netlify/lib/catalog.ts` is the single source of truth for products, prices, descriptions, and
categories. Change it and the storefront updates itself — no HTML edits needed.

`netlify/lib/mind-maps.ts` is the equivalent for the individual mind maps sold on
`mind-maps.html`. They are deliberately excluded from `/api/catalog` — nearly a hundred $2 items
would bury the study guides on `store.html` — but they are ordinary catalog products otherwise, so
checkout, fulfilment, and download treat them identically. Set `published: false` to withdraw a map
from sale.

Prices are **only** read from these files, server-side. The browser sends product ids to
`/api/checkout` and never a price, so a tampered request cannot change what is charged.

The storefront sections are Mind Maps, Study Guides, Cram Sheets & Quick References, Bundles, and
Interactive Resources — the same way the shop describes itself on Etsy, so a product is filed in one
obvious place rather than in whichever category matched the file format.

To add a product: append an entry to `PRODUCTS` with a stable internal id (`cram-renal-diuretics`,
never an Etsy listing number or a slug of the title), then upload its file under the `blobKey` you
chose. `published: false` keeps a record in the catalog but off the storefront, which is how a
product is staged before its file exists. To add a category: append to `CATEGORIES` and use its `id`
as the `categoryId` on products. Landing page buttons can deep-link to any category, e.g.
`store.html#cram-sheets`; a renamed category keeps its old anchor alive through `CATEGORY_ALIASES`.

### Reconciling the three catalogs

The website, Stripe, and Etsy are separate inventories — adding a product to Etsy does not add it to
this site. `scripts/reconcile-catalog.mjs` builds one master table across all three, keyed by the
internal id, and reports what is missing where:

```bash
node scripts/reconcile-catalog.mjs --out reconciliation.csv          # website + Stripe
node scripts/reconcile-catalog.mjs --etsy-file etsy-listings.json    # all three
```

It is read-only and changes nothing. The Etsy leg takes an export file rather than calling the API
on purpose: Etsy rotates the refresh token on every use and the site stores the rotated value, so a
script refreshing from outside that store would quietly break `/api/marketplace-sync`.

## How a Purchase Works

1. The storefront POSTs the chosen product ids to `/api/checkout`, which prices them from the
   server-side catalog and creates a Stripe Checkout session.
2. Stripe collects payment and redirects to `/thank-you.html?session_id=...`.
3. `/api/order` confirms with Stripe that the session is paid, records the order, and returns one
   signed download link per item.
4. `/api/download` re-checks the link signature *and* re-confirms with Stripe that the order paid
   for that specific product before streaming the file from Netlify Blobs.

Download links expire after 30 days. The thank-you URL can be revisited during that window to get
fresh links.

## Database Migrations

The order ledger lives in Netlify Database. After changing `db/schema.ts`:

```bash
npm run db:generate -- --name describe_your_change
```

Netlify applies migrations from `netlify/database/migrations/` automatically at deploy time. Never
apply them by hand.

## Marketplace and Social Links

Etsy, Shopify, and Amazon listings are linked from the landing page. Placeholder social links are
rendered as `<span class="btn soon">` elements — swap them to `<a>` tags once the Facebook, TikTok,
and Pinterest profiles exist.

## Keeping Shopify and Etsy in Step

`/api/mind-maps-export?format=shopify` returns a Shopify product import CSV and
`?format=etsy` returns a listing worksheet, both generated from `netlify/lib/mind-maps.ts`. Edit
that list, re-export, and upload — the three channels describe the same maps at the same price
because they share one source.

There is no live API sync on purpose. Shopify and Etsy each require their own app credentials, and
a background job that silently rewrites live listings is a far larger commitment than a file the
shop owner reviews before uploading. The export image column points at the blurred, watermarked
2000px JPEGs under `/assets/listing-images/` — the same file `/api/marketplace-sync` uploads, built
by the same helper, so a sheet and a sync can never put two different pictures on one map. The
full-resolution artwork belongs in each channel's digital-delivery slot, not in its photo gallery.

Note that `/assets/mind-maps/...` is never a valid image column: `netlify.toml` rewrites that whole
path to `assets/previews/`, and anything under it without a same-named preview 404s by design.

## Preview Protection

`assets/mind-maps/` holds the source artwork, and none of it is published as-is. The Netlify build
command runs `scripts/build-previews.mjs`, which rewrites each image in the disposable build
workspace, producing two protected variants:

| Variant | Where it goes | What it is |
| --- | --- | --- |
| Gallery preview | `assets/mind-maps/<file>` | 900px on the long edge, blurred, tiled `ANESTHESIASTUDYCO.COM` watermark and a `PREVIEW` band |
| Listing photo | `assets/mind-maps/listing/<file>` | Square 1200px crop of the middle of the map, blurred proportionally harder, same watermark |

Because the degradation is in the pixels, it holds for a screenshot, a right-click save, a hotlink,
and an Image CDN request at any width — none of which a CSS `filter` survives. The listing crop
adds the one thing blur alone does not solve on a marketplace: it never shows the full landscape,
so the arrangement of the map — the thing being sold — is not given away by the listing photo.

The files buyers pay for are untouched by this: they live in the `digital-products` blob store and
are served full-resolution and clean by `/api/download`.

```bash
npm run previews          # watermarked copies in preview-exports/ (+ preview-exports/listing/)
npm run previews:deploy   # what the build runs; overwrites assets/mind-maps in place
```

`previews:deploy` is destructive by design and refuses to run outside a Netlify build, or when git
does not already hold a clean copy of the artwork it would overwrite. Blur strength, output size,
and how much of the map the listing crop shows are set with `PREVIEW_BLUR_SIGMA`,
`PREVIEW_MAX_EDGE`, `PREVIEW_LISTING_SIZE`, and `PREVIEW_LISTING_ZOOM` (a fraction of the short
edge; `1` takes the largest square that fits, `0.6` shows considerably less).

## The Build's Link Check

The deploy runs `npm run links:check` before anything else, and a failure stops it while the
previous deploy keeps serving.

```bash
npm run links:check
```

It exists because the landing page once shipped with its "Browse Mind Maps" and Amazon buttons
pointing at sections an edit had deleted. The HTML was still valid and the deploy was still green;
the buttons simply did nothing. So `scripts/check-links.mjs` asserts the three things that would
have caught it: every same-page `#anchor` has an element with that id, every local file a page links
to or loads an image from is on disk, and no page ends early or carries a placeholder comment where
content should be.

A hash on *another* page is checked only as far as the file. `store.html#study-guides` has no
matching id in the file on disk and never will — those sections are built from `/api/catalog` after
load, which is also why `mind-maps.html` resolves its own `#map-05` deep links in JavaScript once
the grid exists.
