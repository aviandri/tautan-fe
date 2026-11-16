import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // CSS modules in renderer tests: skip the app's Tailwind PostCSS pipeline (class names are enough)
  css: { postcss: { plugins: [] } },
  esbuild: { jsx: "automatic" },
  test: { environment: "node", include: ["src/**/*.test.ts", "src/**/*.test.tsx"] },
});
