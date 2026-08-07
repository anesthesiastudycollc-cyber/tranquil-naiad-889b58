import type { Config } from "@netlify/functions";
import { getProduct } from "../lib/catalog.js";
import { isMindMap, mindMapBundleSaving } from "../lib/mind-maps.js";
import { getStripe, notConfiguredResponse, siteOrigin, stripeConfigured } from "../lib/stripe.js";

/**
 * Creates a Stripe Checkout session for a basket of catalog product ids.
 *
 * The request body carries ids only. Names, descriptions, and prices are read
 * from the server-side catalog, so the amount charged cannot be influenced by
 * the browser. Each catalog id is honoured once — these are digital downloads,
 * so buying two copies of the same file is meaningless.
 */
export default async (req: Request) => {
  if (!stripeConfigured()) return notConfiguredResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const requested = (body as { items?: unknown })?.items;
  if (!Array.isArray(requested) || requested.length === 0) {
    return Response.json({ error: "empty_cart", message: "Select at least one item." }, { status: 400 });
  }

  const ids = [...new Set(requested.map((item) => (typeof item === "string" ? item : item?.id)))].filter(
    (id): id is string => typeof id === "string",
  );

  const products = ids.map(getProduct).filter((product) => product !== undefined);
  const unknown = ids.filter((id) => !getProduct(id));

  if (products.length === 0) {
    return Response.json(
      { error: "unknown_products", message: "None of the selected items are available.", unknown },
      { status: 400 },
    );
  }

  const origin = siteOrigin(req);
  const stripe = getStripe();

  // A cancelled checkout should land back where it started. The page is chosen
  // from a fixed set rather than taken from the request, so the body cannot
  // redirect a customer somewhere off-site.
  const cancelPath = (body as { cancelTo?: unknown })?.cancelTo === "mind-maps" ? "/mind-maps.html" : "/store.html";

  // Mind maps are $2 each or any five for $9. The saving is applied as an
  // order-level discount rather than a cheaper "bundle" line item so that every
  // paid line still names exactly one product — which is what fulfilment reads
  // to decide who may download what.
  const saving = mindMapBundleSaving(products.filter((product) => isMindMap(product.id)).length);

  try {
    let discounts: { coupon: string }[] | undefined;

    if (saving > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: saving,
        currency: "usd",
        duration: "once",
        max_redemptions: 1,
        name: "Mind map bundle — any 5 for $9",
      });
      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: products.map((product) => ({
        quantity: 1,
        price_data: {
          currency: product.currency,
          unit_amount: product.unitAmount,
          product_data: {
            name: product.name,
            description: product.format,
            // Read back during fulfilment to map a paid line item to a catalog entry.
            metadata: { product_id: product.id },
          },
        },
      })),
      // Stripe rejects a session that both carries a discount and invites a
      // promotion code, so the automatic bundle saving takes precedence.
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      success_url: `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPath}?checkout=cancelled`,
    });

    if (!session.url) {
      return Response.json({ error: "checkout_url_missing" }, { status: 502 });
    }

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Failed to create Stripe Checkout session", error);
    return Response.json(
      { error: "checkout_failed", message: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
};

export const config: Config = {
  path: "/api/checkout",
  method: "POST",
};
