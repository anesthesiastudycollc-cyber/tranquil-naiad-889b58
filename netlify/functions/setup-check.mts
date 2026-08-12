import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { PRODUCTS } from "../lib/catalog.js";
import { MIND_MAP_PRODUCTS } from "../lib/mind-maps.js";
import { etsyConfigured, shopifyConfigured, syncTokenConfigured } from "../lib/marketplaces.js";
import { getStripe, stripeConfigured } from "../lib/stripe.js";

/**
 * A human-readable setup checklist at /api/setup-check.
 *
 * Configuring payments means setting environment variables in a dashboard and
 * then having no way to tell whether it worked short of buying something. This
 * page answers that: it asks Stripe whether the key actually authenticates,
 * whether the account can take real charges, and which product files are still
 * missing from the blob store.
 *
 * It never reveals a key or any part of one — only whether Stripe accepted it.
 * The page is unlinked from the site nav; it is a URL the shop owner visits.
 */

type Level = "ok" | "warn" | "bad";
type Check = { level: Level; title: string; detail: string };

export default async () => {
  const checks: Check[] = [];

  checks.push(await stripeKeyCheck());
  checks.push(downloadSecretCheck());
  checks.push(await productFileCheck());
  checks.push(marketplaceCheck());

  return htmlPage(checks);
};

/**
 * Whether the Etsy and Shopify photo sync can run.
 *
 * Reports presence only. A credential's value never appears here, and neither
 * does the sync token — printing that would hand over the ability to rewrite the
 * shop's listings to anyone who opened this page.
 */
function marketplaceCheck(): Check {
  const missing: string[] = [];
  if (!syncTokenConfigured()) missing.push("MARKETPLACE_SYNC_TOKEN");
  if (!etsyConfigured()) missing.push("ETSY_API_KEY, ETSY_REFRESH_TOKEN, ETSY_SHOP_ID");
  if (!shopifyConfigured()) missing.push("SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_TOKEN");

  if (missing.length === 0) {
    return {
      level: "ok",
      title: "Etsy and Shopify photos can be blurred automatically",
      detail:
        "Both marketplaces are connected. Open /api/marketplace-sync with your sync token to see " +
        "which listings would change, then apply it. Nothing is changed until you press the button.",
    };
  }

  return {
    level: "warn",
    title: "Etsy and Shopify photos have to be replaced by hand",
    detail:
      "This site's own images and the payment page are already blurred; a listing on Etsy or " +
      "Shopify shows a photo stored on their servers, which only their API can change. Still to " +
      `set in Netlify: ${missing.join("; ")}. Until then, replace those photos yourself from ` +
      "assets/listing-images/ — see MIND-MAPS-SETUP.md.",
  };
}

/**
 * What a Stripe secret key looks like, so the page can say which of the several
 * "Stripe rejected the key" causes actually applies.
 *
 * Asking Stripe is the real test, but a rejection on its own leaves the owner
 * guessing between a typo, a rolled key, and having pasted the wrong value
 * entirely — and the wrong value is by far the most common. That is decidable
 * here without a network call, so it is checked first and named precisely.
 */
const STRIPE_SECRET_KEY_PATTERN = /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/;
const STRIPE_SECRET_KEY_MIN_LENGTH = 40;

/**
 * The part of a value before its first underscore, for telling the owner which
 * kind of value they pasted.
 *
 * Only ever called for a value that has already failed
 * `STRIPE_SECRET_KEY_PATTERN`, so it cannot echo a working credential, and it is
 * capped regardless — the goal is to say "this is a pk_/price_/product id", not
 * to reproduce what was saved.
 */
function valueKind(value: string): string {
  const prefix = value.split("_")[0] ?? "";
  return prefix.length > 0 && prefix.length <= 6 ? `"${prefix}_…"` : "something else";
}

