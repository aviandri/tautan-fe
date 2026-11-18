/**
 * Payments (a): the creator's own provider accounts (SPEC.md → "Payments (a):
 * provider settings"). Keys are write-only: the API returns hints ("…1234"),
 * never the keys themselves.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/** "fake" is the API's dev-only provider: it is never listed when APP_ENV=production. */
export type PaymentProvider = "xendit" | "midtrans" | "stripe" | "fake";
export type PaymentMode = "sandbox" | "live";

export interface ProviderError {
  code: string;
  message: string;
}

export interface ProviderSettings {
  provider: PaymentProvider;
  configured: boolean;
  enabled: boolean;
  mode: PaymentMode | null;
  secret_key_hint: string | null;
  webhook_secret_hint: string | null;
  needs_webhook_secret: boolean;
  webhook_url: string;
  currencies: string[];
  verified_at: string | null;
  last_error: ProviderError | null;
  updated_at: string | null;
}

export interface ProvidersResponse {
  available: boolean;
  providers: ProviderSettings[];
}

export interface ProviderTest {
  ok: boolean;
  code?: string;
  message?: string;
}

export interface ProviderWriteResponse {
  provider: ProviderSettings;
  test: ProviderTest | null;
}

/** PUT body. Omit a secret to keep it; webhook_secret "" clears it. */
export interface ProviderInput {
  mode?: PaymentMode;
  secret_key?: string;
  webhook_secret?: string;
  enabled?: boolean;
}

/** Copy for each provider: what it offers and where its keys live. */
export const PROVIDER_INFO: Record<
  PaymentProvider,
  {
    name: string;
    methods: string;
    keyLabel: string;
    keyPlaceholder: Record<PaymentMode, string>;
    keyHint: string;
    webhookLabel?: string;
    webhookPlaceholder?: string;
    webhookHint: string;
    webhookEvents?: string[];
    /** Provider dashboard link (none for the dev-only fake provider). */
    dashboard?: Record<PaymentMode, string>;
  }
> = {
  xendit: {
    name: "Xendit",
    methods: "QRIS, e-wallets, virtual accounts, cards and retail outlets",
    keyLabel: "Secret API key",
    keyPlaceholder: { sandbox: "xnd_development_…", live: "xnd_production_…" },
    keyHint: "Xendit dashboard → Settings → API keys. Give it write access to Money-in.",
    webhookLabel: "Callback verification token",
    webhookPlaceholder: "From Settings → Webhooks",
    webhookHint: "In Xendit: Settings → Webhooks. Paste this URL under “Invoices paid”, then copy the verification token from the same page.",
    dashboard: { sandbox: "https://dashboard.xendit.co/settings/developers#webhooks", live: "https://dashboard.xendit.co/settings/developers#webhooks" },
  },
  midtrans: {
    name: "Midtrans",
    methods: "QRIS, GoPay, ShopeePay, virtual accounts and cards",
    keyLabel: "Server key",
    keyPlaceholder: { sandbox: "SB-Mid-server-…", live: "Mid-server-…" },
    keyHint: "Midtrans dashboard → Settings → Access keys. Use the server key, not the client key.",
    webhookHint: "Nothing to paste: every order tells Midtrans to notify this URL.",
    dashboard: { sandbox: "https://dashboard.sandbox.midtrans.com/settings/config_info", live: "https://dashboard.midtrans.com/settings/config_info" },
  },
  stripe: {
    name: "Stripe",
    methods: "Cards, Apple Pay and Google Pay",
    keyLabel: "Secret key",
    keyPlaceholder: { sandbox: "sk_test_… or rk_test_…", live: "sk_live_… or rk_live_…" },
    keyHint: "Stripe dashboard → Developers → API keys. A restricted key needs write access to Checkout Sessions.",
    webhookLabel: "Signing secret",
    webhookPlaceholder: "whsec_…",
    webhookHint: "In Stripe: Developers → Webhooks → Add endpoint with this URL and these events, then reveal the signing secret.",
    webhookEvents: [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "checkout.session.expired",
      "charge.refunded",
    ],
    dashboard: { sandbox: "https://dashboard.stripe.com/test/webhooks", live: "https://dashboard.stripe.com/webhooks" },
  },
  fake: {
    name: "Fake (dev only)",
    methods: "Pay / Fail / Expire buttons on a test checkout page. No money moves.",
    keyLabel: "Key",
    keyPlaceholder: { sandbox: "fake_…", live: "fake_… (sandbox only)" },
    keyHint: "Any value starting with fake_. Only offered when the API isn't running in production.",
    webhookHint: "Nothing to paste: the test checkout page notifies this URL itself.",
  },
};

/**
 * Instant feedback that mirrors the server's shape checks (the server stays the
 * judge). Returns per-field messages; an empty key is fine when one is saved.
 */
