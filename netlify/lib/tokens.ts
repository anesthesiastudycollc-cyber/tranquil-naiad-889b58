import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Download links are stateless, signed URLs rather than database-backed
 * sessions: the token carries the Stripe session id, the product id, and an
 * expiry, all covered by an HMAC. The download endpoint additionally confirms
 * the order really exists and really paid for that product, so a forged or
 * expired token fails twice over.
 */

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type DownloadClaims = {
  /** Stripe Checkout session id. */
  sid: string;
  /** Catalog product id. */
  pid: string;
  /** Expiry, seconds since the epoch. */
  exp: number;
};

function signingSecret(): string {
  const explicit = Netlify.env.get("DOWNLOAD_SIGNING_SECRET");
  if (explicit) return explicit;

  // Fall back to a key derived from the Stripe secret so the store works with a
  // single environment variable configured. Setting DOWNLOAD_SIGNING_SECRET
  // explicitly is preferred — it lets Stripe keys be rotated without
  // invalidating every outstanding download link.
  const stripeKey = Netlify.env.get("STRIPE_SECRET_KEY");
  if (stripeKey) {
    return createHash("sha256").update(`asc-download-v1:${stripeKey}`).digest("hex");
  }

  throw new Error("No signing secret available: set DOWNLOAD_SIGNING_SECRET or STRIPE_SECRET_KEY.");
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createDownloadToken(sid: string, pid: string, ttlSeconds = TOKEN_TTL_SECONDS): string {
  const claims: DownloadClaims = {
    sid,
    pid,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payload = b64url(JSON.stringify(claims));
  return `${payload}.${sign(payload)}`;
}

export type TokenResult =
  | { ok: true; claims: DownloadClaims }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

export function verifyDownloadToken(token: string): TokenResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };

  const [payload, signature] = parts;

  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: "bad-signature" };
  }

  let claims: DownloadClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof claims.sid !== "string" || typeof claims.pid !== "string" || typeof claims.exp !== "number") {
    return { ok: false, reason: "malformed" };
  }

  if (claims.exp * 1000 < Date.now()) return { ok: false, reason: "expired" };

  return { ok: true, claims };
}
