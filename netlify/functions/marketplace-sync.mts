import type { Config } from "@netlify/functions";
import {
  etsyConfigured,
  notConfiguredResponse,
  shopifyConfigured,
  syncTokenConfigured,
  syncTokenValid,
} from "../lib/marketplaces.js";
import { syncEtsy, syncShopify, type SyncReport, type SyncScope } from "../lib/marketplace-sync.js";
import { siteOrigin } from "../lib/stripe.js";

/**
 * Owner-facing control panel and API for pushing the blurred listing photos to
 * Etsy and Shopify — /api/marketplace-sync.
 *
 * This is the answer to "the maps are still sharp on Etsy". Everything this site
 * serves was already blurred; a live marketplace listing shows a file hosted by
 * the marketplace, so fixing it requires writing to their API. That is what this
 * does, one listing at a time, matching by SKU.
 *
 *   GET  /api/marketplace-sync?token=…   Dry run. Reports what would change and
 *                                        offers a button to apply it.
 *   POST /api/marketplace-sync           Applies the change. Requires confirm=1.
 *
 * Both require MARKETPLACE_SYNC_TOKEN, because this endpoint edits a live shop
 * and the URL is otherwise guessable. Like /api/setup-check it is unlinked from
 * the site nav, and it never renders a credential or any part of one.
 *
 * Writes are batched (`limit`, default 10). Etsy rate-limits at about ten calls
 * a second and a function invocation is not allowed to run long, so a full shop
 * takes several runs — the page says how many listings are left.
 */

/** Dry runs only read, so they can cover the whole shop in one pass. */
const DRY_RUN_LIMIT = 1000;
const APPLY_LIMIT = 10;

