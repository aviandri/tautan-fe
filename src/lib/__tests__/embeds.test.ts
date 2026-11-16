import { describe, expect, it } from "vitest";
import { toMusicEmbed, toVideoEmbed, youtubeId } from "../embeds";

describe("youtube", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=10",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  ])("parses %s", (u) => expect(youtubeId(u)).toBe("dQw4w9WgXcQ"));

  it("rejects look-alikes", () => {
    expect(youtubeId("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeId("https://youtube.com/watch?v=short")).toBeNull();
  });

  it("embeds via nocookie", () => {
    expect(toVideoEmbed("https://youtu.be/dQw4w9WgXcQ")?.src).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
});

describe("vimeo", () => {
  it("parses public and unlisted links", () => {
    expect(toVideoEmbed("https://vimeo.com/76979871")?.src).toBe("https://player.vimeo.com/video/76979871");
    expect(toVideoEmbed("https://vimeo.com/76979871/abc123ef")?.src).toBe("https://player.vimeo.com/video/76979871?h=abc123ef");
  });
});

describe("music", () => {
  it("spotify track is compact, playlist tall, intl prefix ignored", () => {
    const t = toMusicEmbed("https://open.spotify.com/intl-id/track/4uLU6hMCjMI75M1A2tKUQC?si=x");
    expect(t?.src).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
    expect(t?.height).toBe(152);
    expect(toMusicEmbed("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")?.height).toBe(352);
  });
  it("soundcloud", () => {
    const e = toMusicEmbed("https://soundcloud.com/forss/flickermood");
    expect(e?.src).toContain(encodeURIComponent("https://soundcloud.com/forss/flickermood"));
  });
  it("returns null for unknown hosts and non-http", () => {
    expect(toMusicEmbed("https://example.com/song")).toBeNull();
    expect(toVideoEmbed("javascript:alert(1)")).toBeNull();
  });
});
