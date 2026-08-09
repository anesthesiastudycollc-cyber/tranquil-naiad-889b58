import type { Product } from "./catalog.js";

/**
 * Single source of truth for the individual printable mind maps.
 *
 * These are the maps browsed on `mind-maps.html`. They are deliberately kept out
 * of `publicCatalog()` — nearly a hundred $2 items would bury the study guides on
 * `store.html` — but they are real catalog products in every other respect, so
 * checkout, fulfilment, and download treat them exactly like anything else.
 *
 * Editing this list is the only thing needed to add, rename, or retire a map:
 * the browsing page, card checkout, and the Shopify/Etsy exports all read it.
 *
 *   file       Artwork file name. The source lives in assets/mind-maps/, which is
 *              NOT served — netlify.toml rewrites that path to the blurred,
 *              watermarked derivative of the same name in assets/previews/, which
 *              is what the gallery and Stripe checkout show. The 2000px versions
 *              in assets/listing-images/ are what gets uploaded to Etsy and
 *              Shopify. Run scripts/generate-previews.mjs after changing artwork.
 *              The full-resolution file the buyer receives lives in the
 *              `digital-products` blob store under the same name.
 *   title      Shown on the card and used to name the downloaded file.
 *   published  false hides a slot that has no artwork yet, or whose artwork
 *              duplicates another slot. Hidden maps cannot be bought.
 */

/** Amounts are in US cents: $2.00 a map, or any five for $9.00. */
export const MIND_MAP_UNIT_AMOUNT = 200;
export const MIND_MAP_BUNDLE_SIZE = 5;
export const MIND_MAP_BUNDLE_AMOUNT = 900;

export type MindMap = {
  id: string;
  file: string;
  title: string;
  published: boolean;
};

