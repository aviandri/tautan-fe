"use client";

import { Check } from "lucide-react";
import type { Theme } from "@/lib/types";
import { PRESETS, themeFromPreset, type Preset } from "@/lib/theme/presets";
import { backgroundValue, themeToCssVars } from "@/lib/theme/resolve";
import { fontStack } from "@/lib/theme/fonts-meta";
import { themeFontVariables } from "@/lib/theme/fonts";

export interface ThemePickerProps {
  value: Theme | null | undefined;
  /** Picking a preset clears any advanced overrides. */
  onChange: (theme: Theme) => void;
  /** "cards" (default): tall swatches with buttons, for onboarding. "row": Kartu's compact tile row for the Design page. */
  variant?: "cards" | "row";
}

function Swatch({ p }: { p: Preset }) {
  const vars = themeToCssVars(p);
  const btn = {
    background: "var(--t-btn-bg)",
    border: "1.5px solid var(--t-btn-border)",
    borderRadius: `min(var(--t-btn-radius), 8px)`,
    boxShadow: p.button.style === "shadow" ? `2px 2px 0 ${p.text_color}` : "none",
  };
  return (
    <div
      className="flex aspect-[3/4] w-full flex-col items-center gap-1.5 px-3 pt-4"
      style={{ ...vars, background: backgroundValue(p.bg), color: p.text_color, fontFamily: fontStack(p.font) }}
      aria-hidden
    >
      <div className="mb-1 h-6 w-6 rounded-full" style={{ background: p.text_color, opacity: 0.85 }} />
      <div className="text-[11px] font-bold leading-none">{p.name}</div>
      <div className="mt-1 h-4 w-full" style={btn} />
      <div className="h-4 w-full" style={btn} />
      <div className="h-4 w-full" style={btn} />
    </div>
  );
}

export function ThemePicker({ value, onChange, variant = "cards" }: ThemePickerProps) {
  const current = value?.preset;
  if (variant === "row") {
    return (
      <div role="radiogroup" aria-label="Theme presets" className={`${themeFontVariables} grid grid-cols-4 gap-2 sm:grid-cols-8`}>
        {PRESETS.map((p) => {
          const selected = p.preset === current;
          return (
            <button
              key={p.preset}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(themeFromPreset(p.preset))}
              title={p.blurb}
              className={`flex h-[72px] items-end rounded-[18px] p-2 text-left text-xs font-bold transition hover:-translate-y-0.5 ${
                selected ? "shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--accent)]" : "shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]"
              }`}
              style={{ background: backgroundValue(p.bg), color: p.text_color, fontFamily: fontStack(p.font) }}
            >
              {p.name}
              <span className="sr-only">{`: ${p.blurb}`}</span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className={themeFontVariables}>
      <div role="radiogroup" aria-label="Theme presets" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PRESETS.map((p) => {
          const selected = p.preset === current;
          return (
            <button
              key={p.preset}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(themeFromPreset(p.preset))}
              title={p.blurb}
              className={`group relative overflow-hidden rounded-xl border-2 text-left transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                selected ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <Swatch p={p} />
              {selected ? (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-zinc-900 text-white">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              ) : null}
              <span className="sr-only">{`${p.name}: ${p.blurb}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
