/**
 * In-memory mock of the Tautan API, enabled by NEXT_PUBLIC_API_MOCK=1.
 * Mirrors SPEC.md's contract closely enough for FE development. State is per
 * JS realm (browser tab / server process) and resets on reload — except in the
 * browser, where it's persisted to localStorage so the editor survives reloads.
 *
 * Seed login: demo@tautan.id / password123  (username "demo", published)
 */
import type { Transport } from "../api";
import type {
  AnalyticsSummary,
  Block,
  BlockType,
  ContactSubmission,
  Profile,
  Tab,
  Theme,
  User,
} from "../types";

interface DB {
  users: (User & { password: string })[];
  profiles: Profile[];
  tabs: Tab[];
  blocks: Block[];
  submissions: ContactSubmission[];
  /** refresh "cookie" — mock keeps one session per realm */
  session: string | null;
}

const LS_KEY = "tautan-mock-db-v1";
const now = () => new Date().toISOString();
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const DEFAULT_THEME: Theme = {
  preset: "default",
  bg: { type: "color", value: "#f6f5f1" },
  button: { style: "fill", radius: 14, color: "#111111", text_color: "#ffffff" },
  font: "Inter",
  text_color: "#111111",
};

function seed(): DB {
  const userId = uid();
  const profileId = uid();
  const t1 = uid();
  const t2 = uid();
  const folderId = uid();
  const contactId = uid();
  const ts = now();
  const b = <K extends BlockType>(
    type: K,
    data: Extract<Block, { type: K }>["data"],
    position: number,
    extra: Partial<Block> = {},
  ): Block =>
    ({
      id: uid(),
      profile_id: profileId,
      tab_id: t1,
      parent_id: null,
      type,
      data,
      position,
      is_visible: true,
      created_at: ts,
      updated_at: ts,
      ...extra,
    }) as Block;

  return {
    users: [{ id: userId, email: "demo@tautan.id", password: "password123", created_at: ts }],
    profiles: [
      {
        id: profileId,
        user_id: userId,
        username: "demo",
        display_name: "Sari Wulandari",
        bio: "Ceramicist in Yogyakarta. Small-batch stoneware, workshops on weekends.",
        avatar_url: null,
        theme: DEFAULT_THEME,
        seo: { title: "Sari Wulandari — Ceramics", description: "Shop, workshops and studio notes." },
        is_published: true,
        created_at: ts,
        updated_at: ts,
      },
    ],
    tabs: [
      { id: t1, profile_id: profileId, title: "Links", slug: "links", position: 0 },
      { id: t2, profile_id: profileId, title: "Workshops", slug: "workshops", position: 1 },
    ],
    blocks: [
      b("social_icons", { items: [
        { platform: "instagram", url: "https://instagram.com/" },
        { platform: "tiktok", url: "https://tiktok.com/" },
        { platform: "email", url: "mailto:hello@example.com" },
      ] }, 0),
      b("link", { title: "Shop the spring glaze collection", url: "https://example.com/shop" }, 1),
      b("folder", { title: "Studio favourites" }, 2, { id: folderId }),
      b("link", { title: "Clay supplier I use", url: "https://example.com/clay" }, 0, { parent_id: folderId }),
      b("link", { title: "My wheel setup", url: "https://example.com/wheel" }, 1, { parent_id: folderId }),
      b("text", { content: "New pieces drop on the **first Friday** of each month." }, 3),
      b("video", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, 4, { is_visible: false }),
      b("faq", { items: [
        { q: "Do you ship internationally?", a: "Yes, to most of Southeast Asia." },
        { q: "Are pieces food safe?", a: "All glazes are lead-free and food safe." },
      ] }, 0, { tab_id: t2 }),
      b("testimonial", { items: [
        { quote: "Best Saturday I've had in months.", author: "Dimas" },
      ] }, 1, { tab_id: t2 }),
      b("contact_form", { title: "Book a private session", button_label: "Send" }, 2, { tab_id: t2, id: contactId }),
    ],
    submissions: Array.from({ length: 7 }, (_, i) => ({
      id: uid(),
      profile_id: profileId,
      block_id: contactId,
      name: ["Rina", "Bayu", "Ayu", "Kevin", "Putri", "Andre", "Mei"][i],
      email: `person${i}@example.com`,
      message: "Hi! Is there space for 3 people next Saturday? We're beginners.",
      created_at: new Date(Date.now() - i * 36e5 * 9).toISOString(),
    })),
    session: null,
  };
}

