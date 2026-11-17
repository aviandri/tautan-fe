"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { RotateCcw, Upload } from "lucide-react";
import type { ButtonStyle, HeaderLayout, Theme, ThemeBg } from "@/lib/types";
import { PRESETS, getPreset, hasOverrides, themeFromPreset } from "@/lib/theme/presets";
import { isColor, isImageUrl, resolveTheme, textOn } from "@/lib/theme/resolve";
import { DEFAULT_GRADIENT, parseGradient, toGradientCss, type SimpleGradient } from "@/lib/theme/gradient";
import { FONT_OPTIONS, fontStack } from "@/lib/theme/fonts-meta";
import { themeFontVariables } from "@/lib/theme/fonts";

export interface ThemeCustomizerProps {
  value: Theme;
  onChange: (theme: Theme) => void;
  /** Uploads a background image and resolves to its URL (the dashboard passes api.uploads.create). */
  onUploadImage?: (file: File) => Promise<string>;
}

/** The BE caps radius at 100; 100px is a pill at any button height. */
const PILL = 100;

export function ThemeCustomizer({ value, onChange, onUploadImage }: ThemeCustomizerProps) {
  const t = resolveTheme(value);
  const set = (patch: Partial<Theme>) => onChange({ ...t, ...patch });
  const setButton = (patch: Partial<Theme["button"]>) => set({ button: { ...t.button, ...patch } });
  const paletteOn = !!t.palette && t.palette_mode !== "mono";

  // Kartu "Design" groups; the parent lays them out in a 2-column grid (span-2 groups go full width)
  return (
    <>
      <Group title="Header">
        <HeaderLayouts value={t.header?.layout ?? "classic"} onChange={(layout) => set({ header: { ...t.header, layout } })} />
        {t.header?.layout === "banner" ? (
          <ImageEditor
            value={t.header.banner_image_url ?? ""}
            onChange={(banner_image_url) => set({ header: { layout: "banner", banner_image_url } })}
            onUploadImage={onUploadImage}
            label="Banner image URL"
          />
        ) : null}
      </Group>

      <Group title="Fonts">
        <FontSelect label="Name and headings" value={t.fonts?.title ?? ""} emptyLabel={`Same as everything else`} onChange={(title) => set({ fonts: title ? { ...t.fonts, title } : t.fonts?.body ? { body: t.fonts.body } : undefined })} />
        <FontSelect label="Everything else" value={t.font} onChange={(font) => set({ font, fonts: t.fonts?.title ? { title: t.fonts.title } : undefined })} />
      </Group>

      <Group title="Buttons">
        <Segmented<ButtonStyle>
          label="Button style"
          value={t.button.style}
          options={[
            { value: "fill", label: "Fill" },
            { value: "outline", label: "Outline" },
            { value: "shadow", label: "Hard shadow" },
          ]}
          onChange={(style) => setButton({ style })}
        />
        <RadiusField radius={t.button.radius} onChange={(radius) => setButton({ radius })} />
        {paletteOn ? (
          <p className="text-sm text-muted">Main buttons use the accent from Card colours.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Main button" value={t.button.color} onChange={(color) => setButton({ color })} />
            <ColorField label="Button text" value={t.button.text_color} onChange={(text_color) => setButton({ text_color })} />
          </div>
        )}
      </Group>

      <PaletteGroup t={t} set={set} />

      <Group
        title="Colours"
        action={
          hasOverrides(t) ? (
            <button type="button" onClick={() => onChange(themeFromPreset(t.preset))} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold text-muted hover:bg-sunken hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset to {getPreset(t.preset).name}
            </button>
          ) : null
        }
      >
        <BackgroundEditor bg={t.bg} onChange={(bg) => set({ bg })} onUploadImage={onUploadImage} />
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Text" value={t.text_color} onChange={(text_color) => set({ text_color, ...(t.palette ? { palette: { ...t.palette, ink: text_color } } : {}) })} />
          {t.block ? (
            <ColorField label="Cards" value={t.block.color} onChange={(color) => set({ block: { ...t.block!, color } })} />
          ) : (
            <button type="button" onClick={() => set({ block: { color: "#ffffff", text_color: t.text_color } })} className="flex min-h-[48px] items-center justify-center rounded-2xl bg-sunken px-3 text-sm font-semibold text-ink-2 hover:bg-[#e1e1dd]">
              Custom card colour
            </button>
          )}
        </div>
        {t.block ? (
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Card text" value={t.block.text_color} onChange={(text_color) => set({ block: { ...t.block!, text_color } })} />
            <button type="button" onClick={() => set({ block: undefined })} className="flex min-h-[48px] items-center justify-center rounded-2xl px-3 text-sm font-semibold text-muted hover:bg-sunken hover:text-foreground">
              Use theme cards
            </button>
          </div>
        ) : null}
      </Group>

      <details className="group col-span-full rounded-k-l bg-surface shadow-card [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-xl font-bold tracking-[-0.015em]">
          More options
          <span className="ml-auto text-sm font-semibold text-muted group-open:hidden">Labels, borders, shadow, spacing, wide screens</span>
          <span aria-hidden className="text-muted transition group-open:rotate-180">▾</span>
        </summary>
        <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Optional label="Custom label colours" on={!!t.label} onToggle={(on) => set({ label: on ? { color: t.text_color, text_color: "#ffffff" } : undefined })}>
              {t.label ? (
                <div className="grid grid-cols-2 gap-2">
                  <ColorField label="Label" value={t.label.color} onChange={(color) => set({ label: { ...t.label!, color } })} />
                  <ColorField label="Label text" value={t.label.text_color} onChange={(text_color) => set({ label: { ...t.label!, text_color } })} />
                </div>
              ) : null}
            </Optional>
            <Optional label="Border" on={!!t.border} onToggle={(on) => set({ border: on ? { width: 2, color: t.text_color } : undefined })}>
              {t.border ? (
                <div className="grid grid-cols-2 items-end gap-2">
                  <SliderField label="Width" min={0} max={12} value={t.border.width} unit="px" onChange={(width) => set({ border: { ...t.border!, width } })} />
                  <ColorField label="Border colour" value={t.border.color} onChange={(color) => set({ border: { ...t.border!, color } })} />
                </div>
              ) : null}
            </Optional>
          </div>
          <div className="flex flex-col gap-3">
            <Optional label="Shadow" on={!!t.shadow} onToggle={(on) => set({ shadow: on ? { amount: 30, style: "soft" } : undefined })}>
              {t.shadow ? (
                <>
                  <Segmented<"soft" | "solid">
                    label="Shadow style"
                    value={t.shadow.style}
                    options={[
                      { value: "soft", label: "Soft" },
                      { value: "solid", label: "Solid" },
                    ]}
                    onChange={(style) => set({ shadow: { ...t.shadow!, style } })}
                  />
                  <SliderField label="Amount" min={0} max={100} value={t.shadow.amount} onChange={(amount) => set({ shadow: { ...t.shadow!, amount } })} />
                </>
              ) : null}
            </Optional>
            <SliderField label="Space between cards" min={0} max={64} value={t.spacing ?? 14} unit="px" onChange={(spacing) => set({ spacing })} />
            <Optional label="Colour around the page on desktop" on={!!t.bg_desktop} onToggle={(on) => set({ bg_desktop: on ? "#ebebe8" : undefined })}>
              {t.bg_desktop ? <ColorField label="Desktop background" value={t.bg_desktop} onChange={(bg_desktop) => set({ bg_desktop })} /> : null}
            </Optional>
          </div>
        </div>
      </details>
    </>
  );
}

