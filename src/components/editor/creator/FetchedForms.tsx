"use client";

/**
 * Forms for P3-B cards whose content the server fetches (post grid, latest video,
 * podcast) and the shop-the-look hotspot editor.
 */
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button, cx, Field, IconButton, Input } from "@/components/ui";
import { api, ApiError, assetUrl } from "@/lib/api";
import { channelIdFrom, postPlatform } from "@/lib/creator/creator";
import { CREATOR_LIMITS } from "@/lib/editor/creator-meta";
import { relativeTime } from "@/lib/time";
import type { BlockDataMap } from "@/lib/types";
import { ImageField, ItemsEditor, TextField, UrlField } from "../fields";
import { MoreOptions, Segmented } from "../fields-extra";
import type { FormProps } from "../BlockForm";
import { CurrencySelect, MoneyField, selectCls } from "../sell/sell-fields";

type Post = BlockDataMap["post_grid"]["posts"][number];
type Spot = BlockDataMap["shop_the_look"]["spots"][number];

/**
 * The server fills `data.resolved` in the background after a save. The editor's draft
 * owns `data`, so poll the editor read on a separate key and pick this block's `resolved`.
 * `key` changes when the inputs change (new URLs), `done` stops the polling.
 */
function useResolved<R>(blockId: string | undefined, key: string, done: (r: R | undefined) => boolean) {
  return useQuery({
    queryKey: ["resolved", blockId, key],
    enabled: !!blockId && !!key,
    queryFn: async () => {
      const e = await api.profile.editor();
      return ((e.blocks.find((b) => b.id === blockId)?.data as { resolved?: R } | undefined)?.resolved ?? null) as R | null;
    },
    refetchInterval: (q) => (done(q.state.data ?? undefined) || q.state.dataUpdateCount > 40 ? false : 4000),
    staleTime: 0,
  });
}

const PLATFORM_LABEL = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" } as const;

function StatusLine({ busy, children }: { busy?: boolean; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[12px] text-muted">
      {busy && <Loader2 className="size-3 animate-spin" aria-hidden />}
      {children}
    </p>
  );
}

// ---------- post grid ----------

type PostResolved = NonNullable<BlockDataMap["post_grid"]["resolved"]>;

export function PostGridForm({ data, onChange, errors, autoFocus, ctx }: FormProps<"post_grid">) {
  const set = (p: Partial<BlockDataMap["post_grid"]>) => onChange({ ...data, ...p });
  const urls = data.posts.map((p) => p.url.trim()).filter((u) => postPlatform(u));
  const resolved = useResolved<PostResolved>(ctx?.blockId, urls.join("|"), (r) => !!r && urls.every((u) => r.posts.some((p) => p.url === u && p.status !== "pending")));
  const byUrl = new Map((resolved.data?.posts ?? data.resolved?.posts ?? []).map((p) => [p.url, p]));
  return (
    <>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder="Latest posts" error={errors.title} />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">Posts</span>
        <p className="-mt-1 text-[12px] text-muted">Paste links to Instagram posts or reels, TikTok videos or YouTube videos. No login needed.</p>
        {errors.posts && <p className="text-[13px] text-danger">{errors.posts}</p>}
        <ItemsEditor
          items={data.posts}
          onChange={(posts) => set({ posts })}
          make={(): Post => ({ url: "" })}
          addLabel="New post"
          max={CREATOR_LIMITS.posts}
          render={(it, update, i) => {
            const platform = postPlatform(it.url);
            const r = byUrl.get(it.url.trim());
            return (
              <div className="flex gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/[.05] text-[11px] font-medium text-muted">
                  {r?.thumb_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(r.thumb_url)} alt="" className="size-full object-cover" />
                  ) : platform ? (
                    PLATFORM_LABEL[platform]
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <UrlField label="Post link" value={it.url} onChange={(url) => update({ url })} autoFocus={autoFocus && i === data.posts.length - 1} placeholder="https://www.instagram.com/p/…" error={errors[`posts.${i}.url`]} />
                  {platform && ctx?.blockId && (
                    <StatusLine busy={!r || r.status === "pending"}>
                      {!r || r.status === "pending"
                        ? "Getting the thumbnail… (after it saves)"
                        : r.status === "link_only"
                          ? `${PLATFORM_LABEL[platform]} didn't share a thumbnail, so this shows as a link card.`
                          : [r.title, r.author].filter(Boolean).join(" · ") || "Thumbnail ready"}
                    </StatusLine>
                  )}
                  <TextField label="Caption (optional)" value={it.caption ?? ""} onChange={(caption) => update({ caption })} maxLength={200} error={errors[`posts.${i}.caption`]} />
                </div>
              </div>
            );
          }}
        />
      </div>
    </>
  );
}

// ---------- latest video ----------

type VideoResolved = NonNullable<BlockDataMap["latest_video"]["resolved"]>;

