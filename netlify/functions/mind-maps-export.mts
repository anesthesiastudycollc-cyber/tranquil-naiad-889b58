import type { Config } from "@netlify/functions";
import { MIND_MAP_UNIT_AMOUNT, PUBLISHED_MIND_MAPS } from "../lib/mind-maps.js";
import { siteOrigin } from "../lib/stripe.js";

/**
 * Builds an upload sheet of the mind map collection for the other sales channels.
 *
 * The website, Shopify, and Etsy all end up describing the same maps at the same
 * price because all three are generated from `netlify/lib/mind-maps.ts`. Editing
 * that one list and re-exporting is what keeps the channels in step.
 *
 *   GET /api/mind-maps-export?format=shopify  → Shopify product import CSV
 *   GET /api/mind-maps-export?format=etsy     → listing worksheet for Etsy
 *
 * The image column points at `assets/listing-images/` — the 2000px blurred,
 * watermarked versions, at the size Etsy asks for. Do not swap them for the
 * full-resolution artwork: a marketplace listing image is public to everyone who
 * browses the category, whether or not they ever buy, so a sharp listing image
 * gives the product away. The buyer gets the full file after checkout.
 *
 * Note what this export can and cannot do. It sets the image on listings created
 * *from* it. A listing already live on Etsy or Shopify shows a file that was
 * uploaded to that marketplace when it was created, hosted by them — nothing this
 * site serves can reach it. Fixing those is `/api/marketplace-sync`, which writes
 * the blurred image through each marketplace's API; this export covers only new
 * listings.
 *
 * Keep the SKU column as the map id. `/api/marketplace-sync` matches a live
 * listing back to a map by SKU, and falls back to fuzzy title matching only when
 * the SKU is absent.
 */
export default async (req: Request) => {
  const format = new URL(req.url).searchParams.get("format") ?? "shopify";
  const origin = siteOrigin(req);

  if (format !== "shopify" && format !== "etsy") {
    return Response.json(
      { error: "unknown_format", message: "Use format=shopify or format=etsy." },
      { status: 400 },
    );
  }

  const csv = format === "shopify" ? shopifyCsv(origin) : etsyCsv(origin);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="anesthesia-mind-maps-${format}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};

const PRICE = (MIND_MAP_UNIT_AMOUNT / 100).toFixed(2);

function description(title: string): string {
  return (
    `A high-resolution printable anesthesia mind map of ${title}. ` +
    "The whole topic is laid out in one view so the connections between its parts are the point — " +
    "built for exam review, case preparation, and clinical reasoning practice. " +
    "Instant digital download (PNG), sized for letter or A4 printing or tablet annotation. " +
    "Single-user educational license. For educational purposes only; not medical advice."
  );
}

function shopifyCsv(origin: string): string {
  const columns = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Type",
    "Tags",
    "Published",
    "Option1 Name",
    "Option1 Value",
    "Variant SKU",
    "Variant Inventory Policy",
    "Variant Fulfillment Service",
    "Variant Price",
    "Variant Requires Shipping",
    "Variant Taxable",
    "Image Src",
    "Image Position",
    "Image Alt Text",
    "Gift Card",
    "Status",
  ];

  const rows = PUBLISHED_MIND_MAPS.map((map) => [
    handleFor(map.title, map.id),
    `${map.title} Mind Map`,
    `<p>${description(map.title)}</p>`,
    "Anesthesia Study Co. LLC",
    "Digital Mind Map",
    tagsFor(map.title).join(", "),
    "TRUE",
    "Title",
    "Default Title",
    map.id,
    "deny",
    "manual",
    PRICE,
    // Digital delivery: no shipping is ever calculated for these.
    "FALSE",
    "TRUE",
    listingImage(origin, map.file),
    "1",
    `${map.title} anesthesia mind map`,
    "FALSE",
    "active",
  ]);

  return toCsv(columns, rows);
}

/**
 * Etsy has no native CSV listing import, so this is a worksheet: the columns are
 * the fields Etsy's listing form asks for, in the order it asks for them, ready
 * to work through by hand or feed to a bulk-listing tool.
 */
function etsyCsv(origin: string): string {
  const columns = [
    "Title",
    "Description",
    "Price (USD)",
    "Quantity",
    "SKU",
    "Tags",
    "Type",
    "Who made it",
    "When was it made",
    "Digital file",
    "Image URL",
  ];

  const rows = PUBLISHED_MIND_MAPS.map((map) => [
    `${map.title} Mind Map — Anesthesia Study Guide, Printable Digital Download`.slice(0, 140),
    description(map.title),
    PRICE,
    // Digital listings on Etsy sell repeatedly from one quantity.
    "999",
    map.id,
    tagsFor(map.title).join(", "),
    "Digital download",
    "I did",
    "Made to order",
    map.file,
    listingImage(origin, map.file),
  ]);

  return toCsv(columns, rows);
}

/**
 * The 2000px blurred, watermarked version of a map, as an absolute URL.
 *
 * Marketplace listing images are seen by everyone browsing a category, not just
 * buyers, so this never resolves to `assets/mind-maps/` — that path holds the
 * artwork and is not served at all.
 */
function listingImage(origin: string, file: string): string {
  return `${origin}/assets/listing-images/${file.replace(/\.png$/i, ".jpg")}`;
}

function handleFor(title: string, id: string): string {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `${slug}-mind-map` : `${id}-mind-map`;
}

/** Etsy allows 13 tags of at most 20 characters each; Shopify is happy with the same set. */
function tagsFor(title: string): string[] {
  const base = [
    "anesthesia",
    "mind map",
    "anesthesia student",
    "CRNA study guide",
    "nursing school",
    "medical student",
    "study notes",
    "printable",
    "digital download",
    "exam prep",
  ];

  const fromTitle = title
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .map((word) => word.toLowerCase());

  const tags: string[] = [];
  for (const tag of [...fromTitle, ...base]) {
    const trimmed = tag.slice(0, 20).trim();
    if (trimmed && !tags.includes(trimmed)) tags.push(trimmed);
    if (tags.length === 13) break;
  }
  return tags;
}

function toCsv(columns: string[], rows: string[][]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [columns, ...rows].map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
}

export const config: Config = {
  path: "/api/mind-maps-export",
  method: "GET",
};
