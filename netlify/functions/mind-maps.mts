import type { Config } from "@netlify/functions";
import { publicMindMaps } from "../lib/mind-maps.js";
import { stripeConfigured } from "../lib/stripe.js";

/**
 * Feeds `mind-maps.html`. The page used to carry its own copy of the map list
 * and its own prices, which meant the browser was the only thing that knew what
 * a map cost. Now the list and the prices come from here — the same values
 * checkout charges from — so the two can no longer disagree.
 */
export default async () => {
  return Response.json(
    { ...publicMindMaps(), checkoutEnabled: stripeConfigured() },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
};

export const config: Config = {
  path: "/api/mind-maps",
  method: "GET",
};
