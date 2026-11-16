"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Download, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AudienceNav } from "./AudienceNav";
import { Alert, Button, Card, cx, Spinner } from "@/components/ui";
import { useMedia } from "@/lib/use-media";
import { ContactDetail } from "./ContactDetail";
import { toast } from "@/components/ui/toast";
import { api, downloadCsv } from "@/lib/api";
import { errorMessage } from "@/lib/editor/queries";
import { relativeTime } from "@/lib/time";
import type { AudienceStatus, Contact } from "@/lib/types";

const STATUSES: { value: AudienceStatus; label: string }[] = [
  { value: "all", label: "Everyone" },
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
  const isLg = useMedia("(min-width: 1024px)");
  const [picked, setPicked] = useState<string | null>(null);
  const selected = isLg ? (picked && contacts.some((c) => c.id === picked) ? picked : contacts[0]?.id) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[14px] px-4 pb-10 pt-2 sm:px-7">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[32px] font-semibold leading-none tracking-[-0.045em] sm:text-[36px]">Audience</h1>
        <div className="w-full sm:ml-3 sm:w-auto">
          <AudienceNav />
        </div>
        <span className="hidden flex-1 lg:block" />
        {!noneAtAll && (
          <label className="flex h-[42px] w-full items-center gap-2 rounded-full bg-surface px-4 shadow-[inset_0_0_0_1px_var(--line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--ink)] sm:w-[280px]">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              aria-label="Search contacts"
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none placeholder:font-medium placeholder:text-muted"
            />
          </label>
        )}
        <Button size="sm" variant="secondary" onClick={exportCsv} loading={exporting} disabled={!contacts.length}>
          <Download className="size-3.5" /> Export CSV
        </Button>
      </div>

      {!noneAtAll && (
        <div role="tablist" aria-label="Filter contacts" className="flex flex-wrap gap-2.5">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              role="tab"
              aria-selected={status === s.value}
              onClick={() => setStatus(s.value)}
              className={cx(
                "inline-flex h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors",
                status === s.value ? "bg-foreground text-background" : "bg-sunken hover:bg-line",
              )}
            >
              {s.label}
              {counts && <span className="font-mono text-[12px] font-medium opacity-75">{counts[s.value]}</span>}
            </button>
          ))}
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
        <Card className="px-6 py-16 text-center">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-mint">
            <Users className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-[17px] font-bold">No contacts yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Add an Email sign-up or a Form card. People who leave their email show up here.</p>
          <Link href="/dashboard" className="mt-5 inline-flex h-[38px] items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background">
            Go to the editor
          </Link>
        </Card>
      ) : contacts.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No contacts match{q ? ` “${q}”` : " this filter"}.</p>
      ) : (
        <div className="flex flex-col items-start gap-[14px] lg:flex-row">
          <Card className={cx("w-full min-w-0 overflow-x-auto px-3 py-2.5 transition-opacity lg:flex-[2]", query.isPlaceholderData && "opacity-60")}>
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr className="text-left text-[13px] font-semibold text-muted">
                  <th className="px-3 py-2.5 font-semibold">Contact</th>
                  <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Came from</th>
                  <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">Status</th>
                  <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <ContactRow key={c.id} c={c} selected={selected === c.id} onSelect={isLg ? () => setPicked(c.id) : undefined} />
                ))}
              </tbody>
            </table>
            {query.hasNextPage && (
              <div className="flex justify-center py-3">
                <Button variant="secondary" size="sm" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
                  Load more
                </Button>
              </div>
            )}
          </Card>
          {isLg && selected && (
            <aside aria-label="Contact details" className="sticky top-[84px] w-full min-w-[340px] rounded-[28px] bg-surface p-[22px] shadow-card lg:flex-1">
              <ContactDetail key={selected} id={selected} embedded />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

const TINTS = ["bg-mint", "bg-sky", "bg-butter", "bg-peach", "bg-blush"];
export function ContactAvatar({ c, size = 36 }: { c: Pick<Contact, "name" | "email" | "id">; size?: number }) {
  const src = (c.name || c.email).trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  const ini = (parts.length > 1 && c.name ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
  const tint = TINTS[[...c.id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TINTS.length];
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-bold", tint)} style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {ini}
    </span>
  );
}

export function SubscribedBadge({ subscribed }: { subscribed: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex h-[26px] w-fit items-center rounded-full px-2.5 text-[13px] font-semibold",
        subscribed ? "bg-ok-soft text-ok" : "bg-sunken text-ink-2",
      )}
    >
      {subscribed ? "Subscribed" : "Not subscribed"}
    </span>
  );
}

function ContactRow({ c, selected, onSelect }: { c: Contact; selected: boolean; onSelect?: () => void }) {
  const sources = [...new Set(c.sources.map((s) => s.title || s.type))];
  const cell = cx("border-t border-line px-3 py-3", selected && "border-transparent bg-brand-soft");
  return (
    <tr className={cx("cursor-pointer", !selected && "hover:[&>td]:bg-background")} onClick={onSelect}>
      <td className={cx(cell, selected && "rounded-l-2xl")}>
        <Link
          href={`/dashboard/audience/${c.id}`}
          onClick={(e) => {
            if (onSelect) {
              e.preventDefault();
              onSelect();
            }
          }}
          aria-current={selected ? "true" : undefined}
          className="flex min-w-0 items-center gap-2.5"
        >
          <ContactAvatar c={c} />
          <span className="min-w-0">
            <b className="block truncate">{c.name || c.email}</b>
            {c.name && <span className="block truncate text-[13px] text-muted">{c.email}</span>}
          </span>
        </Link>
      </td>
      <td className={cx(cell, "hidden md:table-cell")}>{sources.join(", ") || "—"}</td>
      <td className={cx(cell, "hidden sm:table-cell")}>
        <SubscribedBadge subscribed={c.subscribed} />
      </td>
      <td className={cx(cell, "hidden text-muted md:table-cell", selected && "rounded-r-2xl")}>{relativeTime(c.last_activity_at)}</td>
    </tr>
  );
}