export const MIND_MAPS: MindMap[] = [
  /* Slot 01 has no artwork yet — publish it once the preview is uploaded. */
  { id: "map-01", file: "mind-map-01.png", title: "Mind Map 1", published: false },
  /* Artwork is the watermarked export also supplied as slot 23. */
  { id: "map-02", file: "mind-map-02.png", title: "Phenylephrine", published: true },
  { id: "map-03", file: "mind-map-03.png", title: "Nitrous Oxide (N₂O)", published: true },
  /* Slot 04 is currently the same Nitrous Oxide artwork as slot 03 — hidden to
     avoid listing the same map twice. Replace the file, then publish. */
  { id: "map-04", file: "mind-map-04.png", title: "Nitrous Oxide (N₂O)", published: false },
  { id: "map-05", file: "mind-map-05.png", title: "ACLS Recognition & Treatment", published: true },
  { id: "map-06", file: "mind-map-06.png", title: "Central Venous Line & CVP Measurement", published: true },
  { id: "map-07", file: "mind-map-07.png", title: "Bradycardia", published: true },
  { id: "map-08", file: "mind-map-08.png", title: "Clevidipine (Cleviprex)", published: true },
  { id: "map-09", file: "mind-map-09.png", title: "Ketamine", published: true },
  { id: "map-10", file: "mind-map-10.png", title: "Desflurane", published: true },
  { id: "map-11", file: "mind-map-11.png", title: "ENT Anesthesia", published: true },
  { id: "map-12", file: "mind-map-12.png", title: "Tachycardia", published: true },
  { id: "map-13", file: "mind-map-13.png", title: "Pulmonary Hypertension", published: true },
  { id: "map-14", file: "mind-map-14.png", title: "Types of Shock", published: true },
  { id: "map-15", file: "mind-map-15.png", title: "Dobutamine", published: true },
  { id: "map-16", file: "mind-map-16.png", title: "Tranexamic Acid (TXA)", published: true },
  { id: "map-17", file: "mind-map-17.png", title: "Arterial Line & Pressure Monitoring", published: true },
  { id: "map-18", file: "mind-map-18.png", title: "Orthopedic Anesthesia", published: true },
  { id: "map-19", file: "mind-map-19.png", title: "Induction of Anesthesia", published: true },
  /* Slot 20 has no artwork yet — publish it once the preview is uploaded. */
  { id: "map-20", file: "mind-map-20.png", title: "Mind Map 20", published: false },
  { id: "map-21", file: "mind-map-21.png", title: "Norepinephrine", published: true },
  { id: "map-22", file: "mind-map-22.png", title: "Hydralazine", published: true },
  /* Slot 23 is the same Phenylephrine artwork now used by slot 02 — hidden to
     avoid listing the same map twice. */
  { id: "map-23", file: "mind-map-23.png", title: "Phenylephrine", published: false },
  { id: "map-24", file: "mind-map-24.png", title: "Neostigmine", published: true },
  { id: "map-25", file: "mind-map-25.png", title: "Morphine", published: true },
  /* Slot 26 duplicates slot 24 (Neostigmine) — hidden. Replace the file, then publish. */
  { id: "map-26", file: "mind-map-26.png", title: "Neostigmine", published: false },
  /* Slot 27 duplicates slot 25 (Morphine) — hidden. Replace the file, then publish. */
  { id: "map-27", file: "mind-map-27.png", title: "Morphine", published: false },
  { id: "map-28", file: "mind-map-28.png", title: "Massive Transfusion Protocol (MTP)", published: true },
  { id: "map-29", file: "mind-map-29.png", title: "Renal Considerations", published: true },
  { id: "map-30", file: "mind-map-30.png", title: "Labetalol", published: true },
  { id: "map-31", file: "mind-map-31.png", title: "Pre-Operative Treatments", published: true },
  { id: "map-32", file: "mind-map-32.png", title: "Pulmonary Artery Catheter (PAC) & CVP", published: true },
  { id: "map-33", file: "mind-map-33.png", title: "Anesthesia History", published: true },
  { id: "map-34", file: "mind-map-34.png", title: "GI Anesthesia", published: true },
  { id: "map-35", file: "mind-map-35.png", title: "Naloxone (Narcan)", published: true },
  { id: "map-36", file: "mind-map-36.png", title: "Neuroanesthesia", published: true },
  { id: "map-37", file: "mind-map-37.png", title: "Pre-Operative Interview", published: true },
  { id: "map-38", file: "mind-map-38.png", title: "Esmolol", published: true },
  { id: "map-39", file: "mind-map-39.png", title: "Regional Anesthesia", published: true },
  { id: "map-40", file: "mind-map-40.png", title: "Restrictive & Obstructive Pulmonary Disease", published: true },
  { id: "map-41", file: "mind-map-41.png", title: "Pediatric Anesthesia", published: true },
  { id: "map-42", file: "mind-map-42.png", title: "Anesthesia Overview", published: true },
  { id: "map-43", file: "mind-map-43.png", title: "Cardiopulmonary Bypass (CPB) & Anesthesia Machine", published: true },
  { id: "map-44", file: "mind-map-44.png", title: "Hypertension", published: true },
  { id: "map-45", file: "mind-map-45.png", title: "Anesthesia Instruments", published: true },
  { id: "map-46", file: "mind-map-46.png", title: "Dopamine", published: true },
  /* Slot 47 duplicates slot 46 (Dopamine) — hidden. Replace the file, then publish. */
  { id: "map-47", file: "mind-map-47.png", title: "Dopamine", published: false },
  { id: "map-48", file: "mind-map-48.png", title: "Vecuronium", published: true },
  { id: "map-49", file: "mind-map-49.png", title: "Pulmonary Embolism (PE)", published: true },
  /* Slot 50 duplicates slot 49 (Pulmonary Embolism) — hidden. Replace the file, then publish. */
  { id: "map-50", file: "mind-map-50.png", title: "Pulmonary Embolism (PE)", published: false },
  { id: "map-51", file: "mind-map-51.png", title: "Pancuronium", published: true },
  { id: "map-52", file: "mind-map-52.png", title: "Vasopressin", published: true },
  /* Slot 53 duplicates slot 52 (Vasopressin) — hidden. Replace the file, then publish. */
  { id: "map-53", file: "mind-map-53.png", title: "Vasopressin", published: false },
  { id: "map-54", file: "mind-map-54.png", title: "Hypoxia", published: true },
  { id: "map-55", file: "mind-map-55.png", title: "Metoprolol", published: true },
  { id: "map-56", file: "mind-map-56.png", title: "Myocardial Infarction (MI)", published: true },
  { id: "map-57", file: "mind-map-57.png", title: "Ephedrine", published: true },
  /* Overview of every invasive monitor — complements the single-topic maps at
     slots 06 (CVP), 17 (arterial line), and 32 (PAC). */
  { id: "map-58", file: "mind-map-58.png", title: "Invasive Monitors Overview", published: true },
  { id: "map-59", file: "mind-map-59.png", title: "Cisatracurium", published: true },
  { id: "map-60", file: "mind-map-60.png", title: "Scopolamine", published: true },
  { id: "map-61", file: "mind-map-61.png", title: "Sevoflurane", published: true },
  { id: "map-62", file: "mind-map-62.png", title: "Nifedipine", published: true },
  /* Technique-selection map (GA vs neuraxial vs regional vs MAC) — broader than
     the induction map at slot 19 and the overview at slot 42. */
  { id: "map-63", file: "mind-map-63.png", title: "Anesthesia Technique Choices", published: true },
  { id: "map-64", file: "mind-map-64.png", title: "Tocolytics in Obstetric Anesthesia", published: true },
  { id: "map-65", file: "mind-map-65.png", title: "Aortic Stenosis", published: true },
  { id: "map-66", file: "mind-map-66.png", title: "Bronchospasm", published: true },
  /* Slots 67 and 69 duplicate slot 65 (Aortic Stenosis) — hidden. Replace the files, then publish. */
  { id: "map-67", file: "mind-map-67.png", title: "Aortic Stenosis", published: false },
  /* Slot 68 duplicates slot 66 (Bronchospasm) — hidden. Replace the file, then publish. */
  { id: "map-68", file: "mind-map-68.png", title: "Bronchospasm", published: false },
  { id: "map-69", file: "mind-map-69.png", title: "Aortic Stenosis", published: false },
  { id: "map-70", file: "mind-map-70.png", title: "Glycopyrrolate (Robinul)", published: true },
  { id: "map-71", file: "mind-map-71.png", title: "Epinephrine", published: true },
  { id: "map-72", file: "mind-map-72.png", title: "EKG Interpretation", published: true },
  /* Title corrects the artwork, which renders the heading as "ATRICURIUM". */
  { id: "map-73", file: "mind-map-73.png", title: "Atracurium", published: true },
  /* Reading and responding to monitor data — distinct from the invasive-monitor
     hardware overview at slot 58. */
  { id: "map-74", file: "mind-map-74.png", title: "Anesthesia Monitors & Meaning", published: true },
  { id: "map-75", file: "mind-map-75.png", title: "IV Medication Pharmacokinetics & Pharmacodynamics", published: true },
  { id: "map-76", file: "mind-map-76.png", title: "Etomidate", published: true },
  { id: "map-77", file: "mind-map-77.png", title: "Atropine", published: true },
  { id: "map-78", file: "mind-map-78.png", title: "Hypotension", published: true },
  { id: "map-79", file: "mind-map-79.png", title: "IV Access & Fluid Management", published: true },
  /* Slot 80 duplicates slot 79 (IV Access & Fluid Management) — hidden. Replace the file, then publish. */
  { id: "map-80", file: "mind-map-80.png", title: "IV Access & Fluid Management", published: false },
  /* Slots 81–86 arrived after 87–96, so they are listed here to keep the grid in
     numeric order. */
  { id: "map-81", file: "mind-map-81.png", title: "Anesthesia Gas Laws", published: true },
  { id: "map-82", file: "mind-map-82.png", title: "Rocuronium", published: true },
  /* Foundations chart from the "Assess the…" series — a different chart from the
     formal overview at slot 42, which is organized by perioperative phase. */
  { id: "map-83", file: "mind-map-83.png", title: "Anesthesia Basics", published: true },
  { id: "map-84", file: "mind-map-84.png", title: "Mechanical Ventilator Modes & Settings", published: true },
  /* Slot 85 duplicates slot 84 (Mechanical Ventilator Modes & Settings) — hidden.
     Replace the file, then publish. */
  { id: "map-85", file: "mind-map-85.png", title: "Mechanical Ventilator Modes & Settings", published: false },
  { id: "map-86", file: "mind-map-86.png", title: "Cardiac Considerations", published: true },
  { id: "map-87", file: "mind-map-87.png", title: "Midazolam (Versed)", published: true },
  { id: "map-88", file: "mind-map-88.png", title: "Stroke", published: true },
  { id: "map-89", file: "mind-map-89.png", title: "Dexmedetomidine (Precedex)", published: true },
  /* Comparison of all five inotropes — complements the single-drug maps at slots
     15 (dobutamine), 21 (norepinephrine), 46 (dopamine), and 71 (epinephrine). */
  { id: "map-90", file: "mind-map-90.png", title: "Inotropes Compared", published: true },
  /* Slot 91 duplicates slot 90 (Inotropes Compared) — hidden. Replace the file, then publish. */
  { id: "map-91", file: "mind-map-91.png", title: "Inotropes Compared", published: false },
  /* Same subject as slot 37 but a different chart, built around the A-I-D-E-A-L
     mnemonic. Titled to tell the two apart on the shelf. */
  { id: "map-92", file: "mind-map-92.png", title: "Pre-Operative Interview (A-I-D-E-A-L Framework)", published: true },
  { id: "map-93", file: "mind-map-93.png", title: "Hepatic Considerations", published: true },
  /* Slot 94 duplicates slot 92 (Pre-Operative Interview) — hidden. Replace the file, then publish. */
  { id: "map-94", file: "mind-map-94.png", title: "Pre-Operative Interview (A-I-D-E-A-L Framework)", published: false },
  /* Second etomidate map; slot 76 is the live one. Their induction dose ranges
     disagree (0.15–0.3 vs 0.2–0.3 mg/kg), so only one should ever be published. */
  { id: "map-95", file: "mind-map-95.png", title: "Etomidate", published: false },
  { id: "map-96", file: "mind-map-96.png", title: "Isoflurane", published: true },
  { id: "map-97", file: "mind-map-97.png", title: "Endocrine Considerations", published: true },
  { id: "map-98", file: "mind-map-98.png", title: "Hydromorphone (Dilaudid)", published: true },
  { id: "map-99", file: "mind-map-99.png", title: "Patient Positioning", published: true },
  { id: "map-100", file: "mind-map-100.png", title: "Airway Management", published: true },
  /* Inhaled counterpart to the IV pharmacokinetics map at slot 75. */
  { id: "map-101", file: "mind-map-101.png", title: "Inhalational Agent Pharmacokinetics & Pharmacodynamics", published: true },
  /* Slot 102 duplicates slot 101 (Inhalational Agent PK/PD) — hidden. Replace the
     file, then publish. */
  { id: "map-102", file: "mind-map-102.png", title: "Inhalational Agent Pharmacokinetics & Pharmacodynamics", published: false },
  /* Machine itself, from the "Assess the…" series. Slot 43 covers the machine only in
     the context of cardiopulmonary bypass; slot 45 is the instrument tray. */
  { id: "map-103", file: "mind-map-103.png", title: "Anesthesia Machine", published: true },
  /* Counterpart to the induction map at slot 19. */
  { id: "map-104", file: "mind-map-104.png", title: "Emergence of Anesthesia", published: true },
  /* Covers AS, AR, MS and MR side by side. Slot 65 is a deep dive on aortic stenosis
     alone, so the two complement each other. */
  { id: "map-105", file: "mind-map-105.png", title: "Cardiac Valvular Disease", published: true },
  { id: "map-106", file: "mind-map-106.png", title: "Fentanyl", published: true },
  /* Slot 107 duplicates slot 104 (Emergence of Anesthesia) — hidden. Replace the
     file, then publish. */
  { id: "map-107", file: "mind-map-107.png", title: "Emergence of Anesthesia", published: false },
  { id: "map-108", file: "mind-map-108.png", title: "Propofol", published: true },
  /* Slots 109–114 all repeat maps that are already on sale, so they are hidden:
     109 repeats slot 56, 110 repeats slot 108, 111 and 114 repeat slot 61,
     112 repeats slot 10, and 113 repeats slot 89. Their content matches the live
     versions, so nothing is being withheld from the shelf. Replace any of these
     files with new artwork, then publish that slot. */
  { id: "map-109", file: "mind-map-109.png", title: "Myocardial Infarction (MI)", published: false },
  { id: "map-110", file: "mind-map-110.png", title: "Propofol", published: false },
  { id: "map-111", file: "mind-map-111.png", title: "Sevoflurane", published: false },
  { id: "map-112", file: "mind-map-112.png", title: "Desflurane", published: false },
  { id: "map-113", file: "mind-map-113.png", title: "Dexmedetomidine (Precedex)", published: false },
  { id: "map-114", file: "mind-map-114.png", title: "Sevoflurane", published: false },
  /* Slots 115–126 are all re-exports of maps already on sale, so the whole batch is
     hidden: 115 repeats slot 40, 116 repeats slot 3, 117 repeats slot 34, 118 repeats
     slot 70, 119 repeats slot 96, 120 repeats slot 5, 121 repeats slot 63, 122 and 123
     repeat slot 18, 124 repeats slot 11, 125 repeats slot 25, and 126 repeats slot 76.
     Every pair was compared image by image — they are byte-different but visually the
     same chart, so a hash comparison does not catch them. Replace any of these files
     with new artwork, then publish that slot. */
  { id: "map-115", file: "mind-map-115.png", title: "Restrictive & Obstructive Pulmonary Disease", published: false },
  { id: "map-116", file: "mind-map-116.png", title: "Nitrous Oxide (N₂O)", published: false },
  { id: "map-117", file: "mind-map-117.png", title: "GI Anesthesia", published: false },
  { id: "map-118", file: "mind-map-118.png", title: "Glycopyrrolate (Robinul)", published: false },
  { id: "map-119", file: "mind-map-119.png", title: "Isoflurane", published: false },
  { id: "map-120", file: "mind-map-120.png", title: "ACLS Recognition & Treatment", published: false },
  { id: "map-121", file: "mind-map-121.png", title: "Anesthesia Technique Choices", published: false },
  { id: "map-122", file: "mind-map-122.png", title: "Orthopedic Anesthesia", published: false },
  { id: "map-123", file: "mind-map-123.png", title: "Orthopedic Anesthesia", published: false },
  { id: "map-124", file: "mind-map-124.png", title: "ENT Anesthesia", published: false },
  { id: "map-125", file: "mind-map-125.png", title: "Morphine", published: false },
  /* Third etomidate export. Its induction dose (0.2–0.3 mg/kg) matches hidden slot 95
     and disagrees with live slot 76 (0.15–0.3 mg/kg) — see the note above slot 95.
     Two of the three exports now say 0.2–0.3. */
  { id: "map-126", file: "mind-map-126.png", title: "Etomidate", published: false }];

