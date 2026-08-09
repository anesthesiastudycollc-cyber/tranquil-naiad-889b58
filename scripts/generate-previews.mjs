/**
 * Regenerates the blurred imagery this business shows in public.
 *
 * Why this exists
 * ---------------
 * The gallery used to apply `filter: blur()` in CSS on top of the full artwork.
 * That obscures nothing: the sharp file still travels to the browser, is one
 * right-click away, and sits at a guessable URL (`/assets/mind-maps/...`) that
 * anyone can open directly. A CSS filter is decoration, not protection.
 *
 * This script destroys the information instead of hiding it. Each map is
 * downscaled, Gaussian-blurred, and stamped with a watermark that is part of the
 * pixels. `netlify.toml` sends the original path at the blurred copy, so the
 * untouched artwork is not reachable over HTTP at all.
 *
 * Two sizes come out of it:
 *
 *   assets/previews/        560px PNG  — what this website serves
 *   assets/listing-images/  2000px JPG — what gets uploaded to Etsy and Shopify
 *
 * The second set exists because a marketplace listing image is a file the seller
 * uploads to the marketplace; nothing this site serves can change a listing that
 * is already live. These are the files to upload there, at the size Etsy asks for.
 *
 * The blur is tuned to keep a map recognisable — its shape, its colour blocks,
 * how busy it is — while leaving no label or body text readable. The listing
 * still sells the topic; it no longer gives away the content.
 *
 * Usage
 * -----
 *   npm install --no-save sharp     # not a project dependency, see below
 *   node scripts/generate-previews.mjs
 *
 * Run it after adding, replacing, or publishing artwork, and commit the result.
 * `sharp` is deliberately kept out of `package.json`: it is a large native
 * package, this is a maintenance step rather than a build step, and the site
 * itself must stay dependency-light.
 */

import { createRequire } from "node:module";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_DIR = path.join(ROOT, "assets", "mind-maps");
const PREVIEW_DIR = path.join(ROOT, "assets", "previews");
const LISTING_DIR = path.join(ROOT, "assets", "listing-images");

/** Longest edge of a web preview, in pixels. Displayed at ~300px wide. */
const PREVIEW_WIDTH = 560;

/** Etsy asks for 2000px on the shortest side for listing photos. */
const LISTING_WIDTH = 2000;

/**
 * Blur radius as a fraction of image width, so both sizes are obscured to the
 * same degree rather than the big one staying readable. Lowering the divisor
 * blurs harder; the point of diminishing returns is around 40, where cards stop
 * being tellable apart. Text is already unreadable at 62.
 */
const BLUR_DIVISOR = 62;

const WATERMARK_TEXT = "PREVIEW · anesthesiastudyco.com";

/**
 * The eight maps featured on the landing page were being hot-linked sharp from
 * the Shopify CDN, which put the full artwork on the home page of the site. They
 * are fetched here, blurred like everything else, and served from our own domain.
 * Only the blurred results are committed — nothing sharp is added to the repo.
 */
const FEATURED = {
  "featured-acls": "https://cdn.shopify.com/s/files/1/0753/6807/1341/files/04ACLS.png?v=1785979717",
  "featured-ekg":
    "https://cdn.shopify.com/s/files/1/0753/6807/1341/files/70EKG_4afd5b02-19d7-4f9b-b5fd-cbe084290034.png?v=1785981973",
  "featured-mi":
    "https://cdn.shopify.com/s/files/1/0753/6807/1341/files/MI_9feb90d8-2156-473a-b832-a619c632be4d.png?v=1785982335",
  "featured-pe": "https://cdn.shopify.com/s/files/1/0753/6807/1341/files/43PulmonaryEmbolism.png?v=1785982494",
  "featured-hypoxia":
    "https://cdn.shopify.com/s/files/1/0753/6807/1341/files/46Hypooxia_148fb7b2-fdf3-4b40-99c6-a5b324b26758.png?v=1785982223",
  "featured-bronchospasm":
    "https://cdn.shopify.com/s/files/1/0753/6807/1341/files/58Bronchospasm.png?v=1785982161",
  "featured-hemodynamics":
    "https://cdn.shopify.com/s/files/1/0753/6807/1341/files/HemodynamicsMonitoring.png?v=1785982365",
  "featured-ephedrine": "https://cdn.shopify.com/s/files/1/0753/6807/1341/files/49Ephedrine.png?v=1785982432",
};

