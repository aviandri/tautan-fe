/**
 * Typed client for the Tautan REST API (SPEC.md → "REST API").
 *
 * - Access token lives in memory only; the refresh token is an httpOnly cookie
 *   set by the API, so every request uses `credentials: "include"`.
 * - On a 401 the client calls POST /auth/refresh once (deduplicated across
 *   concurrent requests) and retries the original request.
 * - NEXT_PUBLIC_API_MOCK=1 routes everything to an in-memory mock (src/lib/mock)
 *   so the FE works without the Go backend.
 */
import type {
  AudienceList,
  AudienceStatus,
  ContactDetail,
  FormSubmission,
  FormSummary,
  ImportResponse,
  UnfurlResult,
  UploadResult,
  ApiErrorBody,
  AuthResponse,
  Block,
  ContactSubmission,
  CreateBlockInput,
  EditorResponse,
  EventKind,
  MeResponse,
  Paginated,
  Profile,
  ProfilePatch,
  PublicPageResponse,
  Tab,
  UpdateBlockInput,
} from "./types";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");
export const API_BASE = `${API_URL}/api/v1`;
export const USE_MOCK = process.env.NEXT_PUBLIC_API_MOCK === "1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    /** P2-3: per-field validation messages, keyed by field id */
    public details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------- token store ----------

let accessToken: string | null = null;
const tokenListeners = new Set<(t: string | null) => void>();

export const tokenStore = {
  get: () => accessToken,
  set(t: string | null) {
    accessToken = t;
    tokenListeners.forEach((l) => l(t));
  },
  subscribe(l: (t: string | null) => void) {
    tokenListeners.add(l);
    return () => {
      tokenListeners.delete(l);
    };
  },
};

// ---------- transport ----------

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Attach Bearer token and refresh on 401. Default true. */
  auth?: boolean;
  signal?: AbortSignal;
  /** Next.js fetch cache options for server components. */
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
}

export type Transport = (
  path: string,
  init: { method: string; body?: unknown; token: string | null },
) => Promise<{ status: number; json: unknown }>;

let mockTransport: Transport | null = null;
async function getMockTransport(): Promise<Transport> {
  if (!mockTransport) {
    const m = await import("./mock/server");
    mockTransport = m.mockTransport;
  }
  return mockTransport;
}

async function rawFetch(
  path: string,
  opts: RequestOptions,
  token: string | null,
): Promise<{ status: number; json: unknown }> {
  const method = opts.method ?? "GET";
  if (USE_MOCK) {
    const t = await getMockTransport();
    return t(path, { method, body: opts.body, token });
  }
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body,
    credentials: "include",
    signal: opts.signal,
    cache: opts.cache,
    next: opts.next,
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: { code: "bad_json", message: text.slice(0, 200) } };
    }
  }
  return { status: res.status, json };
}

let refreshing: Promise<string | null> | null = null;

