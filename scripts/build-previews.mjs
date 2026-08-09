#!/usr/bin/env node
/**
 * Turns the mind map artwork in `assets/mind-maps/` into previews that are safe
 * to publish: downscaled, blurred, and with the shop's watermark burned into the
 * pixels.
 *
 * Why this exists
 * ---------------
 * The gallery used to blur previews with a CSS `filter` and lay a watermark over
 * them with a CSS `::after`. Both are decoration on top of an untouched image:
 * anyone could delete the rule in devtools, open the image URL directly, or ask
 * the Netlify Image CDN for the source at full size and walk away with the
 * artwork. A visitor did not even need to screenshot it.
 *
 * So the protection has to be in the pixels the server sends. Everything this
 * script writes is already blurred and already watermarked, which means a
 * screenshot, a right-click save, a hotlink, and an Image CDN request at any
 * width all produce the same degraded, branded image.
 *
 * What it does NOT touch
 * ----------------------
 * The files buyers pay for. Those live in the `digital-products` Netlify Blobs
 * store and are served by `/api/download` after Stripe confirms payment — a
 * different set of files entirely, never read or written here. Paid downloads
 * stay full-resolution and clean.
 *
 * Usage
 * -----
 *   node scripts/build-previews.mjs                 → writes to preview-exports/
 *   node scripts/build-previews.mjs --out some/dir  → writes somewhere else
 *   node scripts/build-previews.mjs --deploy        → replaces assets/mind-maps/
 *
 * `--deploy` is how the Netlify build uses this: it rewrites the artwork in the
 * ephemeral build workspace so only watermarked files are ever deployed, while
 * the full-resolution originals stay untouched in git. Because that is
 * destructive on a real working copy, it runs only inside a Netlify build, and
 * only when git says every file it is about to overwrite is committed — so the
 * originals can always be brought back with `git checkout -- assets/mind-maps`.
 * `--force` skips both checks and is for people who are certain.
 *
 * Tuning (environment variables, all optional):
 *   PREVIEW_MAX_EDGE     longest edge of the output, in pixels   (default 900)
 *   PREVIEW_BLUR_SIGMA   blur strength; higher is less legible   (default 3.4)
 *   PREVIEW_WATERMARK    the repeated diagonal text
 *   PREVIEW_BAND_TEXT    the text in the band across the middle
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { renderText } from "./font5x7.mjs";

const SOURCE_DIR = "assets/mind-maps";
const DEFAULT_OUT_DIR = "preview-exports";

const MAX_EDGE = number(process.env.PREVIEW_MAX_EDGE, 900);
const BLUR_SIGMA = number(process.env.PREVIEW_BLUR_SIGMA, 3.4);
const WATERMARK = process.env.PREVIEW_WATERMARK || "ANESTHESIASTUDYCO.COM";
const BAND_TEXT = process.env.PREVIEW_BAND_TEXT || "PREVIEW · ANESTHESIASTUDYCO.COM";

/** Diagonal, because horizontal watermarks are far easier to crop or clone out. */
const WATERMARK_ANGLE = -28;

