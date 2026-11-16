"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import Link from "next/link";
import { Field } from "@/components/ui";
import type { FieldErrors } from "@/lib/editor/block-meta";
import { BOOKING_HOSTS } from "@/lib/editor/block-meta";
import type { BlockDataMap, BlockType, LinkLayout, Schedule, Tab, TestimonialData, TextAlign } from "@/lib/types";
import { ImageField, ItemsEditor, TextField, UrlField } from "./fields";
import {
  DateTimeField,
  FileUploadField,
  IconField,
  LayoutPicker,
  MoreOptions,
  scheduleState,
  ScheduleField,
  Segmented,
  ToggleRow,
} from "./fields-extra";
import { FormBuilder } from "./FormBuilder";
import {
  MarketplaceForm,
  PaymentForm,
  PriceListForm,
  ProductForm,
  ReviewsForm,
  ShopForm,
  StoreInfoForm,
  TipJarForm,
  WhatsAppForm,
} from "./sell/SellForms";
import { SOCIAL_PLATFORMS } from "@/lib/social";

export interface FormContext {
  /** All tabs (link → tab destination). */
  tabs: Tab[];
  /** The tab the block lives in (not offered as a link destination). */
  currentTabId?: string;
}

export interface FormProps<K extends BlockType> {
  data: BlockDataMap[K];
  onChange: (d: BlockDataMap[K]) => void;
  errors: FieldErrors;
  /** Focus the first field (new blocks). */
  autoFocus?: boolean;
  ctx?: FormContext;
}

type AnyForm = (p: FormProps<BlockType>) => React.ReactNode;

const ALIGN_OPTIONS: { value: TextAlign; label: React.ReactNode; title: string }[] = [
  { value: "left", label: <AlignLeft className="size-4" />, title: "Left" },
  { value: "center", label: <AlignCenter className="size-4" />, title: "Center" },
  { value: "right", label: <AlignRight className="size-4" />, title: "Right" },
];

const selectCls =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10";

// ---------- link ----------

type DestKind = "url" | "email" | "file" | "tab";