export default async (req: Request) => {
  const url = new URL(req.url);
  const form = req.method === "POST" ? await readBody(req) : new URLSearchParams();

  const token = req.headers.get("x-sync-token") ?? form.get("token") ?? url.searchParams.get("token");

  if (!syncTokenConfigured()) {
    return notConfiguredResponse(
      "MARKETPLACE_SYNC_TOKEN is not set for this site. This endpoint rewrites the photos on your " +
        "live Etsy and Shopify listings, so it stays switched off until you choose a password for " +
        "it. Add MARKETPLACE_SYNC_TOKEN in Netlify under Site configuration → Environment " +
        "variables, set it to a long random string, and redeploy.",
    );
  }

  if (!syncTokenValid(token)) {
    return new Response("Not authorised. Add ?token=… with your MARKETPLACE_SYNC_TOKEN.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const platform = (form.get("platform") ?? url.searchParams.get("platform") ?? "both").toLowerCase();
  const scope: SyncScope =
    (form.get("scope") ?? url.searchParams.get("scope")) === "all" ? "all" : "primary";
  const dryRun = !(req.method === "POST" && (form.get("confirm") === "1" || form.get("confirm") === "true"));

  const requestedLimit = Number(form.get("limit") ?? url.searchParams.get("limit"));
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.floor(requestedLimit)
      : dryRun
        ? DRY_RUN_LIMIT
        : APPLY_LIMIT;

  const origin = siteOrigin(req);
  const reports: SyncReport[] = [];
  const problems: string[] = [];

  if (platform === "etsy" || platform === "both") {
    if (!etsyConfigured()) {
      problems.push(
        "Etsy is not connected. Set ETSY_API_KEY, ETSY_REFRESH_TOKEN, and ETSY_SHOP_ID in Netlify.",
      );
    } else {
      try {
        reports.push(await syncEtsy(origin, { dryRun, scope, limit }));
      } catch (error) {
        problems.push(`Etsy: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (platform === "shopify" || platform === "both") {
    if (!shopifyConfigured()) {
      problems.push(
        "Shopify is not connected. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN in Netlify.",
      );
    } else {
      try {
        reports.push(await syncShopify(origin, { dryRun, scope, limit }));
      } catch (error) {
        problems.push(`Shopify: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if ((form.get("format") ?? url.searchParams.get("format")) === "json") {
    return Response.json(
      { dryRun, scope, limit, problems, reports },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return htmlPage({ dryRun, scope, limit, platform, problems, reports, token: token ?? "" });
};

/** Accepts both the form post from the page below and a JSON body from a script. */
async function readBody(req: Request): Promise<URLSearchParams> {
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const json = (await req.json()) as Record<string, unknown>;
      return new URLSearchParams(
        Object.entries(json).map(([key, value]) => [key, String(value)]),
      );
    }
    return new URLSearchParams(await req.text());
  } catch {
    return new URLSearchParams();
  }
}

const escape = (value: string) => value.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

function htmlPage(state: {
  dryRun: boolean;
  scope: SyncScope;
  limit: number;
  platform: string;
  problems: string[];
  reports: SyncReport[];
  token: string;
}): Response {
  const { dryRun, scope, problems, reports, token } = state;

  const remaining = reports.reduce(
    (total, report) => total + Math.max(0, report.listingsSeen - report.outcomes.length),
    0,
  );

  const heading = problems.length && !reports.length
    ? "Nothing is connected yet"
    : dryRun
      ? "Preview — nothing has been changed"
      : "Listings updated";

  const problemRows = problems
    .map((problem) => `<div class="check bad"><p>${escape(problem)}</p></div>`)
    .join("");

  const reportRows = reports
    .map((report) => {
      const rows = report.outcomes
        .map(
          (outcome) => `
        <tr class="${outcome.status}">
          <td>${escape(outcome.listing)}</td>
          <td>${escape(outcome.mapId ?? "—")}</td>
          <td>${escape(outcome.detail)}</td>
        </tr>`,
        )
        .join("");

      return `
    <div class="check ${report.failed ? "bad" : report.changed ? "warn" : "ok"}">
      <h2>${escape(report.platform === "etsy" ? "Etsy" : "Shopify")}</h2>
      <p>${report.listingsSeen} listing(s) found · ${report.matched} matched · ${report.changed}
         ${dryRun ? "would be updated" : "updated"} · ${report.unmatched} not matched ·
         ${report.failed} failed</p>
      ${rows ? `<table><thead><tr><th>Listing</th><th>Map</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
    </div>`;
    })
    .join("");

  const canApply = reports.some((report) => report.changed > 0);

  const applyForm =
    dryRun && canApply
      ? `
  <form method="POST" class="apply">
    <input type="hidden" name="token" value="${escape(token)}">
    <input type="hidden" name="platform" value="${escape(state.platform)}">
    <input type="hidden" name="confirm" value="1">
    <label>Photos to replace
      <select name="scope">
        <option value="primary"${scope === "primary" ? " selected" : ""}>Main photo only (safer)</option>
        <option value="all"${scope === "all" ? " selected" : ""}>Every photo on the listing</option>
      </select>
    </label>
    <label>How many listings this run
      <input type="number" name="limit" value="${APPLY_LIMIT}" min="1" max="100">
    </label>
    <button type="submit">Replace the photos now</button>
    <p class="warn-note">This changes your live listings. The blurred file replaces the photo on
       each matched listing. There is no undo from here — to restore a photo you would upload it
       again in Etsy or Shopify.</p>
  </form>`
      : "";

  const nextNote =
    !dryRun && remaining > 0
      ? `<p class="lead">${remaining} listing(s) were not reached in this run. Reload this page and
         run it again to continue.</p>`
      : "";

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Marketplace photo sync — Anesthesia Study Co. LLC</title>
<style>
  body { margin:0; padding:32px 20px; font-family: Arial, Helvetica, sans-serif; color:#fff;
    line-height:1.6; background: linear-gradient(135deg,#07111f,#120626 65%,#081827); }
  main { max-width:900px; margin:auto; }
  h1 { font-size:26px; margin:0 0 6px; }
  .lead { color:rgba(255,255,255,0.76); margin:0 0 24px; }
  .check { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16);
    border-left-width:4px; border-radius:16px; padding:18px 20px; margin-bottom:14px; }
  .check.ok { border-left-color:#37d67a; }
  .check.warn { border-left-color:#ffd84d; }
  .check.bad { border-left-color:#ff6b6b; }
  .check h2 { font-size:17px; margin:0 0 6px; }
  .check p { color:rgba(255,255,255,0.76); margin:0; font-size:15px; }
  table { width:100%; border-collapse:collapse; margin-top:14px; font-size:13px; }
  th { text-align:left; color:rgba(255,255,255,0.55); font-weight:600; padding:6px 8px;
    border-bottom:1px solid rgba(255,255,255,0.16); }
  td { padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.08); vertical-align:top;
    color:rgba(255,255,255,0.82); }
  tr.skipped td { color:rgba(255,255,255,0.5); }
  tr.failed td { color:#ffb4b4; }
  .apply { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16);
    border-radius:16px; padding:18px 20px; margin-top:8px; }
  .apply label { display:block; font-size:14px; margin-bottom:12px;
    color:rgba(255,255,255,0.76); }
  .apply select, .apply input { display:block; margin-top:4px; padding:8px 10px; border-radius:8px;
    border:1px solid rgba(255,255,255,0.24); background:#0b1a2c; color:#fff; font-size:15px; }
  .apply button { padding:11px 20px; border-radius:999px; border:0; background:#00c2ff;
    color:#04121f; font-size:15px; font-weight:700; cursor:pointer; }
  .warn-note { color:#ffd84d; font-size:13px; margin:12px 0 0; }
  footer { color:rgba(255,255,255,0.55); font-size:13px; margin-top:22px; }
  a { color:#00c2ff; }
</style>
</head>
<body>
<main>
  <h1>${escape(heading)}</h1>
  <p class="lead">This replaces the photo on your live Etsy and Shopify listings with the blurred,
     watermarked version, so a map cannot be read — and screenshotted — without buying it. Listings
     are matched to a map by SKU (for example <code>map-05</code>); set the SKU on a listing if it
     shows as not matched.</p>
  ${nextNote}
  ${problemRows}
  ${reportRows}
  ${applyForm}
  <footer>
    Step-by-step instructions: MIND-MAPS-SETUP.md in the site repository ·
    <a href="/api/setup-check">Setup check</a> · <a href="/mind-maps.html">Mind maps</a>
  </footer>
</main>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export const config: Config = {
  path: "/api/marketplace-sync",
  method: ["GET", "POST"],
};
