"use client";

import { Check } from "lucide-react";
import type { Theme } from "@/lib/types";
import { PRESETS, themeFromPreset, type Preset } from "@/lib/theme/presets";
import { backgroundValue } from "@/lib/theme/resolve";
import { fontStack } from "@/lib/theme/fonts-meta";
import { themeFontVariables } from "@/lib/theme/fonts";

export interface ThemePickerProps {
  value: Theme | null | undefined;
  /** Picking a preset clears any advanced overrides. */
  onChange: (theme: Theme) => void;
  /** "cards" (default): tall swatches with buttons, for onboarding. "row": Kartu's compact tile row for the Design page. */
  variant?: "cards" | "row";
}

/** Tall preview: the preset's ground with three cards in different palette surfaces and the accent button. */
function Swatch({ p }: { p: Preset }) {
  const surfaces = p.palette?.surfaces ?? [p.button.color, p.button.color, p.button.color];
  const accent = p.palette?.accents[0] ?? p.button.color;
  const radius = `min(${p.button.radius}px, 8px)`;
  const bar = (bg: string) => ({ background: bg, borderRadius: radius });
  return (
    <div
      className="flex aspect-[3/4] w-full flex-col items-center gap-1.5 px-3 pt-4"
      style={{ background: backgroundValue(p.bg), color: p.text_color, fontFamily: fontStack(p.font) }}
      aria-hidden
    >
      <div className="mb-1 h-6 w-6 rounded-full" style={{ background: surfaces[1] ?? surfaces[0] }} />
      <div className="text-[11px] font-bold leading-none">{p.name}</div>
      <div className="mt-1 h-4 w-full" style={bar(accent)} />
      <div className="h-4 w-full" style={bar(surfaces[0])} />
      <div className="h-4 w-full" style={bar(surfaces[2] ?? surfaces[0])} />
      <div className="h-4 w-full" style={bar(surfaces[3] ?? surfaces[0])} />
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
              <span className="flex w-full flex-col gap-1.5">
                {/* the palette at a glance: four card surfaces and the accent */}
                <span className="flex gap-1" aria-hidden>
                  {(p.palette?.surfaces ?? []).slice(0, 4).map((c) => (
                    <i key={c} className="h-3.5 flex-1 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]" style={{ background: c }} />
                  ))}
                  <i className="h-3.5 w-3.5 rounded-full" style={{ background: p.palette?.accents[0] ?? p.button.color }} />
                </span>
                {p.name}
              </span>
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
