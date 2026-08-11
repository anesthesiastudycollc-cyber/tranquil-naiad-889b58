#!/usr/bin/env node
/**
 * Three-way catalog reconciliation: website <-> Stripe <-> Etsy.
 *
 * Why this exists: the website, Stripe, and Etsy are three separate inventories.
 * Adding a product to Etsy does not add it to this site — `netlify/lib/catalog.ts`
 * and `netlify/lib/mind-maps.ts` are the only things the storefront renders from.
 * Adding products one marketplace at a time is what let the shop sell sheets the
 * website had never heard of, so the fix is a master table rather than a memory:
 * one row per product, keyed by the internal id, showing where it exists and
 * where it does not.
 *
 * Read-only. It never writes to Stripe, Etsy, or the catalog — it prints what is
 * out of step and leaves the editing to a person.
 *
 * Usage:
 *   node scripts/reconcile-catalog.mjs                  # website + Stripe
 *   node scripts/reconcile-catalog.mjs --no-stripe      # website only, offline
 *   node scripts/reconcile-catalog.mjs --etsy-file etsy-listings.json
 *   node scripts/reconcile-catalog.mjs --out reconciliation.csv
 *
 * The Etsy leg deliberately takes a file rather than calling the API. Etsy rotates
 * the refresh token on every use and the site keeps the rotated value in the
 * `marketplace-tokens` blob store (see netlify/lib/marketplaces.ts); a script
 * refreshing from outside that store would quietly invalidate the shop's token
 * and break /api/marketplace-sync weeks later. Export active listings from Etsy —
 * or from the site's own Etsy client — and pass the file.
 *
 *   Accepted shapes: [{ listing_id, title, sku, price, state }, ...]
 *                    { results: [ ... ] }        (raw Etsy API response)
 */

import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { register } from "node:module";

// The catalog libraries import each other with `.js` specifiers while the files
// on disk are `.ts`; the hook bridges that so this stays a plain node script.
register(new URL("./ts-js-resolve.mjs", import.meta.url));

const { CATEGORIES, PRODUCTS } = await import("../netlify/lib/catalog.ts");
const { MIND_MAP_PRODUCTS } = await import("../netlify/lib/mind-maps.ts");
const { STRIPE_PRICE_IDS, STRIPE_PRODUCT_IDS } = await import("../netlify/lib/stripe-price-map.ts");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const useStripe = !flag("--no-stripe");
const etsyFile = value("--etsy-file");
const outFile = value("--out");

/* ------------------------------------------------------------------ website */

const categoryName = new Map(CATEGORIES.map((category) => [category.id, category.name]));

/**
 * Both catalog files, as one list. Mind maps are real catalog products that are
 * simply held back from the store listing, so a reconciliation that ignored them
 * would report 89 phantom gaps against Stripe.
 */
const website = [...PRODUCTS, ...MIND_MAP_PRODUCTS].map((product) => ({
  id: product.id,
  name: product.name,
  category: categoryName.get(product.categoryId) ?? product.categoryId,
  unitAmount: product.unitAmount,
  file: product.delivery?.kind === "file" ? product.delivery.blobKey : "",
  previewImage: product.previewImage ?? "",
  published: product.published !== false,
  etsyListingId: product.etsyListingId ?? "",
  etsySku: product.etsySku ?? "",
}));

const byId = new Map(website.map((row) => [row.id, row]));

/* ------------------------------------------------------------------- stripe */

const stripeByInternalId = new Map();
let stripeStatus = "skipped (--no-stripe)";
const stripeOrphans = [];

if (useStripe) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    stripeStatus = "skipped — STRIPE_SECRET_KEY is not set in this environment";
  } else {
    try {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(key);
      const seen = [];
      for await (const product of stripe.products.list({
        active: true,
        limit: 100,
        expand: ["data.default_price"],
      })) {
        seen.push(product);
      }

      // Match on metadata.product_id first: that is the field fulfilment.ts reads
      // to turn a paid line back into a download, so it is the binding that has
      // to be right. Fall back to an exact name match, which is how the bulk
      // import was reconciled, and report anything left over rather than guess.
      const byName = new Map();
      for (const product of seen) {
        const internalId = product.metadata?.product_id;
        if (internalId && byId.has(internalId)) {
          stripeByInternalId.set(internalId, product);
          continue;
        }
        byName.set(product.name.trim().toLowerCase(), product);
      }
      for (const row of website) {
        if (stripeByInternalId.has(row.id)) continue;
        const match = byName.get(row.name.trim().toLowerCase());
        if (match) {
          stripeByInternalId.set(row.id, match);
          byName.delete(row.name.trim().toLowerCase());
        }
      }
      stripeOrphans.push(...byName.values());
      stripeStatus = `${seen.length} active products read, ${stripeByInternalId.size} matched to an internal id`;
    } catch (error) {
      const status = error?.statusCode ? ` (HTTP ${error.statusCode})` : "";
      stripeStatus = `unavailable${status} — ${error?.message ?? error}`;
    }
  }
}

/** The generated map is the authority on ids even when Stripe cannot be reached. */
const stripePriceFor = (id) => stripeByInternalId.get(id)?.default_price?.id ?? STRIPE_PRICE_IDS[id] ?? "";
const stripeProductFor = (id) => stripeByInternalId.get(id)?.id ?? STRIPE_PRODUCT_IDS[id] ?? "";