let db: DB | null = null;
const isBrowser = typeof window !== "undefined";

function load(): DB {
  if (db) return db;
  if (isBrowser) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) db = JSON.parse(raw) as DB;
    } catch {}
  }
  db ??= seed();
  return db;
}
function save() {
  if (isBrowser && db) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(db));
    } catch {}
  }
}

export function resetMockDb() {
  db = seed();
  save();
}

// tokens are "mock.<userId>"
const tokenFor = (u: User) => `mock.${u.id}`;
const userFromToken = (d: DB, t: string | null) =>
  t?.startsWith("mock.") ? d.users.find((u) => u.id === t.slice(5)) : undefined;

const ok = (json: unknown, status = 200) => ({ status, json });
const err = (status: number, code: string, message: string) => ({
  status,
  json: { error: { code, message } },
});
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tab";

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && new Set(a).size === a.length && b.every((x) => a.includes(x));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockTransport: Transport = async (path, { method, body, token }) => {
  await sleep(120 + Math.random() * 180);
  const d = load();
  const url = new URL(path, "http://mock");
  const p = url.pathname;
  const B = (body ?? {}) as Record<string, unknown>;
  const res = route();
  if (method !== "GET") save();
  return res;

  function route() {
    // ----- auth -----
    if (p === "/auth/username-available") {
      const u = (url.searchParams.get("u") ?? "").toLowerCase();
      const reserved = ["admin", "dashboard", "login", "signup", "api", "settings"];
      return ok({ available: !reserved.includes(u) && !d.profiles.some((x) => x.username === u) });
    }
    if (p === "/auth/signup" && method === "POST") {
      const email = String(B.email ?? "").toLowerCase();
      // P2-6: username optional → temporary name + suggestion
      const claimed = !!B.username;
      const username = claimed ? String(B.username).toLowerCase() : `tmp.${uid().replace(/-/g, "").slice(0, 10)}`;
      const suggested = email.split("@")[0].replace(/[^a-z0-9_.]/g, ".").slice(0, 30);
      if (d.users.some((u) => u.email === email)) return err(409, "email_taken", "That email is already registered.");
      if (d.profiles.some((x) => x.username === username)) return err(409, "username_taken", "That username is taken.");
      const user = { id: uid(), email, password: String(B.password), created_at: now() };
      const profile: Profile = {
        id: uid(), user_id: user.id, username, display_name: claimed ? username : "", bio: "", avatar_url: null,
        theme: DEFAULT_THEME, seo: {}, is_published: false, created_at: now(), updated_at: now(),
        onboarding: { completed: false, username_claimed: claimed, ...(claimed ? {} : { suggested_username: suggested }) },
      };
      d.users.push(user);
      d.profiles.push(profile);
      d.tabs.push({ id: uid(), profile_id: profile.id, title: "Links", slug: "links", position: 0 });
      d.session = user.id;
      const { password: _pw, ...pub } = user;
      void _pw;
      return ok({ access_token: tokenFor(user), user: pub, profile }, 201);
    }
    if (p === "/auth/login" && method === "POST") {
      const user = d.users.find((u) => u.email === String(B.email ?? "").toLowerCase());
      if (!user || user.password !== B.password) return err(401, "invalid_credentials", "Email or password is incorrect.");
      d.session = user.id;
      const { password: _pw, ...pub } = user;
      void _pw;
      return ok({ access_token: tokenFor(user), user: pub, profile: d.profiles.find((x) => x.user_id === user.id) });
    }
    if (p === "/auth/refresh" && method === "POST") {
      const user = d.users.find((u) => u.id === d.session);
      return user ? ok({ access_token: tokenFor(user) }) : err(401, "no_session", "Not signed in.");
    }
    if (p === "/auth/logout") {
      d.session = null;
      return ok(null, 204);
    }

    // ----- public -----
    const pub = p.match(/^\/public\/([^/]+)(\/events|\/contact|\/form|\/subscribe)?$/);
    if (pub) {
      const prof = d.profiles.find((x) => x.username === decodeURIComponent(pub[1]).toLowerCase());
      if (!prof || !prof.is_published) return err(404, "not_found", "Page not found.");
      if (pub[2] === "/events") return ok(null, 204);
      if (pub[2] === "/contact") {
        d.submissions.unshift({
          id: uid(), profile_id: prof.id, block_id: String(B.block_id), name: String(B.name),
          email: String(B.email), message: String(B.message), created_at: now(),
        });
        return ok(null, 201);
      }
      if (pub[2] === "/form" || pub[2] === "/subscribe") {
        // minimal: accept and answer like the BE; nothing is stored (Forms/Audience stay empty in the mock)
        const want = pub[2] === "/form" ? "form" : "email_signup";
        const blk = d.blocks.find((b) => b.id === B.block_id && b.profile_id === prof.id && !b.deleted_at);
        if (!blk || blk.type !== want) return err(400, "invalid_block", "form not found on this page");
        if (want === "email_signup" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(B.email ?? "")))
          return err(400, "invalid_email", "email address is invalid");
        const msg = (blk.data as { success_message?: string }).success_message ?? "";
        return ok(want === "form" ? { id: uid(), success_message: msg } : { success_message: msg }, 201);
      }
      return ok({
        profile: prof,
        tabs: d.tabs.filter((t) => t.profile_id === prof.id).sort((a, b) => a.position - b.position),
        blocks: d.blocks.filter((b) => b.profile_id === prof.id && b.is_visible && !b.deleted_at),
      });
    }

    // ----- owner -----
    const user = userFromToken(d, token);
    if (!user) return err(401, "unauthorized", "Missing or invalid token.");
    const profile = d.profiles.find((x) => x.user_id === user.id)!;
    const mine = <T extends { profile_id: string }>(xs: T[]) => xs.filter((x) => x.profile_id === profile.id);
    /** live (not soft-deleted) blocks of this profile */
    const live = () => mine(d.blocks).filter((b) => !b.deleted_at);
    const { password: _pw, ...pubUser } = user;
    void _pw;

    if (p === "/me") return ok({ user: pubUser, profile });

    if (p === "/profile" && method === "PATCH") {
      if (B.username && B.username !== profile.username && d.profiles.some((x) => x.username === B.username))
        return err(409, "username_taken", "That username is taken.");
      if (B.is_published && !B.username && profile.onboarding && !profile.onboarding.username_claimed)
        return err(400, "username_not_claimed", "claim a username before publishing");
      const { onboarding, ...rest } = B as { onboarding?: Record<string, unknown>; announcement?: Profile["announcement"] };
      if (rest.announcement) {
        // like the BE: id is stable across edits, new only after null + re-create
        rest.announcement = { layout: "banner", ...rest.announcement, id: profile.announcement?.id ?? Math.random().toString(16).slice(2, 18) };
      }
      Object.assign(profile, rest, { updated_at: now() });
      if (onboarding || B.username) {
        const ob = { ...(profile.onboarding ?? { completed: true, username_claimed: true }), ...(onboarding ?? {}) } as NonNullable<Profile["onboarding"]>;
        if (B.username) {
          ob.username_claimed = true;
          delete ob.suggested_username;
        }
        if (onboarding?.completed) ob.completed_at = now();
        profile.onboarding = ob;
      }
      return ok(profile);
    }
    if (p === "/profile/editor") {
      return ok({
        profile,
        tabs: mine(d.tabs).sort((a, b) => a.position - b.position),
        blocks: live(),
      });
    }

    if (p === "/tabs" && method === "POST") {
      const title = String(B.title ?? "New tab");
      const tab: Tab = {
        id: uid(), profile_id: profile.id, title, slug: B.slug ? String(B.slug) : slugify(title),
        position: mine(d.tabs).length,
      };
      d.tabs.push(tab);
      return ok(tab, 201);
    }
    if (p === "/tabs/order" && method === "PUT") {
      if (!sameSet(B.ids as string[], mine(d.tabs).map((t) => t.id)))
        return err(400, "order_mismatch", "ids must list every tab exactly once");
      (B.ids as string[]).forEach((id, i) => {
        const t = d.tabs.find((x) => x.id === id && x.profile_id === profile.id);
        if (t) t.position = i;
      });
      return ok(null, 204);
    }
    const tabM = p.match(/^\/tabs\/([^/]+)$/);
    if (tabM) {
      const tab = mine(d.tabs).find((t) => t.id === tabM[1]);
      if (!tab) return err(404, "not_found", "Tab not found.");
      if (method === "PATCH") {
        if (B.slug && mine(d.tabs).some((t) => t.id !== tab.id && t.slug === B.slug))
          return err(409, "slug_taken", "another tab already uses this slug");
        Object.assign(tab, B);
        return ok(tab);
      }
      if (method === "DELETE") {
        if (mine(d.tabs).length <= 1) return err(400, "last_tab", "A page needs at least one tab.");
        d.tabs = d.tabs.filter((t) => t.id !== tab.id);
        d.blocks = d.blocks.filter((b) => b.tab_id !== tab.id);
        return ok(null, 204);
      }
    }

    if (p === "/blocks" && method === "POST") {
      const parent_id = (B.parent_id as string | null) ?? null;
      const siblings = live().filter((b) => b.tab_id === B.tab_id && b.parent_id === parent_id);
      const block = {
        id: uid(), profile_id: profile.id, tab_id: String(B.tab_id), parent_id, type: B.type,
        data: B.data, position: siblings.length, is_visible: true, created_at: now(), updated_at: now(),
      } as Block;
      d.blocks.push(block);
      return ok(block, 201);
    }
    if (p === "/blocks/order" && method === "PUT") {
      const ids = B.ids as string[];
      const first = live().find((b) => b.id === ids[0]);
      const group = first ? live().filter((b) => b.tab_id === B.tab_id && b.parent_id === first.parent_id) : [];
      if (!first || !sameSet(ids, group.map((b) => b.id)))
        return err(400, "order_mismatch", "ids must list the whole sibling group exactly once");
      ids.forEach((id, i) => {
        const b = d.blocks.find((x) => x.id === id && x.profile_id === profile.id);
        if (b) b.position = i;
      });
      return ok(null, 204);
    }
    if (p === "/blocks/deleted") {
      const blocks = mine(d.blocks)
        .filter((b) => b.deleted_at && (b as { deleted_with?: string }).deleted_with === b.id)
        .sort((a, b) => (b.deleted_at ?? "").localeCompare(a.deleted_at ?? ""));
      return ok({ blocks });
    }
    const restM = p.match(/^\/blocks\/([^/]+)\/restore$/);
    if (restM && method === "POST") {
      const block = mine(d.blocks).find((b) => b.id === restM[1] && b.deleted_at);
      if (!block) return err(404, "not_found", "Block not found.");
      const parentLive = block.parent_id && live().some((b) => b.id === block.parent_id);
      if (block.parent_id && !parentLive) block.parent_id = null;
      block.position = live().filter((b) => b.tab_id === block.tab_id && b.parent_id === block.parent_id).length;
      d.blocks.forEach((b) => {
        if ((b as { deleted_with?: string }).deleted_with === block.id) {
          delete b.deleted_at;
          delete (b as { deleted_with?: string }).deleted_with;
        }
      });
      return ok(block);
    }
    const blkM = p.match(/^\/blocks\/([^/]+)$/);
    if (blkM) {
      const block = live().find((b) => b.id === blkM[1]);
      if (!block) return err(404, "not_found", "Block not found.");
      if (method === "PATCH") {
        Object.assign(block, B, { updated_at: now() });
        if (block.type === "folder" && B.tab_id)
          d.blocks.forEach((c) => { if (c.parent_id === block.id) c.tab_id = String(B.tab_id); });
        return ok(block);
      }
      if (method === "DELETE") {
        // P2-1 soft delete; live children go with their folder.
        const at = now();
        d.blocks.forEach((b) => {
          if (b.id === block.id || (b.parent_id === block.id && !b.deleted_at)) Object.assign(b, { deleted_at: at, deleted_with: block.id });
        });
        return ok(null, 204);
      }
    }

    if (p === "/uploads" && method === "POST") {
      const file = body instanceof FormData ? body.get("file") : null;
      if (!(file instanceof Blob)) return err(400, "no_file", "No file uploaded.");
      // The mock can't store files; return a stable placeholder URL that passes URL validation.
      const name = (file as File).name ?? "file";
      if (url.searchParams.get("kind") === "file")
        return ok({ url: `https://example.com/files/${encodeURIComponent(name)}`, file_name: name, size: file.size, content_type: file.type }, 201);
      return ok({ url: `https://picsum.photos/seed/${uid().slice(0, 8)}/600/600`, file_name: name, size: file.size, content_type: file.type }, 201);
    }

    if (p === "/analytics/summary") {
      const days = Number((url.searchParams.get("range") ?? "7d").replace("d", "")) || 7;
      const series = Array.from({ length: days }, (_, i) => {
        const date = new Date(Date.now() - (days - 1 - i) * 864e5).toISOString().slice(0, 10);
        const views = Math.round(80 + 40 * Math.sin(i / 3) + ((i * 37) % 23));
        return { date, views, clicks: Math.round(views * (0.3 + ((i * 13) % 10) / 50)) };
      });
      const views = series.reduce((s, x) => s + x.views, 0);
      const clicks = series.reduce((s, x) => s + x.clicks, 0);
      const links = live().filter((b) => b.type === "link");
      const summary: AnalyticsSummary = {
        views, clicks, ctr: views ? clicks / views : 0, series,
        top_links: links.slice(0, 5).map((b, i) => ({
          block_id: b.id, title: (b.data as { title: string }).title, clicks: Math.round(clicks / (i + 2)),
        })),
        top_referrers: [
          { referrer: "instagram.com", count: Math.round(views * 0.46) },
          { referrer: "direct", count: Math.round(views * 0.28) },
          { referrer: "tiktok.com", count: Math.round(views * 0.17) },
          { referrer: "google.com", count: Math.round(views * 0.09) },
        ],
      };
      return ok(summary);
    }

    // P2-6: import preview/apply (no network in the mock)
    if (p === "/import" && method === "POST") {
      const preview = {
        source_url: String(B.url ?? ""),
        profile: { display_name: "Imported Name", bio: "Imported bio", avatar_url: "" },
        links: [{ title: "My shop", url: "https://example.com/shop" }, { title: "Latest video", url: "https://example.com/video" }],
        socials: [{ platform: "instagram", url: "https://instagram.com/example" }],
      };
      if (!B.apply) return ok({ preview });
      const tabId = String(B.tab_id ?? mine(d.tabs)[0]?.id);
      preview.links.forEach((l) => {
        d.blocks.push({ id: uid(), profile_id: profile.id, tab_id: tabId, parent_id: null, type: "link", data: l, position: live().filter((b) => b.tab_id === tabId && !b.parent_id).length, is_visible: true, created_at: now(), updated_at: now() } as Block);
      });
      if (!profile.display_name || profile.display_name === profile.username) profile.display_name = preview.profile.display_name;
      if (!profile.bio) profile.bio = preview.profile.bio;
      profile.onboarding = { ...(profile.onboarding ?? { completed: false, username_claimed: true }), source: "import" };
      return ok({ preview, applied: { links: 2, socials: 0, display_name: true, bio: true, avatar: false }, profile });
    }
    // P2-5: classify only (no network fetch in the mock)
    if (p === "/unfurl" && method === "POST") {
      const raw = String(B.url ?? "").trim();
      if (!raw) return err(400, "invalid_url", "url is required");
      const addr = raw.replace(/^mailto:/, "");
      if (!addr.includes("/") && addr.includes("@"))
        return ok({ url: `mailto:${addr}`, suggested_type: "link", dest_kind: "email", fetched: false, title: addr, description: "", image_url: "", site_name: "" });
      let u: URL;
      try {
        u = new URL(raw.includes("://") ? raw : `https://${raw}`);
      } catch {
        return err(400, "invalid_url", "not a valid http(s) URL");
      }
      const host = u.hostname.replace(/^www\./, "");
      const t = /youtube\.com|youtu\.be|vimeo\.com/.test(host) ? "video" : /spotify\.com|soundcloud\.com/.test(host) ? "music" : /^(calendly\.com|cal\.com|app\.cal\.com)$/.test(host) ? "booking" : /\.(png|jpe?g|gif|webp)$/i.test(u.pathname) ? "image" : "link";
      return ok({ url: u.toString(), suggested_type: t, fetched: false, title: "", description: "", image_url: t === "image" ? u.toString() : "", site_name: host });
    }
    // P2-3 (minimal): forms list from blocks, no stored submissions/contacts in the mock.
    if (p === "/forms") {
      const items = live()
        .filter((b) => b.type === "form" || b.type === "email_signup")
        .map((b) => ({ block_id: b.id, type: b.type, title: (b.data as { title?: string }).title ?? "", tab_id: b.tab_id, is_visible: b.is_visible, responses: 0, last_response_at: null }));
      return ok({ items });
    }
    if (/^\/forms\/[^/]+\/submissions$/.test(p)) return ok({ items: [], next_cursor: null });
    if (p === "/audience") return ok({ items: [], next_cursor: null, counts: { all: 0, subscribed: 0, unsubscribed: 0 } });
    if (p === "/contact-submissions") {
      const all = mine(d.submissions).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const start = Number(url.searchParams.get("cursor") ?? 0);
      const items = all.slice(start, start + 20);
      return ok({ items, next_cursor: start + 20 < all.length ? String(start + 20) : null });
    }

    return err(404, "not_found", `No mock route for ${method} ${p}`);
  }
};
