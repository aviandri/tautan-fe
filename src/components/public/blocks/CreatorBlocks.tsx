import { siDiscord, siLine, siTelegram, siWhatsapp, type SimpleIcon } from "simple-icons";
import type { BlockOf } from "@/lib/types";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { formatMoney } from "@/lib/sell/money";
import { mediaFor, track, type PageEnv } from "../env";
import { Img } from "../Img";
import { Download, Play } from "../icons";
import { s } from "../cls";
import { BrandMark } from "./SellBlocksA";
import { SocialIcon } from "./SocialIconsBlock";

// P3-B creator cards. Server components only: no hooks, no islands. Interactivity goes through the
// lazy runtime: data-embed facades (latest_video), data-lightbox and data-slides (gallery),
// data-goto-form (rate_card), data-live-* (events "Live now" correction) and audio play tracking.

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const fmtCount = (n: number) => compact.format(n);

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  facebook: "Facebook",
  threads: "Threads",
  twitch: "Twitch",
  linkedin: "LinkedIn",
  spotify: "Spotify",
  podcast: "Podcast",
  blog: "Blog",
  shopee: "Shopee Live",
  other: "Live",
};

function CardTitle({ title }: { title?: string }) {
  return title?.trim() ? <h3 className={s.crTitle}>{title}</h3> : null;
}

function httpHref(u: string | undefined): string | undefined {
  const h = safeHref(u);
  return h && /^https?:/.test(h) ? h : undefined;
}

// ---------- media_kit ----------

function Bars({ label, slices }: { label: string; slices?: { label: string; pct: number }[] }) {
  if (!slices?.length) return null;
  return (
    <div className={s.crBars}>
      <div className={s.crBarsLabel}>{label}</div>
      {slices.map((x, i) => (
        <div key={i} className={s.crBar}>
          <span className={s.crBarName}>{x.label}</span>
          <span className={s.crBarTrack} aria-hidden>
            <span className={s.crBarFill} style={{ width: `${Math.max(0, Math.min(100, x.pct))}%` }} />
          </span>
          <span className={s.crBarPct}>{Math.round(x.pct)}%</span>
        </div>
      ))}
    </div>
  );
}

export function MediaKitBlock({ block }: { block: BlockOf<"media_kit"> }) {
  const d = block.data;
  const pdf = safeHref(d.pdf_url);
  const updated = /^\d{4}-\d{2}-\d{2}$/.test(d.updated_at) ? new Date(`${d.updated_at}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : null;
  return (
    <section className={s.creator} aria-label={d.title || "Media kit"}>
      <CardTitle title={d.title || "Media kit"} />
      <ul className={s.crStats}>
        {d.platforms.map((p, i) => {
          const href = httpHref(p.url);
          const body = (
            <>
              <span className={s.crStatHead}>
                <span className={s.crStatIcon} aria-hidden>
                  <SocialIcon platform={p.platform} />
                </span>
                <span className={s.crStatHandle}>{p.handle}</span>
              </span>
              <span className={s.crStatBig}>
                {fmtCount(p.followers)}
                <span className={s.crStatUnit}> followers</span>
              </span>
              {p.avg_views != null || p.engagement != null ? (
                <span className={s.crStatSmall}>
                  {p.avg_views != null ? `${fmtCount(p.avg_views)} avg views` : null}
                  {p.avg_views != null && p.engagement != null ? " · " : null}
                  {p.engagement != null ? `${p.engagement}% engagement` : null}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={i}>
              {href ? (
                <a className={s.crStat} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${PLATFORM_LABEL[p.platform] ?? p.platform}: ${p.handle}`} {...track(block.id, `profile:${p.platform}`)}>
                  {body}
                </a>
              ) : (
                <div className={s.crStat}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {d.audience ? (
        <div className={s.crAudience}>
          <Bars label="Age" slices={d.audience.age} />
          <Bars label="Gender" slices={d.audience.gender} />
          <Bars label="Top cities" slices={d.audience.cities} />
        </div>
      ) : null}
      <div className={s.crFoot}>
        {updated ? <span className={s.crMuted}>Updated {updated}</span> : <span />}
        {pdf ? (
          <a className={s.crLink} href={pdf} target="_blank" rel="noopener noreferrer" {...track(block.id, "download")}>
            <Download aria-hidden /> Full media kit (PDF)
          </a>
        ) : null}
      </div>
    </section>
  );
}

