"use client";

/** Editor forms for the P3-B creator cards. Errors are keyed by dotted path (creator-meta.ts). */
import { useEffect, useRef, useState } from "react";
import { Button, cx, Field, Input } from "@/components/ui";
import { ctaTargets } from "@/lib/announcement";
import { assetUrl } from "@/lib/api";
import { COMMUNITY_META, detectCommunity, formatCount, parseCount } from "@/lib/creator/creator";
import { getMeta, type FieldErrors } from "@/lib/editor/block-meta";
import { CREATOR_LIMITS, today } from "@/lib/editor/creator-meta";
import { useEditorData } from "@/lib/editor/queries";
import {
  COMMUNITY_PLATFORMS,
  EVENT_STATUSES,
  LIVE_PLATFORMS,
  MEDIA_KIT_PLATFORMS,
  WEEKDAYS,
  type BlockDataMap,
} from "@/lib/types";
import { ImageField, ItemsEditor, TextField, UrlField } from "../fields";
import { FileUploadField, MoreOptions, Segmented } from "../fields-extra";
import type { FormProps } from "../BlockForm";
import { TzSelect } from "../sell/HoursEditor";
import { ChipsInput, CurrencySelect, MoneyField, MultiImageField, selectCls, ToggleChips } from "../sell/sell-fields";

type MkPlatform = BlockDataMap["media_kit"]["platforms"][number];
type Slice = { label: string; pct: number };
type Pkg = BlockDataMap["rate_card"]["packages"][number];
type Logo = BlockDataMap["brands"]["logos"][number];
type EventDate = NonNullable<BlockDataMap["events"]["dates"]>[number];
type LiveSlot = NonNullable<BlockDataMap["events"]["weekly"]>[number];

const PLATFORM_LABEL: Record<(typeof MEDIA_KIT_PLATFORMS)[number], string> = {
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X", facebook: "Facebook", threads: "Threads",
  twitch: "Twitch", linkedin: "LinkedIn", spotify: "Spotify", podcast: "Podcast", blog: "Blog",
};
const LIVE_LABEL: Record<(typeof LIVE_PLATFORMS)[number], string> = {
  tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", twitch: "Twitch", facebook: "Facebook", shopee: "Shopee Live", other: "Other",
};
const STATUS_LABEL: Record<(typeof EVENT_STATUSES)[number], string> = { sold_out: "Sold out", few_left: "Few left", cancelled: "Cancelled" };
const DAY_SHORT: Record<(typeof WEEKDAYS)[number], string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

// ---------- number inputs ----------

/** Text input that reports a parsed number (NaN when unparseable, so the validator blocks the save). */
function NumberText({
  label,
  value,
  onChange,
  parse,
  format,
  error,
  hint,
  placeholder,
  suffix,
  inputMode = "decimal",
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  parse: (s: string) => number | undefined;
  format: (n: number) => string;
  error?: string;
  hint?: React.ReactNode;
  placeholder?: string;
  suffix?: string;
  inputMode?: "decimal" | "numeric";
}) {
  const [text, setText] = useState(() => (value === undefined || Number.isNaN(value) ? "" : format(value)));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current && value !== undefined && !Number.isNaN(value)) setText(format(value));
    if (!focused.current && value === undefined) setText("");
  }, [value, format]);
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <div className="relative">
          <Input
            {...p}
            inputMode={inputMode}
            value={text}
            placeholder={placeholder}
            className={cx("tabular-nums", suffix && "pr-8")}
            onFocus={() => (focused.current = true)}
            onBlur={() => {
              focused.current = false;
              const n = parse(text);
              if (n !== undefined && !Number.isNaN(n)) setText(format(n));
            }}
            onChange={(e) => {
              setText(e.target.value);
              onChange(parse(e.target.value));
            }}
          />
          {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
        </div>
      )}
    </Field>
  );
}

const parsePct = (s: string) => {
  const t = s.trim().replace("%", "").replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};
const fmtPct = (n: number) => String(+n.toFixed(2));
const fmtCount = (n: number) => n.toLocaleString("en-US");

