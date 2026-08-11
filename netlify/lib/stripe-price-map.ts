/**
 * Internal catalog id -> permanent Stripe Product / Price ids.
 *
 * GENERATED from ASC_Stripe_Import_Results.csv (231 rows) by matching internal
 * catalog titles against imported Stripe product names. Regenerate after any
 * bulk import rather than hand-editing.
 *
 * Keyed by internal id (`map-02`, `guide-airway`) and never by title or slug: 29 mind
 * map titles are shared by more than one slot in mind-maps.ts, so a title-keyed
 * map would silently bind a live product to a hidden duplicate slot.
 *
 * COVERAGE IS PARTIAL — 56 of the 107 sellable products are mapped. The import was
 * built from the Shopify catalog, which contains none of the study guides,
 * one-pagers, interactive apps, or bundles this site sells, and is missing some
 * mind maps too. 20 more need a human decision and 31 have no Stripe entry at
 * all. Anything unmapped here must keep using inline price_data at checkout, so
 * consumers of this file have to handle undefined rather than assume a hit.
 */

/** Internal id -> Stripe Price id. Used to build Checkout line items. */
export const STRIPE_PRICE_IDS: Record<string, string> = {
  "map-02":   "price_1U34SZ5zrBzOO46iwwsYMWpg", // Phenylephrine
  "map-07":   "price_1U34SX5zrBzOO46iuMFzglHL", // Bradycardia
  "map-08":   "price_1U34SX5zrBzOO46ikOOPNFkf", // Clevidipine (Cleviprex)
  "map-09":   "price_1U34SW5zrBzOO46iJRwSvxj3", // Ketamine
  "map-10":   "price_1U34SW5zrBzOO46iwpICjjVF", // Desflurane
  "map-11":   "price_1U34SV5zrBzOO46i3MpQsSMX", // ENT Anesthesia
  "map-12":   "price_1U34SV5zrBzOO46iQuiG9Rrc", // Tachycardia
  "map-13":   "price_1U34SU5zrBzOO46iVZ0RjL7y", // Pulmonary Hypertension
  "map-16":   "price_1U34SU5zrBzOO46ihpjVy1zu", // Tranexamic Acid (TXA)
  "map-18":   "price_1U34ST5zrBzOO46iVwOWy8a5", // Orthopedic Anesthesia
  "map-19":   "price_1U34SS5zrBzOO46is9nHg23H", // Induction of Anesthesia
  "map-21":   "price_1U34SR5zrBzOO46igffugXUA", // Norepinephrine
  "map-22":   "price_1U34SR5zrBzOO46iCiu1gEEJ", // Hydralazine
  "map-24":   "price_1U34SQ5zrBzOO46i7qE2ikTg", // Neostigmine
  "map-25":   "price_1U34SQ5zrBzOO46i9sqLdXE8", // Morphine
  "map-28":   "price_1U34SQ5zrBzOO46ivimdjtPb", // Massive Transfusion Protocol (MTP)
  "map-30":   "price_1U34SP5zrBzOO46iv1qBPFL8", // Labetalol
  "map-34":   "price_1U34SN5zrBzOO46ix7RP46DG", // GI Anesthesia
  "map-35":   "price_1U34SN5zrBzOO46iq5kuMnEb", // Naloxone (Narcan)
  "map-36":   "price_1U34SM5zrBzOO46iq17O7I5S", // Neuroanesthesia
  "map-37":   "price_1U34SM5zrBzOO46ityvxG2VX", // Pre-Operative Interview
  "map-38":   "price_1U34SL5zrBzOO46i7WGC2sjc", // Esmolol
  "map-39":   "price_1U34SL5zrBzOO46iS92vlyta", // Regional Anesthesia
  "map-41":   "price_1U34SK5zrBzOO46izIAyvuP6", // Pediatric Anesthesia
  "map-45":   "price_1U34SI5zrBzOO46iEmKxHOss", // Anesthesia Instruments
  "map-46":   "price_1U34SH5zrBzOO46iQWfJAnnb", // Dopamine
  "map-48":   "price_1U34SH5zrBzOO46iw0cWQmHC", // Vecuronium
  "map-51":   "price_1U34SG5zrBzOO46irMFnRQsZ", // Pancuronium
  "map-52":   "price_1U34SF5zrBzOO46ivhOSGuZC", // Vasopressin
  "map-54":   "price_1U34SF5zrBzOO46iIrnT5zA3", // Hypoxia
  "map-55":   "price_1U34SF5zrBzOO46iVyoCWDvr", // Metoprolol
  "map-56":   "price_1U34RX5zrBzOO46iBwmPVgJo", // Myocardial Infarction (MI)
  "map-57":   "price_1U34SE5zrBzOO46i168lVIoI", // Ephedrine
  "map-59":   "price_1U34SC5zrBzOO46izv1qDZin", // Cisatracurium
  "map-60":   "price_1U34SC5zrBzOO46iLktjPQn7", // Scopolamine
  "map-61":   "price_1U34SC5zrBzOO46iWNZ9oE5f", // Sevoflurane
  "map-62":   "price_1U34SB5zrBzOO46iSjWFUVy0", // Nifedipine
  "map-63":   "price_1U34SB5zrBzOO46iQYle1F9S", // Anesthesia Technique Choices
  "map-65":   "price_1U34SA5zrBzOO46iz8q2Nfm7", // Aortic Stenosis
  "map-66":   "price_1U34S95zrBzOO46iw3zgMgmP", // Bronchospasm
  "map-71":   "price_1U34S85zrBzOO46iGe3VOHPi", // Epinephrine
  "map-73":   "price_1U34S75zrBzOO46iyzBP7ivX", // Atracurium
  "map-76":   "price_1U34S65zrBzOO46irBNg4GJG", // Etomidate
  "map-77":   "price_1U34S55zrBzOO46i4CWasjm8", // Atropine
  "map-78":   "price_1U34S55zrBzOO46iCqrZWOa5", // Hypotension
  "map-82":   "price_1U34S35zrBzOO46iUoL5nTW6", // Rocuronium
  "map-83":   "price_1U34S35zrBzOO46izCwXNZsp", // Anesthesia Basics
  "map-87":   "price_1U34S15zrBzOO46iQraB7QjS", // Midazolam (Versed)
  "map-88":   "price_1U34S15zrBzOO46iki8pIXiE", // Stroke
  "map-89":   "price_1U34S05zrBzOO46iPiNg0TcP", // Dexmedetomidine (Precedex)
  "map-96":   "price_1U34Ry5zrBzOO46i2sGnAmb1", // Isoflurane
  "map-98":   "price_1U34Rx5zrBzOO46i6ucY8owT", // Hydromorphone (Dilaudid)
  "map-99":   "price_1U34Rx5zrBzOO46iR8B4NkUG", // Patient Positioning
  "map-103":  "price_1U34Rw5zrBzOO46ivhPSHG94", // Anesthesia Machine
  "map-105":  "price_1U34Rv5zrBzOO46iaA8LkyDZ", // Cardiac Valvular Disease
  "map-108":  "price_1TyFZP5zrBzOO46iOnYt5Xh7", // Propofol
};