// ---------- rate_card ----------

export function RateCardBlock({ block }: { block: BlockOf<"rate_card"> }) {
  const d = block.data;
  return (
    <section className={s.creator} aria-label={d.title || "Rates"}>
      <CardTitle title={d.title || "Collab rates"} />
      <ul className={s.crPackages}>
        {d.packages.map((p, i) => (
          <li key={i} className={s.crPackage}>
            <div className={s.crPackageHead}>
              <span className={s.crPackageName}>{p.name}</span>
              {p.price_from != null ? (
                <span className={s.crPackagePrice}>
                  <span className={s.crMuted}>from </span>
                  {formatMoney(p.price_from, d.currency)}
                </span>
              ) : null}
            </div>
            {p.deliverables.length ? (
              <ul className={s.crDeliverables}>
                {p.deliverables.map((x, k) => (
                  <li key={k}>{x}</li>
                ))}
              </ul>
            ) : null}
            {p.turnaround ? <div className={s.crMuted}>Turnaround: {p.turnaround}</div> : null}
          </li>
        ))}
      </ul>
      {d.note ? <p className={s.crNote}>{d.note}</p> : null}
      {d.form_block_id ? (
        <button type="button" className={s.sellBtn} data-goto-form={d.form_block_id} {...track(block.id, "collab")}>
          {d.button_label || "Request a collab"}
        </button>
      ) : null}
    </section>
  );
}

// ---------- brands ----------

