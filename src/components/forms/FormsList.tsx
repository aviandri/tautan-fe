"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, EyeOff, MailPlus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Alert, Button, Card, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage, useEditorData } from "@/lib/editor/queries";
import { relativeTime } from "@/lib/time";

export const formsKey = ["forms"] as const;

export function FormsList() {
  const q = useQuery({ queryKey: formsKey, queryFn: () => api.forms.list().then((r) => r.items) });
  const editor = useEditorData();
  const tabTitle = (id: string) => editor.data?.tabs.find((t) => t.id === id)?.title;
  const items = q.data ?? [];
  const total = items.reduce((n, f) => n + f.responses, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Forms"
        description={items.length ? `${total} response${total === 1 ? "" : "s"} across ${items.length} form${items.length === 1 ? "" : "s"}.` : "Responses to the forms and email signups on your page."}
        actions={
          <Link href="/dashboard/audience" className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
            View Audience
          </Link>
        }
      />
      {q.isLoading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner />
        </div>
      ) : q.error ? (
        <div>
          <Alert>{errorMessage(q.error)}</Alert>
          <Button variant="secondary" className="mt-3" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <ClipboardList className="mx-auto size-6 text-muted" aria-hidden />
          <p className="mt-3 text-[15px] font-medium">No forms yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Add a Form or Email signup block to your page to start collecting responses.</p>
          <Link href="/dashboard" className="mt-5 inline-flex h-9 items-center rounded-xl border border-line bg-surface px-3.5 text-sm font-medium hover:border-line-2">
            Go to the editor
          </Link>
        </div>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {items.map((f) => {
            const Icon = f.type === "form" ? ClipboardList : MailPlus;
            return (
              <Link key={f.block_id} href={`/dashboard/forms/${f.block_id}`} className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-background/50">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/[.08] text-brand">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-medium">{f.title || (f.type === "form" ? "Untitled form" : "Email signup")}</span>
                    {!f.is_visible && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-muted">
                        <EyeOff className="size-3" aria-hidden /> Hidden
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {f.type === "form" ? "Form" : "Email signup"}
                    {tabTitle(f.tab_id) && ` · ${tabTitle(f.tab_id)} tab`}
                    {f.last_response_at ? ` · last response ${relativeTime(f.last_response_at)}` : " · no responses yet"}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-lg font-semibold tabular-nums leading-tight">{f.responses}</span>
                  <span className="block text-[12px] text-muted">responses</span>
                </span>
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
