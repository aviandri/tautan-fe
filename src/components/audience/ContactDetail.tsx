"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Copy, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { answerText } from "@/components/forms/answers";
import { Alert, Card, cx, IconButton, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/editor/queries";
import { dateTimeFormat, relativeTime } from "@/lib/time";
import { ContactAvatar, SubscribedBadge } from "./Audience";

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** One contact: summary, stats and an activity timeline. `embedded` renders inside the Audience side panel. */
export function ContactDetail({ id, embedded }: { id: string; embedded?: boolean }) {
  const q = useQuery({ queryKey: ["audience", "contact", id], queryFn: () => api.audience.get(id) });

  if (q.isLoading)
    return (
      <div className={cx("grid place-items-center", embedded ? "min-h-[240px]" : "min-h-[50vh]")}>
        <Spinner />
      </div>
    );
  if (q.error || !q.data)
    return (
      <div className={embedded ? "" : "mx-auto max-w-3xl px-4 py-8 sm:px-6"}>
        <Alert>{q.error ? errorMessage(q.error) : "Contact not found."}</Alert>
      </div>
    );

  const { contact: c, activity } = q.data;
  const titleFor = (blockId: string | null) => c.sources.find((s) => s.block_id === blockId)?.title;
  const first = (c.name || c.email).split(/\s+/)[0];

  const body = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ContactAvatar c={c} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[20px] font-bold tracking-[-0.015em]">{c.name || c.email}</h2>
          <div className="flex items-center gap-1 text-sm text-muted">
            <span className="truncate">{c.email}</span>
            <IconButton label="Copy email" className="size-7" onClick={() => navigator.clipboard.writeText(c.email).then(() => toast.success("Email copied"), () => {})}>
              <Copy className="size-3.5" />
            </IconButton>
          </div>
        </div>
        <a
          href={`mailto:${encodeURIComponent(c.email)}`}
          className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 text-[14px] font-semibold text-background transition-transform hover:-translate-y-px active:scale-[.97]"
        >
          <Mail className="size-3.5" aria-hidden /> Email {first.length <= 12 ? first : ""}
        </a>
      </div>
      <SubscribedBadge subscribed={c.subscribed} />
      <dl className="grid grid-cols-2 gap-2">
        {[
          ["First seen", fmtDay(c.first_seen_at)],
          ["Responses", `${c.responses} form${c.responses === 1 ? "" : "s"}`],
          ["Last active", relativeTime(c.last_activity_at)],
          ["Subscribed", c.subscribed_at ? fmtDay(c.subscribed_at) : "No"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-sunken px-3 py-2.5">
            <dt className="text-[13px] font-semibold text-ink-2">{k}</dt>
            <dd className="font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      {c.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.sources.map((s, i) => (
            <span key={`${s.block_id}-${i}`} className="inline-flex h-7 items-center rounded-full bg-sunken px-3 text-[12px] font-semibold">
              {s.title || s.type}
            </span>
          ))}
        </div>
      )}
      <h3 className="text-[13px] font-semibold text-ink-2">Activity</h3>
      {activity.length === 0 ? (
        <p className="text-sm text-muted">No activity recorded.</p>
      ) : (
        <ol className="flex flex-col">
          {activity.map((a, i) => {
            const Icon = a.kind === "form" ? ClipboardList : MessageSquare;
            const tint = a.kind === "form" ? "bg-peach" : "bg-sky";
            const src = titleFor(a.block_id) ?? (a.block_id ? (a.kind === "form" ? "a form" : "the contact form") : "a deleted card");
            const last = i === activity.length - 1;
            return (
              <li key={i} className="relative flex gap-3 pb-[18px]">
                {!last && <span aria-hidden className="absolute bottom-0 left-[15px] top-8 w-0.5 bg-sunken" />}
                <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-full", tint)}>
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {a.kind === "form" ? `Sent ${src}` : `Sent a message via ${src}`}
                  </p>
                  <p className="text-[13px] text-muted" title={dateTimeFormat.format(new Date(a.created_at))}>
                    {relativeTime(a.created_at)}
                  </p>
                  {a.message && <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-background px-3 py-2.5 text-sm">{a.message}</p>}
                  {a.answers && a.answers.length > 0 && (
                    <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-2xl bg-background px-3 py-2.5 text-sm">
                      {a.answers.map((ans) => (
                        <div key={ans.field_id} className="contents">
                          <dt className="text-muted">{ans.label}</dt>
                          <dd className="whitespace-pre-wrap break-words font-semibold">{answerText(ans) || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );

  if (embedded) return body;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-10 pt-2 sm:px-7">
      <Link href="/dashboard/audience" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Audience
      </Link>
      <Card className="p-6">{body}</Card>
    </div>
  );
}
