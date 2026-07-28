# AGENTS.md — Anesthesia Study Co. LLC Website

## Project Architecture

Minimal static HTML site. No framework, no build step, no JavaScript dependencies.

```
/
├── index.html              # Main landing page
├── mind-maps.html          # Mind map storefront (gallery + bundle builder)
├── privacy.html            # Privacy policy (Apple App Store support URL)
├── assets/mind-maps/       # Watermarked preview PNGs + upload instructions
├── README.md
└── AGENTS.md
```

## Coding Conventions

- All styles are **inline `<style>` blocks** inside each HTML file — no external CSS files.
- CSS custom properties (`--cyan`, `--purple`, `--card`, etc.) are defined in `:root` in `index.html`.
- `privacy.html` and `mind-maps.html` duplicate minimal styles rather than linking to a shared stylesheet, keeping each file self-contained.
- Placeholder links (social media) are rendered as `<span class="btn soon">` elements — swap to `<a>` tags when real URLs are available.

## Non-Obvious Decisions

- **No external dependencies**: The site is intentionally dependency-free. Avoid adding npm, bundlers, or CDN scripts unless the feature genuinely requires it.
- **Privacy policy effective date** is hardcoded to `2026-05-31` (the creation date). Update manually when the policy content changes.
- **Apple Support URL** points to `https://anesthesiastudyco.com/#support` — required for iOS App Store listing. Do not remove the `#support` anchor or the support section `id`.
- **Educational disclaimer** ("not medical advice") appears in the hero, mind map storefront, and privacy policy — keep all three in sync if wording changes.
- The `<footer>` year is set dynamically via a small inline `<script>` on every page.
- **Mind map catalog is data-driven**: the `MAPS` array plus `PRICE_SINGLE` / `BUNDLE_SIZE` / `BUNDLE_PRICE` constants at the bottom of `mind-maps.html` are the single source of truth for titles, listing URLs, and pricing. Change prices there, not in the markup — the copy and the bundle math both read from those constants.
- **Bundle math**: every complete group of `BUNDLE_SIZE` costs `BUNDLE_PRICE`, the remainder is charged at `PRICE_SINGLE` each. Selecting 6 maps therefore costs $11.00, not two bundles.
- **`assets/mind-maps/` is public**. Only watermarked, downscaled previews belong there — anything committed is freely downloadable at a predictable URL. Full-resolution paid files are delivered by the store after checkout, never from this repo.
- **Checkout is delegated to the store**. There is no payment processor wired into this site, so purchase buttons link to Etsy listings (`url` per catalog entry, falling back to `SHOP_URL`). Adding real on-site checkout would require a payment provider plus gated download delivery.

## Key URLs

- Etsy shop: `https://www.etsy.com/shop/AnesthesiaStudyCo?ref=seller-platform-mcnav`
- Support email: `admin@anesthesiastudyco.com`
- Domain: `https://anesthesiastudyco.com`
