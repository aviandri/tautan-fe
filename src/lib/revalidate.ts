import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Signature for POST /api/revalidate: "sha256=" + hex HMAC-SHA256(secret, "<ts>.<raw body>"). */
export function sign(secret: string, ts: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
}

export const MAX_SKEW_S = 300;

/** Constant-time check of signature and timestamp freshness (±5 min). */
export function verify(secret: string, ts: string, body: string, got: string, nowS = Date.now() / 1000): boolean {
  if (!/^\d{9,11}$/.test(ts) || Math.abs(nowS - Number(ts)) > MAX_SKEW_S) return false;
  const want = sign(secret, ts, body);
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
