import type { Config } from "@netlify/functions";
import { publicCatalog } from "../lib/catalog.js";
import { stripeConfigured } from "../lib/stripe.js";

/**
 * The storefront renders itself from this endpoint so prices exist in exactly
 * one place (netlify/lib/catalog.ts) and cannot drift out of sync with what
 * checkout actually charges.
 */
export default async () => {
  return Response.json(
    { ...publicCatalog(), checkoutEnabled: stripeConfigured() },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
};

export const config: Config = {
  path: "/api/catalog",
  method: "GET",
};
