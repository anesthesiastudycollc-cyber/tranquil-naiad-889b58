import type { Config } from "@netlify/functions";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import type { Product } from "../lib/catalog.js";
import { db } from "../../db/index.js";
import { orderItems, orders } from "../../db/schema.js";
import { loadPaidSession } from "../lib/fulfilment.js";
import { notConfiguredResponse, stripeConfigured } from "../lib/stripe.js";
import { createDownloadToken } from "../lib/tokens.js";

/**
 * Backs the thank-you page: confirms the Checkout session was paid, records the
 * order once, and returns a signed download link per purchased item so the files
 * are available the moment Stripe redirects the customer back.
 *
 * Safe to call repeatedly — the ledger write is keyed on the Stripe session id,
 * so refreshing the page does not duplicate the order.
 */
export default async (req: Request) => {
  if (!stripeConfigured()) return notConfiguredResponse();

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return Response.json({ error: "missing_session_id" }, { status: 400 });
  }

  const result = await loadPaidSession(sessionId);

  if (!result.ok) {
    if (result.reason === "unpaid") {
      return Response.json(
        {
          error: "payment_incomplete",
          message: "This order has not completed payment yet. If you were charged, contact support.",
          paymentStatus: result.status,
        },
        { status: 402 },
      );
    }
    return Response.json({ error: "order_not_found" }, { status: 404 });
  }

  const { session, products } = result;
  const email = session.customer_details?.email ?? null;

  // Bookkeeping is best-effort and deliberately non-blocking: the customer has
  // paid, so a ledger failure is logged for follow-up rather than surfaced as a
  // failed delivery.
  try {
    await recordOrder(session, products, email);
  } catch (error) {
    console.error(`Failed to record order for session ${session.id}`, error);
  }

  return Response.json({
    email,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    items: products.map((product) => ({
      id: product.id,
      name: product.name,
      format: product.format,
      categoryId: product.categoryId,
      unitAmount: product.unitAmount,
      downloadUrl:
        product.delivery.kind === "link"
          ? product.delivery.url
          : `/api/download?token=${encodeURIComponent(createDownloadToken(session.id, product.id))}`,
    })),
  });
};

async function recordOrder(session: Stripe.Checkout.Session, products: Product[], email: string | null) {
  const existing = await db.select({ id: orders.id }).from(orders).where(eq(orders.stripeSessionId, session.id));
  if (existing.length > 0) return;

  const paymentIntent = session.payment_intent;

  const [order] = await db
    .insert(orders)
    .values({
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof paymentIntent === "string" ? paymentIntent : (paymentIntent?.id ?? null),
      email,
      amountTotal: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
    })
    .returning();

  if (products.length === 0) return;

  await db.insert(orderItems).values(
    products.map((product) => ({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      category: product.categoryId,
      unitAmount: product.unitAmount,
      quantity: 1,
    })),
  );
}

export const config: Config = {
  path: "/api/order",
  method: "GET",
};
