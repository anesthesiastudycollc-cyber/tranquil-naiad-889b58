import Stripe from "stripe";

/**
 * The store is inert until STRIPE_SECRET_KEY is configured. Endpoints check
 * `stripeConfigured()` first and return a 503 with an actionable message rather
 * than throwing, so an unconfigured deploy still serves a working storefront
 * that explains itself instead of a blank error.
 */

export function stripeConfigured(): boolean {
  return Boolean(Netlify.env.get("STRIPE_SECRET_KEY"));
}

export function getStripe(): Stripe {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return new Stripe(key);
}

export function notConfiguredResponse(): Response {
  return Response.json(
    {
      error: "store_not_configured",
      message:
        "Checkout is not available yet. Set the STRIPE_SECRET_KEY environment variable for this site to enable payments.",
    },
    { status: 503 },
  );
}

/**
 * Public origin to build Stripe return URLs against.
 *
 * The incoming request's own origin is used first so a deploy preview sends
 * customers back to that preview instead of to production.
 */
export function siteOrigin(req: Request): string {
  try {
    return new URL(req.url).origin;
  } catch {
    const configured = Netlify.env.get("DEPLOY_PRIME_URL") ?? Netlify.env.get("URL");
    if (configured) return configured.replace(/\/$/, "");
    throw new Error("Could not determine the site origin for Stripe return URLs.");
  }
}