function CountField(p: Omit<React.ComponentProps<typeof NumberText>, "parse" | "format">) {
  return <NumberText {...p} parse={parseCount} format={fmtCount} hint={p.hint ?? (p.value && p.value >= 1000 && !Number.isNaN(p.value) ? `Shown as ${formatCount(p.value)}` : undefined)} />;
}

// ---------- media kit ----------

function SliceEditor({ label, addLabel, items, onChange, errors, prefix, max, placeholder }: { label: string; addLabel: string; items: Slice[]; onChange: (s: Slice[]) => void; errors: FieldErrors; prefix: string; max: number; placeholder: string }) {
  const sum = items.reduce((n, x) => n + (Number.isFinite(x.pct) ? x.pct : 0), 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">{label}</span>
        {items.length > 0 && <span className={cx("text-[12px] tabular-nums", sum > 100 ? "text-danger" : "text-muted")}>{Math.round(sum)}% of 100%</span>}
      </div>
      {errors[prefix] && <p className="text-[13px] text-danger">{errors[prefix]}</p>}
      <ItemsEditor
        items={items}
        onChange={onChange}
        make={(): Slice => ({ label: "", pct: NaN })}
        addLabel={addLabel}
        max={max}
        render={(it, update, i) => (
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
            <TextField label="Group" value={it.label} onChange={(l) => update({ label: l })} maxLength={40} placeholder={placeholder} error={errors[`${prefix}.${i}.label`]} />
            <NumberText label="Share" value={Number.isNaN(it.pct) ? undefined : it.pct} onChange={(n) => update({ pct: n ?? NaN })} parse={parsePct} format={fmtPct} suffix="%" error={errors[`${prefix}.${i}.pct`]} />
          </div>
        )}
      />
    </div>
  );
}

