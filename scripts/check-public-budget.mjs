#!/usr/bin/env node
// Fails when the public page's first-load JS (gzip) goes over budget (SPEC: ≤ 110 kB).
// Same accounting as `next build`'s "First Load JS" column: every JS file the route loads up front
// (framework, runtime, layouts, page), gzip-compressed, in kB of 1000 bytes. Lazy islands
// (React.lazy chunks) are not counted. Run after `pnpm build`:  node scripts/check-public-budget.mjs
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const BUDGET_KB = Number(process.env.PUBLIC_JS_BUDGET_KB || 110);
const dist = process.env.NEXT_DIST_DIR || ".next";
const manifest = JSON.parse(readFileSync(join(dist, "app-build-manifest.json"), "utf8")).pages;

let failed = false;
for (const route of ["/[username]/page", "/[username]/t/[tab]/page"]) {
  const files = [...new Set([...(manifest["/layout"] ?? []), ...(manifest["/[username]/layout"] ?? []), ...(manifest[route] ?? [])])].filter((f) => f.endsWith(".js"));
  if (!files.length) {
    console.error(`✗ ${route}: not in ${dist}/app-build-manifest.json (did the build run?)`);
    failed = true;
    continue;
  }
  const kb = files.reduce((sum, f) => sum + gzipSync(readFileSync(join(dist, f)), { level: 9 }).length, 0) / 1000;
  const ok = kb <= BUDGET_KB;
  failed ||= !ok;
  console.log(`${ok ? "✓" : "✗"} ${route}: ${kb.toFixed(1)} kB first-load JS (budget ${BUDGET_KB} kB)`);
}
process.exit(failed ? 1 : 0);