/** Internal id -> Stripe Product id. Used by the metadata backfill script. */
export const STRIPE_PRODUCT_IDS: Record<string, string> = {
  "map-02":   "prod_V3Ao4gGNdfMdsu", // Phenylephrine
  "map-07":   "prod_V3AogkA5irUl0R", // Bradycardia
  "map-08":   "prod_V3AoA9DzP47gqV", // Clevidipine (Cleviprex)
  "map-09":   "prod_V3AocsLo3OnVEA", // Ketamine
  "map-10":   "prod_V3Ao10ksMh5RGH", // Desflurane
  "map-11":   "prod_V3AoOjtiPTQOCY", // ENT Anesthesia
  "map-12":   "prod_V3Aodz0hXFSXdu", // Tachycardia
  "map-13":   "prod_V3Aoq90rPSH5zS", // Pulmonary Hypertension
  "map-16":   "prod_V3AodkPOLZMuLI", // Tranexamic Acid (TXA)
  "map-18":   "prod_V3Ao9w4IsRnKE6", // Orthopedic Anesthesia
  "map-19":   "prod_V3AoP1Hc1Kgbh6", // Induction of Anesthesia
  "map-21":   "prod_V3AoXEwra8w9uV", // Norepinephrine
  "map-22":   "prod_V3AoZukvJsD9Ut", // Hydralazine
  "map-24":   "prod_V3AowErqJNZq1n", // Neostigmine
  "map-25":   "prod_V3AoPHZnzJuMx2", // Morphine
  "map-28":   "prod_V3Ao07ZJs930NY", // Massive Transfusion Protocol (MTP)
  "map-30":   "prod_V3AovGVbNvPOjF", // Labetalol
  "map-34":   "prod_V3AnEZbgBJEUun", // GI Anesthesia
  "map-35":   "prod_V3AnQcEWAH2kkT", // Naloxone (Narcan)
  "map-36":   "prod_V3AnNlvMZ7wlWP", // Neuroanesthesia
  "map-37":   "prod_V3AnShgaeeUbiK", // Pre-Operative Interview
  "map-38":   "prod_V3AneUoNJh2kyS", // Esmolol
  "map-39":   "prod_V3AnPN3W4PJfsv", // Regional Anesthesia
  "map-41":   "prod_V3AnOF9AGRILmQ", // Pediatric Anesthesia
  "map-45":   "prod_V3AnLSOaOWNMFt", // Anesthesia Instruments
  "map-46":   "prod_V3AnXS0H3LNFK8", // Dopamine
  "map-48":   "prod_V3AnDQxImn9kvZ", // Vecuronium
  "map-51":   "prod_V3AnUr2EdkyKwr", // Pancuronium
  "map-52":   "prod_V3AnLmqNRjoW1L", // Vasopressin
  "map-54":   "prod_V3Anr1qOGU7x0N", // Hypoxia
  "map-55":   "prod_V3AnfFhVpE41Hp", // Metoprolol
  "map-56":   "prod_V3AnI68fcPnmzO", // Myocardial Infarction (MI)
  "map-57":   "prod_V3Anri52vNunQQ", // Ephedrine
  "map-59":   "prod_V3AnSYZEo0w2NT", // Cisatracurium
  "map-60":   "prod_V3AnJnNIPs0WPQ", // Scopolamine
  "map-61":   "prod_V3Ani0iFcEjEly", // Sevoflurane
  "map-62":   "prod_V3AnRhoF2BuECw", // Nifedipine
  "map-63":   "prod_V3AnzMKffNkuFL", // Anesthesia Technique Choices
  "map-65":   "prod_V3AnBSIXxCQRsG", // Aortic Stenosis
  "map-66":   "prod_V3AnbvdTpgjhI0", // Bronchospasm
  "map-71":   "prod_V3AnABzo9ZVUTh", // Epinephrine
  "map-73":   "prod_V3Ane4mQIBetCc", // Atracurium
  "map-76":   "prod_V3An0NHTkYD70E", // Etomidate
  "map-77":   "prod_V3Anc4SAWlknau", // Atropine
  "map-78":   "prod_V3AnFwvJcoXZ0i", // Hypotension
  "map-82":   "prod_V3AnTfu0BRhwjr", // Rocuronium
  "map-83":   "prod_V3AnDb7vbzXFHd", // Anesthesia Basics
  "map-87":   "prod_V3AnrdLskMlMle", // Midazolam (Versed)
  "map-88":   "prod_V3Anw4VBFgAMOH", // Stroke
  "map-89":   "prod_V3Anty0UldcXws", // Dexmedetomidine (Precedex)
  "map-96":   "prod_V3Anv6rNCIkxjh", // Isoflurane
  "map-98":   "prod_V3AnpJbl9LgN5P", // Hydromorphone (Dilaudid)
  "map-99":   "prod_V3AnJ3rkGdK13t", // Patient Positioning
  "map-103":  "prod_V3AnxzrSMwJ9ci", // Anesthesia Machine
  "map-105":  "prod_V3AnJGm8PanoMf", // Cardiac Valvular Disease
  "map-108":  "prod_UyBxWfa883xTHS", // Propofol
};

