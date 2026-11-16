"use client";

import { Field } from "@/components/ui";
import type { FieldErrors } from "@/lib/editor/block-meta";
import type { BlockDataMap, BlockType, TestimonialData } from "@/lib/types";
import { ImageField, ItemsEditor, TextField, UrlField } from "./fields";
import { SOCIAL_PLATFORMS } from "./social-platforms";

export interface FormProps<K extends BlockType> {
  data: BlockDataMap[K];
  onChange: (d: BlockDataMap[K]) => void;
  errors: FieldErrors;
  /** Focus the first field (new blocks). */
  autoFocus?: boolean;
}

type AnyForm = (p: FormProps<BlockType>) => React.ReactNode;

function LinkForm({ data, onChange, errors, autoFocus }: FormProps<"link">) {
  return (
    <>
      <UrlField value={data.url} onChange={(url) => onChange({ ...data, url })} error={errors.url} autoFocus={autoFocus} />
      <TextField
        label="Title"
        value={data.title}
        onChange={(title) => onChange({ ...data, title })}
        placeholder="What should the button say?"
        maxLength={120}
      />
      <ImageField
        label="Thumbnail (optional)"
        shape="square"
        value={data.thumbnail_url}
        onChange={(thumbnail_url) => onChange({ ...data, thumbnail_url })}
        error={errors.thumbnail_url}
      />
    </>
  );
}

function TextForm({ data, onChange, autoFocus }: FormProps<"text">) {
  return (
    <TextField
      label="Text"
      multiline
      value={data.content}
      onChange={(content) => onChange({ content })}
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

function ImageForm({ data, onChange, errors }: FormProps<"image">) {
  return (
    <>
      <ImageField label="Image" value={data.url} onChange={(url) => onChange({ ...data, url })} error={errors.url} />
      <TextField
        label="Alt text"
        value={data.alt ?? ""}
        onChange={(alt) => onChange({ ...data, alt })}
        placeholder="Describe the image for screen readers"
        maxLength={200}
      />
      <UrlField
        label="Link (optional)"
        value={data.link_url ?? ""}
        onChange={(link_url) => onChange({ ...data, link_url })}
        error={errors.link_url}
      />
    </>
  );
}

function VideoForm({ data, onChange, errors, autoFocus }: FormProps<"video">) {
  return (
    <UrlField
      label="Video link"
      placeholder="https://youtube.com/watch?v=…"
      value={data.url}
      onChange={(url) => onChange({ url })}
      error={errors.url}
      hint="YouTube or Vimeo"
      autoFocus={autoFocus}
    />
  );
}

function MusicForm({ data, onChange, errors, autoFocus }: FormProps<"music">) {
  return (
    <UrlField
      label="Track, album or playlist link"
      placeholder="https://open.spotify.com/track/…"
      value={data.url}
      onChange={(url) => onChange({ url })}
      error={errors.url}
      hint="Spotify or SoundCloud"
      autoFocus={autoFocus}
    />
  );
}

function SocialIconsForm({ data, onChange, errors }: FormProps<"social_icons">) {
  const used = new Set(data.items.map((i) => i.platform));
  return (
    <ItemsEditor
      items={data.items}
      onChange={(items) => onChange({ items })}
      make={() => ({ platform: SOCIAL_PLATFORMS.find((p) => !used.has(p.id))?.id ?? "website", url: "" })}
      addLabel="Add icon"
      max={SOCIAL_PLATFORMS.length}
      render={(it, update, i) => {
        const platform = SOCIAL_PLATFORMS.find((p) => p.id === it.platform);
        return (
          <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
            <Field label="Platform" error={errors[`items.${i}.platform`]}>
              {(p) => (
                <select
                  {...p}
                  value={it.platform}
                  onChange={(e) => update({ platform: e.target.value })}
                  className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                >
                  {SOCIAL_PLATFORMS.map((pl) => (
                    <option key={pl.id} value={pl.id} disabled={pl.id !== it.platform && used.has(pl.id)}>
                      {pl.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <UrlField
              label="Profile link"
              value={it.url}
              onChange={(url) => update({ url })}
              placeholder={platform?.placeholder}
              error={errors[`items.${i}.url`]}
            />
          </div>
        );
      }}
    />
  );
}

function FolderForm({ data, onChange, autoFocus }: FormProps<"folder">) {
  return (
    <TextField
      label="Folder name"
      value={data.title}
      onChange={(title) => onChange({ title })}
      autoFocus={autoFocus}
      maxLength={120}
    />
  );
}

function FaqForm({ data, onChange }: FormProps<"faq">) {
  return (
    <ItemsEditor
      items={data.items}
      onChange={(items) => onChange({ items })}
      make={() => ({ q: "", a: "" })}
      addLabel="Add question"
      render={(it, update) => (
        <div className="flex flex-col gap-2">
          <TextField label="Question" value={it.q} onChange={(q) => update({ q })} maxLength={200} />
          <TextField label="Answer" value={it.a} onChange={(a) => update({ a })} multiline maxLength={1000} />
        </div>
      )}
    />
  );
}

function TestimonialForm({ data, onChange, errors }: FormProps<"testimonial">) {
  return (
    <ItemsEditor<TestimonialData["items"][number]>
      items={data.items}
      onChange={(items) => onChange({ items })}
      make={() => ({ quote: "", author: "" })}
      addLabel="Add quote"
      render={(it, update, i) => (
        <div className="flex flex-col gap-2">
          <TextField label="Quote" value={it.quote} onChange={(quote) => update({ quote })} multiline maxLength={600} />
          <TextField label="Name" value={it.author} onChange={(author) => update({ author })} maxLength={80} />
          <ImageField
            label="Photo (optional)"
            shape="round"
            allowUrl={false}
            value={it.avatar_url}
            onChange={(avatar_url) => update({ avatar_url })}
            error={errors[`items.${i}.avatar_url`]}
          />
        </div>
      )}
    />
  );
}

function ContactFormForm({ data, onChange, autoFocus }: FormProps<"contact_form">) {
  return (
    <>
      <TextField
        label="Heading"
        value={data.title}
        onChange={(title) => onChange({ ...data, title })}
        autoFocus={autoFocus}
        maxLength={120}
      />
      <TextField
        label="Button label"
        value={data.button_label}
        onChange={(button_label) => onChange({ ...data, button_label })}
        maxLength={40}
      />
      <p className="text-[13px] text-muted">Visitors fill in name, email and message. Replies arrive in your Inbox.</p>
    </>
  );
}

const FORMS: { [K in BlockType]: (p: FormProps<K>) => React.ReactNode } = {
  link: LinkForm,
  text: TextForm,
  image: ImageForm,
  video: VideoForm,
  music: MusicForm,
  social_icons: SocialIconsForm,
  folder: FolderForm,
  faq: FaqForm,
  testimonial: TestimonialForm,
  contact_form: ContactFormForm,
};

export function BlockForm<K extends BlockType>({ type, ...props }: FormProps<K> & { type: K }) {
  const Form = FORMS[type] as unknown as AnyForm;
  return <div className="flex flex-col gap-4">{Form(props as unknown as FormProps<BlockType>)}</div>;
}
