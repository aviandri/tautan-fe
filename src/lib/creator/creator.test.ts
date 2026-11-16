import { describe, expect, it } from "vitest";
import { channelIdFrom, communityUrlError, detectCommunity, formatCount, parseCount, postPlatform } from "./creator";

describe("parseCount", () => {
  it.each([
    ["84.2K", 84200], ["84,2k", 84200], ["212rb", 212000], ["1,2jt", 1200000], ["1.2M", 1200000],
    ["31.000", 31000], ["31,000", 31000], ["1,234,567", 1234567], ["950", 950], ["6.8", 7],
  ] as const)("%s → %d", (raw, n) => expect(parseCount(raw)).toBe(n));
  it("empty and junk", () => {
    expect(parseCount(" ")).toBeUndefined();
    expect(parseCount("lots")).toBeNaN();
    expect(parseCount("1.2.3")).toBeNaN();
  });
  it("formats", () => {
    expect(formatCount(84200)).toBe("84.2K");
    expect(formatCount(1200000)).toBe("1.2M");
    expect(formatCount(950)).toBe("950");
  });
});

describe("community links", () => {
  it("detects and checks hosts", () => {
    expect(detectCommunity("https://chat.whatsapp.com/AbC")).toBe("whatsapp_group");
    expect(detectCommunity("whatsapp.com/channel/0029Va")).toBe("whatsapp_channel");
    expect(detectCommunity("https://t.me/stickerclub")).toBe("telegram");
    expect(detectCommunity("https://discord.gg/x")).toBe("discord");
    expect(detectCommunity("https://example.com")).toBeNull();
    expect(communityUrlError("https://t.me/x", "telegram")).toBeNull();
    expect(communityUrlError("http://t.me/x", "telegram")).toMatch(/https/);
    expect(communityUrlError("https://t.me/x", "discord")).toMatch(/Discord/);
  });
});

describe("post and channel urls", () => {
  it.each([
    ["https://www.instagram.com/p/Cx1/", "instagram"], ["https://instagram.com/reel/Cx1", "instagram"],
    ["https://www.tiktok.com/@sekar/video/7312", "tiktok"], ["https://vt.tiktok.com/ZS8x/", "tiktok"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"], ["https://youtube.com/shorts/abc", "youtube"], ["https://youtu.be/abc", "youtube"],
    ["https://www.instagram.com/sekar/", null], ["https://www.tiktok.com/@sekar", null], ["https://www.youtube.com/@sekar", null], ["https://example.com/p/1", null],
  ] as const)("%s → %s", (u, want) => expect(postPlatform(u)).toBe(want));
  it("channel ids", () => {
    expect(channelIdFrom("UCabcdefghijklmnopqrstuv")).toBe("UCabcdefghijklmnopqrstuv");
    expect(channelIdFrom("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv/videos")).toBe("UCabcdefghijklmnopqrstuv");
    expect(channelIdFrom("https://www.youtube.com/@sekar")).toBeNull();
  });
});
