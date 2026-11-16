"use client";

/**
 * Kartu editor: three panes. Left, the card list; centre, a dotted stage with the live preview
 * (phone or desktop); right, the selected card's settings. Under 1280px the preview opens from a
 * button; under 1024px the settings open as a bottom sheet.
 */
import { Eye, Monitor, Smartphone, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMedia } from "@/lib/use-media";
import { Alert, Button, cx, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { getMeta } from "@/lib/editor/block-meta";
import { byPosition, errorMessage, siblings, useCreateBlock, useEditorData, useReorderBlocks, useUpdateBlock } from "@/lib/editor/queries";
import { linkBlock, marketplaceBlock, type SellSuggestion } from "@/lib/editor/smart-paste";
import { MARKETPLACES } from "@/lib/sell/platforms-meta";
import type { Block, BlockDataMap, BlockOf, BlockType, CreateBlockInput, Tab } from "@/lib/types";
import { NewBlockDraft, useQuickCreate } from "./AddBlock";
import { CardList } from "./CardList";
import dynamic from "next/dynamic";
import { BlockInspector, EmptyInspector } from "./Inspector";
// Loaded on demand: the picker (catalog, samples, renderer) on open, the previews after the editor shell.
const SellPasteChoice = dynamic(() => import("./SellPasteChoice").then((m) => m.SellPasteChoice), { ssr: false });
const CardPicker = dynamic(() => import("./CardPicker").then((m) => m.CardPicker), { ssr: false });
function PreviewSkeleton() {
  return <div className="mx-auto h-[630px] w-[300px] animate-pulse rounded-[48px] bg-line" aria-label="Loading preview" />;
}
const PhonePreview = dynamic(() => import("./preview/Preview").then((m) => m.PhonePreview), { ssr: false, loading: PreviewSkeleton });
const DesktopPreview = dynamic(() => import("./preview/Preview").then((m) => m.DesktopPreview), { ssr: false, loading: PreviewSkeleton });
import { pasteError, usePasteToBlock } from "./SmartPaste";

type Selection =
  | { kind: "block"; id: string }
  | { kind: "new"; type: BlockType; parentId: string | null; initialData?: Partial<BlockDataMap[BlockType]> }
  | { kind: "sell"; suggestion: SellSuggestion }
  | null;


function Segment<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; icon: React.ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1 rounded-full bg-surface/80 p-1 shadow-card">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors",
            value === o.value ? "bg-foreground text-background" : "text-ink-2 hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Editor() {
  const { data, isLoading, error, refetch } = useEditorData();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const isLg = useMedia("(min-width: 1024px)");
  const isXl = useMedia("(min-width: 1280px)");
  const [sel, setSel] = useState<Selection>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [previewOpen, setPreviewOpen] = useState(false);

  const quick = useQuickCreate();
  const create = useCreateBlock();
  const update = useUpdateBlock();
  const reorder = useReorderBlocks();

  const tabs = useMemo(() => (data ? [...data.tabs].sort(byPosition) : []), [data]);
  const slug = params.get("tab");
  const active = tabs.find((t) => t.slug === slug) ?? tabs[0];
  const paste = usePasteToBlock(active?.id ?? "");
  const blocks = useMemo(() => data?.blocks ?? [], [data]);
  const selectedBlock = sel?.kind === "block" ? blocks.find((b) => b.id === sel.id) : undefined;

  // a selected card that's gone (deleted, moved to another tab) clears the selection
  useEffect(() => {
    if (sel?.kind === "block" && data && (!selectedBlock || selectedBlock.tab_id !== active?.id)) setSel(null);
  }, [sel, selectedBlock, data, active?.id]);

  const sheetOpen = !isLg && !!sel;
  useEffect(() => {
    if (!sheetOpen && !previewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (previewOpen) setPreviewOpen(false);
      else setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen, previewOpen]);

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner />
      </div>
    );
  }
  if (error || !data || !active) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Alert>{error ? errorMessage(error) : "Couldn't load your page."}</Alert>
        <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { profile } = data;
  const top = siblings(blocks, active.id, null);

  const selectTab = (t: Tab) => {
    const q = new URLSearchParams(params);
    if (t.id === tabs[0]?.id) q.delete("tab");
    else q.set("tab", t.slug);
    router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
    setSel(null);
  };
  const selectBySlug = (s: string) => {
    const t = tabs.find((x) => x.slug === s);
    if (t) selectTab(t);
  };

  /** New top-level cards go first (the server appends), then open in the settings panel. */
  function onCreated(b: Block) {
    if (!b.parent_id) reorder.mutate({ tabId: active.id, ids: [b.id, ...top.filter((x) => x.id !== b.id).map((x) => x.id)] });
    setSel({ kind: "block", id: b.id });
    setFresh(b.id);
  }

  function pick(type: BlockType, parentId: string | null = null) {
    setPicking(false);
    if (getMeta(type).needsInputFirst) setSel({ kind: "new", type, parentId });
    else quick.run(type, active.id, parentId, onCreated);
  }

  function createFromPaste(input: CreateBlockInput) {
    create.mutate(input, { onSuccess: onCreated, onError: (e) => toast.error(errorMessage(e)) });
  }

  const sellTarget =
    sel?.kind === "sell"
      ? (top.find((b) => b.type === "marketplace" && !b.data.stores.some((x) => x.platform === sel.suggestion.platform)) as BlockOf<"marketplace"> | undefined)
      : undefined;

  const inspector = (() => {
    if (!sel) return <EmptyInspector />;
    if (sel.kind === "new")
      return (
        <NewBlockDraft
          key={`${sel.type}-${sel.parentId}`}
          bare
          type={sel.type}
          tabId={active.id}
          parentId={sel.parentId}
          tabs={tabs}
          initialData={sel.initialData}
          onDone={(b) => (b ? onCreated(b) : setSel(null))}
        />
      );
    if (sel.kind === "sell") {
      const s = sel.suggestion;
      return (
        <SellPasteChoice
          suggestion={s}
          existing={sellTarget}
          busy={create.isPending}
          onProduct={() => setSel({ kind: "new", type: "product", parentId: null, initialData: s.product })}
          onMarketplace={() => createFromPaste(marketplaceBlock(s, active.id))}
          onAppend={() => {
            if (!sellTarget) return;
            update.mutate({ id: sellTarget.id, patch: { data: { ...sellTarget.data, stores: [...sellTarget.data.stores, { platform: s.platform, url: s.url }] } } });
            toast.success(`Added ${MARKETPLACES[s.platform].label} to your marketplace card`);
            setSel({ kind: "block", id: sellTarget.id });
          }}
          onLink={() => createFromPaste(linkBlock(s, active.id))}
          onCancel={() => setSel(null)}
        />
      );
    }
    if (!selectedBlock) return <EmptyInspector />;
    return <BlockInspector key={selectedBlock.id} block={selectedBlock} tabs={tabs} autoFocus={fresh === selectedBlock.id} onDeleted={() => setSel(null)} />;
  })();

  const previewProps = { profile, tabs, blocks, activeTabSlug: active.slug, onTabChange: selectBySlug };

  return (
    <div className="grid flex-1 items-start gap-4 px-4 pb-6 pt-1 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)_minmax(320px,360px)]">
      {/* cards */}
      <section aria-label="Your cards" className="min-w-0 lg:p-2">
        <CardList
          blocks={blocks}
          tab={active}
          tabs={tabs}
          selectedId={selectedBlock?.id}
          onSelect={(b) => {
            setSel({ kind: "block", id: b.id });
            setFresh(null);
          }}
          onSelectTab={selectTab}
          onAdd={() => setPicking(true)}
          onAddToFolder={(f) => pick("link", f.id)}
          onCreated={onCreated}
          onSell={(s) => setSel({ kind: "sell", suggestion: s })}
          adding={quick.pending || paste.busy}
        />
      </section>

      {/* stage */}
      {isXl && (
        <section aria-label="Live preview" className="k-stage sticky top-[84px] flex h-[calc(100dvh-100px)] min-h-[560px] flex-col items-center gap-4 overflow-hidden rounded-[32px] p-5">
          <Segment
            label="Preview size"
            value={device}
            onChange={setDevice}
            options={[
              { value: "phone", label: "Phone", icon: <Smartphone className="size-3.5" aria-hidden /> },
              { value: "desktop", label: "Desktop", icon: <Monitor className="size-3.5" aria-hidden /> },
            ]}
          />
          <div className="flex min-h-0 w-full flex-1 items-start justify-center overflow-y-auto">
            {device === "phone" ? <PhonePreview {...previewProps} width={300} height={610} /> : <DesktopPreview {...previewProps} height={600} />}
          </div>
          <p className="text-[13px] font-semibold text-muted">{profile.is_published ? "Changes are live as they save." : "Draft. Publish to make it public."}</p>
        </section>
      )}

      {/* settings: one stable wrapper (a side panel on large screens, a bottom sheet on phones), so
          crossing a breakpoint (rotation, resizing) never remounts the form and loses a draft */}
      <div
        className={
          isLg
            ? "sticky top-[84px] min-w-0"
            : sheetOpen
              ? "fixed inset-0 z-40 flex flex-col justify-end bg-black/30"
              : "hidden"
        }
        onMouseDown={(e) => !isLg && e.target === e.currentTarget && setSel(null)}
      >
        <div
          role={isLg ? undefined : "dialog"}
          aria-modal={isLg ? undefined : true}
          aria-label={isLg ? "Card settings" : "Edit card"}
          className={
            isLg
              ? "max-h-[calc(100dvh-100px)] overflow-y-auto rounded-[32px] bg-surface p-[22px] shadow-card"
              : "k-enter max-h-[88dvh] overflow-y-auto rounded-t-[32px] bg-surface px-[18px] pb-6 pt-2.5 shadow-[0_-20px_40px_-20px_rgba(0,0,0,.3)]"
          }
        >
          {!isLg && (
            <div className="sticky -top-2.5 z-10 -mx-[18px] mb-3 flex items-center bg-surface px-[18px] pb-2 pt-1">
              <span aria-hidden className="absolute left-1/2 top-1 h-[5px] w-11 -translate-x-1/2 rounded-full bg-line-2" />
              <Button size="sm" variant="dark" className="ml-auto mt-3" onClick={() => setSel(null)}>
                Done
              </Button>
            </div>
          )}
          {inspector}
        </div>
      </div>

      {/* under 1280px: preview from a button */}
      {!isXl && !sheetOpen && (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="fixed bottom-5 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-5 text-[15px] font-semibold text-background shadow-lift transition-transform hover:-translate-y-px active:scale-[.97]"
        >
          <Eye className="size-4" aria-hidden /> Preview
        </button>
      )}
      {previewOpen && !isXl && (
        <div role="dialog" aria-modal="true" aria-label="Page preview" className="k-stage fixed inset-0 z-50 flex flex-col items-center gap-4 overflow-y-auto px-4 py-5">
          <Button variant="secondary" size="sm" className="self-end" onClick={() => setPreviewOpen(false)}>
            <X className="size-4" /> Close
          </Button>
          <PhonePreview {...previewProps} />
        </div>
      )}

      {picking && (
        <CardPicker
          onPick={(t) => pick(t)}
          onPaste={(text) => {
            setPicking(false);
            paste.run(text).then((out) => (out.kind === "created" ? onCreated(out.block) : setSel({ kind: "sell", suggestion: out.suggestion })), (e) => toast.error(pasteError(e)));
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
