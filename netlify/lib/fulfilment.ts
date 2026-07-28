import type Stripe from "stripe";
import { getProduct, type Product } from "./catalog.js";
import { getStripe } from "./stripe.js";

/**
 * Stripe is the authority on entitlement. Both the receipt endpoint and the
 * download endpoint resolve a Checkout session through here rather than trusting
 * the order ledger, which means a database outage can delay bookkeeping but can
 * never stop a paying customer from getting their files.
 */

export type PaidSessionResult =
  | { ok: true; session: Stripe.Checkout.Session; products: Product[] }
  | { ok: false; reason: "not-found" | "unpaid"; status: string | null };

export async function loadPaidSession(sessionId: string): Promise<PaidSessionResult> {
  const stripe = getStripe();

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });
  } catch (error) {
    console.error(`Could not retrieve Checkout session ${sessionId}`, error);
    return { ok: false, reason: "not-found", status: null };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, reason: "unpaid", status: session.payment_status };
  }

  const products: Product[] = [];
  for (const item of session.line_items?.data ?? []) {
    const stripeProduct = item.price?.product;
    if (!stripeProduct || typeof stripeProduct === "string" || stripeProduct.deleted) continue;

    const product = getProduct(stripeProduct.metadata?.product_id ?? "");
    if (product) products.push(product);
  }

  return { ok: true, session, products };
}
