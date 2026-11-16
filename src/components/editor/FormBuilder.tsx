"use client";

import {
  ArrowDown,
  ArrowUp,
  AtSign,
  Calendar,
  CheckSquare,
  ChevronDown,
  Hash,
  List,
  Phone,
  Plus,
  Trash2,
  Type,
  AlignLeft,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, cx, Field, IconButton, Input, Textarea } from "@/components/ui";
import { Menu, MenuItem } from "@/components/ui/menu";
import { FORM_PRESETS, newFieldId, type FieldErrors } from "@/lib/editor/block-meta";
import type { BlockDataMap, FormField } from "@/lib/types";
import { TextField } from "./fields";
import { MoreOptions, Segmented, ToggleRow } from "./fields-extra";

type FieldType = FormField["type"];
type FormData_ = BlockDataMap["form"];

export const FIELD_TYPE_META: Record<FieldType, { label: string; icon: LucideIcon }> = {
  text: { label: "Short text", icon: Type },
  textarea: { label: "Long text", icon: AlignLeft },
  email: { label: "Email", icon: AtSign },
  phone: { label: "Phone", icon: Phone },
  number: { label: "Number", icon: Hash },
  date: { label: "Date", icon: Calendar },
  select: { label: "Choice", icon: List },
  checkbox: { label: "Checkbox", icon: CheckSquare },
};
const FIELD_TYPES = Object.keys(FIELD_TYPE_META) as FieldType[];
const MAX_FIELDS = 30;

