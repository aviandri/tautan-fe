// Card-level gates: the locked stub a gated card renders as on the public page (the API sends
// data:null). Plain HTML: the unlock <form data-x="unlock"> and the re-open from a stored token
// ([data-x-lock], restore()) are handled by the lazily imported runtime-p3cd.
import type { Block } from "@/lib/types";
import { safeHref } from "@/lib/safe-url";
import { platformLabel } from "@/lib/social";
import { s as p } from "../cls";

const COPY = {
  password: { title: "Locked", button: "Unlock" },
  email: { title: "Unlock with your email", button: "Unlock" },
  age_18: { title: "18+ only", button: "I'm 18 or older" },
  follow: { title: "Follow to unlock", button: "I followed, unlock" },
} as const;

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden data-p="lockIcon">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function LockedCard({ block }: { block: Block }) {
  const g = block.gate;
  // A child of a gated folder: the folder's own stub stands in for it.
  if (!g) return null;
  const copy = COPY[g.kind];
  const follow = g.kind === "follow" ? safeHref(g.follow?.url) : undefined;
  const fid = `unlock-${block.id}`;
  return (
    <section className={`${p.card} tpx`} data-p="locked" data-x-lock={block.id} id={`block-${block.id}`} aria-label={g.message || copy.title}>
      <div data-p="lockHead">
        <LockIcon />
        <p data-p="title">{g.message || copy.title}</p>
      </div>
      <form data-x="unlock" data-block={block.id} data-kind={g.kind} noValidate>
        {g.kind === "password" ? (
          <>
            <label htmlFor={fid} data-p="sr">
              Password
            </label>
            <div data-p="row">
              <input id={fid} type="password" name="password" required autoComplete="off" placeholder="Password" data-p="input" />
              <button type="submit" className={p.btn} data-p="submit">
                {copy.button}
              </button>
            </div>
          </>
        ) : g.kind === "email" ? (
          <>
            <label htmlFor={fid} data-p="sr">
              Email
            </label>
            <div data-p="row">
              <input id={fid} type="email" name="email" required autoComplete="email" placeholder="you@example.com" data-p="input" />
              <button type="submit" className={p.btn} data-p="submit">
                {copy.button}
              </button>
            </div>
            {g.subscribe === "ask" ? (
              <label data-p="check">
                <input type="checkbox" name="subscribe" value="1" /> Send me updates by email
              </label>
            ) : g.subscribe === "everyone" ? (
              <p data-p="fine">You&apos;ll also get occasional updates by email.</p>
            ) : null}
          </>
        ) : g.kind === "follow" ? (
          <>
            {follow ? (
              <a href={follow} target="_blank" rel="noopener noreferrer" data-p="followLink">
                Follow on {platformLabel(g.follow?.platform ?? "")} ↗
              </a>
            ) : null}
            <button type="submit" className={p.btn} data-p="submit">
              {copy.button}
            </button>
          </>
        ) : (
          <button type="submit" className={p.btn} data-p="submit">
            {copy.button}
          </button>
        )}
        <p data-p="status" role="status" aria-live="polite" />
      </form>
    </section>
  );
}
