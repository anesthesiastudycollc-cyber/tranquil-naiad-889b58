# Mind Map Artwork (source files)

This folder holds the mind map artwork the site works from. **Nothing in here is
served to the public.**

`netlify.toml` rewrites `/assets/mind-maps/*` to `/assets/previews/*`, so a
request for the original file name returns the blurred, watermarked preview
instead. That rewrite is the only thing standing between this folder and a free
download, so leave it in place.

## The three folders

| Folder | Contents | Public? |
| --- | --- | --- |
| `assets/mind-maps/` | Artwork exactly as exported. Source only. | No — rewritten to the preview |
| `assets/previews/` | Generated: 560px, blurred, watermark burned in | Yes — what this website shows |
| `assets/listing-images/` | Generated: 2000px, blurred, watermark burned in | Yes — what you upload to Etsy and Shopify |

The two generated folders are never edited by hand. Everything public reads from
them: the gallery on `/mind-maps.html`, the eight cards on the landing page, the
product image on the Stripe checkout page, and the image columns in the Shopify
and Etsy upload sheets from `/api/mind-maps-export`.

The full-resolution file a buyer actually receives is not in this repository at
all — it lives in the `digital-products` Netlify Blobs store.

## Marketplaces need the files uploaded, not just the link

Changing this repository fixes this website. It does **not**, on its own, change a
listing that is already live on Etsy or Shopify. Those listings show a photo that
was uploaded to the marketplace when the listing was created and is hosted by
them, so only that marketplace's API can replace it.

`/api/marketplace-sync` does exactly that: it matches each live listing to a map
by SKU and uploads the matching file from `assets/listing-images/`. It needs Etsy
and Shopify credentials, is a dry run until confirmed, and is documented in
MIND-MAPS-SETUP.md. Replacing the photos by hand from `assets/listing-images/`
remains a supported alternative.

## After adding or replacing artwork

```
npm install --no-save sharp
node scripts/generate-previews.mjs
```

Then commit the new source file and both regenerated derivatives. A source file
with no matching preview will 404 on the site, because the rewrite has nothing to
point at — which is the safe failure, not a leak.

Blur strength and watermark text are constants at the top of
`scripts/generate-previews.mjs`. If a preview ever looks too readable, lower
`BLUR_DIVISOR` and regenerate — do not rely on the CSS blur in the page, which is
cosmetic and can be switched off by anyone with a browser's developer tools.

## Filenames

Name files in sequence so they match the catalog in `netlify/lib/mind-maps.ts`:

```
mind-map-01.png
mind-map-02.png
...
mind-map-126.png
```

Gaps are fine, and files can arrive out of order — a filename with no catalog entry never
renders, and a catalog entry with no file must stay `published: false`. Numbers past 99 are
not zero-padded, so the folder does not sort in numeric order; the grid order comes from the
`MIND_MAPS` array, not the filesystem.

The landing page also shows eight images named `featured-*`. Those are generated
from URLs listed in `scripts/generate-previews.mjs` rather than from this folder,
because the landing page used to hot-link them sharp from the Shopify CDN.

## Then edit the catalog

Open `netlify/lib/mind-maps.ts` and find the `MIND_MAPS` array. For each map set
`file`, `title`, and `published`. Prices live just above it
(`MIND_MAP_UNIT_AMOUNT`, `MIND_MAP_BUNDLE_SIZE`, `MIND_MAP_BUNDLE_AMOUNT`) and
feed the page, the exports, and what Stripe charges from that one place.

Two things are worth checking before publishing a slot:

- **Is the artwork already in the gallery?** Batches have arrived containing the
  same map twice. Two identical cards let a customer buy the same map twice, so
  keep the better export and leave the other `published: false`. This is now the
  most common thing to catch: 35 of the files here are repeats of a map already on
  sale. Compare them by eye, not by checksum — repeat exports are almost always
  byte-different but visually identical, so `md5sum` does not flag them.
- **Does the slot have artwork at all?** An empty published slot still renders a
  card with an "Add to bundle" button, so a customer can pay for a map that does
  not exist. A slot with no file belongs at `published: false`.

`published: false` hides a card but is not, on its own, protection — the preview
at that file name stays fetchable. It is the preview, though, not the artwork, so
an unpublished slot leaks nothing worth having.

## Adding more maps

Add another entry to the `MIND_MAPS` array with the next filename in sequence. The
grid grows automatically. The landing page advertises a topic count
(`index.html`, in the Mind Maps section) that is written by hand — bump it when
the number of published maps changes.