export function FormBuilder({
  data,
  onChange,
  errors,
  autoFocus,
}: {
  data: FormData_;
  onChange: (d: FormData_) => void;
  errors: FieldErrors;
  autoFocus?: boolean;
}) {
  const set = (p: Partial<FormData_>) => onChange({ ...data, ...p });
  const [openField, setOpenField] = useState<number | null>(null);
  const fields = data.fields;
  const ids = fields.map((f) => f.id);

  const setField = (i: number, p: Partial<FormField>) => set({ fields: fields.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  const move = (i: number, d: -1 | 1) => {
    const next = [...fields];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set({ fields: next });
    setOpenField((o) => (o === i ? i + d : o === i + d ? i : o));
  };
  const add = (type: FieldType) => {
    const label = FIELD_TYPE_META[type].label;
    const field: FormField = { id: newFieldId(type, ids), type, label, ...(type === "select" ? { options: ["Option 1", "Option 2"] } : {}) };
    set({ fields: [...fields, field] });
    setOpenField(fields.length);
  };
  const fieldHasError = (i: number) => Object.keys(errors).some((k) => k.startsWith(`fields.${i}.`));

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] text-muted">Start from:</span>
        {Object.entries(FORM_PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            title={p.description}
            onClick={() => {
              onChange({ ...p.data(), schedule: data.schedule } as FormData_);
              setOpenField(null);
            }}
            className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium transition-colors hover:border-brand hover:text-brand"
          >
            {p.label}
          </button>
        ))}
      </div>

      <TextField label="Heading" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={120} error={errors.title} autoFocus={autoFocus} />
      <TextField label="Intro (optional)" value={data.description ?? ""} onChange={(description) => set({ description })} multiline maxLength={500} error={errors.description} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-medium">
            Fields <span className="font-normal text-muted">({fields.length})</span>
          </p>
          {errors.fields && <p className="text-[13px] text-danger">{errors.fields}</p>}
        </div>
        <ol className="flex flex-col gap-2">
          {fields.map((f, i) => {
            const Icon = FIELD_TYPE_META[f.type].icon;
            const open = openField === i;
            return (
              <li key={`${f.id}-${i}`} className={cx("rounded-xl border bg-background/60", fieldHasError(i) ? "border-danger/50" : "border-line")}>
                <div className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
                  <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                  <button type="button" onClick={() => setOpenField(open ? null : i)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
                    <span className="truncate text-sm font-medium">{f.label || "Untitled field"}</span>
                    {f.required && <span className="text-[12px] text-danger" aria-label="required">*</span>}
                    <span className="shrink-0 text-[12px] text-muted">{FIELD_TYPE_META[f.type].label}</span>
                  </button>
                  {i > 0 && (
                    <IconButton label={`Move ${f.label} up`} onClick={() => move(i, -1)}>
                      <ArrowUp className="size-3.5" />
                    </IconButton>
                  )}
                  {i < fields.length - 1 && (
                    <IconButton label={`Move ${f.label} down`} onClick={() => move(i, 1)}>
                      <ArrowDown className="size-3.5" />
                    </IconButton>
                  )}
                  <IconButton
                    label={`Remove ${f.label}`}
                    disabled={fields.length <= 1}
                    onClick={() => {
                      set({ fields: fields.filter((_, j) => j !== i) });
                      setOpenField(null);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                  <IconButton label={open ? "Collapse field" : "Edit field"} onClick={() => setOpenField(open ? null : i)}>
                    <ChevronDown className={cx("size-4 transition-transform", open && "rotate-180")} />
                  </IconButton>
                </div>
                {open && (
                  <FieldEditor field={f} index={i} errors={errors} onChange={(p) => setField(i, p)} />
                )}
              </li>
            );
          })}
        </ol>
        {fields.length < MAX_FIELDS && (
          <div className="mt-2">
            <Menu
              align="left"
              trigger={(p) => (
                <Button type="button" variant="secondary" size="sm" {...p}>
                  <Plus className="size-3.5" /> Add field
                </Button>
              )}
            >
              {(close) =>
                FIELD_TYPES.map((t) => {
                  const Icon = FIELD_TYPE_META[t].icon;
                  return (
                    <MenuItem
                      key={t}
                      onSelect={() => {
                        add(t);
                        close();
                      }}
                    >
                      <Icon className="size-3.5 text-muted" /> {FIELD_TYPE_META[t].label}
                    </MenuItem>
                  );
                })
              }
            </Menu>
          </div>
        )}
      </div>

      <MoreOptions title="After submit and Audience">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Button label" value={data.button_label ?? ""} onChange={(button_label) => set({ button_label })} placeholder="Send" maxLength={40} />
          <TextField label="Thank-you message" value={data.success_message ?? ""} onChange={(success_message) => set({ success_message })} placeholder="Thanks!" maxLength={300} error={errors.success_message} />
        </div>
        <ToggleRow label="Hide field labels" hint="Show placeholders only, for a compact form" checked={!!data.hide_labels} onChange={(hide_labels) => set({ hide_labels })} />
        <ToggleRow
          label="Add people to Audience"
          hint="Creates a contact when an email is given"
          checked={data.create_contacts !== false}
          onChange={(create_contacts) => set({ create_contacts })}
        />
        {data.create_contacts !== false && (
          <Segmented<"none" | "ask" | "everyone">
            label="Subscribe them to updates"
            value={data.subscribe ?? "none"}
            onChange={(subscribe) => set({ subscribe })}
            options={[
              { value: "none", label: "No" },
              { value: "ask", label: "Ask with a checkbox" },
              { value: "everyone", label: "Always" },
            ]}
          />
        )}
        <p className="text-[13px] text-muted">
          Responses appear under{" "}
          <Link href="/dashboard/forms" className="font-medium text-foreground underline-offset-2 hover:underline">
            Forms
          </Link>
          .
        </p>
      </MoreOptions>
    </>
  );
}

function FieldEditor({
  field: f,
  index: i,
  errors,
  onChange,
}: {
  field: FormField;
  index: number;
  errors: FieldErrors;
  onChange: (p: Partial<FormField>) => void;
}) {
  const [optionsText, setOptionsText] = useState((f.options ?? []).join("\n"));
  return (
    <div className="flex flex-col gap-3 border-t border-line px-3 pb-3 pt-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
        <TextField label="Question" value={f.label} onChange={(label) => onChange({ label })} maxLength={200} error={errors[`fields.${i}.label`]} autoFocus />
        <Field label="Type">
          {(p) => (
            <select
              {...p}
              value={f.type}
              onChange={(e) => {
                const type = e.target.value as FieldType;
                const opts = type === "select" ? (f.options?.length ? f.options : ["Option 1", "Option 2"]) : undefined;
                if (opts) setOptionsText(opts.join("\n"));
                onChange({ type, options: opts });
              }}
              className="h-12 w-full rounded-2xl border-0 bg-background px-4 text-[15px] font-medium shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-2)] focus:bg-surface focus:shadow-[inset_0_0_0_2px_var(--foreground)] focus:outline-none"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_META[t].label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      {f.type === "select" && (
        <Field label="Choices" hint="One per line" error={errors[`fields.${i}.options`]}>
          {(p) => (
            <Textarea
              {...p}
              value={optionsText}
              rows={4}
              onChange={(e) => {
                setOptionsText(e.target.value);
                onChange({ options: e.target.value.split("\n") });
              }}
            />
          )}
        </Field>
      )}
      {f.type !== "checkbox" && f.type !== "select" && f.type !== "date" && (
        <TextField label="Placeholder" value={f.placeholder ?? ""} onChange={(placeholder) => onChange({ placeholder })} maxLength={200} error={errors[`fields.${i}.placeholder`]} />
      )}
      <ToggleRow
        label="Required"
        hint={f.type === "checkbox" ? "Visitors must tick it (e.g. accept terms)" : undefined}
        checked={!!f.required}
        onChange={(required) => onChange({ required })}
      />
      <Field label="Field id" hint="Used in CSV exports. Changing it splits old and new answers." error={errors[`fields.${i}.id`]}>
        {(p) => (
          <Input
            {...p}
            value={f.id}
            onChange={(e) => onChange({ id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 40) })}
            className="h-9 font-mono text-[13px]"
          />
        )}
      </Field>
    </div>
  );
}
