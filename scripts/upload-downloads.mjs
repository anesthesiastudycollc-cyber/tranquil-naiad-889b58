#!/usr/bin/env node
/**
 * Uploads the files buyers receive into the `digital-products` Netlify Blobs
 * store, so a paid download resolves instantly instead of asking the customer to
 * email support.
 *
 * Why this exists
 * ---------------
 * Everything else in the purchase path already works: Stripe takes the payment,
 * `/api/order` confirms it, and `/api/download` re-checks the session with Stripe
 * before it serves anything. The one thing it cannot do is invent the file. Until
 * a product's `blobKey` exists in the store, `/api/download` answers a paying
 * customer with a support message — which is a graceful failure, but still a
 * failure, and `/api/setup-check` reports it as one.
 *
 * The 89 mind maps are the case worth automating: their full-resolution artwork
 * is already in this repository, and the key each one is delivered under is the
 * artwork's own file name. So the whole set can be uploaded in one command rather
 * than dragged into the Netlify UI one file at a time.
 *
 * Usage
 * -----
 *   node scripts/upload-downloads.mjs                # dry run: report only
 *   node scripts/upload-downloads.mjs --confirm      # actually upload
 *   node scripts/upload-downloads.mjs --confirm --force   # re-upload existing keys
 *   node scripts/upload-downloads.mjs --only map-05  # one product
 *
 * It is a dry run by default because the store is shared by every deploy: what it
 * writes is live for real customers the moment it lands, with no review step in
 * between.
 *
 * Where the files come from
 * -------------------------
 *   mind maps   assets/mind-maps/<blobKey>   — the artwork, already in the repo
 *   everything  product-files/<blobKey>      — drop the PDFs and ZIPs in here
 *
 * `product-files/` is git-ignored on purpose. Those are the paid files; a
 * repository is the wrong place for them, and the store is the right one.
 *
 * Credentials
 * -----------
 * Needs a Netlify personal access token and the site id:
 *
 *   NETLIFY_AUTH_TOKEN=...  NETLIFY_SITE_ID=...  node scripts/upload-downloads.mjs --confirm
 *
 * `netlify env:list` or the Netlify UI has the site id; `netlify login` leaves a
 * token behind that `netlify env:get` can read.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { register } from "node:module";
import path from "node:path";
import process from "node:process";

// The catalog libraries import each other with `.js` specifiers while the files
// on disk are `.ts`; the hook bridges that so this stays a plain node script.
register(new URL("./ts-js-resolve.mjs", import.meta.url));

const { PRODUCTS } = await import("../netlify/lib/catalog.ts");
const { MIND_MAP_PRODUCTS } = await import("../netlify/lib/mind-maps.ts");
const { getStore } = await import("@netlify/blobs");

const STORE_NAME = "digital-products";
const ARTWORK_DIR = "assets/mind-maps";
const PRODUCT_FILE_DIR = "product-files";

async function main() {
  const options = parseArgs(process.argv.slice(2));

  assertArtworkIsTheOriginal();

  const store = openStore();
  const existing = new Set((await store.list()).blobs.map((blob) => blob.key));

  const wanted = [...MIND_MAP_PRODUCTS, ...PRODUCTS.filter((product) => product.published)]
    .filter((product) => product.delivery?.kind === "file")
    .filter((product) => !options.only || product.id === options.only);

  if (wanted.length === 0) {
    fail(options.only ? `No published product with id ${options.only}.` : "Nothing to upload.");
  }

  const plan = [];
  const missingSource = [];
  let alreadyThere = 0;

  for (const product of wanted) {
    if (existing.has(product.delivery.blobKey) && !options.force) {
      alreadyThere += 1;
      continue;
    }

    const source = sourceFor(product);
    const size = await sizeOf(source);

    if (size === null) missingSource.push({ product, source });
    else plan.push({ product, source, size });
  }

  console.log(
    `${STORE_NAME}: ${existing.size} file${existing.size === 1 ? "" : "s"} already stored.\n` +
      `${plan.length} to upload, ${alreadyThere} already there, ${missingSource.length} with no file on disk.\n`,
  );

  if (missingSource.length > 0) {
    console.log("No file found for these — nothing was uploaded for them:");
    for (const { product, source } of missingSource.slice(0, 20)) {
      console.log(`  ${product.id.padEnd(24)} expected ${source}`);
    }
    if (missingSource.length > 20) console.log(`  …and ${missingSource.length - 20} more.`);
    console.log(`\nPut those files in ${PRODUCT_FILE_DIR}/ under exactly those names and re-run.\n`);
  }

  if (plan.length === 0) {
    console.log("Nothing left to do.");
    return;
  }

  const megabytes = plan.reduce((total, item) => total + item.size, 0) / 1024 / 1024;

  if (!options.confirm) {
    console.log(`Would upload ${plan.length} file${plan.length === 1 ? "" : "s"} (${megabytes.toFixed(1)} MB):`);
    for (const { product, source } of plan.slice(0, 20)) {
      console.log(`  ${product.delivery.blobKey.padEnd(24)} ← ${source}`);
    }
    if (plan.length > 20) console.log(`  …and ${plan.length - 20} more.`);
    console.log("\nThis was a dry run. Re-run with --confirm to upload.");
    return;
  }

  console.log(`Uploading ${plan.length} file${plan.length === 1 ? "" : "s"} (${megabytes.toFixed(1)} MB)…`);

  let done = 0;
  for (const { product, source } of plan) {
    const body = await readFile(source);

    // Metadata rather than a separate manifest: whatever is asked about a stored
    // file later — which product it belongs to, whether it is the current copy —
    // is answered by the store itself, and cannot drift away from the bytes.
    await store.set(product.delivery.blobKey, body, {
      metadata: {
        productId: product.id,
        filename: product.delivery.filename,
        contentType: product.delivery.contentType,
        sha256: createHash("sha256").update(body).digest("hex"),
      },
    });

    done += 1;
    console.log(`  [${String(done).padStart(3)}/${plan.length}] ${product.delivery.blobKey}`);
  }

  console.log(`\nDone. Reload /api/setup-check to confirm the store now holds them.`);
}

/** Where a given product's paid file is expected to sit on disk. */
function sourceFor(product) {
  const key = product.delivery.blobKey;
  return product.categoryId === "mind-maps" && /\.(png|jpe?g|webp)$/i.test(key)
    ? path.join(ARTWORK_DIR, key)
    : path.join(PRODUCT_FILE_DIR, key);
}

