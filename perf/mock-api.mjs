// Fixture API for Lighthouse runs: serves GET /api/v1/public/heavy (perf/fixtures/heavy.json),
// accepts events, and serves the fixture images under /uploads/. No dependencies.
//   node perf/mock-api.mjs            (port 8097, or PORT=…)
// Then build the FE with NEXT_PUBLIC_API_URL=http://localhost:8097 NEXT_PUBLIC_API_MOCK=0.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8097);
const page = readFileSync(join(here, "fixtures", "heavy.json"));

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const cors = { "Access-Control-Allow-Origin": req.headers.origin || "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Credentials": "true" };
  if (req.method === "OPTIONS") return res.writeHead(204, { ...cors, "Access-Control-Allow-Methods": "GET,POST" }).end();
  if (url.pathname === "/api/v1/public/heavy") {
    return res.writeHead(200, { ...cors, "Content-Type": "application/json", "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" }).end(page);
  }
  if (url.pathname === "/api/v1/public/heavyold") {
    // a renamed page: the BE answers 301 + {redirect_to}
    return res.writeHead(301, { ...cors, "Content-Type": "application/json", Location: "/api/v1/public/heavy" }).end('{"redirect_to":"heavy"}');
  }
  if (/^\/api\/v1\/public\/heavy\/(events|contact|form|subscribe)$/.test(url.pathname)) {
    req.resume();
    return res.writeHead(202, cors).end();
  }
  const m = url.pathname.match(/^\/uploads\/([\w.-]+\.jpg)$/);
  if (m && existsSync(join(here, "fixtures", "img", m[1]))) {
    return res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" }).end(readFileSync(join(here, "fixtures", "img", m[1])));
  }
  res.writeHead(404, { ...cors, "Content-Type": "application/json" }).end('{"error":{"code":"not_found","message":"not found"}}');
}).listen(port, () => console.log(`fixture API on :${port}`));
