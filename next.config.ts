import { createHash } from "node:crypto";
import { relative } from "node:path";
import type { NextConfig } from "next";

/**
 * Production CSS-module class names as a short hash ("c" + 6 chars of sha1(path#class)) instead
 * of Next's readable `public_facadePoster__D7eOC`. Next ships the class map of every CSS module
 * used on a route as client JS (server-only modules included), so on /[username] the ~170 public
 * card classes cost first-load bytes; short names keep the page inside its 110 kB budget.
 * Dev keeps the readable names.
 */
function shortLocalIdent(context: { rootContext: string; resourcePath: string }, _: string, exportName: string) {
  const rel = relative(context.rootContext, context.resourcePath).replace(/\\+/g, "/");
  return "c" + createHash("sha1").update(`${rel}#${exportName}`).digest("base64url").slice(0, 6).replace(/-/g, "_");
}

type Use = { loader?: string; options?: { modules?: { getLocalIdent?: unknown } } };
type Rule = { oneOf?: Rule[]; rules?: Rule[]; use?: Use | Use[] };

function patchCssModules(rules: Rule[] | undefined) {
  for (const r of rules ?? []) {
    if (!r || typeof r !== "object") continue;
    patchCssModules(r.oneOf);
    patchCssModules(r.rules);
    const uses = Array.isArray(r.use) ? r.use : r.use ? [r.use] : [];
    for (const u of uses) {
      if (u && typeof u === "object" && u.loader?.includes("css-loader") && u.options?.modules?.getLocalIdent) {
        u.options.modules.getLocalIdent = shortLocalIdent;
      }
    }
  }
}

const nextConfig: NextConfig = {
  // Self-hosted Docker image: NEXT_OUTPUT=standalone emits .next/standalone (server.js + only the
  // node_modules it traces). Vercel and CI leave it unset and build the normal output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Lets `next dev` and `next build` run side by side (e.g. NEXT_DIST_DIR=.next-dev pnpm dev).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  webpack(config, { dev }) {
    if (!dev) patchCssModules(config.module?.rules as Rule[]);
    return config;
  },
};

export default nextConfig;
