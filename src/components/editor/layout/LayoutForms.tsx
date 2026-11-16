"use client";

/** Editor forms for the P3-D text and layout cards. Errors are keyed by dotted path (layout-meta.ts). */
import { LocateFixed } from "lucide-react";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { parseCoords } from "@/lib/editor/layout-meta";
import type { BlockDataMap } from "@/lib/types";
import { MARQUEE_SPEEDS } from "@/lib/types";
import { ImageField, ItemsEditor, TextField, UrlField } from "../fields";
import { MoreOptions, Segmented, ToggleRow } from "../fields-extra";
import type { FormProps } from "../BlockForm";

/** Number input that reports NaN for unparseable text, so the validator blocks the save. */
function NumberInput({
  label,
  value,
  onChange,
  error,
  step = "any",
  hint,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  error?: string;
  step?: string;
  hint?: React.ReactNode;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <Input
          {...p}
          inputMode="decimal"
          step={step}
          value={text}
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            onChange(t.trim() === "" ? undefined : Number(t.replace(",", ".")));
          }}
        />
      )}
    </Field>
  );
}

// ---------- spotlight ----------

export function SpotlightForm({ data, onChange, errors, autoFocus }: FormProps<"spotlight">) {
  const set = (p: Partial<BlockDataMap["spotlight"]>) => onChange({ ...data, ...p });
  const btn = data.button ?? { label: "", url: "" };
  return (
    <>
      <ImageField label="Image (optional)" value={data.image_url} onChange={(image_url) => set({ image_url })} error={errors.image_url} />
      <TextField label="Eyebrow (optional)" value={data.eyebrow ?? ""} onChange={(eyebrow) => set({ eyebrow })} maxLength={40} placeholder="New drop" error={errors.eyebrow} />
      <TextField label="Headline" value={data.headline} onChange={(headline) => set({ headline })} autoFocus={autoFocus} maxLength={100} placeholder="The Fall collection is here" error={errors.headline} />
      <TextField label="Text (optional)" value={data.text ?? ""} onChange={(text) => set({ text })} multiline maxLength={300} error={errors.text} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Button label (optional)" value={btn.label} onChange={(label) => set({ button: { ...btn, label } })} maxLength={40} placeholder="Shop now" error={errors["button.label"]} />
        <UrlField label="Button link" value={btn.url} onChange={(url) => set({ button: { ...btn, url } })} error={errors["button.url"]} />
      </div>
      <Segmented<"left" | "center">
        label="Align"
        value={data.align ?? "left"}
        onChange={(align) => set({ align })}
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
        ]}
      />
    </>
  );
}

// ---------- marquee ----------

