import { API_BASE, ApiError, USE_MOCK } from "./api";

// TEMPORARY: 3c is adding api.public.form / api.public.subscribe to api.ts (it owns that file).
// Swap these two calls for those once they land, then delete this file.

export class FormApiError extends ApiError {
  constructor(status: number, code: string, message: string, public details?: Record<string, string>) {
    super(status, code, message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    console.debug("[tautan mock]", path, body);
    return {} as T;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new FormApiError(0, "network", "Couldn't reach the server. Check your connection and try again.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error;
    throw new FormApiError(res.status, e?.code ?? `http_${res.status}`, e?.message ?? "Something went wrong.", e?.details);
  }
  return json as T;
}

export const publicForms = {
  form: (username: string, b: { block_id: string; answers: Record<string, unknown>; subscribe?: boolean }) =>
    post<{ id: string; success_message?: string }>(`/public/${encodeURIComponent(username)}/form`, b),
  subscribe: (username: string, b: { block_id: string; email: string; name?: string }) =>
    post<{ success_message?: string }>(`/public/${encodeURIComponent(username)}/subscribe`, b),
};

export function formErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Too many tries. Please wait a few minutes and try again.";
    if (err.status === 0) return err.message;
    if (err.status === 400 || err.status === 422) return err.message;
  }
  return "Something went wrong sending this. Please try again.";
}
