"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { ChevronRight, Download, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AudienceNav } from "./AudienceNav";
import { Alert, Button, Card, cx, Input, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api, downloadCsv } from "@/lib/api";
import { errorMessage } from "@/lib/editor/queries";
import { relativeTime } from "@/lib/time";
import type { AudienceStatus, Contact } from "@/lib/types";

const STATUSES: { value: AudienceStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "subscribed", label: "Subscribed" },
  { value: "unsubscribed", label: "Not subscribed" },
];

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function Audience() {
  const [status, setStatus] = useState<AudienceStatus>("all");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const query = useInfiniteQuery({
    queryKey: ["audience", status, q],
    queryFn: ({ pageParam }) => api.audience.list({ status, q: q || undefined, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    placeholderData: keepPreviousData,
  });
  const contacts = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const counts = query.data?.pages[0]?.counts;
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadCsv(api.audience.csvPath({ status, q: q || undefined }), `audience-${status}.csv`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  const noneAtAll = counts && counts.all === 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Audience"
        description="Everyone who left an email through your forms, sign-ups and contact form, merged by email."
        actions={
          <Button size="sm" variant="secondary" onClick={exportCsv} loading={exporting} disabled={!contacts.length}>
            <Download className="size-3.5" /> Export CSV
          </Button>
        }
      />

      <AudienceNav />

      {!noneAtAll && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="tablist" aria-label="Filter contacts" className="inline-flex w-fit gap-1 rounded-xl bg-black/[.045] p-1">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                role="tab"
                aria-selected={status === s.value}
                onClick={() => setStatus(s.value)}
                className={cx(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors",
                  status === s.value ? "bg-surface shadow-sm" : "text-muted hover:text-foreground",
                )}
              >
                {s.label}
                {counts && <span className="tabular-nums text-muted">{counts[s.value]}</span>}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" aria-label="Search contacts" className="h-10 pl-10" />
          </div>
        </div>
      )}

      {query.isLoading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner />
        </div>
      ) : query.error ? (
        <div>
          <Alert>{errorMessage(query.error)}</Alert>
          <Button variant="secondary" className="mt-3" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : noneAtAll ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <Users className="mx-auto size-6 text-muted" aria-hidden />
          <p className="mt-3 text-[15px] font-medium">No contacts yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add an Email signup or a Form block. People who leave their email show up here.
          </p>
          <Link href="/dashboard" className="mt-5 inline-flex h-9 items-center rounded-xl border border-line bg-surface px-3.5 text-sm font-medium hover:border-line-2">
            Go to the editor
          </Link>
        </div>
      ) : contacts.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No contacts match{q ? ` “${q}”` : " this filter"}.</p>
      ) : (
        <Card className={cx("divide-y divide-line overflow-hidden transition-opacity", query.isPlaceholderData && "opacity-60")}>
          {contacts.map((c) => (
            <ContactRow key={c.id} c={c} />
          ))}
        </Card>
      )}

      {query.hasNextPage && (
        <Button variant="secondary" className="self-center" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
          Load more
        </Button>
      )}
    </div>
  );
}

export function SubscribedBadge({ subscribed }: { subscribed: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        subscribed ? "bg-brand/10 text-brand" : "bg-black/[.05] text-muted",
      )}
    >
      {subscribed ? "Subscribed" : "Not subscribed"}
    </span>
  );
}

function ContactRow({ c }: { c: Contact }) {
  const initial = (c.name || c.email).trim().slice(0, 1).toUpperCase();
  const sources = [...new Set(c.sources.map((s) => s.title || s.type))];
  return (
    <Link href={`/dashboard/audience/${c.id}`} className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-background/50">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-warn">{initial}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-medium">{c.name || c.email}</span>
          <SubscribedBadge subscribed={c.subscribed} />
        </span>
        <span className="block truncate text-[13px] text-muted">
          {c.name ? `${c.email} · ` : ""}
          {sources.join(", ") || "No source"}
        </span>
      </span>
      <span className="hidden text-right sm:block">
        <span className="block text-[13px] tabular-nums">
          {c.responses} response{c.responses === 1 ? "" : "s"}
        </span>
        <span className="block text-[12px] text-muted">active {relativeTime(c.last_activity_at)}</span>
      </span>
      <ChevronRight className="size-4 text-muted" aria-hidden />
    </Link>
  );
}
