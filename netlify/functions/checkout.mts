import type { Config } from "@netlify/functions";
import { getProduct } from "../lib/catalog.js";
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

  try {
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
      allow_promotion_codes: true,
      success_url: `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/store.html?checkout=cancelled`,
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