export function MediaKitForm({ data, onChange, errors, autoFocus }: FormProps<"media_kit">) {
  const set = (p: Partial<BlockDataMap["media_kit"]>) => onChange({ ...data, ...p });
  const aud = data.audience ?? {};
  const setAud = (k: "age" | "gender" | "cities", v: Slice[]) => {
    const next = { ...aud, [k]: v.length ? v : undefined };
    set({ audience: next.age || next.gender || next.cities ? next : undefined });
  };
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder="Media kit" error={errors.title} />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">Platforms</span>
        {errors.platforms && <p className="text-[13px] text-danger">{errors.platforms}</p>}
        <ItemsEditor
          items={data.platforms}
          onChange={(platforms) => set({ platforms })}
          make={(): MkPlatform => ({ platform: MEDIA_KIT_PLATFORMS.find((p) => !data.platforms.some((x) => x.platform === p)) ?? "instagram", handle: "", followers: 0 })}
          addLabel="Add platform"
          max={CREATOR_LIMITS.mkPlatforms}
          render={(it, update, i) => (
            <div className="flex flex-col gap-2">
              <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
                <Field label="Platform" error={errors[`platforms.${i}.platform`]}>
                  {(p) => (
                    <select {...p} value={it.platform} onChange={(e) => update({ platform: e.target.value as MkPlatform["platform"] })} className={selectCls}>
                      {MEDIA_KIT_PLATFORMS.map((m) => (
                        <option key={m} value={m}>
                          {PLATFORM_LABEL[m]}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <TextField label="Handle" value={it.handle} onChange={(handle) => update({ handle })} maxLength={61} placeholder="@yourname" autoFocus={autoFocus && i === 0} error={errors[`platforms.${i}.handle`]} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CountField label="Followers" value={it.followers} onChange={(n) => update({ followers: n ?? 0 })} placeholder="84.2K" inputMode="decimal" error={errors[`platforms.${i}.followers`]} />
                <CountField label="Avg views" value={it.avg_views} onChange={(avg_views) => update({ avg_views })} placeholder="12K" inputMode="decimal" error={errors[`platforms.${i}.avg_views`]} />
                <NumberText label="Engagement" value={it.engagement} onChange={(engagement) => update({ engagement })} parse={parsePct} format={fmtPct} suffix="%" placeholder="6.8" error={errors[`platforms.${i}.engagement`]} />
              </div>
              <UrlField label="Profile link (optional)" value={it.url ?? ""} onChange={(url) => update({ url })} error={errors[`platforms.${i}.url`]} />
            </div>
          )}
        />
      </div>
      <MoreOptions title="Audience (optional)" badge={data.audience ? <span className="size-1.5 rounded-full bg-brand" /> : undefined} defaultOpen={Object.keys(errors).some((k) => k.startsWith("audience"))}>
        <SliceEditor label="Age" addLabel="Add age group" items={aud.age ?? []} onChange={(v) => setAud("age", v)} errors={errors} prefix="audience.age" max={CREATOR_LIMITS.age} placeholder="18–24" />
        <SliceEditor label="Gender" addLabel="Add gender" items={aud.gender ?? []} onChange={(v) => setAud("gender", v)} errors={errors} prefix="audience.gender" max={CREATOR_LIMITS.gender} placeholder="Women" />
        <SliceEditor label="Top cities" addLabel="Add city" items={aud.cities ?? []} onChange={(v) => setAud("cities", v)} errors={errors} prefix="audience.cities" max={CREATOR_LIMITS.cities} placeholder="Jakarta" />
      </MoreOptions>
      <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-end">
        <Field label="Stats updated" error={errors.updated_at}>
          {(p) => <Input {...p} type="date" value={data.updated_at} max={today()} onChange={(e) => set({ updated_at: e.target.value })} />}
        </Field>
        {data.updated_at !== today() && (
          <Button type="button" variant="ghost" size="sm" className="self-end sm:mb-1.5 sm:w-fit" onClick={() => set({ updated_at: today() })}>
            Set to today
          </Button>
        )}
      </div>
      <FileUploadField label="Full media kit PDF (optional)" value={{ url: data.pdf_url ?? "" }} onUploaded={(r) => set({ pdf_url: r.url })} error={errors.pdf_url} />
      {data.pdf_url && (
        <Button type="button" variant="ghost" size="sm" className="-mt-2 w-fit" onClick={() => set({ pdf_url: undefined })}>
          Remove PDF
        </Button>
      )}
    </>
  );
}

// ---------- rate card ----------

export function RateCardForm({ data, onChange, errors, autoFocus }: FormProps<"rate_card">) {
  const set = (p: Partial<BlockDataMap["rate_card"]>) => onChange({ ...data, ...p });
  const editor = useEditorData();
  const forms = editor.data ? ctaTargets(editor.data.blocks) : [];
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder="Work with me" error={errors.title} />
      {errors.packages && <p className="text-[13px] text-danger">{errors.packages}</p>}
      <ItemsEditor
        items={data.packages}
        onChange={(packages) => set({ packages })}
        make={(): Pkg => ({ name: "", deliverables: [] })}
        addLabel="Add package"
        max={CREATOR_LIMITS.packages}
        render={(it, update, i) => (
          <div className="flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
              <TextField label="Package" value={it.name} onChange={(name) => update({ name })} maxLength={80} placeholder="Instagram Reel" autoFocus={autoFocus && i === 0} error={errors[`packages.${i}.name`]} />
              <MoneyField label="From (optional)" value={it.price_from} currency={data.currency} onChange={(price_from) => update({ price_from })} error={errors[`packages.${i}.price_from`]} compact />
            </div>
            <ChipsInput label="What's included" value={it.deliverables} onChange={(deliverables) => update({ deliverables })} placeholder="1 Reel, 3 stories" max={CREATOR_LIMITS.deliverables} maxLength={100} error={errors[`packages.${i}.deliverables`]} />
            <TextField label="Turnaround (optional)" value={it.turnaround ?? ""} onChange={(turnaround) => update({ turnaround })} maxLength={40} placeholder="5 days" error={errors[`packages.${i}.turnaround`]} />
          </div>
        )}
      />
      <TextField label="Note (optional)" multiline value={data.note ?? ""} onChange={(note) => set({ note })} maxLength={300} placeholder="Prices exclude tax. Usage rights for 3 months." error={errors.note} />
      <Field label="Request form (optional)" error={errors.form_block_id} hint={forms.length ? "The button scrolls to this form on your page." : "Add a form or contact form to your page to collect collab requests."}>
        {(p) => (
          <select {...p} value={data.form_block_id ?? ""} onChange={(e) => set({ form_block_id: e.target.value || undefined })} disabled={!forms.length && !data.form_block_id} className={selectCls}>
            <option value="">No button</option>
            {data.form_block_id && !forms.some((b) => b.id === data.form_block_id) && <option value={data.form_block_id}>Deleted form</option>}
            {forms.map((b) => (
              <option key={b.id} value={b.id}>
                {(b.data as { title?: string }).title || getMeta(b.type).label}
              </option>
            ))}
          </select>
        )}
      </Field>
      {data.form_block_id && (
        <TextField label="Button text (optional)" value={data.button_label ?? ""} onChange={(button_label) => set({ button_label })} maxLength={40} placeholder="Request a collab" error={errors.button_label} />
      )}
      <MoreOptions title="Currency">
        <CurrencySelect value={data.currency} onChange={(currency) => set({ currency })} />
      </MoreOptions>
    </>
  );
}

// ---------- brands ----------

export function BrandsForm({ data, onChange, errors }: FormProps<"brands">) {
  const set = (p: Partial<BlockDataMap["brands"]>) => onChange({ ...data, ...p });
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} error={errors.title} />
      {errors.logos && <p className="text-[13px] text-danger">{errors.logos}</p>}
      <ItemsEditor
        items={data.logos}
        onChange={(logos) => set({ logos })}
        make={(): Logo => ({ image_url: "", name: "" })}
        addLabel="Add logo"
        max={CREATOR_LIMITS.logos}
        render={(it, update, i) => (
          <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
            <ImageField label="Logo" shape="square" allowUrl={false} value={it.image_url} onChange={(image_url) => update({ image_url })} error={errors[`logos.${i}.image_url`]} />
            <div className="flex flex-col gap-2">
              <TextField label="Brand" value={it.name} onChange={(name) => update({ name })} maxLength={60} error={errors[`logos.${i}.name`]} />
              <UrlField label="Link (optional)" value={it.url ?? ""} onChange={(url) => update({ url })} error={errors[`logos.${i}.url`]} />
            </div>
          </div>
        )}
      />
    </>
  );
}

// ---------- gallery ----------

export function GalleryForm({ data, onChange, errors }: FormProps<"gallery">) {
  const set = (p: Partial<BlockDataMap["gallery"]>) => onChange({ ...data, ...p });
  const urls = data.images.map((i) => i.url);
  const imgError = errors.images ?? Object.entries(errors).find(([k]) => /^images\.\d+\.url$/.test(k))?.[1];
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} error={errors.title} />
      <MultiImageField
        value={urls}
        max={CREATOR_LIMITS.images}
        error={imgError}
        onChange={(next) => {
          // keep alt text and links by URL across reorder, add and remove
          const pool = [...data.images];
          set({ images: next.map((u) => { const k = pool.findIndex((x) => x.url === u); return k >= 0 ? pool.splice(k, 1)[0] : { url: u }; }) });
        }}
      />
      <Segmented<"grid" | "carousel">
        label="Layout"
        value={data.layout ?? "grid"}
        onChange={(layout) => set({ layout })}
        options={[
          { value: "grid", label: "Grid" },
          { value: "carousel", label: "Carousel" },
        ]}
      />
      {data.images.length > 0 && (
        <MoreOptions title="Alt text and links" defaultOpen={Object.keys(errors).some((k) => /^images\.\d+\.(alt|link_url)$/.test(k))}>
          {data.images.map((im, i) => (
            <div key={`${im.url}-${i}`} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(im.url)} alt="" className="mt-6 size-14 rounded-lg object-cover" />
              <div className="flex flex-col gap-2">
                <TextField label={`Photo ${i + 1} description`} value={im.alt ?? ""} onChange={(alt) => set({ images: data.images.map((x, j) => (j === i ? { ...x, alt } : x)) })} maxLength={200} placeholder="What's in the photo" error={errors[`images.${i}.alt`]} />
                <UrlField label="Opens (optional)" value={im.link_url ?? ""} onChange={(link_url) => set({ images: data.images.map((x, j) => (j === i ? { ...x, link_url } : x)) })} error={errors[`images.${i}.link_url`]} />
              </div>
            </div>
          ))}
        </MoreOptions>
      )}
    </>
  );
}