async function stripeKeyCheck(): Promise<Check> {
  if (!stripeConfigured()) {
    return {
      level: "bad",
      title: "Card payments are switched off",
      detail:
        "STRIPE_SECRET_KEY is not set for this site. Until it is, the store and the mind map page " +
        "still work but send customers to Etsy instead of taking a card. Add it in Netlify under " +
        "Site configuration → Environment variables, then redeploy.",
    };
  }

  const raw = Netlify.env.get("STRIPE_SECRET_KEY") ?? "";
  const key = raw.trim();

  // A value that is not shaped like a Stripe secret key can be diagnosed exactly,
  // and no amount of re-copying the wrong field will fix it.
  if (!STRIPE_SECRET_KEY_PATTERN.test(key) || key.length < STRIPE_SECRET_KEY_MIN_LENGTH) {
    return {
      level: "bad",
      title: "The value saved as STRIPE_SECRET_KEY is not a Stripe secret key",
      detail:
        `It starts with ${valueKind(key)} and is ${key.length} characters long. A Stripe secret key ` +
        "starts with sk_test_ or sk_live_ and is far longer — around a hundred characters. This is " +
        "why every card payment is failing: customers reach the store, press buy, and are told to " +
        "try again. Go to Stripe → Developers → API keys and copy the Secret key (press Reveal " +
        "first — the Publishable key beginning pk_ is the other one on that screen and will not " +
        "work). Paste it into Netlify under Site configuration → Environment variables as " +
        "STRIPE_SECRET_KEY, redeploy, and reload this page.",
    };
  }

  if (raw !== key) {
    return {
      level: "bad",
      title: "STRIPE_SECRET_KEY has a stray space in it",
      detail:
        "The key itself looks right, but the saved value has a space or line break at the start or " +
        "end, which Stripe counts as part of the key and rejects. Re-paste it in Netlify without " +
        "the extra whitespace and redeploy.",
    };
  }

  // The key prefix is not a secret — it only says which Stripe mode is in use.
  const live = key.startsWith("sk_live_");
  const mode = live ? "live" : "test";
  const stripe = getStripe();

  try {
    await stripe.balance.retrieve();
  } catch {
    return {
      level: "bad",
      title: "Stripe rejected the key",
      detail:
        "STRIPE_SECRET_KEY is shaped like a real key, but Stripe would not accept it. That normally " +
        "means it was copied incompletely, or it has been rolled or deleted in the Stripe dashboard " +
        "since it was saved here. Copy the Secret key again from Stripe → Developers → API keys, " +
        "paste it fresh, and redeploy.",
    };
  }

  if (!live) {
    return {
      level: "warn",
      title: "Payments are working in test mode",
      detail:
        "Stripe accepted the key and checkout works, but this is a test key — no real money can " +
        "move. Use card 4242 4242 4242 4242 with any future expiry and any CVC to run a practice " +
        "purchase. When you are happy, replace STRIPE_SECRET_KEY with your live key (it starts " +
        "sk_live_) and redeploy.",
    };
  }

  // In live mode, a key that authenticates is still not enough: Stripe holds
  // charges until the account's business details have been accepted.
  try {
    const account = await stripe.accounts.retrieve();
    if (account.charges_enabled === false) {
      return {
        level: "bad",
        title: "Stripe is not ready to accept live charges yet",
        detail:
          "The live key works, but Stripe has not finished activating this account, so payments " +
          "would be declined. Sign in to the Stripe dashboard — it will show what is outstanding, " +
          "usually business details, an identity document, or bank account confirmation.",
      };
    }
  } catch {
    // Not fatal: some restricted keys cannot read the account, and the key
    // itself has already proved it authenticates.
    return {
      level: "ok",
      title: "Payments are live",
      detail:
        "Stripe accepted the live key. Account status could not be read with this key, so confirm " +
        "in the Stripe dashboard that the account is fully activated.",
    };
  }

  return {
    level: "ok",
    title: "Payments are live",
    detail: `Stripe accepted the ${mode} key and the account can take real charges. Customers can pay by card on this site.`,
  };
}

