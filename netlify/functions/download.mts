import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { getProduct } from "../lib/catalog.js";
import { loadPaidSession } from "../lib/fulfilment.js";
import { stripeConfigured } from "../lib/stripe.js";
import { verifyDownloadToken } from "../lib/tokens.js";

/**
 * Serves a purchased file from the `digital-products` blob store.
 *
 * Two independent checks have to pass: the link's HMAC must verify and still be
 * within its 30-day window, and the Stripe session it names must still show as
 * paid for that exact product. A leaked link therefore grants only what was
 * actually bought, and a refunded or forged link grants nothing.
 *
 * This endpoint is followed directly by a browser, so failures render as a small
 * HTML page rather than JSON.
 */
export default async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return errorPage(400, "Missing download link", "This download link is incomplete.");

  if (!stripeConfigured()) {
    return errorPage(503, "Store not configured", "Downloads are unavailable until payments are configured.");
  }

  const verified = verifyDownloadToken(token);
  if (!verified.ok) {
    return verified.reason === "expired"
      ? errorPage(
          410,
          "This download link has expired",
          "Download links stay valid for 30 days. Email admin@anesthesiastudyco.com with your order receipt and we will issue a fresh link.",
        )
      : errorPage(403, "Invalid download link", "This link could not be verified.");
  }

  const { sid, pid } = verified.claims;

  const product = getProduct(pid);
  if (!product) return errorPage(404, "Product unavailable", "This item is no longer in the catalog.");

  const session = await loadPaidSession(sid);
  if (!session.ok) {
    return errorPage(403, "Order not confirmed", "We could not confirm a completed payment for this download.");
  }

  if (!session.products.some((entitled) => entitled.id === pid)) {
    return errorPage(403, "Not part of this order", "This item was not included in the linked order.");
  }

  if (product.delivery.kind === "link") {
    return Response.redirect(product.delivery.url, 302);
  }

  const store = getStore("digital-products");
  const file = await store.get(product.delivery.blobKey, { type: "stream" });

  if (!file) {
    console.error(`Blob missing for product ${pid}: digital-products/${product.delivery.blobKey}`);
    return errorPage(
      503,
      "File not available yet",
      "Your purchase is recorded but this file has not been uploaded to the store yet. Email admin@anesthesiastudyco.com and we will send it to you directly.",
    );
  }

  // The interactive apps are marked `openInBrowser`, so they render here instead
  // of being saved to disk: an app that arrives as a file in a Downloads folder
  // is a worse product than one that opens when the buyer taps the button, and
  // on a phone it is frequently one that cannot be opened at all. Everything
  // else — the PDFs, the ZIPs, the artwork — still downloads as a file.
  //
  // Only first-party files this repo publishes ever carry that flag. Serving
  // HTML inline runs it on our own origin, so `nosniff` is set here and nothing
  // a customer supplies is ever streamed through this endpoint.
  const inline = product.delivery.openInBrowser === true;

  return new Response(file, {
    headers: {
      "Content-Type": product.delivery.contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${product.delivery.filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
};

function errorPage(status: number, title: string, detail: string): Response {
  const escape = (value: string) => value.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} — Anesthesia Study Co. LLC</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
    font-family: Arial, Helvetica, sans-serif; color:#fff; line-height:1.6;
    background: linear-gradient(135deg,#07111f,#120626 65%,#081827); }
  .box { max-width:520px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16);
    border-radius:20px; padding:28px; box-shadow:0 20px 50px rgba(0,0,0,0.28); }
  h1 { margin:0 0 10px; font-size:24px; }
  p { color:rgba(255,255,255,0.76); }
  a { color:#00c2ff; }
</style>
</head>
<body>
  <div class="box">
    <h1>${escape(title)}</h1>
    <p>${escape(detail)}</p>
    <p><a href="/store.html">Return to the store</a></p>
  </div>
</body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export const config: Config = {
  path: "/api/download",
  method: "GET",
};
