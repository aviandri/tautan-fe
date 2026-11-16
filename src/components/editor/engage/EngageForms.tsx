"use client";

/** Editor forms for the P3-C engage cards. Errors are keyed by dotted path (engage-meta.ts). */
import Link from "next/link";
import { Field } from "@/components/ui";
import { newOption } from "@/lib/editor/engage-meta";
import type { BlockDataMap, ShowResults, SubscribeMode } from "@/lib/types";
import { ImageField, ItemsEditor, TextField, UrlField } from "../fields";
import { DateTimeField, FileUploadField, MoreOptions, Segmented, ToggleRow } from "../fields-extra";
import type { FormProps } from "../BlockForm";

const SUBSCRIBE_OPTIONS: { value: SubscribeMode; label: string }[] = [
  { value: "ask", label: "Ask" },
  { value: "everyone", label: "Everyone" },
  { value: "none", label: "No" },
];

function SubscribeField({ value, onChange }: { value: SubscribeMode | undefined; onChange: (v: SubscribeMode) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Segmented<SubscribeMode> label="Add to your mailing list" value={value ?? "ask"} onChange={onChange} options={SUBSCRIBE_OPTIONS} />
      <p className="text-[12px] text-muted">
        {value === "everyone"
          ? "Everyone who enters is subscribed. Say so on the card."
          : value === "none"
            ? "Contacts are saved in Audience but not subscribed."
            : "Visitors get a tick box to opt in."}
      </p>
    </div>
  );
}

function AudienceNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] text-muted">
      {children}{" "}
      <Link href="/dashboard/audience" className="font-medium text-foreground underline-offset-2 hover:underline">
        Audience
      </Link>
      .
    </p>
  );
}

// ---------- poll ----------

export function PollForm({ data, onChange, errors, autoFocus }: FormProps<"poll">) {
  const set = (p: Partial<BlockDataMap["poll"]>) => onChange({ ...data, ...p });
  return (
    <>
      <TextField label="Question" value={data.question} onChange={(question) => set({ question })} autoFocus={autoFocus} maxLength={200} placeholder="Which flavour should we make next?" error={errors.question} />
      <Field label="Answers" error={errors.options}>
        {() => (
          <ItemsEditor
            items={data.options}
            onChange={(options) => set({ options })}
            make={() => newOption(data.options.map((o) => o.id))}
            addLabel="Add answer"
            max={5}
            render={(o, update, i) => (
              <TextField label={`Answer ${i + 1}`} value={o.label} onChange={(label) => update({ label })} maxLength={80} error={errors[`options.${i}.label`] ?? errors[`options.${i}.id`]} />
            )}
          />
        )}
      </Field>
      <Segmented<ShowResults>
        label="Show results"
        value={data.show_results ?? "after_vote"}
        onChange={(show_results) => set({ show_results })}
        options={[
          { value: "after_vote", label: "After voting" },
          { value: "always", label: "Always" },
          { value: "never", label: "Never" },
        ]}
      />
      <DateTimeField label="Voting closes (optional)" value={data.ends_at} onChange={(ends_at) => set({ ends_at })} error={errors.ends_at} clearable />
      {data.results ? <PollResultsView poll={data} /> : <p className="text-[13px] text-muted">One vote per visitor per day. Totals appear here once people vote.</p>}
    </>
  );
}