function downloadSecretCheck(): Check {
  if (Netlify.env.get("DOWNLOAD_SIGNING_SECRET")) {
    return {
      level: "ok",
      title: "Download links are signed with their own key",
      detail:
        "DOWNLOAD_SIGNING_SECRET is set. Never change or remove it once customers have bought — " +
        "doing so breaks every download link already sent out.",
    };
  }

  if (stripeConfigured()) {
    return {
      level: "warn",
      title: "Download links depend on the Stripe key",
      detail:
        "DOWNLOAD_SIGNING_SECRET is not set, so download links are signed with a key derived from " +
        "STRIPE_SECRET_KEY. That works, but the day you swap the test key for the live one, every " +
        "download link already issued stops working. Set DOWNLOAD_SIGNING_SECRET to a long random " +
        "value now, before real customers buy anything.",
    };
  }

  return {
    level: "bad",
    title: "No download signing key",
    detail:
      "Neither DOWNLOAD_SIGNING_SECRET nor STRIPE_SECRET_KEY is set, so no download links can be " +
      "issued at all. Setting up payments fixes this.",
  };
}

async function productFileCheck(): Promise<Check> {
  const products = [...PRODUCTS, ...MIND_MAP_PRODUCTS];
  const expected = products.flatMap((product) =>
    product.delivery.kind === "file" ? [{ key: product.delivery.blobKey, name: product.name }] : [],
  );

  let uploaded: Set<string>;
  try {
    const store = getStore("digital-products");
    const { blobs } = await store.list();
    uploaded = new Set(blobs.map((blob) => blob.key));
  } catch {
    return {
      level: "warn",
      title: "Could not read the product file store",
      detail:
        "The digital-products store could not be listed, so it is not possible to say which files " +
        "are in place. This is normal before the first file has ever been uploaded.",
    };
  }

  const missing = expected.filter((item) => !uploaded.has(item.key));

  if (missing.length === 0) {
    return {
      level: "ok",
      title: `All ${expected.length} product files are uploaded`,
      detail: "Every item that can be bought has a file ready to deliver.",
    };
  }

  const shown = missing.slice(0, 15).map((item) => `${item.name} (${item.key})`);
  const rest = missing.length - shown.length;

  return {
    level: "warn",
    title: `${missing.length} of ${expected.length} product files are not uploaded yet`,
    detail:
      "These can still be bought. The customer pays normally and sees a message asking them to " +
      "email support, so no sale is lost — but you have to send the file by hand until it is " +
      `uploaded to the digital-products store: ${shown.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}.`,
  };
}

function htmlPage(checks: Check[]): Response {
  const escape = (value: string) => value.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);
  const worst: Level = checks.some((c) => c.level === "bad")
    ? "bad"
    : checks.some((c) => c.level === "warn")
      ? "warn"
      : "ok";

  const heading = {
    ok: "Everything is set up",
    warn: "Working, with something worth doing",
    bad: "Not ready to take payments yet",
  }[worst];

  const rows = checks
    .map(
      (check) => `
    <div class="check ${check.level}">
      <h2>${escape(check.title)}</h2>
      <p>${escape(check.detail)}</p>
    </div>`,
    )
    .join("");

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Payment setup check — Anesthesia Study Co. LLC</title>
<style>
  body { margin:0; padding:32px 20px; font-family: Arial, Helvetica, sans-serif; color:#fff;
    line-height:1.6; background: linear-gradient(135deg,#07111f,#120626 65%,#081827); }
  main { max-width:720px; margin:auto; }
  h1 { font-size:26px; margin:0 0 6px; }
  .lead { color:rgba(255,255,255,0.76); margin:0 0 24px; }
  .check { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16);
    border-left-width:4px; border-radius:16px; padding:18px 20px; margin-bottom:14px; }
  .check.ok { border-left-color:#37d67a; }
  .check.warn { border-left-color:#ffd84d; }
  .check.bad { border-left-color:#ff6b6b; }
  .check h2 { font-size:17px; margin:0 0 6px; }
  .check p { color:rgba(255,255,255,0.76); margin:0; font-size:15px; }
  footer { color:rgba(255,255,255,0.55); font-size:13px; margin-top:22px; }
  a { color:#00c2ff; }
</style>
</head>
<body>
<main>
  <h1>${escape(heading)}</h1>
  <p class="lead">This page checks the payment setup for this site. Reload it after changing a
     setting in Netlify and redeploying. It never shows your keys.</p>
  ${rows}
  <footer>
    Step-by-step instructions: STRIPE-SETUP.md in the site repository ·
    <a href="/store.html">Store</a> · <a href="/mind-maps.html">Mind maps</a>
  </footer>
</main>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export const config: Config = {
  path: "/api/setup-check",
  method: "GET",
};
