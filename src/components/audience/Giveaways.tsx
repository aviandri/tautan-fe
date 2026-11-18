"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Shuffle, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Alert, Button, Card, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { drawToast } from "@/lib/giveaway-draw";
import { errorMessage, useEditorData } from "@/lib/editor/queries";
import { qk } from "@/lib/session";
import { dateTimeFormat, relativeTime } from "@/lib/time";
import type { BlockOf } from "@/lib/types";
import { AudienceNav } from "./AudienceNav";

/** Owner view of giveaway cards: entry counts and a random winner draw after entries close. */
export function Giveaways() {
  const editor = useEditorData();
  const cards = (editor.data?.blocks ?? []).filter((b): b is BlockOf<"giveaway"> => b.type === "giveaway");
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Audience" description="Entries for your giveaway cards. Every entrant is also in Contacts." />
      <AudienceNav />
      {editor.isLoading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner />
        </div>
      ) : editor.error ? (
        <Alert>{errorMessage(editor.error)}</Alert>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <Gift className="mx-auto size-6 text-muted" aria-hidden />
          <p className="mt-3 text-[15px] font-medium">No giveaways yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add a <b>Giveaway</b> card on your{" "}
            <Link href="/dashboard" className="font-medium text-foreground underline-offset-2 hover:underline">
              page
            </Link>
            . Entries and the winner draw appear here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((b) => (
            <GiveawayRow key={b.id} block={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

function GiveawayRow({ block }: { block: BlockOf<"giveaway"> }) {
  const qc = useQueryClient();
  const key = ["giveaway", block.id];
  const state = useQuery({ queryKey: key, queryFn: () => api.giveaways.get(block.id) });
  const [confirmRedraw, setConfirmRedraw] = useState(false);
  const [notify, setNotify] = useState(true);
  const draw = useMutation({
    mutationFn: () => api.giveaways.draw(block.id, notify),
    onSuccess: (s) => {
      qc.setQueryData(key, s);
      qc.invalidateQueries({ queryKey: qk.editor }); // the card's public winner changed
      setConfirmRedraw(false);
      (notify && s.notified === false ? toast.error : toast.success)(drawToast(s, notify));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const ends = Date.parse(block.data.ends_at);
  const ended = Number.isFinite(ends) && ends <= Date.now();
  const entries = state.data?.entries ?? 0;
  const winner = state.data?.winner;

  return (
    <li>
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-medium">{block.data.title || "Giveaway"}</p>
            <p className="mt-0.5 text-[13px] text-muted">
              {block.data.prize} · {ended ? "Closed" : "Closes"} {Number.isFinite(ends) ? dateTimeFormat.format(ends) : "—"}
            </p>
          </div>
          <p className="text-[13px] tabular-nums text-muted">
            {state.isLoading ? <Spinner /> : <><b className="text-[18px] text-foreground">{entries}</b> {entries === 1 ? "entry" : "entries"}</>}
          </p>
        </div>

        {winner && (
          <div className="flex items-start gap-3 rounded-xl bg-brand/[.06] p-3">
            <Trophy className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <div className="min-w-0 text-[14px]">
              <p className="font-medium">
                {winner.name || winner.email} <span className="font-normal text-muted">({winner.email})</span>
              </p>
              <p className="text-[12px] text-muted">
                Drawn {relativeTime(winner.drawn_at)} · shown on your page as “{winner.display}”
                <br />
                Arrange the prize with them by email.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-muted">
            {!ended
              ? "You can draw a winner once entries close."
              : entries === 0
                ? "Nobody entered this giveaway."
                : winner
                  ? "Drawing again replaces the winner. The previous winner isn't told."
                  : "Pick one entry at random. Each entry has the same chance."}
          </p>
          {ended && entries > 0 && (
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" className="size-4 accent-brand" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Email the winner
            </label>
          )}
          {confirmRedraw ? (
            <span className="flex gap-1">
              <Button size="sm" loading={draw.isPending} onClick={() => draw.mutate()}>
                Yes, draw again
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRedraw(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button size="sm" variant={winner ? "secondary" : "primary"} disabled={!ended || entries === 0} loading={draw.isPending} onClick={() => (winner ? setConfirmRedraw(true) : draw.mutate())}>
              <Shuffle className="size-3.5" /> {winner ? "Draw again" : "Draw a winner"}
            </Button>
          )}
        </div>
      </Card>
    </li>
  );
}
