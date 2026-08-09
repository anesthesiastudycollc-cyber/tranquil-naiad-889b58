/**
 * Replaces the listing photo on live Etsy and Shopify listings with the blurred,
 * watermarked version this site generates.
 *
 * Background: `/api/mind-maps-export` only sets the image on listings created
 * *from* it. A listing already published shows a file uploaded to the marketplace
 * at creation time and hosted by them, so a sharp photo there stays sharp no
 * matter what this repository serves. This module closes that gap by talking to
 * each marketplace's API and overwriting the photo in place.
 *
 * Three rules shape the design, because this writes to someone's live shop:
 *
 *   1. Nothing is written unless the caller passes `confirm`. The default is a
 *      dry run that reports exactly what would change.
 *   2. Listings are matched by SKU first — the export writes `map-05` into the
 *      SKU field for this reason. Title matching is a fallback, and anything that
 *      matches nothing or matches ambiguously is reported, never guessed at.
 *   3. Only the primary photo is touched by default. A listing may carry photos
 *      that are not artwork (sizing charts, instructions), and clobbering those
 *      is not recoverable from here. `scope: "all"` opts into the rest.
 */

import { PUBLISHED_MIND_MAPS, type MindMap } from "./mind-maps.js";
import {
  ETSY_API,
  etsyAccessToken,
  etsyHeaders,
  etsyShopId,
  shopifyGraphql,
} from "./marketplaces.js";

export type SyncScope = "primary" | "all";

export type ListingOutcome = {
  listing: string;
  /** The mind map id this listing was matched to, or null when nothing matched. */
  mapId: string | null;
  status: "updated" | "would-update" | "skipped" | "failed";
  detail: string;
};

export type SyncReport = {
  platform: "etsy" | "shopify";
  dryRun: boolean;
  scope: SyncScope;
  listingsSeen: number;
  matched: number;
  changed: number;
  unmatched: number;
  failed: number;
  outcomes: ListingOutcome[];
};

/* -------------------------------------------------------------- matching */

/**
 * Collapses a marketplace listing title down to something comparable with a
 * catalog title.
 *
 * Marketplace titles carry sales copy the catalog does not — "Mind Map —
 * Anesthesia Study Guide, Printable Digital Download" and similar. Everything
 * from the words "mind map" onwards is dropped, then punctuation and case are
 * normalised away.
 */
function titleKey(raw: string): string {
  return raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\bmind\s*map\b.*$/, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type MatchIndex = {
  bySku: Map<string, MindMap>;
  byTitle: Map<string, MindMap | null>;
};

/**
 * `byTitle` deliberately stores `null` for a key two maps share. An ambiguous
 * title must be reported to the owner, not resolved by picking the first one —
 * putting the wrong artwork on a listing is worse than leaving it sharp.
 */
function buildIndex(): MatchIndex {
  const bySku = new Map<string, MindMap>();
  const byTitle = new Map<string, MindMap | null>();

  for (const map of PUBLISHED_MIND_MAPS) {
    bySku.set(map.id.toLowerCase(), map);
    const key = titleKey(map.title);
    if (!key) continue;
    byTitle.set(key, byTitle.has(key) ? null : map);
  }

  return { bySku, byTitle };
}

function matchListing(
  index: MatchIndex,
  sku: string | null,
  title: string,
): { map: MindMap | null; reason: string } {
  if (sku) {
    const bySku = index.bySku.get(sku.trim().toLowerCase());
    if (bySku) return { map: bySku, reason: `matched on SKU ${sku}` };
  }

  const key = titleKey(title);
  if (key && index.byTitle.has(key)) {
    const byTitle = index.byTitle.get(key);
    if (byTitle) return { map: byTitle, reason: "matched on title" };
    return { map: null, reason: `two published maps share the title "${key}" — set the SKU to pick one` };
  }

  return {
    map: null,
    reason: "no published mind map has this SKU or title — set the listing's SKU to the map id (e.g. map-05)",
  };
}

/** The blurred, watermarked 2000px JPEG for a map, as an absolute URL. */
export function listingImageUrl(origin: string, map: MindMap): string {
  return `${origin}/assets/listing-images/${map.file.replace(/\.png$/i, ".jpg")}`;
}

async function fetchListingImage(origin: string, map: MindMap): Promise<Blob> {
  const url = listingImageUrl(origin, map);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `The blurred listing image for ${map.id} is missing (HTTP ${response.status} for ${url}). ` +
        "Run scripts/generate-previews.mjs and redeploy.",
    );
  }
  return await response.blob();
}

