// Turns a pasted media URL into an iframe embed. Returns null for anything we don't recognise,
// so the renderer can fall back to a plain link.

export type EmbedProvider = "youtube" | "vimeo" | "spotify" | "soundcloud";

export interface Embed {
  provider: EmbedProvider;
  src: string;
  /** "video" embeds keep 16:9; "audio" embeds use a fixed pixel height. */
  kind: "video" | "audio";
  height?: number;
  title: string;
}

function parse(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

const YT_ID = /^[\w-]{11}$/;

export function youtubeId(raw: string): string | null {
  const u = parse(raw);
  if (!u) return null;
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/);
      id = m?.[1] ?? null;
    }
  }
  return id && YT_ID.test(id) ? id : null;
}

export function toVideoEmbed(raw: string): Embed | null {
  const yt = youtubeId(raw);
  if (yt) {
    return { provider: "youtube", kind: "video", title: "YouTube video", src: `https://www.youtube-nocookie.com/embed/${yt}` };
  }
  const u = parse(raw);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(?:^|\/)(\d{6,})(?:\/([\da-f]+))?/);
    if (m) {
      const hash = m[2] ? `?h=${m[2]}` : "";
      return { provider: "vimeo", kind: "video", title: "Vimeo video", src: `https://player.vimeo.com/video/${m[1]}${hash}` };
    }
  }
  return null;
}

const SPOTIFY_TYPES = new Set(["track", "album", "playlist", "episode", "show", "artist"]);

export function toMusicEmbed(raw: string): Embed | null {
  const u = parse(raw);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "open.spotify.com") {
    // /intl-id/track/ID or /embed/track/ID or /track/ID
    const parts = u.pathname.split("/").filter((p) => p && !p.startsWith("intl-") && p !== "embed");
    const [type, id] = parts;
    if (type && id && SPOTIFY_TYPES.has(type) && /^[A-Za-z0-9]+$/.test(id)) {
      const compact = type === "track" || type === "episode";
      return {
        provider: "spotify",
        kind: "audio",
        height: compact ? 152 : 352,
        title: `Spotify ${type}`,
        src: `https://open.spotify.com/embed/${type}/${id}`,
      };
    }
  }
  // on.soundcloud.com short links are redirects the widget can't resolve; they fall back to a link.
  if (host === "soundcloud.com" || host === "m.soundcloud.com") {
    if (u.pathname.split("/").filter(Boolean).length >= 1) {
      const clean = `https://soundcloud.com${u.pathname}`;
      const isSet = u.pathname.includes("/sets/");
      return {
        provider: "soundcloud",
        kind: "audio",
        height: isSet ? 352 : 166,
        title: "SoundCloud player",
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}&visual=false&show_comments=false`,
      };
    }
  }
  return null;
}

const BOOKING_HOSTS = new Set(["calendly.com", "cal.com", "app.cal.com"]);

/** Calendly / Cal.com URL → iframe src, or null for anything else (the BE validates too). */
export function bookingEmbedSrc(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (u.protocol !== "https:" || !BOOKING_HOSTS.has(host) || u.pathname.length < 2) return null;
    if (host === "calendly.com") {
      u.searchParams.set("hide_gdpr_banner", "1");
      return u.toString();
    }
    u.searchParams.set("embed", "true");
    return u.toString();
  } catch {
    return null;
  }
}
