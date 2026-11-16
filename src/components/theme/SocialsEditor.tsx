"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Minus, Plus, X } from "lucide-react";
import type { Social } from "@/lib/types";
import { SOCIAL_PLATFORMS, handleHint, platformLabel, socialHandle, socialUrl } from "@/lib/social";
import { SocialIcon } from "@/components/public";

export interface SocialsEditorProps {
  socials: Social[];
  position: "top" | "bottom";
  /** Called with the full new value; the dashboard PATCHes {socials, socials_position}. */
  onChange: (v: { socials: Social[]; socials_position: "top" | "bottom" }) => void;
}

const MAX = 30;

/**
 * Editor for the header socials row (profile.socials). The owner types a handle; we store the
 * URL the BE expects (http(s), mailto or tel). "divider" rows are spacers.
 */
export function SocialsEditor({ socials, position, onChange }: SocialsEditorProps) {
  const [adding, setAdding] = useState(SOCIAL_PLATFORMS.find((p) => !socials.some((s) => s.platform === p.id))?.id ?? "instagram");
  const emit = (next: Social[], pos = position) => onChange({ socials: next.slice(0, MAX), socials_position: pos });
  const move = (i: number, d: -1 | 1) => {
    const next = [...socials];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    emit(next);
  };
  const full = socials.length >= MAX;

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Where the icons go" className="grid grid-cols-2 gap-1 rounded-lg bg-black/5 p-1">
        {(["top", "bottom"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={position === p}
            onClick={() => emit(socials, p)}
            className={`min-h-9 rounded-md text-sm font-medium transition ${position === p ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            {p === "top" ? "Under your name" : "At the bottom"}
          </button>
        ))}
      </div>

      {socials.length ? (
        <ul className="flex flex-col gap-2">
          {socials.map((s, i) => (
            <Row
              key={`${s.platform}-${i}`}
              social={s}
              first={i === 0}
              last={i === socials.length - 1}
              onChange={(v) => emit(socials.map((x, k) => (k === i ? v : x)))}
              onRemove={() => emit(socials.filter((_, k) => k !== i))}
              onMove={(d) => move(i, d)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No social icons yet. Add the profiles you want under your name.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Platform to add"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          className="min-h-10 flex-1 rounded-lg border border-line bg-surface px-3 text-sm"
          disabled={full}
        >
          {SOCIAL_PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={full}
          onClick={() => emit([...socials, { platform: adding, url: "" }])}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-foreground px-3 text-sm font-medium text-background disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add icon
        </button>
        <button
          type="button"
          disabled={full}
          onClick={() => emit([...socials, { platform: "divider", url: "" }])}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium disabled:opacity-50"
        >
          <Minus className="h-4 w-4" aria-hidden /> Add gap
        </button>
      </div>
      {full ? <p className="text-xs text-muted">That&apos;s the limit of {MAX} icons.</p> : null}
    </div>
  );
}

function Row({
  social,
  first,
  last,
  onChange,
  onRemove,
  onMove,
}: {
  social: Social;
  first: boolean;
  last: boolean;
  onChange: (s: Social) => void;
  onRemove: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(socialHandle(social.platform, social.url));
  const isGap = social.platform === "divider";
  const label = isGap ? "Gap" : platformLabel(social.platform);
  return (
    <li className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center text-foreground [&>svg]:h-5 [&>svg]:w-5" aria-hidden>
        {isGap ? <Minus className="h-4 w-4 text-muted" /> : <SocialIcon platform={social.platform} />}
      </span>
      {isGap ? (
        <span className="flex-1 text-sm text-muted">Space between icons</span>
      ) : (
        <>
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <input
            id={id}
            value={draft}
            placeholder={handleHint(social.platform)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onChange({ ...social, url: socialUrl(social.platform, draft) })}
            className="min-h-9 min-w-0 flex-1 rounded-md border border-line bg-background px-2.5 text-sm"
            autoComplete="off"
            spellCheck={false}
          />
        </>
      )}
      <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label={`Move ${label} up`} className="grid h-9 w-8 place-items-center rounded-md text-muted hover:bg-black/5 disabled:opacity-30">
        <ArrowUp className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" onClick={() => onMove(1)} disabled={last} aria-label={`Move ${label} down`} className="grid h-9 w-8 place-items-center rounded-md text-muted hover:bg-black/5 disabled:opacity-30">
        <ArrowDown className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="grid h-9 w-8 place-items-center rounded-md text-muted hover:bg-black/5 hover:text-danger">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}
