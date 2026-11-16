"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { RotateCcw, Upload } from "lucide-react";
import type { ButtonStyle, Theme, ThemeBg } from "@/lib/types";
import { getPreset, hasOverrides, themeFromPreset } from "@/lib/theme/presets";
import { isColor, isImageUrl, resolveTheme } from "@/lib/theme/resolve";
import { DEFAULT_GRADIENT, parseGradient, toGradientCss, type SimpleGradient } from "@/lib/theme/gradient";
import { FONT_OPTIONS, fontStack } from "@/lib/theme/fonts-meta";
import { themeFontVariables } from "@/lib/theme/fonts";

export interface ThemeCustomizerProps {
  value: Theme;
  onChange: (theme: Theme) => void;
  /** Uploads a background image and resolves to its URL (the dashboard passes api.uploads.create). */
  onUploadImage?: (file: File) => Promise<string>;
}

const PILL = 999;

export function ThemeCustomizer({ value, onChange, onUploadImage }: ThemeCustomizerProps) {
  const t = resolveTheme(value);
  const set = (patch: Partial<Theme>) => onChange({ ...t, ...patch });
  const setButton = (patch: Partial<Theme["button"]>) => set({ button: { ...t.button, ...patch } });

  return (
    <div className={`${themeFontVariables} flex flex-col gap-6`}>
      <Section
        title="Background"
        action={
          hasOverrides(t) ? (
            <button
              type="button"
              onClick={() => onChange(themeFromPreset(t.preset))}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-black/5 hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset to {getPreset(t.preset).name}
            </button>
          ) : null
        }
      >
        <BackgroundEditor bg={t.bg} onChange={(bg) => set({ bg })} onUploadImage={onUploadImage} />
      </Section>

      <Section title="Buttons">
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
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Button colour" value={t.button.color} onChange={(color) => setButton({ color })} />
          <ColorField label="Button text" value={t.button.text_color} onChange={(text_color) => setButton({ text_color })} />
        </div>
      </Section>

      <Section title="Text">
        <FontField value={t.font} onChange={(font) => set({ font })} />
        <ColorField label="Text colour" value={t.text_color} onChange={(text_color) => set({ text_color })} />
      </Section>
    </div>
  );
}

// ---------- pieces ----------

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-semibold text-foreground">{title}</legend>
        {action}
      </div>
      {children}
    </fieldset>
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
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-black/5 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-md px-3 text-sm font-medium transition ${
            o.value === value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
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
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 focus-within:ring-2 focus-within:ring-brand">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={pickerValue}
          onChange={(e) => {
            setDraft(null);
            onChange(e.target.value);
          }}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
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
          className="min-h-10 w-full bg-transparent font-mono text-sm uppercase outline-none"
        />
      </div>
    </div>
  );
}

function RadiusField({ radius, onChange }: { radius: number; onChange: (r: number) => void }) {
  const id = useId();
  const pill = radius >= PILL;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          Corner radius
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <input type="checkbox" checked={pill} onChange={(e) => onChange(e.target.checked ? PILL : 12)} />
          Pill
        </label>
      </div>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={0}
          max={32}
          step={1}
          value={pill ? 32 : radius}
          disabled={pill}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--brand)] disabled:opacity-40"
        />
        <span className="w-12 text-right font-mono text-xs text-muted">{pill ? "pill" : `${radius}px`}</span>
      </div>
    </div>
  );
}

function FontField({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Font" className="grid grid-cols-2 gap-2">
      {FONT_OPTIONS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="radio"
          aria-checked={f.id === value}
          onClick={() => onChange(f.id)}
          className={`flex min-h-12 flex-col items-start justify-center rounded-lg border px-3 text-left transition ${
            f.id === value ? "border-foreground bg-surface" : "border-line bg-surface/60 hover:border-muted"
          }`}
        >
          <span className="text-base leading-tight" style={{ fontFamily: fontStack(f.id) }}>
            {f.label}
          </span>
          <span className="text-[11px] capitalize text-muted">{f.category}</span>
        </button>
      ))}
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
        ]}
        onChange={switchTo}
      />
      {mode === "color" ? (
        <ColorField label="Background colour" value={bg.value} onChange={(value) => onChange({ type: "color", value })} />
      ) : mode === "gradient" ? (
        <GradientEditor value={bg.value} onChange={(value) => onChange({ type: "gradient", value })} />
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
      <div className="h-10 rounded-lg border border-line" style={{ background: toGradientCss(g) }} aria-hidden />
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
            className="w-full accent-[var(--brand)]"
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
}: {
  value: string;
  onChange: (url: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
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
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface text-sm font-medium hover:border-muted disabled:opacity-60"
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
      <label htmlFor={id} className="text-xs font-medium text-muted">
        Or paste an image URL
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
        className="min-h-10 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-brand"
      />
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
