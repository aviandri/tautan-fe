"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Pin, PinOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Alert, Button, Card, cx, IconButton, Spinner, Textarea } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { errorMessage, useEditorData } from "@/lib/editor/queries";
import { relativeTime } from "@/lib/time";
import type { Question } from "@/lib/types";
import { AudienceNav } from "./AudienceNav";

type Status = "unanswered" | "answered" | "all";
const STATUSES: { value: Status; label: string }[] = [
  { value: "unanswered", label: "New" },
  { value: "answered", label: "Answered" },
  { value: "all", label: "All" },
];

const qKey = ["questions"] as const;

/** Owner inbox for "Ask me anything" cards: answer, pin (public Q&A) and delete. */
export function Questions() {
  const [status, setStatus] = useState<Status>("unanswered");
  const [blockId, setBlockId] = useState("");
  const editor = useEditorData();
  const cards = (editor.data?.blocks ?? []).filter((b) => b.type === "ask_me");
  const query = useQuery({ queryKey: [...qKey, status, blockId], queryFn: () => api.questions.list({ status, block_id: blockId || undefined }) });
  const items = query.data?.items ?? [];
  const cardTitle = (id: string) => {
    const b = cards.find((c) => c.id === id);
    return b && b.type === "ask_me" ? b.data.prompt : "Deleted card";
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Audience" description="Anonymous questions from your Ask me anything cards." />
      <AudienceNav />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Filter questions" className="inline-flex w-fit gap-1 rounded-xl bg-black/[.045] p-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              role="tab"
              aria-selected={status === s.value}
              onClick={() => setStatus(s.value)}
              className={cx("inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-medium transition-colors", status === s.value ? "bg-surface shadow-sm" : "text-muted hover:text-foreground")}
            >
              {s.label}
            </button>
          ))}
        </div>
        {cards.length > 1 && (
          <select
            aria-label="Card"
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-[14px] sm:ml-auto sm:w-72"
          >
            <option value="">All cards</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === "ask_me" ? c.data.prompt : c.id}
              </option>
            ))}
          </select>
        )}
      </div>

      {query.isLoading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner />
        </div>
      ) : query.error ? (
        <Alert>{errorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <HelpCircle className="mx-auto size-6 text-muted" aria-hidden />
          <p className="mt-3 text-[15px] font-medium">{status === "unanswered" ? "No new questions" : "Nothing here yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {cards.length ? (
              "Questions visitors send from your Ask me anything card show up here."
            ) : (
              <>
                Add an <b>Ask me anything</b> card on your{" "}
                <Link href="/dashboard" className="font-medium text-foreground underline-offset-2 hover:underline">
                  page
                </Link>{" "}
                to start collecting questions.
              </>
            )}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((q) => (
            <QuestionRow key={q.id} q={q} cardTitle={cards.length > 1 ? cardTitle(q.block_id) : undefined} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestionRow({ q, cardTitle }: { q: Question; cardTitle?: string }) {
  const qc = useQueryClient();
  const [answer, setAnswer] = useState(q.answer);
  const [confirming, setConfirming] = useState(false);
  const done = () => qc.invalidateQueries({ queryKey: qKey });
  const update = useMutation({
    mutationFn: (b: { answer?: string; pinned?: boolean }) => api.questions.update(q.id, b),
    onSuccess: done,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({ mutationFn: () => api.questions.remove(q.id), onSuccess: done, onError: (e) => toast.error(errorMessage(e)) });
  const dirty = answer.trim() !== q.answer;

  return (
    <li>
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap text-[15px] font-medium">{q.question}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {relativeTime(q.created_at)}
              {cardTitle && <> · {cardTitle}</>}
              {q.pinned && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-brand">
                  · <Pin className="size-3" aria-hidden /> Pinned on your page
                </span>
              )}
            </p>
          </div>
          <IconButton
            label={q.pinned ? "Unpin" : q.answered_at ? "Pin to your page" : "Answer before pinning"}
            disabled={!q.answered_at || update.isPending}
            onClick={() => update.mutate({ pinned: !q.pinned })}
          >
            {q.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          </IconButton>
          {confirming ? (
            <span className="flex items-center gap-1">
              <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <IconButton label="Delete question" onClick={() => setConfirming(true)}>
              <Trash2 className="size-4" />
            </IconButton>
          )}
        </div>
        <Textarea aria-label="Your answer" value={answer} maxLength={2000} placeholder="Write an answer…" onChange={(e) => setAnswer(e.target.value)} />
        {(dirty || q.answered_at) && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] text-muted">{q.answered_at ? `Answered ${relativeTime(q.answered_at)}` : "Not answered yet"}</p>
            <Button size="sm" disabled={!dirty} loading={update.isPending} onClick={() => update.mutate({ answer: answer.trim() })}>
              {answer.trim() ? "Save answer" : "Clear answer"}
            </Button>
          </div>
        )}
      </Card>
    </li>
  );
}