function emptyReport(platform: "etsy" | "shopify", dryRun: boolean, scope: SyncScope): SyncReport {
  return {
    platform,
    dryRun,
    scope,
    listingsSeen: 0,
    matched: 0,
    changed: 0,
    unmatched: 0,
    failed: 0,
    outcomes: [],
  };
}

function record(report: SyncReport, outcome: ListingOutcome): void {
  report.outcomes.push(outcome);
  if (outcome.mapId) report.matched++;
  else if (outcome.status !== "failed") report.unmatched++;
  if (outcome.status === "updated" || outcome.status === "would-update") report.changed++;
  if (outcome.status === "failed") report.failed++;
}

/* ------------------------------------------------------------------ Etsy */

type EtsyListing = { listing_id: number; title: string; skus?: string[] };
type EtsyImage = { listing_image_id: number; rank: number };

/**
 * Etsy pages at 100 listings per request and rate-limits at roughly 10 requests
 * per second, so the walk below is sequential rather than fanned out.
 */
async function etsyActiveListings(shopId: string, headers: Record<string, string>): Promise<EtsyListing[]> {
  const listings: EtsyListing[] = [];
  let offset = 0;

  for (;;) {
    const url =
      `${ETSY_API}/v3/application/shops/${shopId}/listings/active` +
      `?limit=100&offset=${offset}&includes=Skus`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(
        `Etsy would not list your listings (HTTP ${response.status}). Check ETSY_SHOP_ID and that ` +
          "the app was authorised with the listings_w scope.",
      );
    }
    const body = (await response.json()) as { count: number; results: EtsyListing[] };
    listings.push(...body.results);
    offset += body.results.length;
    if (body.results.length === 0 || listings.length >= body.count) break;
  }

  return listings;
}