const sharp = load("sharp");

function load(name) {
  try {
    return createRequire(import.meta.url)(name);
  } catch {
    console.error(
      `Missing "${name}". It is not a project dependency on purpose — install it just for this run:\n\n` +
        `  npm install --no-save ${name}\n`,
    );
    process.exit(1);
  }
}

/**
 * A tiled, rotated watermark sized to the image. It is composited into the
 * picture rather than drawn over it in CSS, so it survives being saved,
 * re-hosted, or uploaded to a marketplace that knows nothing about this site's
 * stylesheet.
 */
function watermarkSvg(width, height) {
  const fontSize = Math.round(width / 30);
  const label = escapeXml(`${WATERMARK_TEXT}   `.repeat(6));
  const rows = [];

  // A third of the maps are drawn on white and the rest on near-black, so plain
  // white text would disappear on some of them. Each line is drawn as dark
  // outline plus white fill, which stays legible either way.
  for (let y = -height; y < height * 2; y += fontSize * 6) {
    rows.push(
      `<text x="-${width}" y="${y}" font-family="Helvetica, Arial, sans-serif" ` +
        `font-size="${fontSize}" font-weight="700" letter-spacing="2" ` +
        `fill="#ffffff" fill-opacity="0.5" ` +
        `stroke="#000000" stroke-opacity="0.32" stroke-width="${Math.max(1, fontSize / 12)}" ` +
        `paint-order="stroke">${label}</text>`,
    );
  }

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<g transform="rotate(-24 ${width / 2} ${height / 2})">${rows.join("")}</g>` +
      `</svg>`,
  );
}

function escapeXml(value) {
  return value.replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[char]);
}

async function obscure(input, targetWidth) {
  // Downscale first: on the web size the detail is gone before the blur even
  // runs, which is also what makes 130-odd files finish in seconds.
  const resized = sharp(input)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .flatten({ background: "#ffffff" });

  const { width, height } = await resized.toBuffer({ resolveWithObject: true }).then((r) => r.info);

  return resized.blur(width / BLUR_DIVISOR).composite([{ input: watermarkSvg(width, height), top: 0, left: 0 }]);
}

async function writePreview(input, name) {
  const image = await obscure(input, PREVIEW_WIDTH);
  // Blurred images are almost all gradient, so a palette costs no visible
  // quality and keeps the committed previews small.
  const buffer = await image.png({ palette: true, quality: 70, compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(PREVIEW_DIR, `${name}.png`), buffer);
  return buffer.length;
}

async function writeListingImage(input, name) {
  const image = await obscure(input, LISTING_WIDTH);
  // JPEG at this size: marketplaces re-encode anyway, and a blurred 2000px PNG
  // would be several megabytes for no benefit.
  const buffer = await image.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  await writeFile(path.join(LISTING_DIR, `${name}.jpg`), buffer);
  return buffer.length;
}

async function main() {
  await mkdir(PREVIEW_DIR, { recursive: true });
  await mkdir(LISTING_DIR, { recursive: true });

  const local = (await readdir(SOURCE_DIR)).filter((name) => name.toLowerCase().endsWith(".png")).sort();

  let previewBytes = 0;
  let listingBytes = 0;

  for (const file of local) {
    const name = file.replace(/\.png$/i, "");
    const source = path.join(SOURCE_DIR, file);
    previewBytes += await writePreview(source, name);
    listingBytes += await writeListingImage(source, name);
  }
  console.log(`Blurred ${local.length} mind maps.`);

  for (const [name, url] of Object.entries(FEATURED)) {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Could not fetch ${name} (${response.status}) — leaving the existing files alone.`);
      continue;
    }
    const source = Buffer.from(await response.arrayBuffer());
    previewBytes += await writePreview(source, name);
    listingBytes += await writeListingImage(source, name);
  }
  console.log(`Blurred ${Object.keys(FEATURED).length} landing page images.`);

  console.log(
    `assets/previews/ ${(previewBytes / 1024 / 1024).toFixed(1)} MB · ` +
      `assets/listing-images/ ${(listingBytes / 1024 / 1024).toFixed(1)} MB`,
  );
}

await main();
