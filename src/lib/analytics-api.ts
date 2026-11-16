import { API_BASE, ApiError, USE_MOCK, request, tokenStore, refreshAccessToken } from "./api";

// Analytics v2 (SPEC "P2-4 Analytics v2"). Kept out of api.ts on purpose (3c owns that file);
// it only uses the exported request() transport.

export const RANGES = ["today", "yesterday", "7d", "30d", "90d", "month", "year", "custom"] as const;
export type RangeKey = (typeof RANGES)[number];
export type Interval = "hour" | "day" | "week";

export const DIMENSIONS = [
  "referrer",
  "channel",
  "country",
  "device",
  "browser",
  "os",
  "utm_source",
  "utm_medium",
  "utm_campaign",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export type Filters = Partial<Record<Dimension, string>>;

export interface AnalyticsQuery {
  range: RangeKey;
  from?: string;
  to?: string;
  interval?: Interval;
  tz?: string;
  filters?: Filters;
}

export interface Totals {
  visitors: number;
  views: number;
  clicks: number;
  /** 0..1 */
  ctr: number;
  /** share of visitors who clicked, 0..1 */
  engagement: number;
}
export interface RangeInfo {
  from: string;
  to: string;
  tz: string;
  interval: Interval;
}
export interface Overview {
  /** from inclusive, to exclusive (RFC 3339 in tz) */
  range: RangeInfo;
  totals: Totals;
  previous: Totals;
  /** % change per key, 1 decimal; null when previous was 0 */
  change: Record<keyof Totals, number | null>;
  series: { t: string; views: number; clicks: number; visitors: number }[];
  top_link: { block_id: string; title: string; clicks: number } | null;
}
export interface Breakdown {
  range: RangeInfo;
  dimension: Dimension;
  items: { value: string; views: number; clicks: number; visitors: number }[];
}
export interface BlockStat {
  block_id: string;
  type: string;
  title: string;
  clicks: number;
  is_visible: boolean;
  deleted: boolean;
  created_at: string;
  /** P3: clicks per meta.action, e.g. {"buy": 2, "marketplace:shopee": 1}; {} when none */
  actions?: Record<string, number>;
}
export interface BlockSeries {
  range: RangeInfo;
  block_id: string;
  clicks: number;
  series: { t: string; clicks: number }[];
}

export function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function toParams(q: AnalyticsQuery, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  p.set("range", q.range);
  if (q.range === "custom") {
    if (q.from) p.set("from", q.from);
    if (q.to) p.set("to", q.to);
  }
  if (q.interval) p.set("interval", q.interval);
  p.set("tz", q.tz ?? browserTz());
  for (const [k, v] of Object.entries(q.filters ?? {})) if (v !== undefined) p.set(k, v);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}

export const analyticsApi = {
  overview: (q: AnalyticsQuery) => (USE_MOCK ? mock.overview(q) : request<Overview>(`/analytics/overview?${toParams(q)}`)),
  breakdown: (q: AnalyticsQuery, dimension: Dimension, limit = 20) =>
    USE_MOCK ? mock.breakdown(q, dimension) : request<Breakdown>(`/analytics/breakdown?${toParams(q, { dimension, limit: String(limit) })}`),
  blocks: (q: AnalyticsQuery) => (USE_MOCK ? mock.blocks(q) : request<{ range: RangeInfo; items: BlockStat[] }>(`/analytics/blocks?${toParams(q)}`)),
  blockSeries: (q: AnalyticsQuery, id: string) =>
    USE_MOCK ? mock.blockSeries(q, id) : request<BlockSeries>(`/analytics/blocks/${encodeURIComponent(id)}/series?${toParams(q)}`),
  /** Downloads GET /analytics/export.csv with the owner's token (a plain link can't send it). */
  async exportCsv(q: AnalyticsQuery, type: "series" | "breakdown" | "blocks", dimension?: Dimension) {
    const params = toParams(q, { type, ...(dimension ? { dimension } : {}) });
    const name = `tautan-analytics-${type}${dimension ? `-${dimension}` : ""}-${q.range}.csv`;
    let blob: Blob;
    if (USE_MOCK) {
      blob = new Blob(["t,views,clicks,visitors\n2026-11-16,10,3,8\n"], { type: "text/csv" });
    } else {
      const get = (token: string | null) =>
        fetch(`${API_BASE}/analytics/export.csv?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
      let res = await get(tokenStore.get());
      if (res.status === 401) res = await get(await refreshAccessToken());
      if (!res.ok) throw new ApiError(res.status, `http_${res.status}`, "Couldn't export the CSV.");
      blob = await res.blob();
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  },
};

// ---------- mock (NEXT_PUBLIC_API_MOCK=1; the in-memory mock server has no v2 endpoints) ----------

function seeded(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function hashStr(x: string) {
  let h = 7;
  for (const c of x) h = (h * 31 + c.charCodeAt(0)) % 1e9;
  return h;
}
function days(q: AnalyticsQuery): number {
  const map: Partial<Record<RangeKey, number>> = { today: 1, yesterday: 1, "7d": 7, "30d": 30, "90d": 90, month: 16, year: 320 };
  if (q.range === "custom" && q.from && q.to) return Math.max(1, Math.round((Date.parse(q.to) - Date.parse(q.from)) / 864e5) + 1);
  return map[q.range] ?? 30;
}
function interval(q: AnalyticsQuery): Interval {
  const d = days(q);
  return q.interval ?? (d <= 2 ? "hour" : d <= 93 ? "day" : "week");
}
const filterFactor = (q: AnalyticsQuery) => (Object.keys(q.filters ?? {}).length ? 0.35 : 1);

const mock = {
  async overview(q: AnalyticsQuery): Promise<Overview> {
    await new Promise((r) => setTimeout(r, 250));
    const n = days(q);
    const iv = interval(q);
    const r = seeded(hashStr(JSON.stringify(q)));
    const f = filterFactor(q);
    const end = new Date();
    const buckets = iv === "hour" ? n * 24 : iv === "week" ? Math.ceil(n / 7) : n;
    const step = iv === "hour" ? 36e5 : iv === "week" ? 7 * 864e5 : 864e5;
    const series = Array.from({ length: buckets }, (_, i) => {
      const t = new Date(end.getTime() - (buckets - 1 - i) * step);
      const scale = iv === "hour" ? 0.08 : iv === "week" ? 7 : 1;
      const views = Math.round((90 + r() * 60) * scale * f);
      const clicks = Math.round(views * (0.25 + r() * 0.2));
      const visitors = Math.round(views * (0.7 + r() * 0.1));
      const iso = t.toISOString();
      return { t: iv === "hour" ? iso.slice(0, 13) + ":00" : iso.slice(0, 10), views, clicks, visitors };
    });
    const sum = (k: "views" | "clicks" | "visitors") => series.reduce((a, x) => a + x[k], 0);
    const totals = { views: sum("views"), clicks: sum("clicks"), visitors: sum("visitors"), ctr: 0, engagement: 0 };
    totals.ctr = totals.views ? totals.clicks / totals.views : 0;
    totals.engagement = totals.visitors ? Math.min(1, (totals.clicks * 0.7) / totals.visitors) : 0;
    const previous = { ...totals, views: Math.round(totals.views * 0.86), clicks: Math.round(totals.clicks * 0.93), visitors: Math.round(totals.visitors * 0.9) };
    previous.ctr = previous.clicks / previous.views;
    previous.engagement = totals.engagement * 0.95;
    const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
    return {
      // like the BE: to is exclusive (the day after the last bucket)
      range: { from: series[0].t.slice(0, 10), to: new Date(Date.parse(series[series.length - 1].t.slice(0, 10)) + 864e5).toISOString().slice(0, 10), tz: q.tz ?? "UTC", interval: iv },
      totals,
      previous,
      change: {
        views: pct(totals.views, previous.views),
        clicks: pct(totals.clicks, previous.clicks),
        visitors: pct(totals.visitors, previous.visitors),
        ctr: pct(totals.ctr, previous.ctr),
        engagement: pct(totals.engagement, previous.engagement),
      },
      series,
      top_link: { block_id: "m1", title: "Order stoneware plates", clicks: Math.round(totals.clicks * 0.3) },
    };
  },
  async breakdown(q: AnalyticsQuery, dimension: Dimension): Promise<Breakdown> {
    await new Promise((r) => setTimeout(r, 200));
    const values: Record<Dimension, string[]> = {
      referrer: ["instagram.com", "", "tiktok.com", "google.com", "wa.me"],
      channel: ["social", "direct", "search", "qr", "email", "referral"],
      country: ["ID", "MY", "SG", "AU", "NL"],
      device: ["mobile", "desktop", "tablet"],
      browser: ["Instagram", "Chrome", "Safari", "TikTok", "Samsung Internet"],
      os: ["Android", "iOS", "Windows", "macOS"],
      utm_source: ["newsletter", "ig_bio", "flyer"],
      utm_medium: ["email", "social", "print"],
      utm_campaign: ["spring", "launch"],
    };
    const f = filterFactor(q) * days(q);
    const items = values[dimension].map((value, i) => {
      const views = Math.round((120 / (i + 1)) * f);
      return { value, views, clicks: Math.round(views * 0.34), visitors: Math.round(views * 0.74) };
    });
    return { range: { from: "", to: "", tz: "UTC", interval: interval(q) }, dimension, items };
  },
  async blocks(q: AnalyticsQuery) {
    await new Promise((r) => setTimeout(r, 200));
    const f = filterFactor(q) * days(q);
    const items: BlockStat[] = [
      ["m1", "link", "Order stoneware plates", true, false],
      ["m2", "link", "Saturday wheel class", true, false],
      ["m3", "discount_code", "SPRING20", true, false],
      ["m4", "file", "Care guide", true, false],
      ["m5", "link", "Old price list", false, false],
      ["m6", "link", "Summer sale", true, true],
    ].map(([block_id, type, title, is_visible, deleted], i) => ({
      block_id: block_id as string,
      type: type as string,
      title: title as string,
      clicks: Math.round((40 / (i + 1)) * f),
      is_visible: is_visible as boolean,
      deleted: deleted as boolean,
      created_at: "2026-10-01T00:00:00Z",
    }));
    return { range: { from: "", to: "", tz: "UTC", interval: interval(q) }, items };
  },
  async blockSeries(q: AnalyticsQuery, id: string): Promise<BlockSeries> {
    const o = await mock.overview({ ...q, filters: { ...q.filters, referrer: id } });
    const series = o.series.map((x) => ({ t: x.t, clicks: Math.round(x.clicks * 0.4) }));
    return { range: o.range, block_id: id, clicks: series.reduce((a, x) => a + x.clicks, 0), series };
  },
};
