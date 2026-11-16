"use client";

import { Megaphone, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ImageField, TextField } from "@/components/editor/fields";
import { ScheduleField, scheduleState, Segmented } from "@/components/editor/fields-extra";
import { Button, cx, Field, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { ApiError, assetUrl } from "@/lib/api";
import {
  ANN_CTA_MAX,
  ANN_DESC_MAX,
  ANN_TITLE_MAX,
  announcementErrors,
  ctaTargets,
  fromDraft,
  toDraft,
  type AnnouncementDraft,
  type AnnouncementLayout,
  type CtaKind,
} from "@/lib/announcement";
import { getMeta } from "@/lib/editor/block-meta";
import { useEditorData } from "@/lib/editor/queries";
import { useUpdateProfile } from "@/lib/profile";
import type { Block, Profile } from "@/lib/types";
import { Section, useSection } from "./section";

const LAYOUTS: { value: AnnouncementLayout; label: string; hint: string }[] = [
  { value: "banner", label: "Banner", hint: "A strip across the top of your page." },
  { value: "card", label: "Card", hint: "A card above your first block." },
  { value: "popup", label: "Popup", hint: "Opens over your page once per visitor until they close it." },
];

const STATE_LABEL = { live: "Showing now", scheduled: "Scheduled", ended: "Ended" } as const;

function annError(err: unknown) {
  if (err instanceof ApiError && err.code === "invalid_announcement") return err.message.replace(/^\w/, (c) => c.toUpperCase());
  if (err instanceof ApiError) return err.message;
  return "Couldn't save. Check your connection.";
}

function targetLabel(b: Block, tabs: { id: string; title: string }[]) {
  const title = (b.data as { title?: string }).title?.trim() || getMeta(b.type).label;
  const tab = tabs.length > 1 ? tabs.find((t) => t.id === b.tab_id)?.title : undefined;
  return tab ? `${title} · ${tab}` : title;
}

export function AnnouncementSection({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const editor = useEditorData();
  const saved = profile.announcement ?? null;
  const form = useSection(toDraft(saved));
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const targets = editor.data ? ctaTargets(editor.data.blocks) : undefined;
  const tabs = editor.data?.tabs ?? [];
  const d = form.v;
  const errs = announcementErrors(d, targets);
  const open = !!saved || creating;
  const state = saved ? scheduleState(saved.schedule) : null;

  function save() {
    setSaving(true);
    update.mutate(
      { announcement: fromDraft(d) },
      {
        onSuccess: () => {
          setCreating(false);
          toast.success(saved ? "Announcement saved" : "Announcement added");
        },
        onError: (e) => toast.error(annError(e)),
        onSettled: () => setSaving(false),
      },
    );
  }

  function remove() {
    if (!saved) {
      setCreating(false);
      form.reset();
      return;
    }
    const prev = fromDraft(toDraft(saved));
    update.mutate(
      { announcement: null },
      {
        onSuccess: () =>
          toast.success("Announcement removed", {
            label: "Undo",
            onClick: () => update.mutate({ announcement: prev }, { onError: (e) => toast.error(annError(e)) }),
          }),
        onError: (e) => toast.error(annError(e)),
      },
    );
  }

  if (!open) {
    return (
      <Section title="Announcement" description="Put news, a sale or a launch at the top of your page.">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">No announcement right now.</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              form.reset();
              setCreating(true);
            }}
          >
            <Megaphone className="size-4" aria-hidden /> Add announcement
          </Button>
        </div>
      </Section>
    );
  }

  const set = (p: Partial<AnnouncementDraft>) => form.set(p);

  return (
    <Section
      title="Announcement"
      description="Put news, a sale or a launch at the top of your page."
      badge={state ? STATE_LABEL[state] : undefined}
      dirty={form.dirty || creating}
      saving={saving}
      canSave={Object.keys(errs).length === 0}
      onReset={() => {
        form.reset();
        setCreating(false);
      }}
      extraActions={
        <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={update.isPending} className="mr-auto text-danger">
          <Trash2 className="size-3.5" aria-hidden /> {saved ? "Remove" : "Cancel"}
        </Button>
      }
      onSave={save}
    >
      <Segmented
        label="Style"
        value={d.layout}
        options={LAYOUTS.map((l) => ({ value: l.value, label: l.label, title: l.hint }))}
        onChange={(layout) => set({ layout })}
      />
      <p className="-mt-3 text-[12px] text-muted">{LAYOUTS.find((l) => l.value === d.layout)?.hint}</p>

      <TextField
        label="Title"
        value={d.title}
        onChange={(title) => set({ title })}
        placeholder="New collection drops Friday"
        maxLength={ANN_TITLE_MAX}
        error={d.title && errs.title !== "Add a title" ? errs.title : undefined}
        hint={`${[...d.title].length}/${ANN_TITLE_MAX}`}
      />
      <TextField
        label="Description (optional)"
        multiline
        value={d.description}
        onChange={(description) => set({ description })}
        maxLength={ANN_DESC_MAX}
        error={errs.description}
        hint={`${[...d.description].length}/${ANN_DESC_MAX}`}
      />
      {d.layout !== "banner" && (
        <ImageField label="Image (optional)" value={d.image_url} onChange={(image_url) => set({ image_url })} error={errs.image_url} allowUrl={false} />
      )}

      <div className="flex flex-col gap-3">
        <Segmented<CtaKind>
          label="Button"
          value={d.cta_kind}
          size="sm"
          options={[
            { value: "none", label: "None" },
            { value: "link", label: "Open a link" },
            { value: "form", label: "Go to a form" },
          ]}
          onChange={(cta_kind) => set({ cta_kind })}
        />
        {d.cta_kind !== "none" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Button text"
              value={d.cta_label}
              onChange={(cta_label) => set({ cta_label })}
              placeholder={d.cta_kind === "form" ? "Join the waitlist" : "Shop now"}
              maxLength={ANN_CTA_MAX}
              error={d.cta_label ? errs.cta_label : undefined}
            />
            {d.cta_kind === "link" ? (
              <TextField
                label="Link"
                value={d.cta_url}
                onChange={(cta_url) => set({ cta_url: cta_url.trim() })}
                placeholder="https://"
                error={d.cta_url ? errs.cta_url : undefined}
              />
            ) : (
              <Field
                label="Form"
                error={d.form_block_id ? errs.form_block_id : undefined}
                hint={
                  targets && targets.length === 0 ? (
                    <>
                      Add a form, contact form or email signup block on{" "}
                      <Link href="/dashboard" className="font-medium text-brand underline-offset-2 hover:underline">
                        your page
                      </Link>{" "}
                      first.
                    </>
                  ) : (
                    "The button scrolls visitors to this block."
                  )
                }
              >
                {(p) => (
                  <select
                    {...p}
                    value={d.form_block_id}
                    onChange={(e) => set({ form_block_id: e.target.value })}
                    disabled={!targets?.length}
                    className="h-12 w-full rounded-2xl border-0 bg-background px-4 text-[15px] font-medium shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-2)] focus:bg-surface focus:shadow-[inset_0_0_0_2px_var(--ink)] focus:outline-none disabled:opacity-60"
                  >
                    <option value="">{targets ? "Choose a block" : "Loading…"}</option>
                    {d.form_block_id && targets && !targets.some((b) => b.id === d.form_block_id) && (
                      <option value={d.form_block_id}>Deleted block</option>
                    )}
                    {targets?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {targetLabel(b, tabs)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField label="Background" value={d.bg_color} onChange={(bg_color) => set({ bg_color })} error={errs.bg_color} />
        <ColorField label="Text" value={d.text_color} onChange={(text_color) => set({ text_color })} error={errs.text_color} />
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium">When to show it</p>
        <ScheduleField value={d.schedule} onChange={(schedule) => set({ schedule })} error={errs.schedule} noun="announcement" />
      </div>

      <AnnouncementPreview draft={d} profile={profile} />
    </Section>
  );
}

// ---------- colour input ----------

const HEX6 = /^#[0-9a-fA-F]{6}$/;

function ColorField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field label={label} error={error} hint={value ? undefined : "Matches your theme"}>
      {(p) => (
        <div className="flex items-center gap-2">
          <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line" title={`Pick ${label.toLowerCase()} colour`}>
            <span
              className={cx("absolute inset-0", !value && "bg-[repeating-conic-gradient(var(--line)_0_25%,transparent_0_50%)] bg-[length:12px_12px]")}
              style={value && !error ? { background: value } : undefined}
            />
            <input
              type="color"
              aria-label={`${label} colour picker`}
              className="absolute inset-0 cursor-pointer opacity-0"
              value={HEX6.test(value) ? value : "#000000"}
              onChange={(e) => onChange(e.target.value)}
            />
          </label>
          <Input {...p} value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="Theme" spellCheck={false} autoCapitalize="none" />
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} aria-label={`Reset ${label.toLowerCase()} colour`}>
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </Field>
  );
}

// ---------- preview ----------

/** Rough preview in the editor's own chrome; the public renderer (tautan-c6) is the source of truth. */
function AnnouncementPreview({ draft: d, profile }: { draft: AnnouncementDraft; profile: Profile }) {
  const t = profile.theme;
  const bg = d.bg_color && !announcementErrors({ ...d, title: "x" }).bg_color ? d.bg_color : t.button.color;
  const fg = d.text_color && !announcementErrors({ ...d, title: "x" }).text_color ? d.text_color : t.button.text_color;
  const img = d.layout !== "banner" ? assetUrl(d.image_url) : undefined;
  const cta = d.cta_kind !== "none" && d.cta_label.trim();
  const body = (
    <>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className="mb-2 aspect-[2/1] w-full rounded-lg object-cover" />
      )}
      <p className="font-semibold">{d.title.trim() || "Your title"}</p>
      {d.description.trim() && <p className="mt-0.5 opacity-85">{d.description.trim()}</p>}
      {cta && (
        <span className="mt-2 inline-block rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: fg, color: bg }}>
          {cta}
        </span>
      )}
    </>
  );
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">Preview</p>
      <div className="relative overflow-hidden rounded-xl border border-line text-[13px]" style={{ background: t.bg.type === "color" ? t.bg.value : undefined, color: t.text_color }}>
        {d.layout === "banner" && (
          <div className="px-4 py-2.5 text-center" style={{ background: bg, color: fg }}>
            {body}
          </div>
        )}
        <div className={cx("flex flex-col items-center gap-2 px-6 pb-6", d.layout === "banner" ? "pt-5" : "pt-6")}>
          <div className="size-10 rounded-full" style={{ background: t.button.color, opacity: 0.35 }} />
          <div className="h-2.5 w-24 rounded-full bg-current opacity-20" />
          {d.layout === "card" && (
            <div className="mt-2 w-full max-w-xs rounded-xl p-4 text-left" style={{ background: bg, color: fg }}>
              {body}
            </div>
          )}
          <div className="mt-2 h-9 w-full max-w-xs rounded-lg bg-current opacity-10" />
          <div className="h-9 w-full max-w-xs rounded-lg bg-current opacity-10" />
        </div>
        {d.layout === "popup" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-6">
            <div className="relative w-full max-w-xs rounded-2xl p-4 pt-5 shadow-xl" style={{ background: bg, color: fg }}>
              <X className="absolute right-2.5 top-2.5 size-3.5 opacity-70" aria-hidden />
              {body}
            </div>
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[12px] text-muted">A rough sketch: on your page it uses your fonts and button style.</p>
    </div>
  );
}
