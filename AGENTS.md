# AGENTS.md — Anesthesia Study Co. LLC Website

## Project Architecture

Minimal two-page static HTML site. No framework, no build step, no JavaScript dependencies.

```
/
├── index.html      # Main landing page
├── privacy.html    # Privacy policy (Apple App Store support URL)
├── README.md
└── AGENTS.md
```

## Coding Conventions

- All styles are **inline `<style>` blocks** inside each HTML file — no external CSS files.
- CSS custom properties (`--cyan`, `--purple`, `--card`, etc.) are defined in `:root` in `index.html`.
- `privacy.html` duplicates minimal styles rather than linking to a shared stylesheet, keeping each file self-contained.
- Placeholder links (Shopify, social media, Amazon) are rendered as `<span class="btn soon">` elements — swap to `<a>` tags when real URLs are available.

## Non-Obvious Decisions

- **No external dependencies**: The site is intentionally dependency-free. Avoid adding npm, bundlers, or CDN scripts unless the feature genuinely requires it.
- **Privacy policy effective date** is hardcoded to `2026-05-31` (the creation date). Update manually when the policy content changes.
- **Apple Support URL** points to `https://anesthesiastudyco.com/#support` — required for iOS App Store listing. Do not remove the `#support` anchor or the support section `id`.
- **Educational disclaimer** ("not medical advice") appears in the hero and privacy policy — keep both in sync if wording changes.
- The `<footer>` year is set dynamically via a small inline `<script>` — this is intentional and the only JS on the page.

## Key URLs

- Etsy shop: `https://www.etsy.com/shop/AnesthesiaStudyCo?ref=seller-platform-mcnav`
- Support email: `admin@anesthesiastudyco.com`
- Domain: `https://anesthesiastudyco.com`
