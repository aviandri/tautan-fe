import { describe, expect, it } from "vitest";
import { BLOCK_META } from "../editor/block-meta";
import { applyPatch } from "../profile";
import { homeFor } from "../session";
import { BlockDataSchemas, type Profile } from "../types";
import { STARTERS } from "./starters";

const base = {
  id: "p", user_id: "u", username: "tmp.abc", display_name: "", bio: "", avatar_url: null, seo: {}, is_published: false,
  created_at: "", updated_at: "", theme: {} as Profile["theme"],
  onboarding: { completed: false, username_claimed: false, suggested_username: "jane" },
} satisfies Profile;

describe("onboarding", () => {
  it("every starter section creates valid block data", () => {
    for (const list of Object.values(STARTERS))
      for (const st of list) {
        const d = st.data();
        expect(BlockDataSchemas[st.type].safeParse(d).success, st.key).toBe(true);
        expect((BLOCK_META[st.type].validate as (x: unknown) => { errors: object })(d).errors, st.key).toEqual({});
        expect(BLOCK_META[st.type].needsInputFirst, st.key).toBe(false);
      }
  });
  it("applyPatch merges onboarding and marks a claimed username", () => {
    const a = applyPatch(base, { onboarding: { step: "profile", intent: "sell" } });
    expect(a.onboarding).toMatchObject({ completed: false, username_claimed: false, step: "profile", intent: "sell", suggested_username: "jane" });
    const b = applyPatch(a, { username: "jane", onboarding: { completed: true } });
    expect(b.onboarding).toMatchObject({ completed: true, username_claimed: true, step: "profile" });
    expect(b.onboarding?.suggested_username).toBeUndefined();
  });
  it("homeFor routes unfinished onboarding to the wizard; old accounts to the dashboard", () => {
    expect(homeFor(base)).toBe("/onboarding");
    expect(homeFor({ onboarding: { completed: true, username_claimed: true } })).toBe("/dashboard");
    expect(homeFor({})).toBe("/dashboard");
  });
});