/** POST /auth/refresh, deduplicated. Resolves to the new token or null. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = rawFetch("/auth/refresh", { method: "POST" }, null)
      .then(({ status, json }) => {
        const t =
          status === 200 ? ((json as { access_token?: string }).access_token ?? null) : null;
        tokenStore.set(t);
        return t;
      })
      .catch(() => {
        tokenStore.set(null);
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

function toError(status: number, json: unknown): ApiError {
  const e = (json as ApiErrorBody | null)?.error;
  return new ApiError(
    status,
    e?.code ?? "http_" + status,
    e?.message ?? `Request failed (${status})`,
    e?.details,
  );
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = opts.auth ?? true;
  let res = await rawFetch(path, opts, auth ? tokenStore.get() : null);
  if (auth && res.status === 401) {
    const t = await refreshAccessToken();
    if (t) res = await rawFetch(path, opts, t);
  }
  if (res.status >= 400) throw toError(res.status, res.json);
  return res.json as T;
}

// ---------- endpoints ----------

const withToken = <T extends { access_token: string }>(r: T) => {
  tokenStore.set(r.access_token);
  return r;
};

export const api = {
  auth: {
    /** username optional since P2-6: without it the account gets a tmp. name + onboarding.suggested_username */
    signup: (b: { email: string; password: string; username?: string }) =>
      request<AuthResponse>("/auth/signup", { method: "POST", body: b, auth: false }).then(withToken),
    login: (b: { email: string; password: string }) =>
      request<AuthResponse>("/auth/login", { method: "POST", body: b, auth: false }).then(withToken),
    refresh: refreshAccessToken,
    logout: () =>
      request<void>("/auth/logout", { method: "POST", auth: false }).finally(() =>
        tokenStore.set(null),
      ),
    usernameAvailable: (u: string, signal?: AbortSignal) =>
      request<{ available: boolean }>(
        `/auth/username-available?u=${encodeURIComponent(u)}`,
        { auth: false, signal },
      ),
  },

  me: () => request<MeResponse>("/me"),

  profile: {
    update: (patch: ProfilePatch) =>
      request<Profile>("/profile", { method: "PATCH", body: patch }),
    editor: () => request<EditorResponse>("/profile/editor"),
  },

  tabs: {
    create: (b: { title: string; slug?: string }) =>
      request<Tab>("/tabs", { method: "POST", body: b }),
    update: (id: string, b: { title?: string; slug?: string }) =>
      request<Tab>(`/tabs/${id}`, { method: "PATCH", body: b }),
    remove: (id: string) => request<void>(`/tabs/${id}`, { method: "DELETE" }),
    reorder: (ids: string[]) =>
      request<void>("/tabs/order", { method: "PUT", body: { ids } }),
  },

  blocks: {
    create: (b: CreateBlockInput) =>
      request<Block>("/blocks", { method: "POST", body: b }),
    update: (id: string, b: UpdateBlockInput) =>
      request<Block>(`/blocks/${id}`, { method: "PATCH", body: b }),
    remove: (id: string) => request<void>(`/blocks/${id}`, { method: "DELETE" }),
    reorder: (tab_id: string, ids: string[]) =>
      request<void>("/blocks/order", { method: "PUT", body: { tab_id, ids } }),
    /** P2-1 soft delete: newest first; purged after 30 days. */
    deleted: () => request<{ blocks: Block[] }>("/blocks/deleted"),
    restore: (id: string) => request<Block>(`/blocks/${id}/restore`, { method: "POST" }),
  },

  /** P2-6: preview (apply=false) or import links/socials/profile from another link page */
  import: (b: { url: string; apply?: boolean; tab_id?: string }) =>
    request<ImportResponse>("/import", { method: "POST", body: b }),

  /** P2-5 smart paste */
  unfurl: (url: string) => request<UnfurlResult>("/unfurl", { method: "POST", body: { url } }),

  /** P2-3 forms */
  forms: {
    list: () => request<{ items: FormSummary[] }>("/forms"),
    submissions: (blockId: string, cursor?: string | null) =>
      request<Paginated<FormSubmission>>(
        `/forms/${blockId}/submissions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      ),
    csvPath: (blockId: string) => `/forms/${blockId}/submissions.csv`,
  },

  /** P2-3 audience */
  audience: {
    list: (p: { status?: AudienceStatus; q?: string; cursor?: string | null } = {}) =>
      request<AudienceList>(`/audience${qs({ status: p.status, q: p.q, cursor: p.cursor })}`),
    get: (id: string) => request<ContactDetail>(`/audience/${id}`),
    csvPath: (p: { status?: AudienceStatus; q?: string } = {}) => `/audience.csv${qs(p)}`,
  },

  uploads: {
    /** kind "file" (P2-1) also accepts PDF, ZIP, MP3, MP4 and text up to 25 MB; images stay ≤5 MB. */
    create: (file: File, kind: "image" | "file" = "image") => {
      const fd = new FormData();
      fd.append("file", file);
      return request<UploadResult>(`/uploads${kind === "file" ? "?kind=file" : ""}`, { method: "POST", body: fd });
    },
  },

  contactSubmissions: {
    list: (cursor?: string | null) =>
      request<Paginated<ContactSubmission>>(
        `/contact-submissions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      ),
  },

  public: {
    page: (username: string, opts?: Pick<RequestOptions, "next" | "cache">) =>
      request<PublicPageResponse>(`/public/${encodeURIComponent(username)}`, {
        auth: false,
        ...opts,
      }),
    event: (username: string, b: { kind: EventKind; block_id?: string }) =>
      request<void>(`/public/${encodeURIComponent(username)}/events`, {
        method: "POST",
        body: b,
        auth: false,
      }),
    contact: (
      username: string,
      b: { block_id: string; name: string; email: string; message: string },
    ) =>
      request<void>(`/public/${encodeURIComponent(username)}/contact`, {
        method: "POST",
        body: b,
        auth: false,
      }),
    /** P2-3 form block. 400 invalid_answers carries ApiError.details {field_id: message}. */
    form: (username: string, b: { block_id: string; answers: Record<string, unknown>; subscribe?: boolean }) =>
      request<{ id: string; success_message: string }>(`/public/${encodeURIComponent(username)}/form`, {
        method: "POST",
        body: b,
        auth: false,
      }),
    /** P2-3 email_signup block */
    subscribe: (username: string, b: { block_id: string; email: string; name?: string }) =>
      request<{ success_message: string }>(`/public/${encodeURIComponent(username)}/subscribe`, {
        method: "POST",
        body: b,
        auth: false,
      }),
  },
};

/** Resolve an API-relative asset URL (e.g. "/uploads/x.png") to absolute. */
export function assetUrl(u: string | null | undefined): string | undefined {
  if (!u) return undefined;
  if (/^(https?:|data:|blob:)/.test(u)) return u;
  return `${API_URL}${u.startsWith("/") ? "" : "/"}${u}`;
}

// ---------- helpers (P2) ----------

function qs(p: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Download an authenticated CSV (Bearer token + one refresh on 401) and save it
 * via a temporary object URL. `path` is API-relative, e.g. api.audience.csvPath().
 */
export async function downloadCsv(path: string, filename: string): Promise<void> {
  if (USE_MOCK) {
    const blob = new Blob(["mock,csv\n"], { type: "text/csv" });
    return saveBlob(blob, filename);
  }
  const go = (token: string | null) =>
    fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
  let res = await go(tokenStore.get());
  if (res.status === 401) {
    const t = await refreshAccessToken();
    if (t) res = await go(t);
  }
  if (!res.ok) {
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {}
    throw toError(res.status, json);
  }
  saveBlob(await res.blob(), filename);
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
