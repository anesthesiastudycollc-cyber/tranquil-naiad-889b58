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

export type Category = {
  id: string;
  name: string;
  tagline: string;
};

export type Delivery =
  /** A file held in the `digital-products` Netlify Blobs store. */
  | { kind: "file"; blobKey: string; filename: string; contentType: string }
  /** An externally hosted download or app-access URL. */
  | { kind: "link"; url: string };

export type Product = {
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
  featured?: boolean;
};

export const CATEGORIES: Category[] = [
  {
    id: "study-guides",
    name: "Study Guides",
    tagline: "Long-form, exam-oriented guides for a full subject area.",
  },
  {
    id: "one-pagers",
    name: "One-Pagers",
    tagline: "Single-sheet quick references built for pocket and clipboard use.",
  },
  {
    id: "mind-maps",
    name: "Mind Maps",
    tagline: "Visual maps that lay a whole topic out in one view, so the connections are the point.",
  },
  {
    id: "interactive-apps",
    name: "Interactive Apps",
    tagline: "Offline-capable interactive tools that run in any browser.",
  },
  {
    id: "bundles",
    name: "Bundles",
    tagline: "Grouped sets at a lower combined price.",
  },
];

export const PRODUCTS: Product[] = [
  // ---------------------------------------------------------------- guides
  {
    id: "guide-pharmacology",
    name: "Anesthesia Pharmacology Study Guide",
    categoryId: "study-guides",
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

  // ------------------------------------------------------------ one-pagers
  {
    id: "onepager-induction",
    name: "Induction Agents One-Pager",
    categoryId: "one-pagers",
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
    categoryId: "one-pagers",
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
    categoryId: "one-pagers",
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
    categoryId: "one-pagers",
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

  // ------------------------------------------------------------- mind maps
  {
    id: "mindmap-pharmacology",
    name: "Anesthesia Pharmacology Mind Map",
    categoryId: "mind-maps",
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

  // ------------------------------------------------------ interactive apps
  {
    id: "app-planning-workbook",
    name: "Interactive Anesthesia Planning Workbook",
    categoryId: "interactive-apps",
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
    categoryId: "interactive-apps",
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
    categoryId: "interactive-apps",
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

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

/** The catalog shape sent to the browser — delivery details stay server-side. */
export function publicCatalog() {
  return {
    currency: "usd",
    categories: CATEGORIES,
    products: PRODUCTS.map(({ delivery, ...rest }) => rest),
  };
}
