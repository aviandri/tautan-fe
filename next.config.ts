import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets `next dev` and `next build` run side by side (e.g. NEXT_DIST_DIR=.next-dev pnpm dev).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
