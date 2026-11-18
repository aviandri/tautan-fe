import { revalidateTag } from "next/cache";
import { profileTag } from "@/lib/get-public-page";
import { verify } from "@/lib/revalidate";

/**
 * POST /api/revalidate: the backend's webhook after a publish, block, theme or username change.
 *
 *   X-Tautan-Timestamp: <unix seconds>
 *   X-Tautan-Signature: sha256=<hex HMAC-SHA256(REVALIDATE_SECRET, "<timestamp>.<raw body>")>
 *   body: {"usernames": ["alice", "alice_old"]}   (1–20; include the old name on a rename)
 *
 * 200 {revalidated:[…]} · 400 bad body · 401 bad/expired signature (±5 min) · 413 body over 4 KB · 503 secret not configured.
 */
export const dynamic = "force-dynamic";

const USERNAME = /^[a-z0-9_.]{1,40}$/i;

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return Response.json({ error: { code: "not_configured", message: "REVALIDATE_SECRET is not set" } }, { status: 503 });

  // Up to 20 usernames is a few hundred bytes; don't buffer more before the signature check.
  if (Number(req.headers.get("content-length") ?? 0) > 4096) return Response.json({ error: { code: "too_large", message: "body too large" } }, { status: 413 });
  const raw = (await req.text()).slice(0, 4096);
  const ts = req.headers.get("x-tautan-timestamp") ?? "";
  const got = req.headers.get("x-tautan-signature") ?? "";
  if (!verify(secret, ts, raw, got)) return Response.json({ error: { code: "bad_signature", message: "missing, invalid or expired signature" } }, { status: 401 });

  let usernames: unknown;
  try {
    usernames = (JSON.parse(raw) as { usernames?: unknown }).usernames;
  } catch {
    usernames = undefined;
  }
  if (!Array.isArray(usernames) || !usernames.length || usernames.length > 20 || !usernames.every((u) => typeof u === "string" && USERNAME.test(u))) {
    return Response.json({ error: { code: "invalid_body", message: 'expected {"usernames": [1–20 usernames]}' } }, { status: 400 });
  }
  const done = [...new Set(usernames.map((u: string) => u.toLowerCase()))];
  for (const u of done) revalidateTag(profileTag(u));
  return Response.json({ revalidated: done });
}
