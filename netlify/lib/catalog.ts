/**
 * Single source of truth for the digital store.
 *
 * Prices live here, server-side, and are never read from the browser — the
 * checkout endpoint looks every requested product up by id and builds the Stripe
 * line items from these values, so a tampered request cannot change what a
 * customer is charged.
 *
 * To edit the store: change this file. The storefront renders itself from
 * `GET /api/catalog`, so no HTML needs touching.
 */

import { MIND_MAP_PRODUCTS } from "./mind-maps.js";

export type Category = {
  id: string;
  name: string;
  tagline: string;
};

/**
 * Retired category ids -> the category that absorbed them.
 *
 * `store.html#one-pagers` is linked from the landing page and from anything a
 * customer has bookmarked, so renaming a category cannot be allowed to break the
 * anchor. The storefront resolves an incoming hash through this table before it
 * decides which section to open. Add an entry here whenever a category id
 * changes; never delete one.
 */
export const CATEGORY_ALIASES: Record<string, string> = {
  "one-pagers": "cram-sheets",
  "interactive-apps": "interactive-resources",
};

export type Delivery =
  /** A file held in the `digital-products` Netlify Blobs store. */
  | { kind: "file"; blobKey: string; filename: string; contentType: string }
  /** An externally hosted download or app-access URL. */
  | { kind: "link"; url: string };

export type Product = {
  /**
   * Stable internal id, and the only thing anything else is allowed to key off.
   *
   * Never an Etsy listing number, a Stripe id, or a slug of the title: 29 mind
   * map titles are shared by more than one slot, marketplace ids differ per
   * marketplace, and a download link signed 30 days ago still carries this
   * string. Renaming one invalidates outstanding download tokens and orphans the
   * Stripe mapping, so ids are append-only in practice.
   */
  id: string;
  name: string;
  categoryId: string;
  /** Price in the smallest currency unit (US cents). */
  unitAmount: number;
  currency: "usd";
  description: string;
  /** Short "what you actually receive" line shown under the price. */
  format: string;
  highlights: string[];
  delivery: Delivery;
  /**
   * Site-relative path to the blurred, watermarked preview for this product, if
   * it has artwork. Only ever a file from `assets/previews/` — this URL is handed
   * to Stripe, which fetches it and shows it on the hosted checkout page, so it
   * must never point at anything a customer has not paid for yet.
   */
  previewImage?: string;
  featured?: boolean;
  /**
   * Whether the storefront lists it. `publicCatalog()` drops anything false, so a
   * product can be defined, categorised, and mapped here long before it is ready
   * to sell — the same convention `mind-maps.ts` uses for a slot with no artwork.
   *
   * A published product still needs its file in the `digital-products` blob store
   * to be deliverable; /api/setup-check lists the ones that are missing.
   */
  published: boolean;
  /**
   * The listing this product corresponds to in the Etsy shop, once known.
   *
   * Filled in by reconciling the three catalogs — see
   * `scripts/reconcile-catalog.mjs`. Nothing at runtime reads these yet; they
   * exist so the mapping has one home instead of living in a spreadsheet.
   *
   * Stripe ids deliberately do NOT live here: they are generated in bulk and kept
   * in `netlify/lib/stripe-price-map.ts`, keyed by this same id. Two files
   * claiming to own the same mapping is how they drift apart.
   */
  etsyListingId?: string;
  /**
   * The SKU set on the live Etsy listing, when it is not the internal id.
   *
   * `/api/mind-maps-export` writes the internal id as the SKU, and
   * `/api/marketplace-sync` matches on it, so a listing created from an export
   * needs no entry here. A listing created by hand before that convention
   * existed does.
   */
  etsySku?: string;
};

/**
 * The storefront sections, in the order they render.
 *
 * These mirror what the shop actually sells rather than how the files happen to
 * be produced — "One-Pagers" became "Cram Sheets & Quick References" because
 * that is what the same sheets are called on Etsy, and a customer who searched
 * one term should not have to guess the other. Retired ids stay resolvable
 * through CATEGORY_ALIASES.
 */
