# Anesthesia Study Co. LLC Website

A marketing website and digital storefront for **Anesthesia Study Co. LLC**, an educational anesthesia tools and study resources business.

## What It Is

- **index.html** — Landing page with hero, purchase buttons, app overview, marketplace links, social, about, and support sections
- **store.html** — Digital store: pick study guides, one-pagers, mind maps, interactive apps, or bundles and pay by card
- **thank-you.html** — Post-payment page that unlocks every purchased file immediately
- **privacy.html** — Privacy policy page (required for the Apple App Store support URL)
- **netlify/functions/** — Catalog, checkout, order-fulfilment, and file-download endpoints
- **db/** — Drizzle schema for the order ledger (Netlify Database / Postgres)

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

### 2. Upload the product files

Each catalog entry names a `blobKey`. Upload the matching file to the `digital-products` blob store:

```bash
netlify blobs:set digital-products guide-pharmacology.pdf --input ./files/pharmacology.pdf
netlify blobs:set digital-products onepager-induction.pdf --input ./files/induction.pdf
netlify blobs:set digital-products mindmap-airway.pdf --input ./files/airway-map.pdf
netlify blobs:set digital-products app-planning-workbook.html --input ./files/workbook.html
# ...one per product
netlify blobs:list digital-products     # verify
```

Until a file is uploaded, a customer who buys it still completes payment and is shown a clear
message asking them to email support — the purchase is never silently lost.

### 3. Check the Stripe dashboard settings

Enable the payment methods you want, and turn on Stripe Tax if you need VAT or sales tax collected
on digital goods (this is not configured in code).

## Editing the Store

`netlify/lib/catalog.ts` is the single source of truth for products, prices, descriptions, and
categories. Change it and the storefront updates itself — no HTML edits needed.

Prices are **only** read from this file, server-side. The browser sends product ids to
`/api/checkout` and never a price, so a tampered request cannot change what is charged.

To add a product: append an entry to `PRODUCTS`, then upload its file under the `blobKey` you chose.
To add a category: append to `CATEGORIES` and use its `id` as the `categoryId` on products. Landing
page buttons can deep-link to any category, e.g. `store.html#one-pagers`.

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
