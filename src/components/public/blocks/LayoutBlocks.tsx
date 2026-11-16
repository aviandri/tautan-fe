// P3-D text and layout cards. Server components: no hooks, no context, no "use client".
// The before/after drag is a native range input (data-x="ba") handled by the lazy runtime-p3cd.
import type { BlockOf, TextStyle } from "@/lib/types";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { Copy, MapPin } from "../icons";
import { TIPS } from "@/lib/sell/platforms";
import { BrandMark } from "./SellBlocksA";
import { mediaFor, track, type PageEnv } from "../env";
import { Img } from "../Img";
import { TextBlock } from "./MediaBlocks";
import { s as p } from "../cls";
import "./p3cd.css";

const FULL = "(max-width: 600px) 92vw, 540px";

// ---------- text styles ----------

export function StyledText({ block, style }: { block: BlockOf<"text">; style: TextStyle }) {
  if (!block.data.content?.trim()) return null;
  return (
    <div className="tpx" data-p="textStyle" data-style={style}>
      <TextBlock block={block} />
    </div>
  );
}

// ---------- spotlight ----------

export function SpotlightBlock({ block, env, priority = false }: { block: BlockOf<"spotlight">; env: PageEnv; priority?: boolean }) {
  const d = block.data;
  const src = safeImageSrc(d.image_url);
  const href = d.button ? safeHref(d.button.url) : undefined;
  return (
    <section className={`${p.card} tpx`} data-p="spotlight" data-align={d.align ?? "left"} aria-label={d.headline}>
      {src ? (
        <div data-p="spotMedia">
          <Img src={src} alt="" media={mediaFor(env, src)} sizes={FULL} priority={priority} />
        </div>
      ) : null}
      <div data-p="spotBody">
        {d.eyebrow ? <p data-p="eyebrow">{d.eyebrow}</p> : null}
        <h2 data-p="spotHeadline">{d.headline}</h2>
        {d.text ? <p data-p="spotText">{d.text}</p> : null}
        {href && d.button?.label ? (
          <a className={p.btn} data-p="spotBtn" href={href} target="_blank" rel="noopener noreferrer" {...track(block.id, "spotlight")}>
            {d.button.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}

// ---------- marquee ----------

export function MarqueeBlock({ block }: { block: BlockOf<"marquee"> }) {
  const d = block.data;
  if (!d.text?.trim()) return null;
  const sep = d.separator ?? "•";
  // Two identical halves scroll by -50% for a seamless loop; the copy is hidden from screen readers.
  const half = Array.from({ length: 4 }, (_, i) => (
    <span key={i} data-p="mqItem">
      {d.text}
      <span data-p="mqSep" aria-hidden>
        {sep}
      </span>
    </span>
  ));
  return (
    <div className="tpx" data-p="marquee" data-style={d.style ?? "ribbon"} data-speed={d.speed ?? "normal"} data-dir={d.direction ?? "left"} role="marquee" aria-label={d.text}>
      <div data-p="mqTrack" aria-hidden>
        <span data-p="mqHalf">{half}</span>
        <span data-p="mqHalf">{half}</span>
      </div>
    </div>
  );
}

// ---------- timeline ----------

export function TimelineBlock({ block }: { block: BlockOf<"timeline"> }) {
  const d = block.data;
  if (!d.items?.length) return null;
  return (
    <section className={`${p.card} tpx`} data-p="timeline" data-style={d.style ?? "numbered"} aria-label={d.title || "Timeline"}>
      {d.title ? <h2 data-p="title">{d.title}</h2> : null}
      <ol data-p="tlList">
        {d.items.map((it, i) => (
          <li key={i} data-p="tlItem" data-on={it.highlight ? "" : undefined}>
            <span data-p="tlMark" aria-hidden>
              {d.style === "dotted" ? "" : i + 1}
            </span>
            <div data-p="tlBody">
              {it.eyebrow ? <p data-p="eyebrow">{it.eyebrow}</p> : null}
              <p data-p="tlTitle">
                {it.title}
                {it.badge ? <span data-p="badge">{it.badge}</span> : null}
              </p>
              {it.description ? <p data-p="tlDesc">{it.description}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- resume ----------

const monthFmt = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" });
function month(ym: string | undefined): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "";
  return monthFmt.format(new Date(`${ym}-01T00:00:00Z`));
}

export function ResumeBlock({ block }: { block: BlockOf<"resume"> }) {
  const d = block.data;
  if (!d.items?.length) return null;
  return (
    <section className={`${p.card} tpx`} data-p="resume" aria-label={d.title || "Experience"}>
      {d.title ? <h2 data-p="title">{d.title}</h2> : null}
      <ul data-p="cvList">
        {d.items.map((it, i) => {
          const company = safeHref(it.company_url);
          return (
            <li key={i} data-p="cvItem">
              <p data-p="cvRole">{it.role}</p>
              <p data-p="cvCompany">
                {company ? (
                  <a href={company} target="_blank" rel="noopener noreferrer" {...track(block.id, "company")}>
                    {it.company}
                  </a>
                ) : (
                  it.company
                )}
                <span data-p="cvDates">
                  {month(it.start)} – {it.current ? "Present" : month(it.end) || "Present"}
                </span>
              </p>
              {it.description ? <p data-p="cvDesc">{it.description}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- before / after ----------

export function BeforeAfterBlock({ block, env }: { block: BlockOf<"before_after">; env: PageEnv }) {
  const d = block.data;
  const before = safeImageSrc(d.before_url);
  const after = safeImageSrc(d.after_url);
  if (!before || !after) return null;
  const start = Math.min(100, Math.max(0, d.start_pct ?? 50));
  const id = `ba-${block.id}`;
  return (
    <figure className="tpx" data-p="ba" id={id} style={{ "--pos": `${start}%` } as React.CSSProperties}>
      <div data-p="baAfter">
        <Img src={after} alt={d.alt ? `${d.alt} (after)` : "After"} media={mediaFor(env, after)} sizes={FULL} />
      </div>
      <div data-p="baBefore">
        <Img src={before} alt={d.alt ? `${d.alt} (before)` : "Before"} media={mediaFor(env, before)} sizes={FULL} />
      </div>
      <span data-p="baLine" aria-hidden />
      {d.before_label ? <span data-p="baLabel" data-side="before">{d.before_label}</span> : null}
      {d.after_label ? <span data-p="baLabel" data-side="after">{d.after_label}</span> : null}
      <input type="range" min={0} max={100} step={0.5} defaultValue={start} aria-label={`${d.alt || "Before and after"}: drag to compare`} data-p="baRange" data-x="ba" />
    </figure>
  );
}

// ---------- map (drawn, no tiles) ----------

/** Small deterministic PRNG so each place gets its own, stable street pattern. */
function rng(seed: number) {
  let x = Math.floor(Math.abs(seed) * 1e5) % 2147483647 || 1;
  return () => (x = (x * 48271) % 2147483647) / 2147483647;
}

/** A stylised street sketch around the pin: decorative only (aria-hidden), no map data. */
function MapSketch({ lat, lng }: { lat: number; lng: number }) {
  const r = rng(lat * 1000 + lng);
  const W = 320;
  const H = 150;
  const roads: string[] = [];
  for (let i = 0; i < 4; i++) {
    const y = 15 + r() * (H - 30);
    roads.push(`M0 ${y.toFixed(1)} L${W} ${(y + (r() - 0.5) * 40).toFixed(1)}`);
  }
  for (let i = 0; i < 5; i++) {
    const x = 20 + r() * (W - 40);
    roads.push(`M${x.toFixed(1)} 0 L${(x + (r() - 0.5) * 50).toFixed(1)} ${H}`);
  }
  const park = { x: r() * (W - 90), y: r() * (H - 50), w: 50 + r() * 40, h: 28 + r() * 20 };
  const river = `M-10 ${(H * (0.2 + r() * 0.6)).toFixed(1)} C ${W * 0.3} ${(r() * H).toFixed(1)}, ${W * 0.6} ${(r() * H).toFixed(1)}, ${W + 10} ${(H * (0.2 + r() * 0.6)).toFixed(1)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} data-p="mapSvg" aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width={W} height={H} data-p="mapBg" />
      <rect x={park.x} y={park.y} width={park.w} height={park.h} rx="8" data-p="mapPark" />
      <path d={river} data-p="mapRiver" />
      {roads.map((d, i) => (
        <path key={i} d={d} data-p={i === 1 || i === 6 ? "mapMain" : "mapRoad"} />
      ))}
      <g transform={`translate(${W / 2} ${H / 2})`} data-p="mapPin">
        <circle r="16" data-p="mapHalo" />
        <path d="M0 6c-1.2 0-9-7.6-9-14a9 9 0 0 1 18 0c0 6.4-7.8 14-9 14z" />
        <circle cy="-8" r="3.2" data-p="mapDot" />
      </g>
    </svg>
  );
}

export function MapBlock({ block }: { block: BlockOf<"map"> }) {
  const d = block.data;
  if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng) || (d.lat === 0 && d.lng === 0)) return null;
  const links = d.links;
  const where = [d.address, d.area].filter(Boolean).join(", ");
  return (
    <section className={`${p.card} tpx`} data-p="map" aria-label={d.label || "Location"}>
      <MapSketch lat={d.lat} lng={d.lng} />
      <div data-p="mapInfo">
        <MapPin aria-hidden data-p="mapIcon" />
        <div>
          {d.label ? <p data-p="mapLabel">{d.label}</p> : null}
          {where ? <p data-p="mapAddr">{where}</p> : null}
        </div>
      </div>
      {links ? (
        <nav data-p="mapLinks" aria-label="Directions">
          <a href={safeHref(links.google)} target="_blank" rel="noopener noreferrer" data-p="mapBtn" {...track(block.id, "directions:google")}>
            Google Maps
          </a>
          <a href={safeHref(links.apple)} target="_blank" rel="noopener noreferrer" data-p="mapBtn" {...track(block.id, "directions:apple")}>
            Apple Maps
          </a>
          <a href={safeHref(links.osm)} target="_blank" rel="noopener noreferrer" data-p="mapBtn" {...track(block.id, "directions:osm")}>
            OpenStreetMap
          </a>
        </nav>
      ) : null}
    </section>
  );
}

// ---------- discount_code with several codes (swipe) ----------
// Lives here, not in P2Blocks, because P2Blocks is also imported by client code: a CSS module
// imported there would ship its class map in the page's JS.

export function DiscountCodesBlock({ block }: { block: BlockOf<"discount_code"> }) {
  const d = block.data;
  const all = [...(d.code ? [{ code: d.code, discount: d.discount, description: d.description, url: d.url }] : []), ...(d.codes ?? [])];
  return (
    <div className={p.discount}>
      {d.brand ? <div className={p.discountBrand}>{d.brand}</div> : null}
      <div className="tpx" data-p="codes" role="list" aria-label="Discount codes">
        {all.map((c, i) => {
          const href = safeHref(c.url);
          return (
            <div key={i} data-p="code" role="listitem" aria-label={`Code ${i + 1} of ${all.length}`}>
              {c.discount ? <p data-p="codeDiscount">{c.discount}</p> : null}
              {c.description ? <p data-p="codeDesc">{c.description}</p> : null}
              <div className={p.discountCodeRow}>
                <code className={p.discountCode}>{c.code}</code>
                <button type="button" className={p.discountCopy} data-copy={c.code} aria-label={`Copy code ${c.code}`} {...track(block.id, "copy")}>
                  <Copy aria-hidden />
                  <span data-copy-label>Copy</span>
                </button>
              </div>
              {href ? (
                <a data-p="codeLink" href={href} target="_blank" rel="noopener noreferrer" {...track(block.id)}>
                  {d.button_label || "Shop now"} →
                </a>
              ) : null}
              <span role="status" className={p.srOnly} data-copy-status />
            </div>
          );
        })}
      </div>
      {all.length > 1 ? (
        <p className="tpx" data-p="codeCount">
          {all.length} codes · swipe for more
        </p>
      ) : null}
    </div>
  );
}

// ---------- social_icons donate variant ----------

export function DonateIconsBlock({ block }: { block: BlockOf<"social_icons"> }) {
  const items = (block.data.items ?? []).filter((i) => safeHref(i.url) && i.platform in TIPS);
  if (!items.length) return null;
  return (
    <nav className="tpx" data-p="donate" aria-label="Support me">
      {items.map((it, i) => {
        const meta = TIPS[it.platform as keyof typeof TIPS];
        return (
          <a key={`${it.platform}-${i}`} data-p="donateLink" href={safeHref(it.url)} target="_blank" rel="noopener noreferrer" {...track(block.id, `tip:${it.platform}`)}>
            <BrandMark icon={meta.icon} label={meta.label} />
            {meta.label}
          </a>
        );
      })}
    </nav>
  );
}
