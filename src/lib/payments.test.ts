import { describe, expect, it } from "vitest";
import { keyErrors, providerInput, providerState, testMessage, type ProviderSettings } from "./payments";

const base: ProviderSettings = {
  provider: "stripe",
  configured: false,
  enabled: false,
  mode: null,
  secret_key_hint: null,
  webhook_secret_hint: null,
  needs_webhook_secret: true,
  webhook_url: "https://api.example/webhooks/stripe/p1",
  currencies: ["IDR", "USD"],
  verified_at: null,
  last_error: null,
  updated_at: null,
};
const saved: ProviderSettings = {
  ...base,
  configured: true,
  enabled: true,
  mode: "sandbox",
  secret_key_hint: "…1234",
  webhook_secret_hint: "…abcd",
  verified_at: "2026-11-18T10:00:00Z",
  updated_at: "2026-11-18T10:00:00Z",
};

describe("keyErrors", () => {
  it("accepts matching keys", () => {
    expect(keyErrors("stripe", "sandbox", "sk_test_1", "whsec_1")).toEqual({});
    expect(keyErrors("stripe", "live", "rk_live_1", "")).toEqual({});
    expect(keyErrors("xendit", "sandbox", "xnd_development_1", "token")).toEqual({});
    expect(keyErrors("midtrans", "live", "Mid-server-1", "")).toEqual({});
    expect(keyErrors("stripe", "live", "", "")).toEqual({}); // empty = keep the saved key
  });
  it("flags the wrong key for the mode or kind", () => {
    expect(keyErrors("stripe", "live", "sk_test_1", "").secret_key).toMatch(/live key/);
    expect(keyErrors("stripe", "sandbox", "pk_test_1", "").secret_key).toMatch(/publishable/);
    expect(keyErrors("stripe", "sandbox", "sk_test_1", "abc").webhook_secret).toMatch(/whsec_/);
    expect(keyErrors("xendit", "live", "xnd_development_1", "").secret_key).toMatch(/xnd_production_/);
    expect(keyErrors("xendit", "sandbox", "xnd_public_development_1", "").secret_key).toMatch(/public key/);
    expect(keyErrors("midtrans", "sandbox", "SB-Mid-client-1", "").secret_key).toMatch(/client key/);
    expect(keyErrors("midtrans", "live", "SB-Mid-server-1", "").secret_key).toMatch(/sandbox key/);
    expect(keyErrors("midtrans", "sandbox", "Mid-server-1", "").secret_key).toMatch(/production key/);
    expect(keyErrors("stripe", "sandbox", "sk_test 1", "").secret_key).toMatch(/spaces/);
  });
  it("checks the dev-only fake provider's keys", () => {
    expect(keyErrors("fake", "sandbox", "fake_dev", "")).toEqual({});
    expect(keyErrors("fake", "sandbox", "sk_test_1", "").secret_key).toMatch(/fake_/);
    expect(keyErrors("fake", "live", "fake_dev", "").secret_key).toMatch(/sandbox-only/);
  });
});

describe("providerInput", () => {
  it("omits empty secrets to keep the saved ones", () => {
    expect(providerInput(saved, { mode: "sandbox", secretKey: "", webhookSecret: " ", enabled: false })).toEqual({
      mode: "sandbox",
      enabled: false,
    });
  });
  it("sends new secrets trimmed", () => {
    expect(providerInput(saved, { mode: "sandbox", secretKey: " sk_test_9 ", webhookSecret: "whsec_9", enabled: true })).toEqual({
      mode: "sandbox",
      enabled: true,
      secret_key: "sk_test_9",
      webhook_secret: "whsec_9",
    });
  });
  it("always sends secret_key on first connect or mode switch", () => {
    expect(providerInput(base, { mode: "sandbox", secretKey: "", webhookSecret: "", enabled: true }).secret_key).toBe("");
    expect(providerInput(saved, { mode: "live", secretKey: "sk_live_1", webhookSecret: "", enabled: true }).secret_key).toBe("sk_live_1");
  });
  it("can clear the webhook secret", () => {
    expect(providerInput(saved, { mode: "sandbox", secretKey: "", webhookSecret: "", enabled: false, clearWebhook: true }).webhook_secret).toBe("");
  });
});

describe("providerState", () => {
  it("covers each state", () => {
    expect(providerState(base)).toBe("off");
    expect(providerState(saved)).toBe("sandbox");
    expect(providerState({ ...saved, mode: "live" })).toBe("live");
    expect(providerState({ ...saved, enabled: false })).toBe("paused");
    expect(providerState({ ...saved, last_error: { code: "invalid_credentials", message: "x" } })).toBe("needs_attention");
    expect(providerState({ ...saved, verified_at: null })).toBe("needs_attention");
  });
});

describe("testMessage", () => {
  it("explains failures", () => {
    expect(testMessage({ ok: false, code: "invalid_credentials", message: "Invalid API Key provided" })).toBe(
      "The provider rejected the key: Invalid API Key provided.",
    );
    expect(testMessage({ ok: false, code: "provider_unreachable" })).toMatch(/reach/);
    expect(testMessage(null)).toBe("");
  });
});
