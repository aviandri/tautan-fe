import type { CSSProperties } from "react";
import type { Block, Theme } from "@/lib/types";
import { resolveTheme, themeToCssVars } from "@/lib/theme/resolve";
import { buildTabTree } from "@/lib/page-structure";
import { themeFontVariables } from "@/lib/theme/fonts";
import { BlockList } from "./BlockRenderer";
import { PageRuntime } from "./PageRuntime";
import { NO_ENV } from "./env";
import { s } from "./cls";
import "./public.css";

/**
 * A few blocks rendered with a theme, outside a full page (marketing showcases, docs).
 * Always in preview mode: no events, no network, links don't navigate.
 * Renders the top-level blocks of `blocks` in position order (tab_id is ignored).
 */
export function ThemedBlocks({ theme, blocks, className, style }: { theme: Theme; blocks: Block[]; className?: string; style?: CSSProperties }) {
  const vars = themeToCssVars(resolveTheme(theme));
  const tree = buildTabTree(
    blocks.map((b) => ({ ...b, tab_id: "x" })),
    "x",
  );
  return (
    <div data-tpage="" className={[s.page, themeFontVariables, className].filter(Boolean).join(" ")} style={{ ...vars, padding: 20, ...style }}>
      <div className={s.column}>
        <BlockList blocks={tree.top} childrenOf={tree.children} opts={{ env: NO_ENV, now: Date.now() }} />
      </div>
      <PageRuntime username="" preview />
    </div>
  );
}
