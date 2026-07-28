# Anesthesia Study Co. LLC Website

A static marketing website for **Anesthesia Study Co. LLC**, an educational anesthesia tools and study resources business.

## What It Is

Static HTML site:
- **index.html** — Main landing page with hero, app overview, mind maps, products, social links, about, and support sections
- **mind-maps.html** — Mind map storefront: preview gallery, $2.00 single pricing, 5-for-$9.00 bundle builder
- **privacy.html** — Privacy policy page (required for Apple App Store support URL)
- **assets/mind-maps/** — Watermarked preview images for the storefront (see the README in that folder)

## Key Technologies

- Plain HTML5 with inline CSS — no build tools or frameworks required
- Responsive layout using CSS Grid and Flexbox
- Glassmorphism dark-theme design with cyan/purple/yellow brand colors
- Netlify Image CDN for on-demand preview thumbnails
- Deployed as a static site on Netlify

## Running Locally

Open `index.html` directly in a browser, or serve with the Netlify CLI so the
Image CDN previews resolve:

```bash
netlify dev --port 8889
```

## Adding or Updating Mind Maps

Drop watermarked preview PNGs into `assets/mind-maps/` as `mind-map-01.png`
through `mind-map-20.png`, then edit the `MAPS` catalog near the bottom of
`mind-maps.html` to set each real title and product URL. Pricing constants sit
directly above that catalog. Full instructions are in
`assets/mind-maps/README.md`.

## Updating Social / Store Links

Edit the placeholder `<span class="btn soon">` elements in `index.html` to live `<a>` tags once the following are ready:
- Instagram, Facebook, TikTok, Pinterest profiles