// ---------- events ----------

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const fmtDur = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`);
function endTime(start: string, mins: number) {
  const [h, m] = start.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  const t = (h * 60 + m + mins) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function EventsForm({ data, onChange, errors, autoFocus }: FormProps<"events">) {
  const set = (p: Partial<BlockDataMap["events"]>) => onChange({ ...data, ...p });
  return (
    <>
      <Segmented<"dates" | "weekly">
        label="Type"
        value={data.mode}
        onChange={(mode) =>
          set({
            mode,
            ...(mode === "weekly" && !data.weekly?.length ? { weekly: [{ days: ["fri"], start: "20:00", duration_min: 60, platform: "tiktok" }] } : {}),
            ...(mode === "dates" && !data.dates?.length ? { dates: [{ date: today() }] } : {}),
          })
        }
        options={[
          { value: "dates", label: "Event dates" },
          { value: "weekly", label: "Weekly live" },
        ]}
      />
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder={data.mode === "weekly" ? "Live schedule" : "Upcoming events"} error={errors.title} />
      {data.mode === "dates" ? (
        <div className="flex flex-col gap-2">
          {errors.dates && <p className="text-[13px] text-danger">{errors.dates}</p>}
          <ItemsEditor
            items={data.dates ?? []}
            onChange={(dates) => set({ dates })}
            make={(): EventDate => ({ date: data.dates?.at(-1)?.date ?? today() })}
            addLabel="Add date"
            max={CREATOR_LIMITS.dates}
            render={(it, update, i) => (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[160px_120px_minmax(0,1fr)]">
                  <Field label="Date" error={errors[`dates.${i}.date`]}>
                    {(p) => <Input {...p} type="date" value={it.date} onChange={(e) => update({ date: e.target.value })} />}
                  </Field>
                  <Field label="Time (optional)" error={errors[`dates.${i}.time`]}>
                    {(p) => <Input {...p} type="time" value={it.time ?? ""} onChange={(e) => update({ time: e.target.value || undefined })} />}
                  </Field>
                  <div className="col-span-2 sm:col-span-1">
                    <TextField label="What" value={it.title ?? ""} onChange={(title) => update({ title })} maxLength={80} placeholder="Zine fair" autoFocus={autoFocus && i === 0} error={errors[`dates.${i}.title`]} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TextField label="City" value={it.city ?? ""} onChange={(city) => update({ city })} maxLength={60} placeholder="Bandung" error={errors[`dates.${i}.city`]} />
                  <TextField label="Venue" value={it.venue ?? ""} onChange={(venue) => update({ venue })} maxLength={100} placeholder="Kopi Toko Djawa" error={errors[`dates.${i}.venue`]} />
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <UrlField label="Tickets link (optional)" value={it.url ?? ""} onChange={(url) => update({ url })} error={errors[`dates.${i}.url`]} />
                  <Field label="Status">
                    {(p) => (
                      <select {...p} value={it.status ?? ""} onChange={(e) => update({ status: (e.target.value || undefined) as EventDate["status"] })} className={selectCls}>
                        <option value="">On sale</option>
                        {EVENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>
              </div>
            )}
          />
          <p className="text-[12px] text-muted">Past dates hide themselves on your page.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {errors.weekly && <p className="text-[13px] text-danger">{errors.weekly}</p>}
          <ItemsEditor
            items={data.weekly ?? []}
            onChange={(weekly) => set({ weekly })}
            make={(): LiveSlot => ({ days: ["sat"], start: "19:00", duration_min: 60 })}
            addLabel="Add live slot"
            max={CREATOR_LIMITS.weekly}
            render={(it, update, i) => (
              <div className="flex flex-col gap-2.5">
                <ToggleChips label="Every" options={WEEKDAYS.map((d) => ({ value: d, label: DAY_SHORT[d] }))} value={it.days} onChange={(days) => update({ days: WEEKDAYS.filter((d) => days.includes(d)) })} />
                {errors[`weekly.${i}.days`] && <p className="-mt-1 text-[13px] text-danger">{errors[`weekly.${i}.days`]}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Starts" error={errors[`weekly.${i}.start`]} hint={HHMMok(it.start) ? `Ends ${endTime(it.start, it.duration_min)}` : undefined}>
                    {(p) => <Input {...p} type="time" value={it.start} onChange={(e) => update({ start: e.target.value })} />}
                  </Field>
                  <Field label="Length" error={errors[`weekly.${i}.duration_min`]}>
                    {(p) => (
                      <select {...p} value={it.duration_min} onChange={(e) => update({ duration_min: Number(e.target.value) })} className={selectCls}>
                        {[...new Set([...DURATIONS, it.duration_min])].sort((a, b) => a - b).map((m) => (
                          <option key={m} value={m}>
                            {fmtDur(m)}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <Field label="Where">
                    {(p) => (
                      <select {...p} value={it.platform ?? ""} onChange={(e) => update({ platform: (e.target.value || undefined) as LiveSlot["platform"] })} className={selectCls}>
                        <option value="">Not set</option>
                        {LIVE_PLATFORMS.map((s) => (
                          <option key={s} value={s}>
                            {LIVE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <TextField label="What (optional)" value={it.title ?? ""} onChange={(title) => update({ title })} maxLength={80} placeholder="Sunday restock" error={errors[`weekly.${i}.title`]} />
                </div>
                <UrlField label="Live link (optional)" value={it.url ?? ""} onChange={(url) => update({ url })} error={errors[`weekly.${i}.url`]} placeholder="https://www.tiktok.com/@you/live" />
              </div>
            )}
          />
        </div>
      )}
      <TzSelect value={data.tz} onChange={(tz) => set({ tz })} error={errors.tz} hint={data.mode === "weekly" ? "Visitors see “Live now” and your next slot in their own time." : "Dates and times are in this zone."} />
    </>
  );
}

const HHMMok = (s: string) => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s);

// ---------- community ----------

export function CommunityForm({ data, onChange, errors, autoFocus }: FormProps<"community">) {
  const set = (p: Partial<BlockDataMap["community"]>) => onChange({ ...data, ...p });
  const meta = COMMUNITY_META[data.platform];
  return (
    <>
      <Field label="Platform" error={errors.platform}>
        {(p) => (
          <select {...p} value={data.platform} onChange={(e) => set({ platform: e.target.value as typeof data.platform })} className={selectCls}>
            {COMMUNITY_PLATFORMS.map((c) => (
              <option key={c} value={c}>
                {COMMUNITY_META[c].label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <UrlField
        label="Invite link"
        value={data.url}
        autoFocus={autoFocus}
        placeholder={meta.example}
        error={errors.url}
        onChange={(url) => {
          const found = detectCommunity(url);
          set({ url, ...(found && found !== data.platform ? { platform: found } : {}) });
        }}
      />
      <TextField label="Title" value={data.title} onChange={(title) => set({ title })} maxLength={80} placeholder="Sticker club channel" error={errors.title} />
      <TextField label="Members (optional)" value={data.members_note ?? ""} onChange={(members_note) => set({ members_note })} maxLength={60} placeholder="2,140 members · restock alerts first" error={errors.members_note} />
      <TextField label="Button text (optional)" value={data.button_label ?? ""} onChange={(button_label) => set({ button_label })} maxLength={40} placeholder={data.platform === "whatsapp_channel" ? "Follow the channel" : "Join"} error={errors.button_label} />
    </>
  );
}
