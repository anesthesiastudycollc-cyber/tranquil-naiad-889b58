# Mind Map Preview Images

Source artwork for the mind map storefront (`/mind-maps.html`).

## Drop your artwork here — the site protects it for you

Every deploy runs `scripts/build-previews.mjs`, which takes each file in this
folder and publishes two protected versions of it:

**The gallery preview**, in place of the original file, for `/mind-maps.html`:

- scaled down to 900px on the long edge
- blurred, so the fine print cannot be read
- watermarked with `ANESTHESIASTUDYCO.COM` repeated diagonally across the whole
  image, plus a `PREVIEW` band through the middle

**The marketplace listing photo**, written to `listing/` alongside it, for Etsy
and Shopify:

- a square 1200px crop of the *middle* of the map, so the outer edges of the
  layout are never shown
- blurred harder to match, because a crop is magnified — the same amount of
  detail is hidden at either size
- watermarked the same way

Those changes are burned into the pixels, so they survive a screenshot, a
right-click save, a hotlink from another site, and a Netlify Image CDN request at
any size. The originals in this folder are never uploaded to the web — only the
watermarked versions are.

This is the part that used to be missing. The gallery previously blurred previews
with a CSS rule and drew the watermark over the top with another one, which looked
protected but was not: switching off one line in a browser's developer tools, or
just opening the image's own URL, gave anyone the untouched artwork.

**The full-quality file buyers pay for is not stored here.** It lives in the
`digital-products` Netlify Blobs store and is delivered by `/api/download` after
Stripe confirms payment — see MIND-MAPS-SETUP.md, Step 2. Buyers get the clean,
full-resolution file; watermarking never touches it.

One thing to keep in mind: the originals in this folder are committed to the
repository. That is what makes the deploy-time overwrite safe to undo, but it also
means anyone who can read the repository can read the artwork. Keep the repository
private.

## Watermarked images for Etsy and Shopify

Etsy and Shopify host their own listing images, so they need copies of the
watermarked files rather than a link to this site. Generate them with:

```bash
npm run previews
```

That writes a full set to `preview-exports/` without touching anything else:
the wide gallery previews at the top level, and the square listing crops in
`preview-exports/listing/`. **Upload the `listing/` ones as Etsy and Shopify
photos** — those are the ones that do not reveal the whole layout — and attach
the clean full-resolution file as the digital download.

To make the watermark heavier or lighter, or to show less of the map, set these
before running:

```bash
PREVIEW_BLUR_SIGMA=4.5 npm run previews     # blurrier
PREVIEW_MAX_EDGE=700 npm run previews       # smaller gallery previews
PREVIEW_LISTING_ZOOM=0.6 npm run previews   # tighter crop: shows less of the map
PREVIEW_LISTING_SIZE=1500 npm run previews  # larger square listing photo
```

`PREVIEW_LISTING_ZOOM` is a fraction of the map's short edge, so `1` (the
default) takes the tallest square that fits — on a 1344×750 map that is the
middle 750 pixels, hiding about 44% of the width. `0.6` shows a good deal less.

The same variables can be set as build environment variables in Netlify to change
what the website publishes.

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

Drop the files in with these names and they appear on the storefront on the next
deploy — no other change needed to show the artwork.

**Setting `published: false` does not hide a file.** The card disappears from the
grid, but its watermarked preview stays fetchable at its public URL. To take a map
off the site completely, delete the file from this folder as well.

## Then edit the catalog

Open `netlify/lib/mind-maps.ts` and find the `MIND_MAPS` array. For each map:

| Field | What to set |
| --- | --- |
| `title` | The real topic, e.g. `"Malignant Hyperthermia"` — this feeds the card heading and the image alt text |
| `file` | The filename in this folder, e.g. `mind-map-42.png` |
| `published` | Set to `false` for any slot you are not selling yet |

Pricing lives just above that array (`MIND_MAP_UNIT_AMOUNT`, `MIND_MAP_BUNDLE_SIZE`,
`MIND_MAP_BUNDLE_AMOUNT`). Change it in that one place and every price on the page,
including the bundle math and what Stripe charges, updates.

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

## Adding more maps

Add another entry to the `MIND_MAPS` array with the next filename in sequence. The
grid grows automatically. The landing page advertises a topic count
(`index.html`, in the Mind Maps section) that is written by hand — bump it when
the number of published maps changes.
