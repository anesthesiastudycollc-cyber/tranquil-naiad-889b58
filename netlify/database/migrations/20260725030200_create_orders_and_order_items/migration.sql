CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"category" text NOT NULL,
	"unit_amount" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"stripe_session_id" text NOT NULL UNIQUE,
	"stripe_payment_intent_id" text,
	"email" text,
	"amount_total" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" ("order_id");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" ("email");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");