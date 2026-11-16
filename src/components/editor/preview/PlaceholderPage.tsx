"use client";

/**
 * TEMPORARY stand-in for tautan-c6's <PublicPage> (PR #2). Same props, rough
 * rendering, enough to make the live preview useful until #2 is on main.
 * Delete this file when Preview.tsx switches to "@/components/public".
 */
import { ChevronDown, FolderClosed, Mail, Music2, PlaySquare } from "lucide-react";
import { useState } from "react";
import { assetUrl } from "@/lib/api";
import { byPosition } from "@/lib/editor/queries";
import type { Block, Profile, Tab } from "@/lib/types";
import { prettyUrl } from "@/lib/url";

export interface PublicPageProps {
  profile: Profile;
  tabs: Tab[];
  blocks: Block[];
  activeTabSlug?: string;
  preview?: boolean;
  onTabChange?: (slug: string) => void;
}

function bgStyle(p: Profile): React.CSSProperties {
  const { bg } = p.theme;
  if (bg.type === "image") return { backgroundImage: `url(${assetUrl(bg.value)})`, backgroundSize: "cover", backgroundPosition: "center" };
  if (bg.type === "gradient") return { backgroundImage: bg.value };
  return { backgroundColor: bg.value };
}

export function PlaceholderPage({ profile, tabs, blocks, activeTabSlug, onTabChange }: PublicPageProps) {
  const t = profile.theme;
  const sorted = [...tabs].sort(byPosition);
  const active = sorted.find((x) => x.slug === activeTabSlug) ?? sorted[0];
  const visible = blocks.filter((b) => b.is_visible);
  const top = visible.filter((b) => b.tab_id === active?.id && !b.parent_id).sort(byPosition);
  const btn: React.CSSProperties = {
    borderRadius: t.button.radius,
    background: t.button.style === "outline" ? "transparent" : t.button.color,
    color: t.button.style === "outline" ? t.button.color : t.button.text_color,
    border: `2px solid ${t.button.color}`,
    boxShadow: t.button.style === "shadow" ? `4px 4px 0 ${t.text_color}` : undefined,
  };
  const avatar = assetUrl(profile.avatar_url);

  return (
    <div className="min-h-full px-5 pb-10 pt-10" style={{ ...bgStyle(profile), color: t.text_color, fontFamily: `${t.font}, ui-sans-serif, system-ui` }}>
      <div className="flex flex-col items-center text-center">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full text-2xl font-semibold" style={{ background: t.button.color, color: t.button.text_color }}>
            {(profile.display_name || profile.username).slice(0, 1).toUpperCase()}
          </div>
        )}
        <p className="mt-3 text-lg font-semibold">{profile.display_name || `@${profile.username}`}</p>
        {profile.bio && <p className="mt-1 whitespace-pre-line text-sm opacity-75">{profile.bio}</p>}
      </div>

      {sorted.length > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {sorted.map((x) => (
            <button
              key={x.id}
              onClick={() => onTabChange?.(x.slug)}
              className="rounded-full px-3 py-1 text-[13px] font-medium"
              style={x.id === active?.id ? { background: t.text_color, color: typeof t.bg.value === "string" && t.bg.type === "color" ? t.bg.value : "#fff" } : { opacity: 0.7 }}
            >
              {x.title}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {top.map((b) => (
          <PreviewBlock key={b.id} block={b} btn={btn} children_={visible.filter((c) => c.parent_id === b.id).sort(byPosition)} />
        ))}
        {top.length === 0 && <p className="py-8 text-center text-sm opacity-50">Nothing here yet</p>}
      </div>
    </div>
  );
}

function PreviewBlock({ block: b, btn, children_ }: { block: Block; btn: React.CSSProperties; children_: Block[] }) {
  const [open, setOpen] = useState(false);
  switch (b.type) {
    case "link":
      return (
        <div className="flex min-h-12 items-center justify-center px-4 py-3 text-center text-sm font-medium" style={btn}>
          {b.data.title || prettyUrl(b.data.url)}
        </div>
      );
    case "text":
      return <p className="whitespace-pre-line text-center text-sm">{b.data.content.replace(/[*_#]/g, "")}</p>;
    case "image":
      return b.data.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(b.data.url)} alt={b.data.alt ?? ""} className="w-full rounded-2xl object-cover" />
      ) : null;
    case "video":
    case "music":
      return (
        <div className="flex aspect-video items-center justify-center gap-2 rounded-2xl bg-black/10 text-sm opacity-80">
          {b.type === "video" ? <PlaySquare className="size-5" /> : <Music2 className="size-5" />}
          {prettyUrl(b.data.url)}
        </div>
      );
    case "social_icons":
      return (
        <div className="flex flex-wrap justify-center gap-2">
          {b.data.items.map((i, k) => (
            <span key={k} className="rounded-full border border-current px-2.5 py-1 text-[12px] font-medium opacity-80">
              {i.platform}
            </span>
          ))}
        </div>
      );
    case "folder":
      return (
        <div>
          <button className="flex min-h-12 w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium" style={btn} onClick={() => setOpen((o) => !o)}>
            <FolderClosed className="size-4" /> {b.data.title} <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="mt-2 flex flex-col gap-2 pl-4">
              {children_.map((c) => c.type === "link" && (
                <div key={c.id} className="px-4 py-2.5 text-center text-[13px] font-medium" style={btn}>
                  {c.data.title || prettyUrl(c.data.url)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    case "faq":
      return (
        <div className="flex flex-col gap-2">
          {b.data.items.map((i, k) => (
            <details key={k} className="rounded-xl bg-black/5 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium">{i.q}</summary>
              <p className="mt-2 opacity-75">{i.a}</p>
            </details>
          ))}
        </div>
      );
    case "testimonial":
      return (
        <div className="flex flex-col gap-2">
          {b.data.items.map((i, k) => (
            <figure key={k} className="rounded-xl bg-black/5 px-4 py-3 text-sm">
              <blockquote>“{i.quote}”</blockquote>
              <figcaption className="mt-1.5 text-[12px] opacity-70">{i.author}</figcaption>
            </figure>
          ))}
        </div>
      );
    case "contact_form":
      return (
        <div className="rounded-2xl bg-black/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium"><Mail className="size-4" /> {b.data.title}</p>
          <div className="mt-3 flex flex-col gap-2 opacity-60">
            <div className="h-9 rounded-lg bg-white/70" />
            <div className="h-9 rounded-lg bg-white/70" />
            <div className="h-16 rounded-lg bg-white/70" />
          </div>
          <div className="mt-3 py-2 text-center font-medium" style={btn}>{b.data.button_label}</div>
        </div>
      );
  }
}