export async function syncEtsy(
  origin: string,
  { dryRun, scope, limit }: { dryRun: boolean; scope: SyncScope; limit: number },
): Promise<SyncReport> {
  const report = emptyReport("etsy", dryRun, scope);
  const index = buildIndex();
  const headers = etsyHeaders(await etsyAccessToken());
  const shopId = etsyShopId();

  const listings = await etsyActiveListings(shopId, headers);
  report.listingsSeen = listings.length;

  for (const listing of listings.slice(0, limit)) {
    const label = `${listing.title} (#${listing.listing_id})`;
    const { map, reason } = matchListing(index, listing.skus?.[0] ?? null, listing.title);

    if (!map) {
      record(report, { listing: label, mapId: null, status: "skipped", detail: reason });
      continue;
    }

    if (dryRun) {
      record(report, {
        listing: label,
        mapId: map.id,
        status: "would-update",
        detail: `${reason}; would upload the blurred ${map.file.replace(/\.png$/i, ".jpg")}`,
      });
      continue;
    }

    try {
      const imagesResponse = await fetch(
        `${ETSY_API}/v3/application/shops/${shopId}/listings/${listing.listing_id}/images`,
        { headers },
      );
      const existing = imagesResponse.ok
        ? ((await imagesResponse.json()) as { results: EtsyImage[] }).results
        : [];

      const blob = await fetchListingImage(origin, map);
      const form = new FormData();
      form.set("image", blob, map.file.replace(/\.png$/i, ".jpg"));
      form.set("rank", "1");
      // Etsy replaces the photo sitting at this rank rather than appending, which
      // is what keeps the listing's primary photo in position.
      form.set("overwrite", "true");
      form.set("alt_text", `${map.title} anesthesia mind map preview, blurred`.slice(0, 250));

      const upload = await fetch(
        `${ETSY_API}/v3/application/shops/${shopId}/listings/${listing.listing_id}/images`,
        { method: "POST", headers, body: form },
      );
      if (!upload.ok) {
        throw new Error(`Etsy rejected the upload (HTTP ${upload.status}: ${await upload.text()})`);
      }

      let removed = 0;
      const others = existing.filter((image) => image.rank !== 1);
      if (scope === "all") {
        for (const image of others) {
          const deletion = await fetch(
            `${ETSY_API}/v3/application/shops/${shopId}/listings/${listing.listing_id}/images/${image.listing_image_id}`,
            { method: "DELETE", headers },
          );
          if (deletion.ok) removed++;
        }
      }

      record(report, {
        listing: label,
        mapId: map.id,
        status: "updated",
        detail:
          `${reason}; primary photo replaced with the blurred version` +
          (scope === "all"
            ? `, ${removed} other photo(s) removed`
            : others.length
              ? `. ${others.length} other photo(s) left untouched — rerun with scope=all to remove them`
              : ""),
      });
    } catch (error) {
      record(report, {
        listing: label,
        mapId: map.id,
        status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return report;
}

/* --------------------------------------------------------------- Shopify */

type ShopifyProduct = {
  id: string;
  title: string;
  variants: { nodes: { sku: string | null }[] };
  media: { nodes: { id: string; mediaContentType: string }[] };
};

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        variants(first: 1) { nodes { sku } }
        media(first: 20) { nodes { id mediaContentType } }
      }
    }
  }
`;

/**
 * Shopify retired the REST product-image endpoints, so replacing a photo means
 * `fileUpdate` with a new `originalSource`. That swaps the bytes behind an
 * existing media id, which keeps the media's position on the product and every
 * reference to it — uploading a new image and deleting the old one would move
 * the product's featured photo to the end.
 */
const FILE_UPDATE_MUTATION = `
  mutation ReplaceImage($files: [FileUpdateInput!]!) {
    fileUpdate(files: $files) {
      files { id fileStatus }
      userErrors { field message }
    }
  }
`;

type ProductsPage = {
  products: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: ShopifyProduct[] };
};

async function shopifyProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let cursor: string | null = null;

  for (;;) {
    const data: ProductsPage = await shopifyGraphql<ProductsPage>(PRODUCTS_QUERY, { cursor });
    products.push(...data.products.nodes);
    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  return products;
}

export async function syncShopify(
  origin: string,
  { dryRun, scope, limit }: { dryRun: boolean; scope: SyncScope; limit: number },
): Promise<SyncReport> {
  const report = emptyReport("shopify", dryRun, scope);
  const index = buildIndex();

  const products = await shopifyProducts();
  report.listingsSeen = products.length;

  for (const product of products.slice(0, limit)) {
    const label = product.title;
    const { map, reason } = matchListing(index, product.variants.nodes[0]?.sku ?? null, product.title);

    if (!map) {
      record(report, { listing: label, mapId: null, status: "skipped", detail: reason });
      continue;
    }

    const images = product.media.nodes.filter((node) => node.mediaContentType === "IMAGE");
    if (images.length === 0) {
      record(report, {
        listing: label,
        mapId: map.id,
        status: "skipped",
        detail: `${reason}, but the product has no image to replace`,
      });
      continue;
    }

    const targets = scope === "all" ? images : images.slice(0, 1);

    if (dryRun) {
      record(report, {
        listing: label,
        mapId: map.id,
        status: "would-update",
        detail: `${reason}; would replace ${targets.length} of ${images.length} image(s) with the blurred version`,
      });
      continue;
    }

    try {
      const url = listingImageUrl(origin, map);
      // Confirm the blurred file exists before asking Shopify to fetch it —
      // Shopify would otherwise store a broken image and report success.
      const head = await fetch(url, { method: "HEAD" });
      if (!head.ok) {
        throw new Error(
          `The blurred listing image for ${map.id} is missing (HTTP ${head.status} for ${url}). ` +
            "Run scripts/generate-previews.mjs and redeploy.",
        );
      }

      const data = await shopifyGraphql<{
        fileUpdate: { files: { id: string }[]; userErrors: { field: string[]; message: string }[] };
      }>(FILE_UPDATE_MUTATION, {
        files: targets.map((image) => ({
          id: image.id,
          originalSource: url,
          alt: `${map.title} anesthesia mind map preview, blurred`,
        })),
      });

      const errors = data.fileUpdate.userErrors;
      if (errors.length) {
        throw new Error(errors.map((e) => e.message).join("; "));
      }

      record(report, {
        listing: label,
        mapId: map.id,
        status: "updated",
        detail:
          `${reason}; replaced ${targets.length} of ${images.length} image(s)` +
          (scope === "primary" && images.length > 1
            ? " — rerun with scope=all to replace the rest"
            : ""),
      });
    } catch (error) {
      record(report, {
        listing: label,
        mapId: map.id,
        status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return report;
}