export const PUBLISHED_MIND_MAPS: MindMap[] = MIND_MAPS.filter((map) => map.published);

/**
 * ASCII filename slug. NFKD first so typographic characters in titles survive as
 * something readable — "Nitrous Oxide (N₂O)" becomes "Nitrous-Oxide-N2O" rather
 * than losing the subscript, which matters because the slug is sent back to the
 * browser in a Content-Disposition header.
 */
function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toProduct(map: MindMap): Product {
  return {
    id: map.id,
    name: `${map.title} Mind Map`,
    categoryId: "mind-maps",
    unitAmount: MIND_MAP_UNIT_AMOUNT,
    currency: "usd",
    description: `A single-page visual map of ${map.title} — the whole topic laid out in one view so the connections between its parts are the point.`,
    format: "High-resolution PNG — prints to letter or A4, or annotate on a tablet",
    highlights: [
      "High-resolution printable PNG",
      "Instant download after checkout",
      "Single-user educational license",
    ],
    delivery: {
      kind: "file",
      blobKey: map.file,
      filename: `${slugify(map.title)}-Mind-Map.png`,
      contentType: "image/png",
    },
    // Deliberately the blurred derivative, not `assets/mind-maps/${map.file}`.
    // Checkout shows this to someone who has not paid yet.
    previewImage: `/assets/previews/${map.file}`,
  };
}

