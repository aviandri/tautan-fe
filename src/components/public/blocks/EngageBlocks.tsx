// P3-C engage cards. Server components: plain HTML <form data-x="…"> that the lazily imported
// runtime-p3cd submits (runtime-core calls preventDefault and hands the event over). No React
// islands, so nothing here adds to the page's first-load JS.
import type { BlockOf, PollResults } from "@/lib/types";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { mediaFor, track, type PageEnv } from "../env";
import { Img } from "../Img";
import { s as p } from "../cls";

/** Honeypot: hidden from people, filled by naive bots; the runtime drops such submissions. */
function Trap() {
  return (
    <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden data-p="trap" />
  );
}

function SubscribeBox({ mode }: { mode?: "everyone" | "ask" | "none" }) {
  if (mode === "everyone") return <p data-p="fine">You&apos;ll also get occasional updates by email.</p>;
  if (mode === "none") return null;
  return (
    <label data-p="check">
      <input type="checkbox" name="subscribe" value="1" /> Send me updates by email
    </label>
  );
}

/** Rendered on the server for show_results=always, and rebuilt by the runtime after a vote. */
export function PollResultsList({ options, results }: { options: { id: string; label: string }[]; results: PollResults }) {
  return (
    <ul data-p="pollResults">
      {options.map((o) => {
        const n = results.counts[o.id] ?? 0;
        const pct = results.total ? Math.round((n / results.total) * 100) : 0;
        return (
          <li key={o.id} data-p="pollRow" style={{ "--pct": `${pct}%` } as React.CSSProperties}>
            <span data-p="pollLabel">{o.label}</span>
            <span data-p="pollPct">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- poll ----------

export function PollBlock({ block }: { block: BlockOf<"poll"> }) {
  const d = block.data;
  if (!d.options?.length) return null;
  const show = d.show_results ?? "after_vote";
  const results = d.results && show === "always" ? d.results : undefined;
  const total = results ? <p data-p="fine">{results.total} vote{results.total === 1 ? "" : "s"}</p> : null;
  return (
    <section className={`${p.card} tpx`} data-p="engage" id={`block-${block.id}`} aria-label={d.question}>
      <h2 data-p="title">{d.question}</h2>
      {d.closed ? (
        <>
          {results ? <PollResultsList options={d.options} results={results} /> : null}
          <p data-p="fine">Voting has closed.</p>
          {total}
        </>
      ) : (
        <form data-x="poll" data-block={block.id} data-show={show} data-options={JSON.stringify(d.options)} noValidate>
          <fieldset data-p="pollOptions">
            <legend data-p="sr">{d.question}</legend>
            {d.options.map((o) => (
              <label key={o.id} data-p="pollOption">
                <input type="radio" name="option" value={o.id} required />
                <span>{o.label}</span>
              </label>
            ))}
          </fieldset>
          <button type="submit" className={p.btn} data-p="submit">
            Vote
          </button>
          <p data-p="status" role="status" aria-live="polite" />
          {results ? (
            <>
              <PollResultsList options={d.options} results={results} />
              {total}
            </>
          ) : null}
        </form>
      )}
    </section>
  );
}

// ---------- ask me ----------

export function AskMeBlock({ block }: { block: BlockOf<"ask_me"> }) {
  const d = block.data;
  const answers = d.public_answers ? (d.answers ?? []) : [];
  const fid = `ask-${block.id}`;
  return (
    <section className={`${p.card} tpx`} data-p="engage" id={`block-${block.id}`} aria-label={d.prompt}>
      <h2 data-p="title">{d.prompt}</h2>
      <form data-x="ask" data-block={block.id} noValidate>
        <label htmlFor={fid} data-p="sr">
          Your question
        </label>
        <textarea id={fid} name="question" required maxLength={500} rows={3} placeholder={d.placeholder || "Type your question…"} data-p="input" />
        <Trap />
        <button type="submit" className={p.btn} data-p="submit">
          {d.button_label || "Send"}
        </button>
        <p data-p="fine">Anonymous: your name and email aren&apos;t sent.</p>
        <p data-p="status" role="status" aria-live="polite" />
      </form>
      {answers.length ? (
        <dl data-p="qa">
          {answers.map((a, i) => (
            <div key={i} data-p="qaItem">
              <dt>{a.question}</dt>
              <dd>{a.answer}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

// ---------- lead magnet ----------

export function LeadMagnetBlock({ block, env }: { block: BlockOf<"lead_magnet">; env: PageEnv }) {
  const d = block.data;
  const cover = safeImageSrc(d.cover_url);
  const eid = `lead-${block.id}`;
  return (
    <section className={`${p.card} tpx`} data-p="engage" id={`block-${block.id}`} aria-label={d.title}>
      {cover ? (
        <div data-p="leadCover">
          <Img src={cover} alt="" media={mediaFor(env, cover)} sizes="(max-width: 600px) 92vw, 540px" />
        </div>
      ) : null}
      <h2 data-p="title">{d.title}</h2>
      {d.description ? <p data-p="desc">{d.description}</p> : null}
      <form data-x="lead" data-block={block.id} data-done={d.success_message || "Here's your download."} noValidate>
        <label htmlFor={eid} data-p="sr">
          Email
        </label>
        <div data-p="row">
          <input id={eid} type="email" name="email" required autoComplete="email" placeholder="you@example.com" data-p="input" />
          <button type="submit" className={p.btn} data-p="submit">
            {d.button_label || "Get it"}
          </button>
        </div>
        <SubscribeBox mode={d.subscribe} />
        <Trap />
        <p data-p="status" role="status" aria-live="polite" />
      </form>
    </section>
  );
}

// ---------- giveaway ----------

const endFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function GiveawayBlock({ block }: { block: BlockOf<"giveaway"> }) {
  const d = block.data;
  const ends = Date.parse(d.ends_at);
  const gid = `ga-${block.id}`;
  return (
    <section className={`${p.card} tpx`} data-p="engage" id={`block-${block.id}`} aria-label={d.title}>
      <p data-p="eyebrow">Giveaway</p>
      <h2 data-p="title">{d.title}</h2>
      <p data-p="prize">
        <span data-p="fine">Prize: </span>
        {d.prize}
      </p>
      {d.ended ? (
        d.winner ? (
          <p data-p="winner">
            Winner: <strong>{d.winner.display}</strong>
          </p>
        ) : (
          <p data-p="fine">Entries are closed. The winner will be announced here soon.</p>
        )
      ) : (
        <>
          {Number.isFinite(ends) ? (
            <p data-p="fine">
              Ends <time dateTime={d.ends_at}>{endFmt.format(ends)} UTC</time>
              {d.entry_count ? ` · ${d.entry_count} ${d.entry_count === 1 ? "entry" : "entries"}` : ""}
            </p>
          ) : null}
          {d.steps?.length ? (
            <ol data-p="steps">
              {d.steps.map((st, i) => {
                const href = safeHref(st.url);
                return (
                  <li key={i}>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" {...track(block.id, "giveaway_step")}>
                        {st.label}
                      </a>
                    ) : (
                      st.label
                    )}
                  </li>
                );
              })}
            </ol>
          ) : null}
          <form data-x="enter" data-block={block.id} noValidate>
            <label htmlFor={`${gid}-n`} data-p="sr">
              Name
            </label>
            <input id={`${gid}-n`} name="name" autoComplete="name" maxLength={100} placeholder="Your name" data-p="input" />
            <label htmlFor={gid} data-p="sr">
              Email
            </label>
            <div data-p="row">
              <input id={gid} type="email" name="email" required autoComplete="email" placeholder="you@example.com" data-p="input" />
              <button type="submit" className={p.btn} data-p="submit">
                Enter
              </button>
            </div>
            <SubscribeBox mode={d.subscribe} />
            <Trap />
            <p data-p="status" role="status" aria-live="polite" />
          </form>
          {safeHref(d.rules_url) ? (
            <a data-p="fineLink" href={safeHref(d.rules_url)} target="_blank" rel="noopener noreferrer">
              Rules
            </a>
          ) : null}
        </>
      )}
    </section>
  );
}
