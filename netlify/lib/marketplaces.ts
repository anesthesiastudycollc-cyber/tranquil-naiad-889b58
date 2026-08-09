/**
 * Credentials and API clients for the two marketplaces.
 *
 * This is the piece that makes blurring Etsy and Shopify listings automatic
 * rather than a manual re-upload. It is deliberately inert until credentials are
 * configured: every entry point checks `*Configured()` first and returns a 503
 * with an actionable message, exactly like the Stripe path does, so a deploy
 * without marketplace credentials behaves normally instead of erroring.
 *
 * Nothing here ever returns a token, or any part of one, to a caller.
 *
 * Environment variables
 * ---------------------
 *   MARKETPLACE_SYNC_TOKEN     Required. A long random string you choose. The
 *                              sync endpoint rewrites live listings, so it must
 *                              not be callable by anyone who finds the URL.
 *
 *   ETSY_API_KEY               Etsy app keystring.
 *   ETSY_REFRESH_TOKEN         OAuth2 refresh token with the listings_w scope.
 *   ETSY_SHOP_ID               Numeric shop id.
 *
 *   SHOPIFY_STORE_DOMAIN       e.g. anesthesia-study-co-llc.myshopify.com
 *   SHOPIFY_ADMIN_TOKEN        Admin API access token with write_files and
 *                              read_products.
 *   SHOPIFY_API_VERSION        Optional override, defaults below.
 */

import { getStore } from "@netlify/blobs";

/** Shopify dates its API quarterly; bump this when a version is retired. */
const DEFAULT_SHOPIFY_API_VERSION = "2026-04";

const ETSY_API = "https://api.etsy.com";

export function syncTokenConfigured(): boolean {
  return Boolean(Netlify.env.get("MARKETPLACE_SYNC_TOKEN"));
}

/**
 * Constant-time-ish comparison of the caller's token against the configured one.
 *
 * This endpoint edits live listings on someone's shop, so an unauthenticated
 * caller must never reach it. Length is compared first only to avoid indexing
 * past the end; the loop still visits every character of the expected value.
 */
export function syncTokenValid(supplied: string | null): boolean {
  const expected = Netlify.env.get("MARKETPLACE_SYNC_TOKEN");
  if (!expected || !supplied || supplied.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return mismatch === 0;
}

export function etsyConfigured(): boolean {
  return Boolean(
    Netlify.env.get("ETSY_API_KEY") &&
      Netlify.env.get("ETSY_REFRESH_TOKEN") &&
      Netlify.env.get("ETSY_SHOP_ID"),
  );
}

export function shopifyConfigured(): boolean {
  return Boolean(Netlify.env.get("SHOPIFY_STORE_DOMAIN") && Netlify.env.get("SHOPIFY_ADMIN_TOKEN"));
}

export function notConfiguredResponse(detail: string): Response {
  return Response.json({ error: "marketplace_not_configured", message: detail }, { status: 503 });
}

/* ------------------------------------------------------------------ Etsy */

/**
 * Etsy access tokens last an hour, so the durable credential is the refresh
 * token and an access token is minted per run.
 *
 * Etsy hands back a fresh refresh token each time one is used. The new value is
 * written to Netlify Blobs and preferred over the environment variable on the
 * next run — without that, the environment variable would eventually go stale
 * and the sync would start failing weeks later for no visible reason. The blob
 * is written before the token is used so a crash mid-run cannot lose it.
 */
export async function etsyAccessToken(): Promise<string> {
  const clientId = Netlify.env.get("ETSY_API_KEY");
  if (!clientId) throw new Error("ETSY_API_KEY is not set.");

  const store = getStore("marketplace-tokens");
  const stored = await store.get("etsy-refresh", { type: "text" }).catch(() => null);
  const refreshToken = stored || Netlify.env.get("ETSY_REFRESH_TOKEN");
  if (!refreshToken) throw new Error("ETSY_REFRESH_TOKEN is not set.");

  const response = await fetch(`${ETSY_API}/v3/public/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // A refresh token that has expired (90 days) or been revoked lands here. The
    // stored copy is cleared so the next run falls back to the environment
    // variable, which is the value the shop owner can actually replace.
    await store.delete("etsy-refresh").catch(() => {});
    throw new Error(
      `Etsy would not refresh the access token (HTTP ${response.status}). The refresh token has ` +
        "probably expired — they last 90 days. Re-authorise the app and set ETSY_REFRESH_TOKEN again.",
    );
  }

  const body = (await response.json()) as { access_token: string; refresh_token?: string };
  if (body.refresh_token && body.refresh_token !== refreshToken) {
    await store.set("etsy-refresh", body.refresh_token).catch(() => {});
  }
  return body.access_token;
}

export function etsyHeaders(accessToken: string): Record<string, string> {
  return {
    "x-api-key": Netlify.env.get("ETSY_API_KEY") ?? "",
    Authorization: `Bearer ${accessToken}`,
  };
}

export function etsyShopId(): string {
  const id = Netlify.env.get("ETSY_SHOP_ID");
  if (!id) throw new Error("ETSY_SHOP_ID is not set.");
  return id;
}

export { ETSY_API };

/* --------------------------------------------------------------- Shopify */

/**
 * One GraphQL call against the Shopify Admin API.
 *
 * Shopify retired the REST product-image endpoints, so images are managed
 * through the files model — see `replaceShopifyImage` in marketplace-sync.ts.
 */
export async function shopifyGraphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const domain = Netlify.env.get("SHOPIFY_STORE_DOMAIN");
  const token = Netlify.env.get("SHOPIFY_ADMIN_TOKEN");
  if (!domain || !token) throw new Error("Shopify credentials are not set.");

  const version = Netlify.env.get("SHOPIFY_API_VERSION") ?? DEFAULT_SHOPIFY_API_VERSION;

  const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(
      `Shopify returned HTTP ${response.status}. Check SHOPIFY_ADMIN_TOKEN and that the app has ` +
        "the write_files and read_products scopes.",
    );
  }

  const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) {
    throw new Error(`Shopify rejected the query: ${body.errors.map((e) => e.message).join("; ")}`);
  }
  if (!body.data) throw new Error("Shopify returned no data.");
  return body.data;
}