/** Every buyable mind map as a catalog product. Unpublished slots are excluded. */
export const MIND_MAP_PRODUCTS: Product[] = PUBLISHED_MIND_MAPS.map(toProduct);

export function isMindMap(productId: string): boolean {
  return MIND_MAP_PRODUCTS.some((product) => product.id === productId);
}

/**
 * The 5-for-$9 saving on a basket, in cents.
 *
 * Every complete group of five maps is discounted; the remainder stays at the
 * single price. Charging happens as one $2 line item per map plus this amount as
 * a Stripe discount, rather than as a single "bundle" line item, so each paid
 * line still names exactly one product and download entitlement stays per-map.
 */
export function mindMapBundleSaving(mindMapCount: number): number {
  const bundles = Math.floor(mindMapCount / MIND_MAP_BUNDLE_SIZE);
  return bundles * (MIND_MAP_BUNDLE_SIZE * MIND_MAP_UNIT_AMOUNT - MIND_MAP_BUNDLE_AMOUNT);
}

/** What the browsing page needs. Delivery details stay server-side. */
export function publicMindMaps() {
  return {
    currency: "usd",
    unitAmount: MIND_MAP_UNIT_AMOUNT,
    bundleSize: MIND_MAP_BUNDLE_SIZE,
    bundleAmount: MIND_MAP_BUNDLE_AMOUNT,
    maps: PUBLISHED_MIND_MAPS.map((map) => ({
      id: map.id,
      title: map.title,
      file: map.file,
      unitAmount: MIND_MAP_UNIT_AMOUNT,
    })),
  };
}
