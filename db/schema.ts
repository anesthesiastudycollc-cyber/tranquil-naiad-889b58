import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

/**
 * One row per completed Stripe Checkout session. `stripeSessionId` is unique so
 * the fulfilment endpoint can be replayed safely when a customer refreshes the
 * thank-you page.
 */
export const orders = pgTable(
  "orders",
  {
    id: serial().primaryKey(),
    stripeSessionId: text("stripe_session_id").notNull().unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    email: text(),
    amountTotal: integer("amount_total").notNull(),
    currency: text().notNull().default("usd"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("orders_email_idx").on(table.email)],
);

/**
 * The catalog items a given order paid for. Product metadata is denormalised so
 * a receipt still reads correctly after the catalog is edited or repriced.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: serial().primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    category: text().notNull(),
    unitAmount: integer("unit_amount").notNull(),
    quantity: integer().notNull().default(1),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);