export function LatestVideoForm({ data, onChange, errors, autoFocus, ctx }: FormProps<"latest_video">) {
  const set = (p: Partial<BlockDataMap["latest_video"]>) => onChange({ ...data, ...p });
  const [input, setInput] = useState(data.channel_id);
  const [found, setFound] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const count = data.show?.count ?? 1;
  const resolved = useResolved<VideoResolved>(ctx?.blockId, `${data.channel_id}|${count}`, (r) => r?.status === "ok");
  const r = resolved.data ?? data.resolved;

  async function lookup(raw: string) {
    const s = raw.trim();
    if (!s) return;
    const direct = channelIdFrom(s);
    if (direct) {
      set({ channel_id: direct });
      return;
    }
    if (!/youtube\.com\/(@|c\/|user\/)|^@/.test(s)) {
      setLookupError("Paste your channel link, like youtube.com/@yourname");
      return;
    }
    setLooking(true);
    setLookupError(null);
    try {
      const u = await api.unfurl(s.startsWith("@") ? `https://www.youtube.com/${s}` : s);
      if (u.youtube_channel_id) {
        set({ channel_id: u.youtube_channel_id });
        setFound(u.channel_title || null);
      } else setLookupError("Couldn't find that channel. Check the link, or paste the channel id (starts with UC).");
    } catch (e) {
      setLookupError(e instanceof ApiError && e.code === "rate_limited" ? "Slow down a little, then try again." : "Couldn't reach YouTube. Try again, or paste the channel id.");
    } finally {
      setLooking(false);
    }
  }

  const channelName = r?.channel_title || found;
  return (
    <>
      <Field
        label="YouTube channel"
        error={lookupError ?? errors.channel_id}
        hint={data.channel_id ? (channelName ? `Channel: ${channelName}` : `Channel id ${data.channel_id}`) : "Your channel link (youtube.com/@yourname) or channel id."}
      >
        {(p) => (
          <div className="flex gap-2">
            <Input
              {...p}
              value={input}
              autoFocus={autoFocus}
              placeholder="https://www.youtube.com/@yourname"
              spellCheck={false}
              autoCapitalize="none"
              onChange={(e) => {
                setInput(e.target.value);
                setLookupError(null);
                const id = channelIdFrom(e.target.value);
                if (id) set({ channel_id: id });
              }}
              onBlur={() => input.trim() !== data.channel_id && lookup(input)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup(input);
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={() => lookup(input)} loading={looking} aria-label="Find channel">
              {!looking && <Search className="size-4" />}
            </Button>
          </div>
        )}
      </Field>
      <Segmented<string>
        label="Show"
        value={String(count)}
        onChange={(v) => set({ show: { count: Number(v) } })}
        options={[1, 2, 3].map((n) => ({ value: String(n), label: n === 1 ? "Newest video" : `${n} newest` }))}
      />
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder="Latest on YouTube" error={errors.title} />
      {ctx?.blockId && data.channel_id && (
        <div className="rounded-xl border border-line p-3">
          {r?.status === "ok" && r.videos?.length ? (
            <div className="flex flex-col gap-2">
              {r.videos.map((v) => (
                <div key={v.video_id} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(v.thumb_url)} alt="" className="aspect-video w-24 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[13px] font-medium">{v.title}</p>
                    <p className="text-[12px] text-muted">{relativeTime(v.published_at)}</p>
                  </div>
                </div>
              ))}
              <p className="text-[12px] text-muted">Updates by itself about every hour.</p>
            </div>
          ) : (
            <StatusLine busy>Getting your latest videos… (after it saves)</StatusLine>
          )}
        </div>
      )}
    </>
  );
}

// ---------- podcast ----------

type PodcastResolved = NonNullable<BlockDataMap["podcast"]["resolved"]>;

export function PodcastForm({ data, onChange, errors, autoFocus, ctx }: FormProps<"podcast">) {
  const set = (p: Partial<BlockDataMap["podcast"]>) => onChange({ ...data, ...p });
  const count = data.count ?? 3;
  const resolved = useResolved<PodcastResolved>(ctx?.blockId, `${data.feed_url}|${count}`, (r) => r?.status === "ok");
  const r = resolved.data ?? data.resolved;
  return (
    <>
      <UrlField
        label="RSS feed link"
        value={data.feed_url}
        onChange={(feed_url) => set({ feed_url })}
        autoFocus={autoFocus}
        placeholder="https://anchor.fm/s/…/podcast/rss"
        error={errors.feed_url}
        hint="Find it in your podcast host's settings (Spotify for Creators, Anchor, Buzzsprout…)."
      />
      <Field label="Episodes to show" error={errors.count}>
        {(p) => (
          <select {...p} value={count} onChange={(e) => set({ count: Number(e.target.value) })} className={selectCls}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "Latest episode" : `${n} latest episodes`}
              </option>
            ))}
          </select>
        )}
      </Field>
      <TextField label="Title (optional)" value={data.title ?? ""} onChange={(title) => set({ title })} maxLength={60} placeholder={r?.title || "My podcast"} error={errors.title} />
      {ctx?.blockId && data.feed_url && !errors.feed_url && (
        <div className="flex items-center gap-3 rounded-xl border border-line p-3">
          {r?.status === "ok" ? (
            <>
              {r.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(r.image_url)} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{r.title}</p>
                <p className="truncate text-[12px] text-muted">{r.episodes?.[0] ? `Latest: ${r.episodes[0].title}` : "No episodes yet"}</p>
              </div>
            </>
          ) : (
            <StatusLine busy>Reading your feed… (after it saves)</StatusLine>
          )}
        </div>
      )}
    </>
  );
}

