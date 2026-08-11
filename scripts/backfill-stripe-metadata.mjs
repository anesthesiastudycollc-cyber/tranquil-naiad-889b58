#!/usr/bin/env node
/**
 * Writes `product_id` into the metadata of every Stripe Product that
 * `netlify/lib/stripe-price-map.ts` maps to an internal catalog id.
 *
 * Why this exists: `netlify/lib/fulfilment.ts` resolves a paid Checkout session
 * back to downloadable products by reading `metadata.product_id` off the Stripe
 * Product. Today that metadata is written inline on every session by
 * `checkout.mts` via `product_data.metadata`. The bulk import created its
 * products with `asc_sku` / `shopify_handle` / `import_source` instead, so the
 * moment checkout starts using permanent Price ids the inline write disappears
 * and fulfilment stops recognising anything. Run this first, verify it, and only
 * then switch checkout over — in that order a customer is never charged for a
 * download the site cannot then identify.
 *
 * Metadata updates merge in Stripe, so the import's own keys are preserved.
 *
 * Usage:
 *   node scripts/backfill-stripe-metadata.mjs            # dry run, writes nothing
 *   node scripts/backfill-stripe-metadata.mjs --confirm  # apply
 *   node scripts/backfill-stripe-metadata.mjs --confirm --force
 *                                                        # also overwrite a
 *                                                        # conflicting product_id
 *
 * Requires STRIPE_SECRET_KEY in the environment. Exits non-zero if anything was
 * left unresolved, so it doubles as a verification pass once applied.
 */

import Stripe from "stripe";
import {
  STRIPE_EXPECTED_AMOUNTS,
  STRIPE_PRICE_IDS,
  STRIPE_PRODUCT_IDS,
} from "../netlify/lib/stripe-price-map.ts";

const apply = process.argv.includes("--confirm");
const force = process.argv.includes("--force");

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set. Export it and run again.");
  process.exit(1);
}

const stripe = new Stripe(key);
const ids = Object.keys(STRIPE_PRODUCT_IDS);

const already = [];
const updated = [];
const conflicts = [];
const priceProblems = [];
const errors = [];

console.log(
  `${apply ? "Applying" : "Dry run —"} product_id metadata for ${ids.length} mapped catalog ids.` +
    (apply ? "" : " Nothing will be written. Re-run with --confirm to apply."),
);

for (const id of ids) {
  const productId = STRIPE_PRODUCT_IDS[id];
  const priceId = STRIPE_PRICE_IDS[id];

  try {
    // The price is checked as well as the product: the whole point of moving to
    // permanent ids is that Stripe starts deciding what a customer pays, so a
    // price that has drifted from the catalog needs to surface here rather than
    // at a customer's card.
    const [product, price] = await Promise.all([
      stripe.products.retrieve(productId),
      stripe.prices.retrieve(priceId),
    ]);

    const expected = STRIPE_EXPECTED_AMOUNTS[id];
    const priceProduct = typeof price.product === "string" ? price.product : price.product?.id;
    if (priceProduct !== productId) {
      priceProblems.push(`${id}: price ${priceId} belongs to ${priceProduct}, not ${productId}`);
    } else if (price.unit_amount !== expected) {
      priceProblems.push(
        `${id}: Stripe charges ${price.unit_amount} but the catalog shows ${expected}`,
      );
    } else if (price.currency !== "usd") {
      priceProblems.push(`${id}: price ${priceId} is in ${price.currency}, not usd`);
    } else if (!price.active) {
      priceProblems.push(`${id}: price ${priceId} is not active`);
    }

    const existing = product.metadata?.product_id;
    if (existing === id) {
      already.push(id);
      continue;
    }
    if (existing && !force) {
      conflicts.push(`${id}: product ${productId} already carries product_id="${existing}"`);
      continue;
    }

    if (apply) {
      await stripe.products.update(productId, { metadata: { product_id: id } });
    }
    updated.push(`${id} -> ${productId}${existing ? ` (overwrote "${existing}")` : ""}`);
  } catch (error) {
    errors.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const report = (label, list) => {
  if (!list.length) return;
  console.log(`\n${label} (${list.length})`);
  for (const line of list) console.log(`  ${line}`);
};

console.log(`\nAlready correct: ${already.length}`);
report(apply ? "Updated" : "Would update", updated);
report("Conflicting product_id — rerun with --force to overwrite", conflicts);
report("Price problems — these block the checkout switch", priceProblems);
report("Errors", errors);

const unresolved = conflicts.length + priceProblems.length + errors.length;
if (!apply && updated.length) {
  console.log("\nDry run only. Re-run with --confirm to write these.");
} else if (apply && !unresolved) {
  console.log("\nAll mapped products carry product_id. Checkout can now use permanent Price ids.");
}
process.exit(unresolved ? 1 : 0);