/**
 * The local price in US cents at generation time, for drift detection only.
 * Never used to charge anyone — Stripe's own Price is what a customer pays.
 * All 56 agreed with the catalog when this file was generated; they can
 * diverge later, because Stripe becomes the authority on what is charged while
 * catalog.ts still drives what the site displays.
 */
export const STRIPE_EXPECTED_AMOUNTS: Record<string, number> = {
  "map-02":   200,
  "map-07":   200,
  "map-08":   200,
  "map-09":   200,
  "map-10":   200,
  "map-11":   200,
  "map-12":   200,
  "map-13":   200,
  "map-16":   200,
  "map-18":   200,
  "map-19":   200,
  "map-21":   200,
  "map-22":   200,
  "map-24":   200,
  "map-25":   200,
  "map-28":   200,
  "map-30":   200,
  "map-34":   200,
  "map-35":   200,
  "map-36":   200,
  "map-37":   200,
  "map-38":   200,
  "map-39":   200,
  "map-41":   200,
  "map-45":   200,
  "map-46":   200,
  "map-48":   200,
  "map-51":   200,
  "map-52":   200,
  "map-54":   200,
  "map-55":   200,
  "map-56":   200,
  "map-57":   200,
  "map-59":   200,
  "map-60":   200,
  "map-61":   200,
  "map-62":   200,
  "map-63":   200,
  "map-65":   200,
  "map-66":   200,
  "map-71":   200,
  "map-73":   200,
  "map-76":   200,
  "map-77":   200,
  "map-78":   200,
  "map-82":   200,
  "map-83":   200,
  "map-87":   200,
  "map-88":   200,
  "map-89":   200,
  "map-96":   200,
  "map-98":   200,
  "map-99":   200,
  "map-103":  200,
  "map-105":  200,
  "map-108":  200,
};

/** The permanent Stripe Price for a catalog id, or undefined if unmapped. */
export function stripePriceId(productId: string): string | undefined {
  return STRIPE_PRICE_IDS[productId];
}

/** The permanent Stripe Product for a catalog id, or undefined if unmapped. */
export function stripeProductId(productId: string): string | undefined {
  return STRIPE_PRODUCT_IDS[productId];
}

/** Catalog ids that resolved to a permanent Stripe Price. */
export function mappedProductIds(): string[] {
  return Object.keys(STRIPE_PRICE_IDS);
}