/* --------------------------------------------------------------------- etsy */

const etsyByKey = new Map();
let etsyStatus = "skipped — pass --etsy-file with an export of active listings";
const etsyOrphans = [];

if (etsyFile) {
  try {
    const parsed = JSON.parse(await readFile(etsyFile, "utf8"));
    const listings = Array.isArray(parsed) ? parsed : (parsed.results ?? []);
    const normalise = (text) => String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

    const bySku = new Map();
    const byTitle = new Map();
    for (const listing of listings) {
      if (listing.sku) bySku.set(String(listing.sku), listing);
      if (Array.isArray(listing.skus) && listing.skus[0]) bySku.set(String(listing.skus[0]), listing);
      byTitle.set(normalise(listing.title), listing);
    }

    // SKU first — /api/mind-maps-export writes the internal id as the SKU, and
    // marketplace-sync matches on the same field. Title matching is the fallback
    // for listings created by hand before that convention.
    for (const row of website) {
      const listing = bySku.get(row.etsySku || row.id) ?? byTitle.get(normalise(row.name));
      if (listing) {
        etsyByKey.set(row.id, listing);
        byTitle.delete(normalise(listing.title));
      }
    }
    const matched = new Set([...etsyByKey.values()]);
    etsyOrphans.push(...listings.filter((listing) => !matched.has(listing)));
    etsyStatus = `${listings.length} listings read, ${etsyByKey.size} matched to an internal id`;
  } catch (error) {
    etsyStatus = `could not read ${etsyFile} — ${error?.message ?? error}`;
  }
}

/* ------------------------------------------------------------ master table */

const rows = website.map((row) => {
  const stripePrice = stripePriceFor(row.id);
  const etsyListing = etsyByKey.get(row.id);
  const etsyListingId = etsyListing ? String(etsyListing.listing_id ?? etsyListing.id ?? "") : row.etsyListingId;

  const problems = [];
  if (!row.published) problems.push("unpublished");
  if (!row.file) problems.push("no-file-declared");
  if (!stripePrice) problems.push("no-stripe-price");
  if (etsyFile && !etsyListing) problems.push("no-etsy-listing");

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: (row.unitAmount / 100).toFixed(2),
    file: row.file,
    previewImage: row.previewImage,
    published: row.published ? "yes" : "no",
    etsyListingId,
    // The SKU actually on the listing when matched; otherwise the value it
    // should be set to, since the internal id is the agreed SKU convention.
    etsySku: etsyListing?.sku || row.etsySku || row.id,
    stripeProductId: stripeProductFor(row.id),
    stripePriceId: stripePrice,
    status: problems.length === 0 ? "ok" : problems.join(" "),
  };
});

const duplicateNames = new Map();
for (const row of rows) {
  const key = row.name.trim().toLowerCase();
  duplicateNames.set(key, (duplicateNames.get(key) ?? 0) + 1);
}
const duplicates = rows.filter((row) => duplicateNames.get(row.name.trim().toLowerCase()) > 1);

/* ------------------------------------------------------------------ report */

const count = (predicate) => rows.filter(predicate).length;

console.log("Catalog reconciliation");
console.log("======================");
console.log(`website records        ${rows.length} (${count((r) => r.published === "yes")} published)`);
console.log(`stripe                 ${stripeStatus}`);
console.log(`etsy                   ${etsyStatus}`);
console.log("");
console.log("Buckets");
console.log(`  ok                   ${count((r) => r.status === "ok")}`);
console.log(`  unpublished          ${count((r) => r.status.includes("unpublished"))}`);
console.log(`  no file declared     ${count((r) => r.status.includes("no-file-declared"))}  (whether it is uploaded is /api/setup-check)`);
console.log(`  missing Stripe price ${count((r) => r.status.includes("no-stripe-price"))}`);
if (etsyFile) console.log(`  missing Etsy listing ${count((r) => r.status.includes("no-etsy-listing"))}`);
console.log(`  duplicate titles     ${duplicates.length}  (among records the site actually lists)`);
console.log(`  in Stripe only       ${stripeOrphans.length}  (no website record — candidates to add)`);
console.log(`  in Etsy only         ${etsyOrphans.length}  (no website record — candidates to add)`);

if (stripeOrphans.length > 0) {
  console.log("\nIn Stripe but not on the website:");
  for (const product of stripeOrphans) console.log(`  ${product.id}  ${product.name}`);
}
if (etsyOrphans.length > 0) {
  console.log("\nIn Etsy but not on the website:");
  for (const listing of etsyOrphans) {
    console.log(`  ${listing.listing_id ?? listing.id ?? "?"}  ${listing.title ?? ""}`);
  }
}
if (duplicates.length > 0) {
  console.log("\nDuplicate titles (ids are the safe identifier — consolidate or retitle):");
  for (const row of duplicates) console.log(`  ${row.id}  ${row.name}`);
}

if (outFile) {
  const columns = [
    "id",
    "name",
    "category",
    "price",
    "file",
    "previewImage",
    "published",
    "etsyListingId",
    "etsySku",
    "stripeProductId",
    "stripePriceId",
    "status",
  ];
  const escape = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
  const csv = [columns.join(",")]
    .concat(rows.map((row) => columns.map((column) => escape(row[column])).join(",")))
    .join("\n");
  writeFileSync(outFile, `${csv}\n`);
  console.log(`\nMaster table written to ${outFile} (${rows.length} rows)`);
}
