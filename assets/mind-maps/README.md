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

## Filenames

Name files in sequence so they match the catalog in `mind-maps.html`:

```
mind-map-01.png
mind-map-02.png
...
mind-map-20.png
```

Drop the files in with these names and they appear on the storefront on the next
deploy — no other change needed to show the artwork.

## Then edit the catalog

Open `mind-maps.html` and find the `MAPS` array near the bottom. For each map:

| Field | What to set |
| --- | --- |
| `title` | The real topic, e.g. `"Malignant Hyperthermia"` — replaces `"Mind Map 1"` |
| `url` | The product listing URL for that map. Leave `null` to send buyers to the shop homepage |
| `published` | Set to `false` for any of the 20 slots you are not selling yet |

Pricing lives just above that array (`PRICE_SINGLE`, `BUNDLE_SIZE`,
`BUNDLE_PRICE`). Change it in that one place and every price on the page,
including the bundle math, updates.

## Adding more than 20 maps

Add another entry to the `MAPS` array with the next filename in sequence. The
grid grows automatically.
