"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Copy, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { answerText } from "@/components/forms/answers";
import { Alert, Card, IconButton, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/editor/queries";
import { dateTimeFormat, relativeTime } from "@/lib/time";
import { SubscribedBadge } from "./Audience";

export function ContactDetail({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["audience", "contact", id], queryFn: () => api.audience.get(id) });

  if (q.isLoading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  if (q.error || !q.data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Alert>{q.error ? errorMessage(q.error) : "Contact not found."}</Alert>
      </div>
    );

  const { contact: c, activity } = q.data;
  const titleFor = (blockId: string | null) => c.sources.find((s) => s.block_id === blockId)?.title;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/dashboard/audience" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Audience
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-[#9a4a1d]">
            {(c.name || c.email).slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{c.name || c.email}</h1>
              <SubscribedBadge subscribed={c.subscribed} />
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <span className="truncate">{c.email}</span>
              <IconButton
                label="Copy email"
                className="size-7"
                onClick={() => navigator.clipboard.writeText(c.email).then(() => toast.success("Email copied"), () => {})}
              >
                <Copy className="size-3.5" />
              </IconButton>
            </div>
          </div>
          <a
            href={`mailto:${encodeURIComponent(c.email)}`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 text-sm font-medium text-brand-ink hover:bg-[#184a3c]"
          >
            <Mail className="size-3.5" /> Email
          </a>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-[12px] text-muted">First seen</dt>
            <dd className="mt-0.5 font-medium">{dateTimeFormat.format(new Date(c.first_seen_at))}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Last active</dt>
            <dd className="mt-0.5 font-medium">{relativeTime(c.last_activity_at)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Responses</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{c.responses}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Subscribed</dt>
            <dd className="mt-0.5 font-medium">{c.subscribed_at ? dateTimeFormat.format(new Date(c.subscribed_at)) : "No"}</dd>
          </div>
        </dl>
        {c.sources.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {c.sources.map((s, i) => (
              <span key={`${s.block_id}-${i}`} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-muted">
                {s.title || s.type}
              </span>
            ))}
          </div>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted">No activity recorded.</p>
        ) : (
          <ol className="relative flex flex-col gap-4 border-l border-line pl-6">
            {activity.map((a, i) => {
              const Icon = a.kind === "form" ? ClipboardList : MessageSquare;
              const src = titleFor(a.block_id) ?? (a.block_id ? (a.kind === "form" ? "Form" : "Contact form") : "Deleted block");
              return (
                <li key={i} className="relative">
                  <span className="absolute -left-[37px] top-0.5 flex size-6 items-center justify-center rounded-full border border-line bg-surface text-muted">
                    <Icon className="size-3" aria-hidden />
                  </span>
                  <p className="text-sm">
                    <span className="font-medium">{a.kind === "form" ? "Submitted" : "Sent a message via"}</span> {src}
                    <span className="text-muted" title={dateTimeFormat.format(new Date(a.created_at))}>
                      {" "}
                      · {relativeTime(a.created_at)}
                    </span>
                  </p>
                  {a.message && <p className="mt-1.5 whitespace-pre-wrap rounded-xl bg-background px-3.5 py-2.5 text-sm">{a.message}</p>}
                  {a.answers && a.answers.length > 0 && (
                    <dl className="mt-1.5 grid gap-x-4 gap-y-1.5 rounded-xl bg-background px-3.5 py-2.5 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
                      {a.answers.map((ans) => (
                        <div key={ans.field_id} className="contents">
                          <dt className="text-muted">{ans.label}</dt>
                          <dd className="whitespace-pre-wrap break-words">{answerText(ans) || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
