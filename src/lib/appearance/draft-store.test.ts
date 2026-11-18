import { describe, expect, it } from "vitest";
import { clearDraft, recoverDraft, stashDraft } from "./draft-store";

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}
const saved = { theme: { preset: "kertas" }, socials: [] as string[] };
const draft = { theme: { preset: "malam" }, socials: [] as string[] };

describe("design draft store", () => {
  it("restores an unsaved draft based on the current saved state", () => {
    const s = mem();
    stashDraft("p1", saved, draft, s);
    expect(recoverDraft("p1", saved, s)).toEqual(draft);
    expect(recoverDraft("p2", saved, s)).toBeNull(); // per profile
  });
  it("forgets the draft once it matches saved (saved or discarded)", () => {
    const s = mem();
    stashDraft("p1", saved, draft, s);
    stashDraft("p1", saved, saved, s);
    expect(s.m.size).toBe(0);
    expect(recoverDraft("p1", saved, s)).toBeNull();
  });
  it("forgets on an explicit discard", () => {
    const s = mem();
    stashDraft("p1", saved, draft, s);
    clearDraft("p1", s);
    expect(recoverDraft("p1", saved, s)).toBeNull();
  });
  it("drops a stale draft when the profile was saved elsewhere since", () => {
    const s = mem();
    stashDraft("p1", saved, draft, s);
    const newer = { theme: { preset: "laut" }, socials: [] as string[] };
    expect(recoverDraft("p1", newer, s)).toBeNull();
    expect(s.m.size).toBe(0);
  });
  it("survives blocked or corrupt storage", () => {
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => {} };
    expect(() => stashDraft("p1", saved, draft, broken)).not.toThrow();
    expect(recoverDraft("p1", saved, broken)).toBeNull();
    const s = mem();
    s.setItem("tautan.design.draft.p1", "{not json");
    expect(recoverDraft("p1", saved, s)).toBeNull();
  });
});