// ---------- shop the look ----------

export function ShopTheLookForm({ data, onChange, errors }: FormProps<"shop_the_look">) {
  const set = (p: Partial<BlockDataMap["shop_the_look"]>) => onChange({ ...data, ...p });
  const [selected, setSelected] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ i: number; moved: boolean } | null>(null);
  const full = data.spots.length >= CREATOR_LIMITS.spots;

  const pos = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));
    return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) };
  };
  const setSpot = (i: number, p: Partial<Spot>) => set({ spots: data.spots.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const remove = (i: number) => {
    set({ spots: data.spots.filter((_, j) => j !== i) });
    setSelected(null);
  };

  return (
    <>
      <ImageField label="Photo" allowUrl={false} value={data.image_url} onChange={(image_url) => set({ image_url })} error={errors.image_url} />
      {data.image_url && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">Tags</span>
          <p className="-mt-1 text-[12px] text-muted">
            {full ? `That's the maximum of ${CREATOR_LIMITS.spots} tags.` : "Tap the photo where an item is to add a tag. Drag a tag to move it, or select it and use the arrow keys."}
          </p>
          {errors.spots && <p className="text-[13px] text-danger">{errors.spots}</p>}
          <div
            ref={box}
            className={cx("relative w-full max-w-md touch-none select-none overflow-hidden rounded-xl border border-line", !full && "cursor-crosshair")}
            onPointerDown={(e) => {
              if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.photo) return;
              if (full) return;
              const p = pos(e);
              set({ spots: [...data.spots, { ...p, title: "", url: "" }] });
              setSelected(data.spots.length);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(data.image_url)} alt={data.alt ?? ""} data-photo="1" className="block w-full" draggable={false} />
            {data.spots.map((s, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Tag ${i + 1}${s.title ? `: ${s.title}` : ""}. Arrow keys move it, Delete removes it.`}
                aria-pressed={selected === i}
                className={cx(
                  "absolute flex size-8 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-white text-[13px] font-bold shadow-[0_2px_8px_rgba(0,0,0,.35)] active:cursor-grabbing",
                  selected === i ? "bg-brand text-brand-ink ring-4 ring-brand/30" : "bg-foreground text-background",
                  errors[`spots.${i}.title`] || errors[`spots.${i}.url`] ? "outline outline-2 outline-danger" : "",
                )}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  drag.current = { i, moved: false };
                  setSelected(i);
                }}
                onPointerMove={(e) => {
                  if (drag.current?.i !== i) return;
                  drag.current.moved = true;
                  setSpot(i, pos(e));
                }}
                onPointerUp={() => (drag.current = null)}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 5 : 1;
                  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
                  if (d) {
                    e.preventDefault();
                    setSpot(i, { x: Math.min(100, Math.max(0, s.x + d[0])), y: Math.min(100, Math.max(0, s.y + d[1])) });
                  } else if (e.key === "Delete" || e.key === "Backspace") {
                    e.preventDefault();
                    remove(i);
                  }
                }}
                onFocus={() => setSelected(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {data.spots.map((s, i) => (
              <div
                key={i}
                className={cx("relative rounded-xl border bg-background/60 p-3 pr-11", selected === i ? "border-brand" : "border-line")}
                onFocusCapture={() => setSelected(i)}
              >
                <span className="mb-2 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-[12px] font-bold text-background">{i + 1}</span>
                <div className="absolute right-1.5 top-1.5">
                  <IconButton label={`Remove tag ${i + 1}`} onClick={() => remove(i)}>
                    <X className="size-3.5" />
                  </IconButton>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <TextField label="Item" value={s.title} onChange={(title) => setSpot(i, { title })} maxLength={80} placeholder="Magenta knit top" error={errors[`spots.${i}.title`]} />
                  <MoneyField label="Price (optional)" value={s.price} currency={data.currency} onChange={(price) => setSpot(i, { price })} error={errors[`spots.${i}.price`]} compact />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <UrlField label="Product or affiliate link" value={s.url} onChange={(url) => setSpot(i, { url })} error={errors[`spots.${i}.url`]} />
                  <TextField label="Code (optional)" value={s.code ?? ""} onChange={(code) => setSpot(i, { code })} maxLength={40} placeholder="SEKAR10" error={errors[`spots.${i}.code`]} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <MoreOptions title="Photo description and currency">
        <TextField label="Photo description" value={data.alt ?? ""} onChange={(alt) => set({ alt })} maxLength={200} placeholder="What's in the photo, for screen readers" error={errors.alt} />
        <CurrencySelect value={data.currency} onChange={(currency) => set({ currency })} />
      </MoreOptions>
    </>
  );
}
