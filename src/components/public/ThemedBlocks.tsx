"use client";

import { useMemo, type CSSProperties } from "react";
import type { Block, Theme } from "@/lib/types";
import { resolveTheme, themeToCssVars } from "@/lib/theme/resolve";
import { buildTabTree } from "@/lib/page-structure";
import { themeFontVariables } from "@/lib/theme/fonts";
import { PublicContext } from "./context";
import { BlockRenderer } from "./BlockRenderer";
import s from "./public.module.css";

/**
 * A few blocks rendered with a theme, outside a full page (marketing showcases, docs).
 * Always in preview mode: no events, no network, links don't navigate.
 * Renders the top-level blocks of `blocks` in position order (tab_id is ignored).
 */
export function ThemedBlocks({ theme, blocks, className, style }: { theme: Theme; blocks: Block[]; className?: string; style?: CSSProperties }) {
  const vars = useMemo(() => themeToCssVars(resolveTheme(theme)), [theme]);
  const tree = useMemo(() => buildTabTree(blocks.map((b) => ({ ...b, tab_id: "x" })), "x"), [blocks]);
  return (
    <PublicContext.Provider value={{ username: "", preview: true }}>
      <div className={[s.page, themeFontVariables, className].filter(Boolean).join(" ")} style={{ ...vars, padding: 20, ...style }}>
        <div className={s.column}>
          {tree.top.map((b) => (
            <BlockRenderer key={b.id} block={b} childBlocks={tree.children.get(b.id)} />
          ))}
        </div>
      </div>
    </PublicContext.Provider>
  );
}
