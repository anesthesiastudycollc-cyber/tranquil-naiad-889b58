# Mind Map Preview Images

Preview artwork for the mind map storefront (`/mind-maps.html`).

## Upload only watermarked, low-resolution previews here

Everything in this folder is served publicly at
`https://anesthesiastudyco.com/assets/mind-maps/<filename>` and can be
downloaded by anyone without paying. **Do not put the full-resolution PNG that
buyers pay for in this folder.** The paid file is delivered by the store
(Etsy/Shopify) after checkout.

A safe preview is roughly 1200px on the long edge with your own watermark burned
into the image. The storefront also overlays a `PREVIEW · anesthesiastudyco.com`
band on every thumbnail and downscales through the Netlify Image CDN, but the
burned-in watermark is the part that survives a screenshot.

**Setting `published: false` does not protect a file.** The card disappears from
the grid, but the image stays fetchable at its public URL. To take an unprotected
file off the site, overwrite it with a watermarked export or delete it.

## Filenames

Name files in sequence so they match the catalog in `mind-maps.html`:

```
mind-map-01.png
mind-map-02.png
...
mind-map-37.png
```

Drop the files in with these names and they appear on the storefront on the next
deploy — no other change needed to show the artwork.

## Then edit the catalog

Open `mind-maps.html` and find the `MAPS` array near the bottom. For each map:

| Field | What to set |
| --- | --- |
| `title` | The real topic, e.g. `"Malignant Hyperthermia"` — this feeds the card heading and the image alt text |
| `url` | The product listing URL for that map. Leave `null` to send buyers to the shop homepage |
| `published` | Set to `false` for any slot you are not selling yet |

Pricing lives just above that array (`PRICE_SINGLE`, `BUNDLE_SIZE`,
`BUNDLE_PRICE`). Change it in that one place and every price on the page,
including the bundle math, updates.

Two things are worth checking before publishing a slot:

- **Is the artwork already in the gallery?** Batches have arrived containing the
  same map twice. Two identical cards let a customer buy the same map twice, so
  keep the better export and leave the other `published: false`.
- **Does the slot have artwork at all?** An empty published slot still renders a
  card with an "Add to bundle" button, so a customer can pay for a map that does
  not exist. A slot with no file belongs at `published: false`.

## Adding more maps

Add another entry to the `MAPS` array with the next filename in sequence. The
grid grows automatically. The landing page advertises a topic count
(`index.html`, in the Mind Maps section) that is written by hand — bump it when
the number of published maps changes.