export function keyErrors(
  provider: PaymentProvider,
  mode: PaymentMode,
  secretKey: string,
  webhookSecret: string,
): { secret_key?: string; webhook_secret?: string } {
  const e: { secret_key?: string; webhook_secret?: string } = {};
  const sk = secretKey.trim();
  const ws = webhookSecret.trim();
  if (/\s/.test(secretKey.trim())) e.secret_key = "Keys have no spaces.";
  if (/\s/.test(webhookSecret.trim())) e.webhook_secret = "Secrets have no spaces.";
  if (sk && !e.secret_key) {
    if (provider === "xendit") {
      if (sk.startsWith("xnd_public_")) e.secret_key = "This is a public key. Use a secret key.";
      else if (mode === "sandbox" && !sk.startsWith("xnd_development_")) e.secret_key = "Sandbox needs a test key starting with xnd_development_.";
      else if (mode === "live" && !sk.startsWith("xnd_production_")) e.secret_key = "Live needs a key starting with xnd_production_.";
    } else if (provider === "midtrans") {
      if (sk.includes("-client-")) e.secret_key = "This is the client key. Use the server key.";
      else if (mode === "live" && sk.startsWith("SB-")) e.secret_key = "This is a sandbox key. Live needs the production server key.";
      else if (mode === "sandbox" && sk.startsWith("Mid-server-")) e.secret_key = "This is a production key. Sandbox needs the SB-Mid-server-… key.";
    } else if (provider === "fake") {
      if (mode === "live") e.secret_key = "The fake provider is sandbox-only.";
      else if (!sk.startsWith("fake_")) e.secret_key = "Use any key starting with fake_.";
    } else {
      if (sk.startsWith("pk_")) e.secret_key = "This is a publishable key. Use a secret key (sk_…) or a restricted key (rk_…).";
      else if (mode === "sandbox" && !/^(sk|rk)_test_/.test(sk)) e.secret_key = "Sandbox needs a test key (sk_test_… or rk_test_…).";
      else if (mode === "live" && !/^(sk|rk)_live_/.test(sk)) e.secret_key = "Live needs a live key (sk_live_… or rk_live_…).";
    }
  }
  if (provider === "stripe" && ws && !e.webhook_secret && !ws.startsWith("whsec_")) {
    e.webhook_secret = "The signing secret starts with whsec_.";
  }
  return e;
}

/**
 * Builds the PUT body from the form. Secrets left empty are omitted (kept),
 * unless the mode changes, where the server needs the new mode's key anyway.
 */
export function providerInput(
  saved: ProviderSettings,
  form: { mode: PaymentMode; secretKey: string; webhookSecret: string; enabled: boolean; clearWebhook?: boolean },
): ProviderInput {
  const body: ProviderInput = { mode: form.mode, enabled: form.enabled };
  if (form.secretKey.trim()) body.secret_key = form.secretKey.trim();
  if (form.webhookSecret.trim()) body.webhook_secret = form.webhookSecret.trim();
  else if (form.clearWebhook) body.webhook_secret = "";
  if (!saved.configured || saved.mode !== form.mode) {
    // nothing to keep: send what we have and let the server explain what's missing
    body.secret_key = form.secretKey.trim();
  }
  return body;
}

export type ProviderState = "off" | "needs_attention" | "sandbox" | "live" | "paused";

/** One status chip per provider. */
export function providerState(p: ProviderSettings): ProviderState {
  if (!p.configured) return "off";
  if (p.last_error || !p.verified_at) return "needs_attention";
  if (!p.enabled) return "paused";
  return p.mode === "live" ? "live" : "sandbox";
}

export const STATE_LABEL: Record<ProviderState, string> = {
  off: "Not connected",
  needs_attention: "Needs attention",
  paused: "Off",
  sandbox: "Sandbox · on",
  live: "Live · on",
};

/** Human message for a failed test. */
export function testMessage(t: ProviderTest | ProviderError | null | undefined): string {
  if (!t) return "";
  const code = t.code;
  let msg = t.message?.trim();
  if (msg && !/[.!?]$/.test(msg)) msg += ".";
  switch (code) {
    case "invalid_credentials":
      return msg ? `The provider rejected the key: ${msg}` : "The provider rejected the key.";
    case "provider_unreachable":
      return "Couldn't reach the provider. Try again in a minute.";
    default:
      return msg || "The test failed.";
  }
}

// ---------- queries ----------

export const paymentsKey = ["payments", "providers"] as const;

export function usePaymentProviders() {
  return useQuery({ queryKey: paymentsKey, queryFn: () => api.payments.list() });
}

function useWriteProvider<A>(fn: (a: A) => Promise<ProviderWriteResponse>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) =>
      qc.setQueryData<ProvidersResponse>(paymentsKey, (d) =>
        d ? { ...d, providers: d.providers.map((p) => (p.provider === res.provider.provider ? res.provider : p)) } : d,
      ),
  });
}

export function useSaveProvider() {
  return useWriteProvider(({ provider, input }: { provider: PaymentProvider; input: ProviderInput }) => api.payments.save(provider, input));
}

export function useTestProvider() {
  return useWriteProvider((provider: PaymentProvider) => api.payments.test(provider));
}

export function useRemoveProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: PaymentProvider) => api.payments.remove(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentsKey }),
  });
}