/** How many images to process at once. Sharp is native and releases the loop. */
const CONCURRENCY = 6;

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.deploy && !options.force) {
    assertSafeToOverwrite();
  }

  const files = (await readdir(SOURCE_DIR))
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort();

  if (files.length === 0) {
    console.log(`No preview artwork found in ${SOURCE_DIR} — nothing to watermark.`);
    return;
  }

  const outDir = options.deploy ? SOURCE_DIR : options.outDir;
  await mkdir(outDir, { recursive: true });

  console.log(
    `Watermarking ${files.length} preview${files.length === 1 ? "" : "s"} → ${outDir}` +
      ` (max ${MAX_EDGE}px, blur ${BLUR_SIGMA})`,
  );

  let sourceBytes = 0;
  let outputBytes = 0;
  const manifest = {};

  // A plain worker pool: every worker pulls the next index off a shared cursor.
  let cursor = 0;
  const worker = async () => {
    while (cursor < files.length) {
      const file = files[cursor];
      cursor += 1;

      const source = await readFile(path.join(SOURCE_DIR, file));

      let output;
      try {
        output = await watermark(source);
      } catch (error) {
        fail(`${file} could not be watermarked: ${error.message}`);
      }

      sourceBytes += source.length;
      outputBytes += output.length;
      manifest[file] = createHash("sha256").update(output).digest("hex").slice(0, 16);

      await writeOutput(path.join(outDir, file), output, options.deploy);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Deliberately not written when deploying: it would leave an untracked file in
  // the artwork folder, which is exactly what assertSafeToOverwrite() refuses to
  // run against next time.
  if (!options.deploy) {
    await writeFile(
      path.join(outDir, "previews.manifest.json"),
      JSON.stringify(
        {
          generatedBy: "scripts/build-previews.mjs",
          maxEdge: MAX_EDGE,
          blurSigma: BLUR_SIGMA,
          watermark: WATERMARK,
          bandText: BAND_TEXT,
          files: manifest,
        },
        null,
        2,
      ) + "\n",
    );
  }

  console.log(
    `Done: ${megabytes(sourceBytes)} of artwork → ${megabytes(outputBytes)} of watermarked previews.`,
  );
}

/**
 * Resize, blur, then stamp the watermark on top.
 *
 * Order matters: the watermark goes on after the blur, so it stays crisp and
 * cannot be blurred away, and it is composited across the whole frame rather
 * than into one corner that a crop would remove.
 */
async function watermark(source) {
  const resized = await sharp(source, { failOn: "error" })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .blur(BLUR_SIGMA)
    // Artwork with transparency would otherwise show the page background through
    // the watermark; paper white matches how these maps are meant to print.
    .flatten({ background: "#ffffff" })
    .toBuffer();

  const { width, height } = await sharp(resized).metadata();

  const tileScale = Math.max(2, Math.round(width / 420));
  const bandScale = Math.max(2, Math.round(width / 300));

  const [tile, band] = await Promise.all([
    watermarkTile(WATERMARK, tileScale),
    watermarkBand(BAND_TEXT, bandScale, width),
  ]);

  return sharp(resized)
    .composite([
      { input: tile, tile: true, blend: "over" },
      { input: band.data, raw: band.raw, gravity: "center", blend: "over" },
    ])
    // A palette PNG is plenty for an image that has just been blurred, and it
    // keeps the deploy small: the sources total well over a hundred megabytes.
    .png({ palette: true, quality: 78, effort: 7 })
    .toBuffer();
}

/** One repeating diagonal stamp of the shop domain, transparent around it. */
async function watermarkTile(text, scale) {
  const { width, height, mask } = renderText(text, scale);
  const pad = scale * 3;

  const stamp = canvas(width + pad * 2, height + pad * 2, [0, 0, 0, 0]);
  // Drawn twice: a dark copy underneath keeps the watermark readable where the
  // artwork behind it is pale, which is most of it.
  draw(stamp, width + pad * 2, mask, width, height, pad + scale, pad + scale, [0, 0, 0], 70);
  draw(stamp, width + pad * 2, mask, width, height, pad, pad, [255, 255, 255], 120);

  const rotated = await sharp(stamp, {
    raw: { width: width + pad * 2, height: height + pad * 2, channels: 4 },
  })
    .rotate(WATERMARK_ANGLE, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const rotatedMeta = await sharp(rotated).metadata();

  // Breathing room around the stamp is what turns it into a repeating pattern
  // rather than a solid wall of text.
  return sharp({
    create: {
      width: rotatedMeta.width + scale * 38,
      height: rotatedMeta.height + scale * 20,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: rotated, gravity: "center" }])
    .png()
    .toBuffer();
}

/** The darkened band across the middle — the part that survives a tight crop. */
function watermarkBand(text, scale, imageWidth) {
  const { width, height, mask } = renderText(text, scale);
  const bandHeight = height + scale * 10;

  const band = canvas(imageWidth, bandHeight, [8, 16, 32, 120]);
  const x = Math.round((imageWidth - width) / 2);
  const y = Math.round((bandHeight - height) / 2);

  draw(band, imageWidth, mask, width, height, x + scale, y + scale, [0, 0, 0], 140);
  draw(band, imageWidth, mask, width, height, x, y, [255, 255, 255], 235);

  return {
    data: band,
    raw: { width: imageWidth, height: bandHeight, channels: 4 },
  };
}

/** A flat RGBA buffer. */
function canvas(width, height, [r, g, b, a]) {
  const buffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = r;
    buffer[i + 1] = g;
    buffer[i + 2] = b;
    buffer[i + 3] = a;
  }
  return buffer;
}

/** Paints a coverage mask onto an RGBA buffer at the given colour and alpha. */
function draw(target, targetWidth, mask, maskWidth, maskHeight, originX, originY, [r, g, b], alpha) {
  const targetHeight = target.length / 4 / targetWidth;

  for (let y = 0; y < maskHeight; y += 1) {
    const destY = originY + y;
    if (destY < 0 || destY >= targetHeight) continue;

    for (let x = 0; x < maskWidth; x += 1) {
      if (!mask[y * maskWidth + x]) continue;

      const destX = originX + x;
      if (destX < 0 || destX >= targetWidth) continue;

      const offset = (destY * targetWidth + destX) * 4;
      target[offset] = r;
      target[offset + 1] = g;
      target[offset + 2] = b;
      target[offset + 3] = alpha;
    }
  }
}

/**
 * Writes through a temporary file when overwriting in place, so a crash midway
 * cannot leave a half-written image where the original artwork used to be.
 */
async function writeOutput(destination, data, inPlace) {
  if (!inPlace) {
    await writeFile(destination, data);
    return;
  }

  const temporary = `${destination}.tmp`;
  await writeFile(temporary, data);
  await rename(temporary, destination);
}

/**
 * Refuses to overwrite artwork that could not be got back afterwards.
 *
 * Two conditions have to hold. The first is that this really is a Netlify build,
 * where the checked-out copy is thrown away when the deploy finishes. The second
 * is that git already has every one of these files exactly as they are on disk,
 * which makes the overwrite reversible with a single checkout. Artwork that has
 * been dropped into the folder but not yet committed is the one case where this
 * script could destroy the only copy, and it is the case this refuses.
 */
function assertSafeToOverwrite() {
  if (process.env.NETLIFY !== "true") {
    fail(
      `--deploy overwrites the original artwork in ${SOURCE_DIR}.\n` +
        "It is meant for the Netlify build, where the checked-out copy is disposable.\n" +
        `Run without flags to write watermarked copies to ${DEFAULT_OUT_DIR}/ instead,\n` +
        "or pass --force if you really mean to overwrite your working copy.",
    );
  }

  let pending;
  try {
    pending = execFileSync("git", ["status", "--porcelain", "--", SOURCE_DIR], {
      encoding: "utf8",
    }).trim();
  } catch (error) {
    fail(
      `--deploy could not ask git whether ${SOURCE_DIR} is safe to overwrite: ${error.message}\n` +
        "Pass --force to overwrite anyway.",
    );
  }

  if (pending) {
    fail(
      `${SOURCE_DIR} has changes git does not know about, so overwriting it could\n` +
        "destroy the only copy of that artwork:\n\n" +
        pending
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n") +
        "\n\nCommit the artwork first, then deploy. Pass --force to overwrite anyway.",
    );
  }
}

function parseArgs(argv) {
  const options = { deploy: false, force: false, outDir: DEFAULT_OUT_DIR };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--deploy") options.deploy = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--out") options.outDir = argv[++i] ?? DEFAULT_OUT_DIR;
    else fail(`Unknown option: ${arg}`);
  }

  return options;
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function megabytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Stops the build. Failing loudly is deliberate: a preview step that swallowed
 * its errors would deploy the unprotected artwork, and a failed build simply
 * leaves the previous deploy serving.
 */
function fail(message) {
  console.error(`\nPreview watermarking failed.\n\n${message}\n`);
  process.exit(1);
}

await main();
