"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, Copy, Inbox as InboxIcon, Mail, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Alert, Button, Card, cx, IconButton, Input, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage, useEditorData } from "@/lib/editor/queries";
import { qk } from "@/lib/session";
import { dateTimeFormat, relativeTime } from "@/lib/time";
import type { ContactSubmission } from "@/lib/types";

const dtf = dateTimeFormat;

export function Inbox() {
  const q = useInfiniteQuery({
    queryKey: qk.submissions,
    queryFn: ({ pageParam }) => api.contactSubmissions.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const editor = useEditorData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const formTitles = useMemo(() => {
    const m = new Map<string, string>();
    editor.data?.blocks.forEach((b) => b.type === "contact_form" && m.set(b.id, b.data.title || "Contact form"));
    return m;
  }, [editor.data]);
  const hasForm = formTitles.size > 0;

  const all = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const needle = search.trim().toLowerCase();
  const items = needle
    ? all.filter((s) => `${s.name} ${s.email} ${s.message}`.toLowerCase().includes(needle))
    : all;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Inbox"
        description="Messages sent through the contact forms on your page."
        actions={
          <Button variant="secondary" size="sm" onClick={() => q.refetch()} loading={q.isRefetching}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        }
      />

      {all.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search loaded messages by name, email or text"
            aria-label="Search messages"
            className="pl-10"
          />
        </div>
      )}

      {q.isLoading ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner />
        </div>
      ) : q.error ? (
        <div>
          <Alert>{errorMessage(q.error)}</Alert>
          <Button variant="secondary" className="mt-3" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      ) : all.length === 0 ? (
        <EmptyState hasForm={hasForm} />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {items.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No loaded messages match “{search}”.</p>}
          {items.map((s) => (
            <Row
              key={s.id}
              s={s}
              form={s.block_id ? (formTitles.get(s.block_id) ?? "Contact form") : "Deleted form"}
              open={open === s.id}
              onToggle={() => setOpen((o) => (o === s.id ? null : s.id))}
            />
          ))}
        </Card>
      )}

      {q.hasNextPage && (
        <Button variant="secondary" className="self-center" onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>
          Load older messages
        </Button>
      )}
      {all.length > 0 && !q.hasNextPage && (
        <p className="text-center text-[13px] text-muted">
          {all.length} message{all.length === 1 ? "" : "s"}, that&apos;s all of them
        </p>
      )}
    </div>
  );
}

function Row({ s, form, open, onToggle }: { s: ContactSubmission; form: string; open: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false);
  const initial = (s.name || s.email).trim().slice(0, 1).toUpperCase();
  const replyHref = `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent(`Re: ${form}`)}`;

  return (
    <article className={cx("transition-colors", open ? "bg-background/60" : "hover:bg-background/40")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3.5 px-5 py-4 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-warn">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[15px] font-medium">{s.name || "No name"}</span>
            <time dateTime={s.created_at} title={dtf.format(new Date(s.created_at))} className="shrink-0 text-[12px] text-muted">
              {relativeTime(s.created_at)}
            </time>
          </span>
          <span className="block truncate text-[13px] text-muted">
            {s.email} · {form}
          </span>
          <span className={cx("mt-1.5 block text-sm leading-relaxed", open ? "whitespace-pre-wrap break-words" : "line-clamp-2 text-foreground/80")}>
            {s.message}
          </span>
        </span>
      </button>
      {open && (
        <div className="flex items-center gap-2 px-5 pb-4 pl-[68px]">
          <a
            href={replyHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-medium text-brand-ink transition-colors hover:bg-brand-hover"
          >
            <Mail className="size-3.5" /> Reply by email
          </a>
          <IconButton
            label={copied ? "Copied" : "Copy email address"}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(s.email);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }}
          >
            {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5" />}
          </IconButton>
        </div>
      )}
    </article>
  );
}

function EmptyState({ hasForm }: { hasForm: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <InboxIcon className="mx-auto size-6 text-muted" aria-hidden />
      <p className="mt-3 text-[15px] font-medium">No messages yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {hasForm
          ? "When someone uses a contact form on your page, their message shows up here."
          : "Add a contact form block to your page so visitors can send you a message."}
      </p>
      {!hasForm && (
        <Link
          href="/dashboard"
          className="mt-5 inline-flex h-9 items-center rounded-xl border border-line bg-surface px-3.5 text-sm font-medium hover:border-line-2"
        >
          Go to the editor
        </Link>
      )}
    </div>
  );
}