export const CATEGORIES: Category[] = [
  {
    id: "mind-maps",
    name: "Mind Maps",
    tagline:
      "Visual maps that lay a whole topic out in one view, so the connections are the point. The single-topic collection is $2 a map, or any five for $9.",
  },
  {
    id: "study-guides",
    name: "Study Guides",
    tagline: "Long-form, exam-oriented guides for a full subject area.",
  },
  {
    id: "cram-sheets",
    name: "Cram Sheets & Quick References",
    tagline: "Single-sheet references on one drug, one monitor, or one system — built for pocket and clipboard use.",
  },
  {
    id: "bundles",
    name: "Bundles",
    tagline: "Grouped sets at a lower combined price.",
  },
  {
    id: "interactive-resources",
    name: "Interactive Resources",
    tagline: "Offline-capable workbooks, simulations, and calculators that run in any browser.",
  },
];

export const PRODUCTS: Product[] = [
  // ---------------------------------------------------------------- guides
  {
    id: "guide-pharmacology",
    name: "Anesthesia Pharmacology Study Guide",
    categoryId: "study-guides",
    published: true,
    unitAmount: 2400,
    currency: "usd",
    description:
      "Induction agents, volatiles, neuromuscular blockade and reversal, opioids, and vasoactive drugs organised by how they get asked about.",
    format: "PDF, 68 pages",
    highlights: [
      "Dose ranges with onset and duration side by side",
      "Mechanism-to-clinical-effect tables",
      "End-of-section self-check questions",
    ],
    delivery: {
      kind: "file",
      blobKey: "guide-pharmacology.pdf",
      filename: "Anesthesia-Pharmacology-Study-Guide.pdf",
      contentType: "application/pdf",
    },
    featured: true,
  },
  {
    id: "guide-airway",
    name: "Airway Management Study Guide",
    categoryId: "study-guides",
    published: true,
    unitAmount: 1900,
    currency: "usd",
    description:
      "Assessment, preoxygenation, device selection, and a structured walk through difficult and failed airway pathways.",
    format: "PDF, 44 pages",
    highlights: [
      "Predictors of difficult mask ventilation and intubation",
      "Device comparison with sizing by patient weight",
      "Annotated difficult-airway decision pathway",
    ],
    delivery: {
      kind: "file",
      blobKey: "guide-airway.pdf",
      filename: "Airway-Management-Study-Guide.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "guide-regional",
    name: "Regional Anesthesia & Blocks Study Guide",
    categoryId: "study-guides",
    published: true,
    unitAmount: 2100,
    currency: "usd",
    description:
      "Upper and lower extremity blocks, truncal blocks, and neuraxial technique with the anatomy and sonoanatomy that each one depends on.",
    format: "PDF, 52 pages",
    highlights: [
      "Landmark and ultrasound views per block",
      "Local anesthetic maximum dosing worksheet",
      "LAST recognition and treatment sequence",
    ],
    delivery: {
      kind: "file",
      blobKey: "guide-regional.pdf",
      filename: "Regional-Anesthesia-Blocks-Study-Guide.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "guide-cardiac",
    name: "Cardiac & Hemodynamics Study Guide",
    categoryId: "study-guides",
    published: true,
    unitAmount: 2600,
    currency: "usd",
    description:
      "Valvular lesions, ischemia, congenital shunts, and bypass physiology framed around the hemodynamic goals each one sets.",
    format: "PDF, 61 pages",
    highlights: [
      "Hemodynamic goal tables per valvular lesion",
      "Pressure-volume loop walkthroughs",
      "Vasoactive drug selection by failure pattern",
    ],
    delivery: {
      kind: "file",
      blobKey: "guide-cardiac.pdf",
      filename: "Cardiac-Hemodynamics-Study-Guide.pdf",
      contentType: "application/pdf",
    },
  },

  // ------------------------------------------- cram sheets & quick references
  // The four below started life as the "one-pagers" category. The five branded
  // sheets after them were being sold on Etsy while this file did not know they
  // existed, which is the whole reason the storefront looked thinner than the
  // shop: nothing renders here that is not defined here.
  {
    id: "onepager-induction",
    name: "Induction Agents One-Pager",
    categoryId: "cram-sheets",
    published: true,
    unitAmount: 600,
    currency: "usd",
    description:
      "Propofol, etomidate, ketamine, and dexmedetomidine on one sheet — dose, onset, duration, and the hemodynamic trade-off for each.",
    format: "PDF, 1 page (print-ready, letter + A4)",
    highlights: ["Side-by-side dosing", "Hemodynamic effect column", "Contraindication callouts"],
    delivery: {
      kind: "file",
      blobKey: "onepager-induction.pdf",
      filename: "Induction-Agents-One-Pager.pdf",
      contentType: "application/pdf",
    },
    featured: true,
  },
  {
    id: "onepager-pressors",
    name: "Vasopressors & Inotropes One-Pager",
    categoryId: "cram-sheets",
    published: true,
    unitAmount: 600,
    currency: "usd",
    description:
      "Receptor activity, infusion ranges, and expected effect on heart rate, contractility, and systemic vascular resistance.",
    format: "PDF, 1 page (print-ready, letter + A4)",
    highlights: ["Receptor activity grid", "Bolus and infusion dosing", "Effect-on-SVR shorthand"],
    delivery: {
      kind: "file",
      blobKey: "onepager-pressors.pdf",
      filename: "Vasopressors-Inotropes-One-Pager.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "onepager-mh",
    name: "Malignant Hyperthermia Crisis One-Pager",
    categoryId: "cram-sheets",
    published: true,
    unitAmount: 500,
    currency: "usd",
    description:
      "The recognition-to-treatment sequence in reading order, with dantrolene reconstitution math already worked out by weight.",
    format: "PDF, 1 page (print-ready, letter + A4)",
    highlights: ["Numbered crisis sequence", "Dantrolene dosing by weight", "Post-crisis monitoring list"],
    delivery: {
      kind: "file",
      blobKey: "onepager-mh.pdf",
      filename: "Malignant-Hyperthermia-Crisis-One-Pager.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "onepager-peds",
    name: "Pediatric Dosing Quick Reference One-Pager",
    categoryId: "cram-sheets",
    published: true,
    unitAmount: 700,
    currency: "usd",
    description:
      "Weight-based dosing, airway equipment sizing, and fluid maintenance across neonate through adolescent ranges.",
    format: "PDF, 1 page (print-ready, letter + A4)",
    highlights: ["Dosing by kilogram bands", "ETT and LMA sizing", "Maintenance fluid calculation"],
    delivery: {
      kind: "file",
      blobKey: "onepager-peds.pdf",
      filename: "Pediatric-Dosing-Quick-Reference-One-Pager.pdf",
      contentType: "application/pdf",
    },
  },

  /*
   * Branded single-drug and single-system sheets.
   *
   * Added from the sheets already being sold on Etsy. Ids are internal and
   * stable (`cram-aramine`, not the Etsy listing number and not the title) so
   * that the Etsy listing, the Stripe Price, and the download token can all be
   * hung off the same string later without any of them becoming the identifier.
   *
   * Each one still needs its PDF uploaded to the `digital-products` blob store
   * under the blobKey below — /api/setup-check lists what is missing. Until then
   * a card purchase completes and the download shows a support message, which is
   * the same state every other product in this file is in today.
   */
  {
    id: "cram-anavar",
    name: "Anavar (Oxandrolone) Cram Sheet",
    categoryId: "cram-sheets",
    published: true,
    unitAmount: 999,
    currency: "usd",
    description:
      "Oxandrolone on one sheet — what it is, why a patient is on it, and the perioperative implications worth knowing before induction.",
    format: "PDF, 1 page (print-ready, letter + A4)",
    highlights: [
      "Class, mechanism, and typical indication",
      "Hepatic and lipid effects to look for",
      "Perioperative and anesthetic considerations",
    ],
    delivery: {
      kind: "file",
      blobKey: "cram-anavar.pdf",
      filename: "Anavar-Oxandrolone-Cram-Sheet.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "cram-innovar",
    name: "Innovar (Fentanyl + Droperidol) Cram Sheet",
    categoryId: "cram-sheets",
    published: true,
    unitAmount: 999,
    currency: "usd",
    description:
      "The classic neuroleptanalgesia combination broken into its two halves — what each component contributes, and what the pairing is watched for.",
    format: "PDF, 1 page (print-ready, letter + A4)",
    highlights: [
      "Fentanyl and droperidol contributions side by side",
      "Neuroleptanalgesia in context",
      "QT prolongation and extrapyramidal cautions",
    ],
    delivery: {
      kind: "file",
      blobKey: "cram-innovar.pdf",
      filename: "Innovar-Fentanyl-Droperidol-Cram-Sheet.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "cram-aramine",
    name: "Aramine (Metaraminol) Cram Sheet",
    categoryId: "cram-sheets",
    published: true,
    unitAmount: 999,
    currency: "usd",
    description:
      "Metaraminol as a vasopressor: receptor activity, dosing, and how its response differs from the pressors it sits beside on the drug tray.",
    format: "PDF, 1 page (print-ready, letter + A4)",
    highlights: [
      "Receptor activity and mechanism",
      "Bolus and infusion dosing",
      "Reflex bradycardia and tachyphylaxis notes",
    ],
    delivery: {
      kind: "file",
      blobKey: "cram-aramine.pdf",
      filename: "Aramine-Metaraminol-Cram-Sheet.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "cram-bis",
    name: "BIS Brain Monitoring Cram Sheet",
    categoryId: "cram-sheets",
    published: true,
    unitAmount: 999,
    currency: "usd",
    description:
      "Processed EEG depth-of-anesthesia monitoring on one sheet — what the number is derived from, what the ranges mean, and what makes it unreliable.",
    format: "PDF, 1 page (print-ready, letter + A4)",
    highlights: [
      "How the index is derived from the EEG",
      "Value ranges and their clinical meaning",
      "Artefact and drug-related pitfalls",
    ],
    delivery: {
      kind: "file",
      blobKey: "cram-bis.pdf",
      filename: "BIS-Brain-Monitoring-Cram-Sheet.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "cram-renal-diuretics",
    name: "Renal System & Diuretics Cram Sheet",
    categoryId: "cram-sheets",
    published: true,
    unitAmount: 999,
    currency: "usd",
    description:
      "The nephron and the diuretic classes mapped onto it, so each drug sits at the segment it acts on alongside the electrolyte consequences that follow.",
    format: "PDF, 1 page (print-ready, letter + A4)",
    highlights: [
      "Diuretic classes by site of action along the nephron",
      "Expected electrolyte and volume effects",
      "Anesthetic considerations in renal impairment",
    ],
    delivery: {
      kind: "file",
      blobKey: "cram-renal-diuretics.pdf",
      filename: "Renal-System-Diuretics-Cram-Sheet.pdf",
      contentType: "application/pdf",
    },
  },

  // ------------------------------------------------------------- mind maps
  // The large-format, multi-topic maps. The 89 single-topic $2 maps are defined
  // in mind-maps.ts and browsed on their own page — same category, deliberately
  // not listed here (see the note above publicCatalog).
  {
    id: "mindmap-pharmacology",
    name: "Anesthesia Pharmacology Mind Map",
    categoryId: "mind-maps",
    published: true,
    unitAmount: 900,
    currency: "usd",
    description:
      "Every drug class branching from receptor to clinical effect on one sheet, so the reason a drug behaves the way it does sits next to the drug itself.",
    format: "PDF, 1 page (large format, prints to letter, A4, or poster)",
    highlights: [
      "Drug classes branched by receptor target",
      "Colour-coded onset and duration bands",
      "Cross-links between interacting agents",
    ],
    delivery: {
      kind: "file",
      blobKey: "mindmap-pharmacology.pdf",
      filename: "Anesthesia-Pharmacology-Mind-Map.pdf",
      contentType: "application/pdf",
    },
    featured: true,
  },
  {
    id: "mindmap-airway",
    name: "Difficult Airway Mind Map",
    categoryId: "mind-maps",
    published: true,
    unitAmount: 900,
    currency: "usd",
    description:
      "The difficult and failed airway pathways drawn as one branching map, with every escape route visible at the same time instead of buried a page later.",
    format: "PDF, 1 page (large format, prints to letter, A4, or poster)",
    highlights: [
      "Branching decision pathways end to end",
      "Device options mapped to each branch",
      "Rescue and cannot-intubate-cannot-oxygenate routes marked",
    ],
    delivery: {
      kind: "file",
      blobKey: "mindmap-airway.pdf",
      filename: "Difficult-Airway-Mind-Map.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "mindmap-crisis",
    name: "Perioperative Crisis Mind Map",
    categoryId: "mind-maps",
    published: true,
    unitAmount: 900,
    currency: "usd",
    description:
      "Hypotension, hypoxia, high airway pressure, arrhythmia, and anaphylaxis radiating from presenting sign to differential to first action.",
    format: "PDF, 1 page (large format, prints to letter, A4, or poster)",
    highlights: [
      "Organised by presenting sign, not by diagnosis",
      "Differential branches with first actions attached",
      "Shared pathways between crises highlighted",
    ],
    delivery: {
      kind: "file",
      blobKey: "mindmap-crisis.pdf",
      filename: "Perioperative-Crisis-Mind-Map.pdf",
      contentType: "application/pdf",
    },
  },
  {
    id: "mindmap-physiology",
    name: "Cardiopulmonary Physiology Mind Map",
    categoryId: "mind-maps",
    published: true,
    unitAmount: 900,
    currency: "usd",
    description:
      "Preload, afterload, contractility, ventilation, and oxygen delivery drawn as one connected system so a change in one branch traces through the rest.",
    format: "PDF, 1 page (large format, prints to letter, A4, or poster)",
    highlights: [
      "Determinants linked to the variables they move",
      "Ventilation and perfusion coupling shown together",
      "Anesthetic effects marked at the point they act",
    ],
    delivery: {
      kind: "file",
      blobKey: "mindmap-physiology.pdf",
      filename: "Cardiopulmonary-Physiology-Mind-Map.pdf",
      contentType: "application/pdf",
    },
  },

  // ------------------------------------------------- interactive resources
  {
    id: "app-planning-workbook",
    name: "Interactive Anesthesia Planning Workbook",
    categoryId: "interactive-resources",
    published: true,
    unitAmount: 3800,
    currency: "usd",
    description:
      "The full planning workbook as a self-contained interactive file: structured prompts for preoperative review, induction, maintenance, emergence, and crisis planning, with your entries saved in the browser.",
    format: "Interactive HTML app — runs offline, no install",
    highlights: [
      "Guided case-planning prompts per phase",
      "Entries persist locally between sessions",
      "Print or export a finished plan",
    ],
    delivery: {
      kind: "file",
      blobKey: "app-planning-workbook.html",
      filename: "Interactive-Anesthesia-Planning-Workbook.html",
      contentType: "text/html",
    },
    featured: true,
  },
  {
    id: "app-case-simulations",
    name: "Interactive Case Simulation Pack",
    categoryId: "interactive-resources",
    published: true,
    unitAmount: 2900,
    currency: "usd",
    description:
      "Branching case scenarios where each decision changes what happens next, followed by a debrief explaining why.",
    format: "Interactive HTML app — runs offline, no install",
    highlights: ["Branching decision scenarios", "Consequence-driven progression", "Written debrief per case"],
    delivery: {
      kind: "file",
      blobKey: "app-case-simulations.html",
      filename: "Interactive-Case-Simulation-Pack.html",
      contentType: "text/html",
    },
  },
  {
    id: "app-dosing-calculator",
    name: "Interactive Dosing Practice Calculator",
    categoryId: "interactive-resources",
    published: true,
    unitAmount: 1800,
    currency: "usd",
    description:
      "A study tool for practising weight-based dosing and infusion calculations, with the working shown step by step so you can check your reasoning.",
    format: "Interactive HTML app — runs offline, no install",
    highlights: ["Step-by-step worked solutions", "Weight-based and infusion practice", "Randomised practice sets"],
    delivery: {
      kind: "file",
      blobKey: "app-dosing-calculator.html",
      filename: "Interactive-Dosing-Practice-Calculator.html",
      contentType: "text/html",
    },
  },

  // ---------------------------------------------------------------- bundles
  {
    id: "bundle-one-pagers",
    name: "Complete One-Pager Set",
    categoryId: "bundles",
    published: true,
    unitAmount: 1900,
    currency: "usd",
    description: "All four one-pagers together, priced below buying them individually.",
    format: "ZIP of print-ready PDFs",
    highlights: ["Induction agents", "Vasopressors and inotropes", "MH crisis", "Pediatric dosing"],
    delivery: {
      kind: "file",
      blobKey: "bundle-one-pagers.zip",
      filename: "Anesthesia-Study-Co-One-Pager-Set.zip",
      contentType: "application/zip",
    },
  },
  {
    id: "bundle-mind-maps",
    name: "Complete Mind Map Set",
    categoryId: "bundles",
    published: true,
    unitAmount: 2700,
    currency: "usd",
    description: "All four mind maps together, priced below buying them individually.",
    format: "ZIP of large-format PDFs",
    highlights: ["Pharmacology", "Difficult airway", "Perioperative crisis", "Cardiopulmonary physiology"],
    delivery: {
      kind: "file",
      blobKey: "bundle-mind-maps.zip",
      filename: "Anesthesia-Study-Co-Mind-Map-Set.zip",
      contentType: "application/zip",
    },
  },
  {
    id: "bundle-library",
    name: "Complete Digital Library",
    categoryId: "bundles",
    published: true,
    unitAmount: 14900,
    currency: "usd",
    description:
      "Every study guide, every one-pager, every mind map, and all three interactive apps in a single download.",
    format: "ZIP of PDFs and interactive HTML apps",
    highlights: ["4 study guides", "4 one-pagers", "4 mind maps", "3 interactive apps"],
    delivery: {
      kind: "file",
      blobKey: "bundle-library.zip",
      filename: "Anesthesia-Study-Co-Complete-Library.zip",
      contentType: "application/zip",
    },
    featured: true,
  },
];

/**
 * Individual mind maps live in `mind-maps.ts` and are browsed on their own page,
 * so they are resolvable for checkout and download without appearing in the
 * store listing — see the note at the top of that file.
 *
 * Resolution deliberately ignores `published`: someone who bought a product last
 * week still has a signed download link for it, and taking the product off the
 * storefront must not turn that link into a dead end. What `published` controls
 * is what `publicCatalog()` offers for sale, which is where it matters.
 */
export function getProduct(id: string): Product | undefined {
  return (
    PRODUCTS.find((product) => product.id === id) ??
    MIND_MAP_PRODUCTS.find((product) => product.id === id)
  );
}

/** The catalog shape sent to the browser — delivery details stay server-side. */
export function publicCatalog() {
  return {
    currency: "usd",
    categories: CATEGORIES,
    categoryAliases: CATEGORY_ALIASES,
    products: PRODUCTS.filter((product) => product.published).map(({ delivery, ...rest }) => rest),
  };
}
