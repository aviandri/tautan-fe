"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Alert, Button, Card, cx, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api, downloadCsv } from "@/lib/api";
import { errorMessage } from "@/lib/editor/queries";
import { dateTimeFormat, relativeTime } from "@/lib/time";
import { answerColumns, answerText } from "./answers";
import { formsKey } from "./FormsList";

export function FormResponses({ blockId }: { blockId: string }) {
  const forms = useQuery({ queryKey: formsKey, queryFn: () => api.forms.list().then((r) => r.items) });
  const meta = forms.data?.find((f) => f.block_id === blockId);
  const q = useInfiniteQuery({
    queryKey: ["forms", blockId, "submissions"],
    queryFn: ({ pageParam }) => api.forms.submissions(blockId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const subs = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const cols = useMemo(() => answerColumns(subs), [subs]);
  const [exporting, setExporting] = useState(false);
  const title = meta?.title || (meta?.type === "email_signup" ? "Email signup" : "Form");

  async function exportCsv() {
    setExporting(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "form";
      await downloadCsv(api.forms.csvPath(blockId), `${slug}-responses.csv`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/dashboard/forms" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="size-3.5" /> All forms
      </Link>
      <PageHeader
        title={title}
        description={meta ? `${meta.responses} response${meta.responses === 1 ? "" : "s"}` : undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => q.refetch()} loading={q.isRefetching}>
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
            <Button size="sm" onClick={exportCsv} loading={exporting} disabled={!subs.length}>
              <Download className="size-3.5" /> Export CSV
            </Button>
          </div>
        }
      />

      {q.isLoading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner />
        </div>
      ) : q.error ? (
        <Alert>{errorMessage(q.error)}</Alert>
      ) : subs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center text-sm text-muted">
          No responses yet. Share your page to start collecting them.
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-background/60 text-[12px] uppercase tracking-wide text-muted">
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5 font-semibold">
                    Submitted
                  </th>
                  {cols.map((c) => (
                    <th key={c.field_id} scope="col" className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {subs.map((s) => {
                  const by = new Map(s.answers.map((a) => [a.field_id, a]));
                  return (
                    <tr key={s.id} className="align-top hover:bg-background/40">
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-muted" title={dateTimeFormat.format(new Date(s.created_at))}>
                        {relativeTime(s.created_at)}
                        {s.contact_id && (
                          <Link href={`/dashboard/audience/${s.contact_id}`} className="block text-[12px] font-medium text-brand hover:underline">
                            Contact
                          </Link>
                        )}
                      </td>
                      {cols.map((c) => {
                        const a = by.get(c.field_id);
                        const text = answerText(a);
                        return (
                          <td key={c.field_id} className={cx("max-w-[320px] px-4 py-3", a?.type === "textarea" ? "whitespace-pre-wrap break-words" : "break-words")}>
                            {a?.type === "email" && text ? (
                              <a href={`mailto:${text}`} className="text-brand hover:underline">
                                {text}
                              </a>
                            ) : text ? (
                              text
                            ) : (
                              <span className="text-[#b9b5a6]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {q.hasNextPage && (
        <Button variant="secondary" className="self-center" onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>
          Load older responses
        </Button>
      )}
    </div>
  );
}