async function sizeOf(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return null;
  }
}

/**
 * Refuses to run anywhere the artwork may already have been replaced by a
 * preview.
 *
 * `scripts/build-previews.mjs --deploy` overwrites every file in the artwork
 * folder with a blurred, watermarked copy, in place. That is exactly right for a
 * deploy and exactly wrong here: uploading afterwards would put the watermarked
 * preview into the store as the file buyers pay for, and the customer's download
 * would silently become the thing the watermark exists to prevent. The two
 * conditions below are the same ones that script checks, for the same reason —
 * git holding the artwork unmodified is what proves it is still the original.
 */
function assertArtworkIsTheOriginal() {
  if (process.env.NETLIFY === "true") {
    fail(
      "This is a Netlify build, where the artwork has been replaced by watermarked previews.\n" +
        "Uploading from here would sell buyers the preview. Run it from a clean checkout instead.",
    );
  }

  let pending;
  try {
    pending = execFileSync("git", ["status", "--porcelain", "--", ARTWORK_DIR], {
      encoding: "utf8",
    }).trim();
  } catch (error) {
    fail(`Could not ask git whether ${ARTWORK_DIR} is untouched: ${error.message}`);
  }

  if (pending) {
    fail(
      `${ARTWORK_DIR} does not match what git has, so these may not be the original files:\n\n` +
        pending
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n") +
        "\n\nCommit or restore the artwork first — a watermarked copy must never be uploaded as the paid file.",
    );
  }
}

function openStore() {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_API_TOKEN;

  if (!siteID || !token) {
    fail(
      "Set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN so this can reach the store.\n" +
        "  NETLIFY_SITE_ID   the site id from the Netlify UI, or `netlify status`\n" +
        "  NETLIFY_AUTH_TOKEN a personal access token from Netlify → User settings → Applications",
    );
  }

  return getStore({ name: STORE_NAME, siteID, token, consistency: "strong" });
}

function parseArgs(argv) {
  const options = { confirm: false, force: false, only: "" };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm") options.confirm = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--only") options.only = argv[++i] ?? "";
    else fail(`Unknown option: ${arg}`);
  }

  return options;
}

function fail(message) {
  console.error(`\nUpload stopped.\n\n${message}\n`);
  process.exit(1);
}

await main();