/** Owner-only totals (editor reads always include data.results). */
function PollResultsView({ poll }: { poll: BlockDataMap["poll"] }) {
  const r = poll.results!;
  return (
    <div className="rounded-xl border border-line bg-background/60 p-3">
      <p className="mb-2 text-[13px] font-medium">
        Results · {r.total} vote{r.total === 1 ? "" : "s"}
        {poll.closed && <span className="ml-1.5 text-muted">· closed</span>}
      </p>
      <ul className="flex flex-col gap-1.5">
        {poll.options.map((o) => {
          const n = r.counts[o.id] ?? 0;
          const pct = r.total ? Math.round((n / r.total) * 100) : 0;
          return (
            <li key={o.id} className="text-[13px]">
              <div className="flex justify-between">
                <span className="truncate">{o.label || "Untitled answer"}</span>
                <span className="tabular-nums text-muted">
                  {n} · {pct}%
                </span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-black/[.06]">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12px] text-muted">One vote per visitor per day.</p>
    </div>
  );
}

// ---------- ask me ----------

export function AskMeForm({ data, onChange, errors, autoFocus }: FormProps<"ask_me">) {
  const set = (p: Partial<BlockDataMap["ask_me"]>) => onChange({ ...data, ...p });
  return (
    <>
      <TextField label="Prompt" value={data.prompt} onChange={(prompt) => set({ prompt })} autoFocus={autoFocus} maxLength={200} placeholder="Ask me anything" error={errors.prompt} />
      <ToggleRow
        label="Show answers on the page"
        hint="Answered questions you pin appear under the box"
        checked={data.public_answers}
        onChange={(public_answers) => set({ public_answers })}
      />
      <MoreOptions title="Wording">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Placeholder" value={data.placeholder ?? ""} onChange={(placeholder) => set({ placeholder })} maxLength={100} placeholder="Type your question…" error={errors.placeholder} />
          <TextField label="Button label" value={data.button_label ?? ""} onChange={(button_label) => set({ button_label })} maxLength={40} placeholder="Send" error={errors.button_label} />
        </div>
      </MoreOptions>
      <p className="text-[13px] text-muted">
        Questions are anonymous. Answer, pin or delete them in{" "}
        <Link href="/dashboard/audience/questions" className="font-medium text-foreground underline-offset-2 hover:underline">
          Questions
        </Link>
        .
      </p>
    </>
  );
}

// ---------- lead magnet ----------

export function LeadMagnetForm({ data, onChange, errors, autoFocus }: FormProps<"lead_magnet">) {
  const set = (p: Partial<BlockDataMap["lead_magnet"]>) => onChange({ ...data, ...p });
  return (
    <>
      <FileUploadField
        label="File"
        value={{ url: data.file_url ?? "" }}
        error={errors.file_url}
        onUploaded={(r) => set({ file_url: r.url, title: data.title && data.title !== "Free guide" ? data.title : (r.file_name ?? "").replace(/\.[a-z0-9]+$/i, "") || data.title })}
      />
      <UrlField label="…or a link to the file" value={data.file_url ?? ""} onChange={(file_url) => set({ file_url })} placeholder="https://drive.google.com/…" hint="Only shown after someone enters their email" />
      <TextField label="Title" value={data.title} onChange={(title) => set({ title })} autoFocus={autoFocus} maxLength={100} error={errors.title} />
      <TextField label="Description" value={data.description ?? ""} onChange={(description) => set({ description })} multiline maxLength={300} error={errors.description} />
      <ImageField label="Cover (optional)" value={data.cover_url} onChange={(cover_url) => set({ cover_url })} error={errors.cover_url} />
      <SubscribeField value={data.subscribe} onChange={(subscribe) => set({ subscribe })} />
      <MoreOptions title="Wording">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Button label" value={data.button_label ?? ""} onChange={(button_label) => set({ button_label })} maxLength={40} placeholder="Send me the guide" error={errors.button_label} />
          <TextField label="Thank-you message" value={data.success_message ?? ""} onChange={(success_message) => set({ success_message })} maxLength={200} placeholder="Here's your download!" error={errors.success_message} />
        </div>
      </MoreOptions>
      <AudienceNote>Emails go to your</AudienceNote>
    </>
  );
}

// ---------- giveaway ----------

export function GiveawayForm({ data, onChange, errors, autoFocus }: FormProps<"giveaway">) {
  const set = (p: Partial<BlockDataMap["giveaway"]>) => onChange({ ...data, ...p });
  return (
    <>
      <TextField label="Title" value={data.title} onChange={(title) => set({ title })} autoFocus={autoFocus} maxLength={100} placeholder="Win our new tote" error={errors.title} />
      <TextField label="Prize" value={data.prize} onChange={(prize) => set({ prize })} maxLength={200} placeholder="1 canvas tote + sticker pack" error={errors.prize} />
      <DateTimeField label="Entries close" value={data.ends_at} onChange={(ends_at) => set({ ends_at: ends_at ?? "" })} error={errors.ends_at} />
      <Field label="Steps to enter (optional)" error={errors.steps}>
        {() => (
          <ItemsEditor
            items={data.steps}
            onChange={(steps) => set({ steps })}
            make={() => ({ label: "", url: "" })}
            addLabel="Add step"
            max={5}
            render={(st, update, i) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <TextField label="Step" value={st.label} onChange={(label) => update({ label })} maxLength={80} placeholder="Follow us on Instagram" error={errors[`steps.${i}.label`]} />
                <UrlField label="Link" value={st.url} onChange={(url) => update({ url })} error={errors[`steps.${i}.url`]} />
              </div>
            )}
          />
        )}
      </Field>
      <UrlField label="Rules (optional)" value={data.rules_url ?? ""} onChange={(rules_url) => set({ rules_url })} error={errors.rules_url} />
      <SubscribeField value={data.subscribe} onChange={(subscribe) => set({ subscribe })} />
      <p className="text-[13px] text-muted">
        One entry per email. When entries close, draw a winner in{" "}
        <Link href="/dashboard/audience/giveaways" className="font-medium text-foreground underline-offset-2 hover:underline">
          Giveaways
        </Link>
        ; the card then shows them as e.g. &ldquo;Budi S.&rdquo;
      </p>
    </>
  );
}
