import { summarizeReport } from "@/lib/csp";

/**
 * POST /api/csp-report: CSP violation reports (Report-Only for now). Logged as one line each, with
 * URL queries stripped; nothing is stored. Bounded: 8 KB bodies, at most 60 log lines a minute per
 * server instance, so a flood of reports can't flood the logs.
 */
export const dynamic = "force-dynamic";

let windowStart = 0;
let logged = 0;

export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 8192) return new Response(null, { status: 413 });
  const raw = (await req.text()).slice(0, 8192);
  let line: string | null = null;
  try {
    line = summarizeReport(JSON.parse(raw));
  } catch {
    line = null;
  }
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    logged = 0;
  }
  if (line && logged < 60) {
    logged++;
    console.warn(line);
  }
  return new Response(null, { status: 204 });
}