type PaletteMode = NonNullable<Theme["palette_mode"]>;

/** Themes v3: the card palette. Cards take these colours in turn (or by type); text on each is picked for contrast. */
function PaletteGroup({ t, set }: { t: Theme; set: (patch: Partial<Theme>) => void }) {
  const pal = t.palette ?? null;
  const mode: PaletteMode = pal ? (t.palette_mode ?? "cycle") : "mono";
  const starter = getPreset(t.preset).palette ?? PRESETS[0].palette!;
  const setMode = (m: PaletteMode) => {
    if (m === "mono") return set({ palette_mode: "mono" });
    set({ palette: pal ?? { ...starter, surfaces: [...starter.surfaces], accents: [...starter.accents], ink: t.text_color }, palette_mode: m });
  };
  const setSurfaces = (surfaces: string[]) => pal && set({ palette: { ...pal, surfaces } });
  return (
    <Group title="Card colours" wide action={<span className="text-sm font-semibold text-muted">{mode === "mono" ? "One colour for every card" : "Text on each card is picked for contrast"}</span>}>
      <Segmented<PaletteMode>
        label="How cards are coloured"
        value={mode}
        options={[
          { value: "cycle", label: "Cycle" },
          { value: "by_type", label: "By card type" },
          { value: "mono", label: "Single colour" },
        ]}
        onChange={setMode}
      />
      {pal && mode !== "mono" ? (
        <>
          <p className="-mt-1 text-sm text-muted">
            {mode === "cycle" ? "Cards take these colours in turn, top to bottom." : "Links, shop cards, creator cards, forms and info cards each get their own colour."}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {pal.surfaces.map((c, i) => (
              <div key={i} className="relative">
                <ColorField label={`Card ${i + 1}`} value={c} onChange={(v) => setSurfaces(pal.surfaces.map((x, k) => (k === i ? v : x)))} />
                {pal.surfaces.length > 4 ? (
                  <button type="button" onClick={() => setSurfaces(pal.surfaces.filter((_, k) => k !== i))} aria-label={`Remove card colour ${i + 1}`} className="absolute right-0 top-0 rounded-full px-1.5 text-xs font-bold text-muted hover:text-foreground">
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
            {pal.surfaces.length < 6 ? (
              <button type="button" onClick={() => setSurfaces([...pal.surfaces, pal.surfaces[pal.surfaces.length - 1]])} className="mt-[22px] flex min-h-[48px] items-center justify-center rounded-2xl bg-sunken text-sm font-semibold text-ink-2 hover:bg-[#e1e1dd]">
                Add colour
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            <ColorField label="Accent (main buttons)" value={pal.accents[0]} onChange={(a) => set({ palette: { ...pal, accents: [a, ...pal.accents.slice(1)], ink_on_accent: textOn(a) } })} />
            <div className="flex flex-col justify-end">
              <span className="flex min-h-[48px] items-center justify-center rounded-full text-sm font-semibold" style={{ background: pal.accents[0], color: textOn(pal.accents[0], pal.ink_on_accent) }}>
                Button preview
              </span>
            </div>
          </div>
        </>
      ) : null}
    </Group>
  );
}

// ---------- pieces ----------

/** A Kartu settings group: white 28px card, 20px title. `wide` spans both columns of the Design grid. */
export function Group({ title, action, wide, children }: { title: string; action?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 rounded-k-l bg-surface p-5 shadow-card ${wide ? "col-span-full" : ""}`} aria-label={title}>
      <div className="flex items-center gap-2">
        <h2 className="mr-auto text-xl font-bold tracking-[-0.015em] text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const LAYOUTS: { value: HeaderLayout; label: string; art: ReactNode }[] = [
  {
    value: "classic",
    label: "Classic",
    art: (
      <>
        <span className="h-[22px] w-[22px] rounded-full bg-foreground" />
        <span className="h-[5px] w-10 rounded-full bg-line-2" />
      </>
    ),
  },
  {
    value: "banner",
    label: "Banner",
    art: (
      <>
        <span className="h-5 w-11 rounded-md bg-line-2" />
        <span className="-mt-3 h-4 w-4 rounded-full bg-foreground shadow-[0_0_0_2px_#fff]" />
      </>
    ),
  },
  { value: "headshot", label: "Headshot", art: <span className="h-[30px] w-10 rounded-lg bg-foreground" /> },
  {
    value: "business",
    label: "Business",
    art: (
      <span className="flex items-center gap-1">
        <span className="h-4 w-4 rounded-[5px] bg-foreground" />
        <span className="h-[5px] w-[22px] rounded-full bg-line-2" />
      </span>
    ),
  },
];

function HeaderLayouts({ value, onChange }: { value: HeaderLayout; onChange: (v: HeaderLayout) => void }) {
  return (
    <div role="radiogroup" aria-label="Header layout" className="grid grid-cols-4 gap-2">
      {LAYOUTS.map((l) => {
        const on = l.value === value;
        return (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(l.value)}
            className={`flex min-h-[86px] flex-col items-center justify-end gap-2 rounded-[18px] p-2.5 text-xs font-semibold transition ${
              on ? "bg-surface text-foreground shadow-[inset_0_0_0_2px_var(--ink)]" : "bg-background text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-2)]"
            }`}
          >
            <span className="flex flex-1 flex-col items-center justify-center gap-1.5" aria-hidden>
              {l.art}
            </span>
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

function FontSelect({ label, value, onChange, emptyLabel }: { label: string; value: string; onChange: (v: string) => void; emptyLabel?: string }) {
  const id = useId();
  const current = FONT_OPTIONS.find((f) => f.label === value || f.id === value);
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={current?.label ?? value}
          onChange={(e) => onChange(e.target.value)}
          className={`${themeFontVariables} h-12 w-full cursor-pointer appearance-none rounded-2xl bg-background pl-4 pr-10 text-[15px] font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-2)]`}
          style={current ? { fontFamily: fontStack(current.id) } : undefined}
        >
          {emptyLabel ? <option value="">{emptyLabel}</option> : null}
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.label}>
              {f.label}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
          ▾
        </span>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full gap-1 self-start overflow-x-auto rounded-full bg-sunken p-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
            o.value === value ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-2 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  // <input type=color> only speaks #rrggbb
  const pickerValue = /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : /^#[0-9a-f]{3}$/i.test(value)
      ? "#" + value.slice(1).split("").map((c) => c + c).join("")
      : "#000000";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      <div className="flex items-center gap-2.5 rounded-2xl bg-background py-1.5 pl-2 pr-3 shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[inset_0_0_0_2px_var(--ink)]">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={pickerValue}
          onChange={(e) => {
            setDraft(null);
            onChange(e.target.value);
          }}
          className="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full border-0 bg-transparent p-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,.1)] [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
        />
        <input
          id={id}
          value={shown}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.trim();
            setDraft(v);
            if (isColor(v)) onChange(v);
          }}
          onBlur={() => setDraft(null)}
          aria-invalid={draft !== null && !isColor(draft)}
          className="min-h-9 w-full min-w-0 bg-transparent font-mono text-[13px] uppercase outline-none"
        />
      </div>
    </div>
  );
}

function Optional({ label, on, onToggle, children }: { label: string; on: boolean; onToggle: (on: boolean) => void; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-9 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-foreground">
        {label}
        <span className="relative inline-flex">
          <input type="checkbox" role="switch" checked={on} onChange={(e) => onToggle(e.target.checked)} className="peer sr-only" />
          <span className="h-7 w-[46px] rounded-full bg-line-2 transition peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" />
          <span className="absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition peer-checked:translate-x-[18px]" />
        </span>
      </label>
      {children}
    </div>
  );
}

function SliderField({
  label,
  min,
  max,
  value,
  unit = "",
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--ink)]"
        />
        <span className="w-12 text-right font-mono text-xs text-muted">
          {value}
          {unit}
        </span>
      </div>
    </div>
  );
}

function RadiusField({ radius, onChange }: { radius: number; onChange: (r: number) => void }) {
  const id = useId();
  // 0–32px, and one more step past 32 means "Full pill" (stored as 100, the BE's max)
  const step = radius >= PILL ? 33 : Math.min(32, radius);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center justify-between text-[13px] font-semibold text-ink-2">
        Corners
        <span className="font-mono text-xs">{radius >= PILL ? "Full pill" : `${radius}px`}</span>
      </label>
      <input id={id} type="range" min={0} max={33} step={1} value={step} onChange={(e) => onChange(Number(e.target.value) >= 33 ? PILL : Number(e.target.value))} className="w-full accent-[var(--ink)]" aria-valuetext={radius >= PILL ? "Full pill" : `${radius} pixels`} />
    </div>
  );
}

function BackgroundEditor({
  bg,
  onChange,
  onUploadImage,
}: {
  bg: ThemeBg;
  onChange: (bg: ThemeBg) => void;
  onUploadImage?: (file: File) => Promise<string>;
}) {
  // remember each mode's last value so flipping between modes doesn't lose work
  const memory = useRef<Record<ThemeBg["type"], string>>({
    color: bg.type === "color" ? bg.value : "#f5f5f4",
    gradient: bg.type === "gradient" ? bg.value : toGradientCss(DEFAULT_GRADIENT),
    image: bg.type === "image" ? bg.value : "",
    split: bg.type === "split" ? bg.value : bg.type === "gradient" ? bg.value : toGradientCss(DEFAULT_GRADIENT),
    none: "",
  });
  memory.current[bg.type] = bg.value;

  const switchTo = (type: ThemeBg["type"]) => {
    if (type === bg.type) return;
    const v = memory.current[type];
    // an image mode with no image yet keeps the current ground until one is chosen
    if (type === "image" && !isImageUrl(v)) {
      setPendingImage(true);
      return;
    }
    setPendingImage(false);
    onChange({ type, value: v });
  };
  const [pendingImage, setPendingImage] = useState(false);
  const mode = pendingImage ? "image" : bg.type;

  return (
    <div className="flex flex-col gap-3">
      <Segmented<ThemeBg["type"]>
        label="Background type"
        value={mode}
        options={[
          { value: "color", label: "Colour" },
          { value: "gradient", label: "Gradient" },
          { value: "image", label: "Image" },
          { value: "split", label: "Top" },
          { value: "none", label: "Plain" },
        ]}
        onChange={switchTo}
      />
      {mode === "color" ? (
        <ColorField label="Background colour" value={bg.value} onChange={(value) => onChange({ type: "color", value })} />
      ) : mode === "gradient" ? (
        <GradientEditor value={bg.value} onChange={(value) => onChange({ type: "gradient", value })} />
      ) : mode === "split" ? (
        <>
          <p className="text-xs text-muted">A gradient behind your header; the rest of the page stays plain.</p>
          <GradientEditor value={bg.value} onChange={(value) => onChange({ type: "split", value })} />
        </>
      ) : mode === "none" ? (
        <p className="text-xs text-muted">A plain page in a neutral that suits your text colour.</p>
      ) : (
        <ImageEditor
          value={bg.type === "image" ? bg.value : ""}
          onChange={(value) => {
            setPendingImage(false);
            onChange({ type: "image", value });
          }}
          onUploadImage={onUploadImage}
        />
      )}
    </div>
  );
}

function GradientEditor({ value, onChange }: { value: string; onChange: (css: string) => void }) {
  const g = parseGradient(value) ?? DEFAULT_GRADIENT;
  const id = useId();
  const update = (patch: Partial<SimpleGradient>) => onChange(toGradientCss({ ...g, ...patch }));
  return (
    <div className="flex flex-col gap-3">
      <div className="h-10 rounded-2xl shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" style={{ background: toGradientCss(g) }} aria-hidden />
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="From" value={g.from} onChange={(from) => update({ from })} />
        <ColorField label="To" value={g.to} onChange={(to) => update({ to })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          Angle
        </label>
        <div className="flex items-center gap-3">
          <input
            id={id}
            type="range"
            min={0}
            max={360}
            step={5}
            value={g.angle}
            onChange={(e) => update({ angle: Number(e.target.value) })}
            className="w-full accent-[var(--ink)]"
          />
          <span className="w-12 text-right font-mono text-xs text-muted">{g.angle}°</span>
        </div>
      </div>
    </div>
  );
}

function ImageEditor({
  value,
  onChange,
  onUploadImage,
  label = "Or paste an image URL",
}: {
  value: string;
  onChange: (url: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  label?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!onUploadImage) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file (JPG, PNG, WebP or GIF).");
    if (file.size > 5 * 1024 * 1024) return setError("That image is over 5 MB. Try a smaller one.");
    setError(null);
    setBusy(true);
    try {
      const url = await onUploadImage(file);
      setDraft(url);
      onChange(url);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {onUploadImage ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-sunken text-sm font-semibold hover:bg-[#e1e1dd] disabled:opacity-60"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {busy ? "Uploading…" : "Upload an image"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </>
      ) : null}
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      <input
        id={id}
        value={draft}
        placeholder="https://…"
        onChange={(e) => {
          setDraft(e.target.value);
          if (isImageUrl(e.target.value.trim())) {
            setError(null);
            onChange(e.target.value.trim());
          }
        }}
        onBlur={() => {
          if (draft && !isImageUrl(draft.trim())) setError("Use an https:// link to an image.");
        }}
        className="h-12 rounded-2xl bg-background px-4 text-[15px] shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
      />
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