export function MarqueeForm({ data, onChange, errors, autoFocus }: FormProps<"marquee">) {
  const set = (p: Partial<BlockDataMap["marquee"]>) => onChange({ ...data, ...p });
  type Speed = (typeof MARQUEE_SPEEDS)[number];
  return (
    <>
      <TextField label="Text" value={data.text} onChange={(text) => set({ text })} autoFocus={autoFocus} maxLength={200} placeholder="FREE SHIPPING ALL JAVA" error={errors.text} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented<Speed>
          label="Speed"
          value={data.speed ?? "normal"}
          onChange={(speed) => set({ speed })}
          options={[
            { value: "slow", label: "Slow" },
            { value: "normal", label: "Normal" },
            { value: "fast", label: "Fast" },
          ]}
        />
        <Segmented<"left" | "right">
          label="Direction"
          value={data.direction ?? "left"}
          onChange={(direction) => set({ direction })}
          options={[
            { value: "left", label: "← Left" },
            { value: "right", label: "Right →" },
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented<"ribbon" | "plain">
          label="Style"
          value={data.style ?? "ribbon"}
          onChange={(style) => set({ style })}
          options={[
            { value: "ribbon", label: "Ribbon" },
            { value: "plain", label: "Plain" },
          ]}
        />
        <TextField label="Separator" value={data.separator ?? ""} onChange={(separator) => set({ separator })} maxLength={8} placeholder="•" error={errors.separator} />
      </div>
    </>
  );
}

// ---------- timeline ----------

export function TimelineForm({ data, onChange, errors }: FormProps<"timeline">) {
  const set = (p: Partial<BlockDataMap["timeline"]>) => onChange({ ...data, ...p });
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder="How to order" error={errors.title} />
      <Segmented<"numbered" | "dotted">
        label="Style"
        value={data.style ?? "numbered"}
        onChange={(style) => set({ style })}
        options={[
          { value: "numbered", label: "1 2 3" },
          { value: "dotted", label: "• • •" },
        ]}
      />
      <Field label="Steps" error={errors.items}>
        {() => (
          <ItemsEditor<BlockDataMap["timeline"]["items"][number]>
            items={data.items}
            onChange={(items) => set({ items })}
            make={() => ({ title: "" })}
            addLabel="Add step"
            max={20}
            render={(it, update, i) => (
              <div className="flex flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <TextField label="Title" value={it.title} onChange={(title) => update({ title })} maxLength={100} error={errors[`items.${i}.title`]} />
                  <TextField label="Badge" value={it.badge ?? ""} onChange={(badge) => update({ badge })} maxLength={24} placeholder="Day 1" error={errors[`items.${i}.badge`]} />
                </div>
                <TextField label="Eyebrow" value={it.eyebrow ?? ""} onChange={(eyebrow) => update({ eyebrow })} maxLength={40} error={errors[`items.${i}.eyebrow`]} />
                <TextField label="Description" value={it.description ?? ""} onChange={(description) => update({ description })} multiline maxLength={300} error={errors[`items.${i}.description`]} />
                <ToggleRow
                  label="Highlight this step"
                  checked={!!it.highlight}
                  onChange={(highlight) => set({ items: data.items.map((x, j) => ({ ...x, highlight: j === i ? highlight : highlight ? false : x.highlight })) })}
                />
              </div>
            )}
          />
        )}
      </Field>
    </>
  );
}

// ---------- resume ----------

function MonthField({ label, value, onChange, error }: { label: string; value: string | undefined; onChange: (v: string) => void; error?: string }) {
  return (
    <Field label={label} error={error}>
      {(p) => <Input {...p} type="month" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function ResumeForm({ data, onChange, errors }: FormProps<"resume">) {
  const set = (p: Partial<BlockDataMap["resume"]>) => onChange({ ...data, ...p });
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder="Experience" error={errors.title} />
      <Field label="Jobs" error={errors.items}>
        {() => (
          <ItemsEditor<BlockDataMap["resume"]["items"][number]>
            items={data.items}
            onChange={(items) => set({ items })}
            make={() => ({ role: "", company: "", start: "" })}
            addLabel="Add job"
            max={30}
            render={(it, update, i) => (
              <div className="flex flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <TextField label="Role" value={it.role} onChange={(role) => update({ role })} maxLength={80} error={errors[`items.${i}.role`]} />
                  <TextField label="Company" value={it.company} onChange={(company) => update({ company })} maxLength={80} error={errors[`items.${i}.company`]} />
                </div>
                <UrlField label="Company link (optional)" value={it.company_url ?? ""} onChange={(company_url) => update({ company_url })} error={errors[`items.${i}.company_url`]} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <MonthField label="Start" value={it.start} onChange={(start) => update({ start })} error={errors[`items.${i}.start`]} />
                  {!it.current && <MonthField label="End" value={it.end} onChange={(end) => update({ end })} error={errors[`items.${i}.end`]} />}
                </div>
                <ToggleRow label="I work here now" hint="Shows “Present”" checked={!!it.current} onChange={(current) => update({ current, end: current ? undefined : it.end })} />
                <TextField label="Description" value={it.description ?? ""} onChange={(description) => update({ description })} multiline maxLength={500} error={errors[`items.${i}.description`]} />
              </div>
            )}
          />
        )}
      </Field>
    </>
  );
}

// ---------- before / after ----------

export function BeforeAfterForm({ data, onChange, errors }: FormProps<"before_after">) {
  const set = (p: Partial<BlockDataMap["before_after"]>) => onChange({ ...data, ...p });
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <ImageField label="Before" value={data.before_url} onChange={(before_url) => set({ before_url })} error={errors.before_url} shape="square" />
          <TextField label="Label" value={data.before_label ?? ""} onChange={(before_label) => set({ before_label })} maxLength={20} error={errors.before_label} />
        </div>
        <div className="flex flex-col gap-2">
          <ImageField label="After" value={data.after_url} onChange={(after_url) => set({ after_url })} error={errors.after_url} shape="square" />
          <TextField label="Label" value={data.after_label ?? ""} onChange={(after_label) => set({ after_label })} maxLength={20} error={errors.after_label} />
        </div>
      </div>
      <TextField label="Alt text" value={data.alt ?? ""} onChange={(alt) => set({ alt })} maxLength={200} placeholder="Kitchen before and after the renovation" error={errors.alt} />
      <Field label={`Slider starts at ${Math.round(data.start_pct ?? 50)}%`} error={errors.start_pct}>
        {(p) => (
          <input {...p} type="range" min={0} max={100} value={data.start_pct ?? 50} onChange={(e) => set({ start_pct: Number(e.target.value) })} className="accent-[var(--color-brand,#1f6f4a)]" />
        )}
      </Field>
      <p className="text-[13px] text-muted">Use two photos of the same size and framing for the best result.</p>
    </>
  );
}

// ---------- map ----------

export function MapForm({ data, onChange, errors, autoFocus }: FormProps<"map">) {
  const set = (p: Partial<BlockDataMap["map"]>) => onChange({ ...data, ...p });
  const [paste, setPaste] = useState("");
  const [pasteErr, setPasteErr] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [key, setKey] = useState(0); // remount number inputs after a paste or locate
  const has = !!(data.lat || data.lng);

  const apply = (c: { lat: number; lng: number }) => {
    set({ lat: Math.round(c.lat * 1e5) / 1e5, lng: Math.round(c.lng * 1e5) / 1e5 });
    setKey((k) => k + 1);
  };

  return (
    <>
      <Field label="Paste a map link or coordinates" error={pasteErr ?? undefined} hint="From Google Maps, Apple Maps or OpenStreetMap: share → copy link, or right-click → copy coordinates">
        {(p) => (
          <Input
            {...p}
            autoFocus={autoFocus}
            value={paste}
            placeholder="https://maps.google.com/…  or  -6.9175, 107.6191"
            onChange={(e) => {
              const v = e.target.value;
              setPaste(v);
              if (!v.trim()) return setPasteErr(null);
              const c = parseCoords(v);
              if (c) {
                apply(c);
                setPasteErr(null);
              } else setPasteErr(/goo\.gl|maps\.app/.test(v) ? "Short links can't be read. Open it and copy the long link from the address bar." : "No coordinates found in that link");
            }}
          />
        )}
      </Field>
      <div className="flex items-end gap-3" key={key}>
        <div className="grid flex-1 grid-cols-2 gap-3">
          <NumberInput label="Latitude" value={has ? data.lat : undefined} onChange={(lat) => set({ lat: lat ?? 0 })} error={errors.lat} />
          <NumberInput label="Longitude" value={has ? data.lng : undefined} onChange={(lng) => set({ lng: lng ?? 0 })} error={errors.lng} />
        </div>
        {typeof navigator !== "undefined" && "geolocation" in navigator && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mb-0.5 h-11"
            disabled={locating}
            onClick={() => {
              setLocating(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  apply({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setLocating(false);
                },
                () => {
                  setPasteErr("Couldn't get your location. Paste a map link instead.");
                  setLocating(false);
                },
                { enableHighAccuracy: true, timeout: 10000 },
              );
            }}
          >
            <LocateFixed className="size-4" /> {locating ? "Locating…" : "Use my location"}
          </Button>
        )}
      </div>
      <TextField label="Place name" value={data.label ?? ""} onChange={(label) => set({ label })} maxLength={80} placeholder="Toko Kue Bu Rina" error={errors.label} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Street address" value={data.address ?? ""} onChange={(address) => set({ address })} maxLength={200} placeholder="Jl. Braga No. 10" error={errors.address} />
        <TextField label="Area" value={data.area ?? ""} onChange={(area) => set({ area })} maxLength={100} placeholder="Bandung" error={errors.area} />
      </div>
      <MoreOptions title="Zoom">
        <Field label={`Zoom ${data.zoom ?? 15}`} error={errors.zoom} hint="Lower shows more of the city, higher shows the street">
          {(p) => <input {...p} type="range" min={3} max={19} value={data.zoom ?? 15} onChange={(e) => set({ zoom: Number(e.target.value) })} />}
        </Field>
      </MoreOptions>
      {has && (
        <p className="text-[13px] text-muted">
          Check the spot:{" "}
          <a className="font-medium text-foreground underline-offset-2 hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${data.lat}&mlon=${data.lng}#map=${data.zoom ?? 15}/${data.lat}/${data.lng}`}>
            open in OpenStreetMap
          </a>
          . Visitors see a drawn location card with Directions buttons. No map tiles load on your page.
        </p>
      )}
    </>
  );
}