function LinkForm({ data, onChange, errors, autoFocus, ctx }: FormProps<"link">) {
  const kind: DestKind = data.dest_kind ?? "url";
  const set = (p: Partial<BlockDataMap["link"]>) => onChange({ ...data, ...p });
  const targetTabs = (ctx?.tabs ?? []).filter((t) => t.id !== ctx?.currentTabId);
  const setKind = (k: DestKind) => {
    // Clear a destination that doesn't fit the new kind.
    const url = k === "email" ? data.url.replace(/^mailto:/, "") : k === "tab" ? "" : data.url.startsWith("mailto:") ? "" : data.url;
    set({ dest_kind: k, url, tab_id: k === "tab" ? (data.tab_id ?? targetTabs[0]?.id) : undefined });
  };
  const layout: LinkLayout = data.layout ?? "button";
  const extras = [data.description, data.label, data.icon, data.layout && data.layout !== "button", data.text_align].filter(Boolean).length;

  return (
    <>
      <Segmented<DestKind>
        label="Opens"
        value={kind}
        onChange={setKind}
        options={[
          { value: "url", label: "Website" },
          { value: "email", label: "Email" },
          { value: "file", label: "File" },
          ...(targetTabs.length > 0 || kind === "tab" ? [{ value: "tab" as const, label: "Tab" }] : []),
        ]}
      />
      {kind === "url" && <UrlField value={data.url} onChange={(url) => set({ url })} error={errors.url} autoFocus={autoFocus} />}
      {kind === "email" && (
        <Field label="Email address" error={errors.url}>
          {(p) => (
            <input
              {...p}
              type="email"
              autoFocus={autoFocus}
              value={data.url.replace(/^mailto:/, "")}
              onChange={(e) => set({ url: e.target.value.trim() })}
              placeholder="you@example.com"
              className={selectCls + " px-3.5"}
            />
          )}
        </Field>
      )}
      {kind === "file" && (
        <FileUploadField
          label="File"
          value={{ url: data.url }}
          error={errors.url}
          onUploaded={(r) => set({ url: r.url, title: data.title || r.file_name || "" })}
        />
      )}
      {kind === "tab" && (
        <Field label="Tab" error={errors.tab_id}>
          {(p) => (
            <select {...p} value={data.tab_id ?? ""} onChange={(e) => set({ tab_id: e.target.value })} className={selectCls}>
              {targetTabs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      <TextField
        label="Title"
        value={data.title}
        onChange={(title) => set({ title })}
        placeholder="What should the button say?"
        maxLength={120}
        autoFocus={autoFocus && kind === "file"}
      />

      <MoreOptions title="Style and details" badge={extras ? <span className="rounded-full bg-black/[.06] px-1.5 text-[11px] text-muted">{extras}</span> : null}>
        <LayoutPicker value={layout} onChange={(v) => set({ layout: v })} />
        <TextField
          label="Description"
          value={data.description ?? ""}
          onChange={(description) => set({ description })}
          placeholder="A short line under the title"
          maxLength={300}
          error={errors.description}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Label"
            value={data.label ?? ""}
            onChange={(label) => set({ label })}
            placeholder="New, Sale, Live…"
            maxLength={24}
            error={errors.label}
          />
          <Segmented<TextAlign> label="Text align" value={data.text_align ?? "center"} onChange={(text_align) => set({ text_align })} options={ALIGN_OPTIONS} />
        </div>
        <IconField value={data.icon} onChange={(icon) => set({ icon })} error={errors.icon} />
        <ImageField
          label={layout === "image_background" ? "Background image" : "Thumbnail"}
          shape={layout === "button" || layout === "thumbnail" ? "square" : "wide"}
          value={data.thumbnail_url}
          onChange={(thumbnail_url) => set({ thumbnail_url })}
          error={errors.thumbnail_url}
        />
      </MoreOptions>
    </>
  );
}

// ---------- simple content ----------

function HeadingForm({ data, onChange, errors, autoFocus }: FormProps<"heading">) {
  return (
    <>
      <TextField label="Heading" value={data.title} onChange={(title) => onChange({ ...data, title })} autoFocus={autoFocus} maxLength={120} error={errors.title} />
      <Segmented<TextAlign> label="Align" value={data.text_align ?? "center"} onChange={(text_align) => onChange({ ...data, text_align })} options={ALIGN_OPTIONS} />
    </>
  );
}

function TextForm({ data, onChange, autoFocus }: FormProps<"text">) {
  return (
    <TextField
      label="Text"
      multiline
      value={data.content}
      onChange={(content) => onChange({ ...data, content })}
      autoFocus={autoFocus}
      maxLength={2000}
      hint={
        <>
          Supports <code className="font-mono">**bold**</code>, <code className="font-mono">*italic*</code>,{" "}
          <code className="font-mono"># heading</code> and <code className="font-mono">[links](https://…)</code>
        </>
      }
    />
  );
}

function DividerForm({ data, onChange }: FormProps<"divider">) {
  type S = NonNullable<BlockDataMap["divider"]["style"]>;
  const styles: S[] = ["solid", "dashed", "dotted", "double", "none"];
  return (
    <Segmented<S>
      label="Style"
      value={data.style ?? "solid"}
      onChange={(style) => onChange({ ...data, style })}
      options={styles.map((s) => ({
        value: s,
        label:
          s === "none" ? (
            "Space"
          ) : (
            <span className="block w-8" style={{ borderTop: `${s === "double" ? 3 : 2}px ${s} currentColor` }} aria-label={s} />
          ),
        title: s,
      }))}
    />
  );
}

function ImageForm({ data, onChange, errors }: FormProps<"image">) {
  return (
    <>
      <ImageField label="Image" value={data.url} onChange={(url) => onChange({ ...data, url })} error={errors.url} />
      <TextField label="Alt text" value={data.alt ?? ""} onChange={(alt) => onChange({ ...data, alt })} placeholder="Describe the image for screen readers" maxLength={200} />
      <UrlField label="Link (optional)" value={data.link_url ?? ""} onChange={(link_url) => onChange({ ...data, link_url })} error={errors.link_url} />
      <ToggleRow label="Full width" hint="Run the image edge to edge" checked={!!data.full_bleed} onChange={(full_bleed) => onChange({ ...data, full_bleed })} />
      <ToggleRow label="Open larger on tap" hint="Shows the image in a lightbox" checked={!!data.lightbox} onChange={(lightbox) => onChange({ ...data, lightbox })} />
    </>
  );
}

function VideoForm({ data, onChange, errors, autoFocus }: FormProps<"video">) {
  return (
    <UrlField label="Video link" placeholder="https://youtube.com/watch?v=…" value={data.url} onChange={(url) => onChange({ ...data, url })} error={errors.url} hint="YouTube or Vimeo" autoFocus={autoFocus} />
  );
}

function MusicForm({ data, onChange, errors, autoFocus }: FormProps<"music">) {
  return (
    <UrlField label="Track, album or playlist link" placeholder="https://open.spotify.com/track/…" value={data.url} onChange={(url) => onChange({ ...data, url })} error={errors.url} hint="Spotify or SoundCloud" autoFocus={autoFocus} />
  );
}

function SocialIconsForm({ data, onChange, errors }: FormProps<"social_icons">) {
  const used = new Set(data.items.map((i) => i.platform));
  return (
    <ItemsEditor
      items={data.items}
      onChange={(items) => onChange({ ...data, items })}
      make={() => ({ platform: SOCIAL_PLATFORMS.find((p) => !used.has(p.id))?.id ?? "website", url: "" })}
      addLabel="Add icon"
      max={SOCIAL_PLATFORMS.length}
      render={(it, update, i) => {
        const platform = SOCIAL_PLATFORMS.find((p) => p.id === it.platform);
        return (
          <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
            <Field label="Platform" error={errors[`items.${i}.platform`]}>
              {(p) => (
                <select {...p} value={it.platform} onChange={(e) => update({ platform: e.target.value })} className={selectCls}>
                  {SOCIAL_PLATFORMS.map((pl) => (
                    <option key={pl.id} value={pl.id} disabled={pl.id !== it.platform && used.has(pl.id)}>
                      {pl.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <UrlField label="Profile link" value={it.url} onChange={(url) => update({ url })} placeholder={platform?.placeholder} error={errors[`items.${i}.url`]} />
          </div>
        );
      }}
    />
  );
}

function FolderForm({ data, onChange, autoFocus }: FormProps<"folder">) {
  type S = NonNullable<BlockDataMap["folder"]["style"]>;
  return (
    <>
      <TextField label="Folder name" value={data.title} onChange={(title) => onChange({ ...data, title })} autoFocus={autoFocus} maxLength={120} />
      <Segmented<S>
        label="Show links"
        value={data.style ?? "collapsible"}
        onChange={(style) => onChange({ ...data, style })}
        options={[
          { value: "collapsible", label: "Behind a button" },
          { value: "inline", label: "Always open" },
        ]}
      />
    </>
  );
}

function FileForm({ data, onChange, errors, autoFocus }: FormProps<"file">) {
  return (
    <>
      <FileUploadField
        label="File"
        value={data}
        error={errors.url}
        onUploaded={(r) => onChange({ ...data, ...r, title: data.title || (r.file_name ?? "").replace(/\.[a-z0-9]+$/i, "") })}
      />
      <TextField label="Title" value={data.title} onChange={(title) => onChange({ ...data, title })} placeholder="Free guide (PDF)" maxLength={120} error={errors.title} autoFocus={autoFocus} />
    </>
  );
}

function DiscountCodeForm({ data, onChange, errors, autoFocus }: FormProps<"discount_code">) {
  const set = (p: Partial<BlockDataMap["discount_code"]>) => onChange({ ...data, ...p });
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Code" value={data.code} onChange={(code) => set({ code: code.toUpperCase().replace(/\s/g, "") })} placeholder="Leave empty if none is needed" maxLength={40} error={errors.code} autoFocus={autoFocus} />
        <TextField label="Discount" value={data.discount ?? ""} onChange={(discount) => set({ discount })} placeholder="20% off" maxLength={24} error={errors.discount} />
      </div>
      <TextField label="Brand" value={data.brand ?? ""} onChange={(brand) => set({ brand })} placeholder="Who is it for?" maxLength={60} />
      <TextField label="Description" value={data.description ?? ""} onChange={(description) => set({ description })} multiline maxLength={300} error={errors.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <UrlField label="Shop link (optional)" value={data.url ?? ""} onChange={(url) => set({ url })} error={errors.url} />
        <TextField label="Button label" value={data.button_label ?? ""} onChange={(button_label) => set({ button_label })} placeholder="Copy code" maxLength={40} />
      </div>
      <p className="text-[13px] text-muted">Each copy counts as a click in Analytics.</p>
    </>
  );
}

function CountdownForm({ data, onChange, errors }: FormProps<"countdown">) {
  const set = (p: Partial<BlockDataMap["countdown"]>) => onChange({ ...data, ...p });
  return (
    <>
      <DateTimeField label="Counts down to" value={data.ends_at} onChange={(ends_at) => set({ ends_at: ends_at ?? "" })} error={errors.ends_at} />
      <TextField label="Label" value={data.label ?? ""} onChange={(label) => set({ label })} placeholder="Launching in" maxLength={120} error={errors.label} />
      <TextField label="Description" value={data.description ?? ""} onChange={(description) => set({ description })} multiline maxLength={300} />
      <TextField label="When it ends, show" value={data.ended_message ?? ""} onChange={(ended_message) => set({ ended_message })} placeholder="We're live!" maxLength={120} />
      <ToggleRow label="Hide when it ends" checked={!!data.hide_after_end} onChange={(hide_after_end) => set({ hide_after_end })} />
    </>
  );
}

function BookingForm({ data, onChange, errors, autoFocus }: FormProps<"booking">) {
  return (
    <UrlField
      label="Booking page link"
      placeholder="https://calendly.com/yourname/30min"
      value={data.url}
      onChange={(url) => onChange({ ...data, url })}
      error={errors.url}
      hint={`Works with ${BOOKING_HOSTS.join(", ")}`}
      autoFocus={autoFocus}
    />
  );
}

function QuoteForm({ data, onChange, errors, autoFocus }: FormProps<"quote">) {
  const set = (p: Partial<BlockDataMap["quote"]>) => onChange({ ...data, ...p });
  return (
    <>
      <TextField label="Quote" value={data.quote} onChange={(quote) => set({ quote })} multiline maxLength={1000} error={errors.quote} autoFocus={autoFocus} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" value={data.name ?? ""} onChange={(name) => set({ name })} maxLength={80} />
        <TextField label="Role" value={data.role ?? ""} onChange={(role) => set({ role })} placeholder="Founder, Studio Lima" maxLength={80} />
      </div>
      <TextField label="Heading (optional)" value={data.heading ?? ""} onChange={(heading) => set({ heading })} maxLength={120} />
    </>
  );
}

function SectionHeading({
  heading,
  description,
  onChange,
}: {
  heading?: string;
  description?: string;
  onChange: (p: { heading?: string; description?: string }) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Heading (optional)" value={heading ?? ""} onChange={(h) => onChange({ heading: h })} maxLength={120} />
      <TextField label="Intro (optional)" value={description ?? ""} onChange={(d) => onChange({ description: d })} maxLength={300} />
    </div>
  );
}

function FaqForm({ data, onChange }: FormProps<"faq">) {
  return (
    <>
      <SectionHeading heading={data.heading} description={data.description} onChange={(p) => onChange({ ...data, ...p })} />
      <ItemsEditor
        items={data.items}
        onChange={(items) => onChange({ ...data, items })}
        make={() => ({ q: "", a: "" })}
        addLabel="Add question"
        render={(it, update) => (
          <div className="flex flex-col gap-2">
            <TextField label="Question" value={it.q} onChange={(q) => update({ q })} maxLength={200} />
            <TextField label="Answer" value={it.a} onChange={(a) => update({ a })} multiline maxLength={1000} />
          </div>
        )}
      />
    </>
  );
}

function TestimonialForm({ data, onChange, errors }: FormProps<"testimonial">) {
  return (
    <>
      <SectionHeading heading={data.heading} description={data.description} onChange={(p) => onChange({ ...data, ...p })} />
      <ItemsEditor<TestimonialData["items"][number]>
        items={data.items}
        onChange={(items) => onChange({ ...data, items })}
        make={() => ({ quote: "", author: "" })}
        addLabel="Add quote"
        render={(it, update, i) => (
          <div className="flex flex-col gap-2">
            <TextField label="Quote" value={it.quote} onChange={(quote) => update({ quote })} multiline maxLength={600} />
            <div className="grid gap-2 sm:grid-cols-2">
              <TextField label="Name" value={it.author} onChange={(author) => update({ author })} maxLength={80} />
              <TextField label="Role" value={it.role ?? ""} onChange={(role) => update({ role })} maxLength={80} />
            </div>
            <UrlField label="Link (optional)" value={it.url ?? ""} onChange={(url) => update({ url })} error={errors[`items.${i}.url`]} />
            <ImageField label="Photo (optional)" shape="round" allowUrl={false} value={it.avatar_url} onChange={(avatar_url) => update({ avatar_url })} error={errors[`items.${i}.avatar_url`]} />
          </div>
        )}
      />
    </>
  );
}

function EmailSignupForm({ data, onChange, autoFocus }: FormProps<"email_signup">) {
  const set = (p: Partial<BlockDataMap["email_signup"]>) => onChange({ ...data, ...p });
  return (
    <>
      <TextField label="Heading" value={data.title ?? ""} onChange={(title) => set({ title })} autoFocus={autoFocus} maxLength={120} />
      <TextField label="Description" value={data.description ?? ""} onChange={(description) => set({ description })} multiline maxLength={300} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Placeholder" value={data.placeholder ?? ""} onChange={(placeholder) => set({ placeholder })} maxLength={60} />
        <TextField label="Button label" value={data.button_label ?? ""} onChange={(button_label) => set({ button_label })} maxLength={40} />
      </div>
      <TextField label="Thank-you message" value={data.success_message ?? ""} onChange={(success_message) => set({ success_message })} placeholder="Thanks! You're on the list." maxLength={300} />
      <p className="text-[13px] text-muted">
        Sign-ups appear in your <Link href="/dashboard/audience" className="font-medium text-foreground underline-offset-2 hover:underline">Audience</Link>.
      </p>
    </>
  );
}

function ContactFormForm({ data, onChange, autoFocus }: FormProps<"contact_form">) {
  return (
    <>
      <TextField label="Heading" value={data.title} onChange={(title) => onChange({ ...data, title })} autoFocus={autoFocus} maxLength={120} />
      <TextField label="Button label" value={data.button_label} onChange={(button_label) => onChange({ ...data, button_label })} maxLength={40} />
      <p className="text-[13px] text-muted">Visitors fill in name, email and message. Replies arrive in your Inbox.</p>
    </>
  );
}

function FormForm({ data, onChange, errors, autoFocus }: FormProps<"form">) {
  return <FormBuilder data={data} onChange={onChange} errors={errors} autoFocus={autoFocus} />;
}

const FORMS: { [K in BlockType]: (p: FormProps<K>) => React.ReactNode } = {
  link: LinkForm,
  heading: HeadingForm,
  text: TextForm,
  image: ImageForm,
  video: VideoForm,
  music: MusicForm,
  social_icons: SocialIconsForm,
  folder: FolderForm,
  file: FileForm,
  discount_code: DiscountCodeForm,
  countdown: CountdownForm,
  booking: BookingForm,
  quote: QuoteForm,
  faq: FaqForm,
  testimonial: TestimonialForm,
  email_signup: EmailSignupForm,
  contact_form: ContactFormForm,
  divider: DividerForm,
  form: FormForm,
  product: ProductForm,
  shop: ShopForm,
  marketplace: MarketplaceForm,
  whatsapp: WhatsAppForm,
  price_list: PriceListForm,
  store_info: StoreInfoForm,
  payment: PaymentForm,
  tip_jar: TipJarForm,
  reviews: ReviewsForm,
};

export function BlockForm<K extends BlockType>({ type, ...props }: FormProps<K> & { type: K }) {
  const Form = FORMS[type] as unknown as AnyForm;
  const data = props.data as { schedule?: Schedule };
  const state = scheduleState(data.schedule);
  return (
    <div className="flex flex-col gap-4">
      {Form(props as unknown as FormProps<BlockType>)}
      <MoreOptions
        title="Schedule"
        defaultOpen={!!props.errors.schedule}
        badge={
          state ? (
            <span className="rounded-full bg-accent/15 px-2 text-[11px] font-medium text-[#9a4a1d]">
              {state === "scheduled" ? "Scheduled" : state === "ended" ? "Ended" : "Live now"}
            </span>
          ) : null
        }
      >
        <ScheduleField
          value={data.schedule}
          onChange={(schedule) => props.onChange({ ...(props.data as object), schedule } as BlockDataMap[K])}
          error={props.errors.schedule}
        />
      </MoreOptions>
    </div>
  );
}
