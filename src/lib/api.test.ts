import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Call = { url: string; init: RequestInit };

function json(status: number, body: unknown) {
  return new Response(body === undefined ? "" : JSON.stringify(body), { status });
}

async function load() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "0");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  return import("./api");
}

describe("api client", () => {
  let calls: Call[];
  beforeEach(() => {
    calls = [];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("stores the access token from login and sends it as Bearer", async () => {
    const { api, tokenStore } = await load();
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/auth/login")) return json(200, { access_token: "A1", user: {}, profile: {} });
      return json(200, { user: {}, profile: {} });
    });
    await api.auth.login({ email: "a@b.c", password: "x" });
    expect(tokenStore.get()).toBe("A1");
    await api.me();
    expect(calls[1].url).toBe("http://api.test/api/v1/me");
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe("Bearer A1");
    expect(calls[1].init.credentials).toBe("include");
  });

  it("refreshes once on 401 and retries, deduplicating concurrent refreshes", async () => {
    const { api, tokenStore } = await load();
    tokenStore.set("old");
    let refreshes = 0;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const auth = (init.headers as Record<string, string>).Authorization;
      if (url.endsWith("/auth/refresh")) {
        refreshes++;
        return json(200, { access_token: "new" });
      }
      return auth === "Bearer new" ? json(200, { ok: true }) : json(401, { error: { code: "expired", message: "x" } });
    });
    const [a, b] = await Promise.all([api.me(), api.profile.editor()]);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshes).toBe(1);
    expect(tokenStore.get()).toBe("new");
  });

  it("throws ApiError with the server's code when refresh fails", async () => {
    const { api, ApiError, tokenStore } = await load();
    tokenStore.set("old");
    vi.stubGlobal("fetch", async (url: string) =>
      url.endsWith("/auth/refresh")
        ? json(401, { error: { code: "no_session", message: "nope" } })
        : json(401, { error: { code: "unauthorized", message: "Missing token" } }),
    );
    const err = await api.me().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("unauthorized");
    expect(tokenStore.get()).toBeNull();
  });

  it("does not attach auth or refresh on public endpoints", async () => {
    const { api, tokenStore } = await load();
    tokenStore.set("T");
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return json(404, { error: { code: "not_found", message: "Page not found." } });
    });
    await expect(api.public.page("ghost")).rejects.toMatchObject({ status: 404 });
    expect(calls).toHaveLength(1);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe("mock transport", () => {
  it("supports the signup → editor → block create flow", async () => {
    vi.resetModules();
    const { mockTransport } = await import("./mock/server");
    const su = await mockTransport("/auth/signup", {
      method: "POST",
      body: { email: "new@x.io", password: "password1", username: "newbie" },
      token: null,
    });
    expect(su.status).toBe(201);
    const token = (su.json as { access_token: string }).access_token;
    const ed = await mockTransport("/profile/editor", { method: "GET", token });
    const tabs = (ed.json as { tabs: { id: string }[] }).tabs;
    expect(tabs).toHaveLength(1);
    const blk = await mockTransport("/blocks", {
      method: "POST",
      body: { tab_id: tabs[0].id, type: "link", data: { title: "Hi", url: "https://x.io" } },
      token,
    });
    expect(blk.status).toBe(201);
    const taken = await mockTransport("/auth/username-available?u=newbie", { method: "GET", token: null });
    expect(taken.json).toEqual({ available: false });
  }, 10_000);
});