export function BrandsBlock({ block, env }: { block: BlockOf<"brands">; env: PageEnv }) {
  const d = block.data;
  const logos = d.logos.map((l) => ({ ...l, src: safeImageSrc(l.image_url), href: httpHref(l.url) })).filter((l) => l.src);
  if (!logos.length) return null;
  return (
    <section className={s.creator} aria-label={d.title || "Brands"}>
      <CardTitle title={d.title || "Worked with"} />
      <ul className={s.crLogos}>
        {logos.map((l, i) => {
          const img = <Img src={l.src!} alt={l.name} media={mediaFor(env, l.src)} sizes="120px" maxVariant={320} className={s.crLogoImg} />;
          return (
            <li key={i} className={s.crLogo}>
              {l.href ? (
                <a href={l.href} target="_blank" rel="noopener noreferrer" {...track(block.id, "brand")}>
                  {img}
                </a>
              ) : (
                img
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- post_grid ----------

export function PostGridBlock({ block, env }: { block: BlockOf<"post_grid">; env: PageEnv }) {
  const d = block.data;
  const resolved = d.resolved?.posts ?? [];
  const posts = d.posts
    .map((p, i) => ({ ...p, r: resolved[i]?.url === p.url ? resolved[i] : resolved.find((x) => x.url === p.url) }))
    .filter((p) => httpHref(p.url));
  if (!posts.length) return null;
  return (
    <section className={s.creator} aria-label={d.title || "Posts"}>
      <CardTitle title={d.title} />
      <ul className={s.crPosts}>
        {posts.map((p, i) => {
          const thumb = p.r?.status === "ok" ? safeImageSrc(p.r.thumb_url) : undefined;
          const platform = p.r?.platform ?? p.platform ?? "instagram";
          const label = p.caption || p.r?.title || `${PLATFORM_LABEL[platform] ?? "Post"} post`;
          return (
            <li key={i}>
              <a className={s.crPost} href={httpHref(p.url)} target="_blank" rel="noopener noreferrer" aria-label={label} {...track(block.id, `post:${platform}`)}>
                {thumb ? <Img src={thumb} alt="" media={mediaFor(env, thumb)} sizes="(max-width: 600px) 31vw, 180px" maxVariant={640} /> : <span className={s.crPostEmpty}>{PLATFORM_LABEL[platform]}</span>}
                <span className={s.crPostIcon} aria-hidden>
                  <SocialIcon platform={platform} />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- latest_video ----------

export function LatestVideoBlock({ block, env }: { block: BlockOf<"latest_video">; env: PageEnv }) {
  const d = block.data;
  const r = d.resolved;
  const videos = r?.status === "ok" ? (r.videos ?? []).slice(0, d.show?.count ?? 1) : [];
  const channel = `https://www.youtube.com/channel/${encodeURIComponent(d.channel_id)}`;
  if (!videos.length) {
    return (
      <a className={s.btn} href={channel} target="_blank" rel="noopener noreferrer" {...track(block.id, "channel")} style={{ justifyContent: "center" }}>
        {d.title || r?.channel_title || "Latest videos on YouTube"}
      </a>
    );
  }
  return (
    <section className={s.creator} aria-label={d.title || "Latest videos"}>
      <CardTitle title={d.title || (r?.channel_title ? `Latest from ${r.channel_title}` : undefined)} />
      {videos.map((v) => {
        const poster = safeImageSrc(v.thumb_url);
        const id = /^[\w-]{11}$/.test(v.video_id) ? v.video_id : null;
        if (!id) return null;
        return (
          <div key={id} className={s.crVideo}>
            <div className={s.embedVideo}>
              <button type="button" className={s.facade} data-embed={`https://www.youtube-nocookie.com/embed/${id}`} data-autoplay="autoplay=1" data-title={v.title} aria-label={`Play ${v.title}`} {...track(block.id, "play")}>
                {poster ? <Img className={s.facadePoster} src={poster} alt="" media={mediaFor(env, poster)} sizes="(max-width: 600px) 100vw, 560px" maxVariant={640} /> : null}
                <span className={s.facadePlay} aria-hidden>
                  <Play />
                </span>
              </button>
            </div>
            <div className={s.crVideoTitle}>{v.title}</div>
          </div>
        );
      })}
    </section>
  );
}

// ---------- shop_the_look ----------

export function ShopTheLookBlock({ block, env }: { block: BlockOf<"shop_the_look">; env: PageEnv }) {
  const d = block.data;
  const src = safeImageSrc(d.image_url);
  const spots = d.spots.filter((x) => httpHref(x.url));
  if (!src) return null;
  return (
    <section className={s.creator} aria-label="Shop the look">
      <div className={s.crLook}>
        <Img src={src} alt={d.alt || "Shop the look"} media={mediaFor(env, src)} sizes="(max-width: 600px) 92vw, 540px" />
        {spots.map((x, i) => (
          <a
            key={i}
            className={s.crSpot}
            href={httpHref(x.url)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ left: `${x.x}%`, top: `${x.y}%` }}
            aria-label={`${i + 1}. ${x.title}${x.price != null ? `, ${formatMoney(x.price, d.currency)}` : ""}`}
            {...track(block.id, "look_spot")}
          >
            {i + 1}
          </a>
        ))}
      </div>
      <ol className={s.crLookList}>
        {spots.map((x, i) => (
          <li key={i} className={s.crLookItem}>
            <span className={s.crLookNum} aria-hidden>
              {i + 1}
            </span>
            <span className={s.crLookText}>
              <span className={s.crLookName}>{x.title}</span>
              {x.price != null ? <span className={s.crMuted}>{formatMoney(x.price, d.currency)}</span> : null}
            </span>
            {x.code ? (
              <button type="button" className={s.crCode} data-copy={x.code} aria-label={`Copy code ${x.code}`} {...track(block.id, "copy")}>
                <span data-copy-label>{x.code}</span>
              </button>
            ) : null}
            <a className={s.crShop} href={httpHref(x.url)} target="_blank" rel="noopener noreferrer" {...track(block.id, "look_buy")}>
              Shop
            </a>
          </li>
        ))}
      </ol>
      <span role="status" className={s.srOnly} data-copy-status />
    </section>
  );
}

// ---------- gallery ----------

export function GalleryBlock({ block, env }: { block: BlockOf<"gallery">; env: PageEnv }) {
  const d = block.data;
  const imgs = d.images.map((x) => ({ ...x, src: safeImageSrc(x.url), href: httpHref(x.link_url) })).filter((x) => x.src);
  if (!imgs.length) return null;
  const carousel = d.layout === "carousel";
  const item = (x: (typeof imgs)[number], i: number) => {
    const img = <Img src={x.src!} alt={x.alt ?? ""} media={mediaFor(env, x.src)} sizes={carousel ? "(max-width: 600px) 92vw, 540px" : "(max-width: 600px) 31vw, 180px"} />;
    if (x.href)
      return (
        <a className={s.crGalleryItem} href={x.href} target="_blank" rel="noopener noreferrer" {...track(block.id)}>
          {img}
        </a>
      );
    return (
      <button type="button" className={s.crGalleryItem} data-lightbox={x.src} data-alt={x.alt ?? ""} aria-label={x.alt ? `Enlarge: ${x.alt}` : `Enlarge image ${i + 1}`}>
        {img}
      </button>
    );
  };
  return (
    <section className={s.creator} aria-label={d.title || "Gallery"}>
      <CardTitle title={d.title} />
      {carousel ? (
        <div className={s.sellGallery}>
          <div className={s.sellSlides} data-slides tabIndex={0} role="region" aria-label={`${d.title || "Gallery"}: ${imgs.length} images, swipe for more`}>
            {imgs.map((x, i) => (
              <div key={i} className={s.crSlide}>
                {item(x, i)}
              </div>
            ))}
          </div>
          {imgs.length > 1 ? (
            <span className={s.sellCount} aria-hidden data-slide-count>
              1 / {imgs.length}
            </span>
          ) : null}
        </div>
      ) : (
        <ul className={s.crGrid}>
          {imgs.map((x, i) => (
            <li key={i}>{item(x, i)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- events ----------

function fmtInTz(iso: string, tz: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: tz }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-GB", opts).format(new Date(iso));
  }
}

const STATUS: Record<string, string> = { sold_out: "Sold out", few_left: "Few left", cancelled: "Cancelled" };
const DAY: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

function addMinutes(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = (h * 60 + m + min) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function EventsBlock({ block }: { block: BlockOf<"events"> }) {
  const d = block.data;
  if (d.mode === "weekly") {
    const slots = d.weekly ?? [];
    if (!slots.length) return null;
    const c = d.computed;
    return (
      <section className={s.creator} aria-label={d.title || "Live schedule"}>
        <CardTitle title={d.title || "Live schedule"} />
        <ul className={s.crEvents}>
          {slots.map((w, i) => {
            const live = c?.live?.index === i ? c.live : null;
            const next = c?.next?.index === i ? c.next : null;
            const href = httpHref(w.url);
            const where = w.platform ? PLATFORM_LABEL[w.platform] : null;
            // server value first; runtime-core re-checks the instants (ISR pages can be minutes old)
            const label = live ? "Live now" : next ? `Next ${fmtInTz(next.starts_at, d.tz, { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : "";
            return (
              <li key={i} className={s.crEvent}>
                <span className={s.crWhen}>
                  <span className={s.crWhenDay}>{w.days.map((x) => DAY[x]).join(", ")}</span>
                  <span className={s.crMuted}>
                    {w.start}–{addMinutes(w.start, w.duration_min)}
                  </span>
                </span>
                <span className={s.crWhat}>
                  <span className={s.crEventTitle}>{w.title || (where ? `Live on ${where}` : "Live")}</span>
                  {w.title && where ? <span className={s.crMuted}>on {where}</span> : null}
                </span>
                <span
                  className={`${s.crLive} ${live ? s.crLiveOn : ""}`}
                  data-live-slot=""
                  data-live-end={live?.ends_at}
                  data-next-start={next?.starts_at}
                  data-next-end={next?.ends_at}
                  data-next-label={next ? label : undefined}
                  suppressHydrationWarning
                >
                  {label}
                </span>
                {href ? (
                  <a className={s.crShop} href={href} target="_blank" rel="noopener noreferrer" {...track(block.id, w.platform ? `live:${w.platform}` : "live")}>
                    Watch
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className={s.crMuted}>Times in {d.tz.replace(/_/g, " ")}</p>
      </section>
    );
  }
  const dates = d.dates ?? [];
  if (!dates.length) return null;
  return (
    <section className={s.creator} aria-label={d.title || "Events"}>
      <CardTitle title={d.title || "Upcoming dates"} />
      <ul className={s.crEvents}>
        {dates.map((e, i) => {
          const day = new Date(`${e.date}T00:00:00Z`);
          const href = httpHref(e.url);
          const where = [e.city, e.venue].filter(Boolean).join(" · ");
          const off = e.status === "sold_out" || e.status === "cancelled";
          return (
            <li key={i} className={`${s.crEvent} ${e.status === "cancelled" ? s.crEventOff : ""}`}>
              <span className={s.crDate} aria-hidden>
                <span className={s.crDateMonth}>{day.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</span>
                <span className={s.crDateDay}>{day.getUTCDate()}</span>
              </span>
              <span className={s.crWhat}>
                <span className={s.crEventTitle}>
                  <span className={s.srOnly}>{day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}: </span>
                  {e.title || e.city || "Event"}
                </span>
                <span className={s.crMuted}>{[where, e.time].filter(Boolean).join(" · ")}</span>
              </span>
              {e.status ? <span className={`${s.crStatus} ${e.status === "few_left" ? s.crStatusHot : ""}`}>{STATUS[e.status]}</span> : null}
              {href && !off ? (
                <a className={s.crShop} href={href} target="_blank" rel="noopener noreferrer" {...track(block.id, "tickets")}>
                  Tickets
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- podcast ----------

function fmtDuration(sec?: number): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

export function PodcastBlock({ block, env }: { block: BlockOf<"podcast">; env: PageEnv }) {
  const d = block.data;
  const r = d.resolved;
  const feed = httpHref(d.feed_url);
  const episodes = r?.status === "ok" ? (r.episodes ?? []).slice(0, d.count ?? 3) : [];
  const cover = safeImageSrc(r?.image_url);
  if (!episodes.length) {
    return feed ? (
      <a className={s.btn} href={feed} target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }} {...track(block.id, "feed")}>
        {d.title || r?.title || "Podcast"}
      </a>
    ) : null;
  }
  return (
    <section className={s.creator} aria-label={d.title || r?.title || "Podcast"}>
      <div className={s.crPodHead}>
        {cover ? <Img src={cover} alt="" media={mediaFor(env, cover)} sizes="64px" className={s.crPodCover} /> : null}
        <CardTitle title={d.title || r?.title || "Podcast"} />
      </div>
      <ul className={s.crEpisodes}>
        {episodes.map((ep, i) => {
          const audio = httpHref(ep.audio_url);
          const meta = [ep.published_at ? new Date(ep.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null, fmtDuration(ep.duration_sec)].filter(Boolean).join(" · ");
          return (
            <li key={i} className={s.crEpisode}>
              <span className={s.crEventTitle}>{ep.title}</span>
              {meta ? <span className={s.crMuted}>{meta}</span> : null}
              {/* preload="none": the browser fetches nothing from the podcast host until play */}
              {audio ? <audio className={s.crAudio} controls preload="none" src={audio} data-play-b={block.id} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- community ----------

const COMMUNITY: Record<string, { label: string; icon: SimpleIcon }> = {
  whatsapp_group: { label: "WhatsApp group", icon: siWhatsapp },
  whatsapp_channel: { label: "WhatsApp channel", icon: siWhatsapp },
  telegram: { label: "Telegram", icon: siTelegram },
  discord: { label: "Discord", icon: siDiscord },
  line: { label: "LINE", icon: siLine },
};

export function CommunityBlock({ block }: { block: BlockOf<"community"> }) {
  const d = block.data;
  const href = httpHref(d.url);
  const meta = COMMUNITY[d.platform];
  if (!href || !meta) return null;
  return (
    <section className={s.creator} aria-label={d.title}>
      <div className={s.crCommunity}>
        <BrandMark icon={meta.icon} label={meta.label} />
        <span className={s.crWhat}>
          <span className={s.crEventTitle}>{d.title}</span>
          <span className={s.crMuted}>{[meta.label, d.members_note].filter(Boolean).join(" · ")}</span>
        </span>
      </div>
      <a className={s.sellBtn} href={href} target="_blank" rel="noopener noreferrer" {...track(block.id, `join:${d.platform}`)}>
        {d.button_label || "Join"}
      </a>
    </section>
  );
}
