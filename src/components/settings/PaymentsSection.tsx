"use client";

import { Check, ChevronDown, Copy, ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { Segmented, ToggleRow } from "@/components/editor/fields-extra";
import { Alert, Button, cx, Field, Input, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import {
  keyErrors,
  PROVIDER_INFO,
  providerInput,
  providerState,
  STATE_LABEL,
  testMessage,
  usePaymentProviders,
  useRemoveProvider,
  useSaveProvider,
  useTestProvider,
  type PaymentMode,
  type ProviderSettings,
  type ProviderState,
} from "@/lib/payments";
import { relativeTime } from "@/lib/time";
import { Section } from "./section";

const CHIP: Record<ProviderState, string> = {
  off: "bg-sunken text-ink-2",
  paused: "bg-sunken text-ink-2",
  needs_attention: "bg-danger/[.08] text-danger",
  sandbox: "bg-accent text-accent-ink",
  live: "bg-brand-soft text-brand-hover",
};

function without(r: Record<string, string>, k: string) {
  const next = { ...r };
  delete next[k];
  return next;
}

/** Settings → Payments: connect the creator's own Xendit, Midtrans and Stripe accounts. */
export function PaymentsSection() {
  const q = usePaymentProviders();
  return (
    <Section
      title="Payments"
      description="Sell from your page with your own payment account. Buyers pay on the provider's checkout page and the money goes straight to you. Tautan takes no cut."
    >
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <Alert>Couldn&apos;t load payment settings. Refresh to try again.</Alert>
      ) : !q.data.available ? (
        <Alert tone="info">Payments aren&apos;t available on this server yet.</Alert>
      ) : (
        <div className="flex flex-col gap-3">
          {q.data.providers.map((p) => (
            <ProviderPanel key={p.provider} p={p} />
          ))}
        </div>
      )}
    </Section>
  );
}

function ProviderPanel({ p }: { p: ProviderSettings }) {
  const info = PROVIDER_INFO[p.provider];
  const state = providerState(p);
  const [open, setOpen] = useState(state === "needs_attention");
  const panelId = `pay-${p.provider}`;
  return (
    <div className="rounded-[20px] bg-background">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-[20px] px-4 py-3.5 text-left hover:bg-sunken/60"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">{info.name}</p>
          <p className="truncate text-[13px] text-muted">
            {info.methods} · {p.currencies.join(", ")}
          </p>
        </div>
        <span className={cx("shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold", CHIP[state])}>{STATE_LABEL[state]}</span>
        <ChevronDown className={cx("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4">
          <ProviderForm key={`${p.mode}-${p.updated_at}`} p={p} />
        </div>
      )}
    </div>
  );
}

function ProviderForm({ p }: { p: ProviderSettings }) {
  const info = PROVIDER_INFO[p.provider];
  const save = useSaveProvider();
  const test = useTestProvider();
  const remove = useRemoveProvider();
  const [mode, setMode] = useState<PaymentMode>(p.mode ?? "sandbox");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [enabled, setEnabled] = useState(p.configured ? p.enabled : true);
  const [serverErr, setServerErr] = useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = useState(false);

  const modeChanged = p.configured && p.mode !== mode;
  const keepsKey = p.configured && !modeChanged;
  const keepsWebhook = keepsKey && !!p.webhook_secret_hint;
  const local = keyErrors(p.provider, mode, secretKey, webhookSecret);
  const errs = { ...serverErr, ...local };
  const needKey = !keepsKey && !secretKey.trim();
  const needWebhook = enabled && p.needs_webhook_secret && !keepsWebhook && !webhookSecret.trim();
  const dirty = !p.configured || modeChanged || !!secretKey.trim() || !!webhookSecret.trim() || enabled !== p.enabled;
  const canSave = dirty && !needKey && !local.secret_key && !local.webhook_secret;

  function onSave() {
    setServerErr({});
    save.mutate(
      { provider: p.provider, input: providerInput(p, { mode, secretKey, webhookSecret, enabled }) },
      {
        onSuccess: (res) => {
          if (res.test && !res.test.ok) toast.error(`${info.name}: ${testMessage(res.test)}`);
          else toast.success(res.test ? `${info.name} connected` : `${info.name} saved`);
        },
        onError: (e) => {
          if (e instanceof ApiError && e.details) setServerErr(e.details);
          else toast.error(e instanceof ApiError ? e.message : "Couldn't save. Check your connection.");
        },
      },
    );
  }

  return (
    // a div, not a form: Section already renders a <form> and forms can't nest
    <div
      className="flex flex-col gap-4 border-t border-line pt-4"
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          if (canSave && !needWebhook) onSave();
        }
      }}
    >
      {p.last_error && (
        <Alert>
          {testMessage(p.last_error)} {p.enabled ? "Payments stay on while you fix it." : "Fix the key, then save to test again."}
        </Alert>
      )}
      {p.configured && !p.last_error && p.verified_at && (
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <Check className="size-3.5 text-brand" aria-hidden /> Connection tested {relativeTime(p.verified_at)}.
        </p>
      )}

      <Segmented<PaymentMode>
        label="Mode"
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { value: "sandbox", label: "Sandbox", title: "Test payments with test keys. No real money moves." },
          { value: "live", label: "Live", title: "Real payments with live keys." },
        ]}
      />
      {modeChanged && (
        <p className="text-[13px] text-muted">Switching to {mode} needs your {mode} keys. The saved {p.mode} keys are replaced when you save.</p>
      )}

      <Field label={info.keyLabel} error={errs.secret_key} hint={info.keyHint}>
        {(f) => (
          <Input
            {...f}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={secretKey}
            onChange={(e) => {
              setSecretKey(e.target.value);
              setServerErr((r) => without(r, "secret_key"));
            }}
            placeholder={keepsKey && p.secret_key_hint ? `Saved key ${p.secret_key_hint} · leave empty to keep` : info.keyPlaceholder[mode]}
          />
        )}
      </Field>

      <WebhookUrl p={p} mode={mode} />

      {info.webhookLabel && (
        <Field
          label={info.webhookLabel}
          error={errs.webhook_secret ?? (needWebhook && secretKey.trim() ? "Needed before you can turn payments on." : undefined)}
          hint={needWebhook ? "Needed before you can turn payments on." : undefined}
        >
          {(f) => (
            <Input
              {...f}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={webhookSecret}
              onChange={(e) => {
                setWebhookSecret(e.target.value);
                setServerErr((r) => without(r, "webhook_secret"));
              }}
              placeholder={keepsWebhook ? `Saved ${p.webhook_secret_hint} · leave empty to keep` : info.webhookPlaceholder}
            />
          )}
        </Field>
      )}

      <ToggleRow
        label={`Accept payments with ${info.name}`}
        hint={mode === "sandbox" ? "Sandbox: buyers see the provider's test checkout." : "Live: buyers pay real money."}
        checked={enabled}
        onChange={setEnabled}
      />

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {p.configured && (
          <div className="mr-auto flex items-center gap-2">
            {confirmRemove ? (
              <>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  loading={remove.isPending}
                  onClick={() =>
                    remove.mutate(p.provider, {
                      onSuccess: () => toast.success(`${info.name} disconnected`),
                      onError: () => toast.error("Couldn't disconnect. Try again."),
                    })
                  }
                >
                  Disconnect and forget keys
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
                <Trash2 className="size-4" aria-hidden /> Disconnect
              </Button>
            )}
          </div>
        )}
        {p.configured && !modeChanged && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={test.isPending}
            onClick={() =>
              test.mutate(p.provider, {
                onSuccess: (res) =>
                  res.test?.ok ? toast.success(`${info.name}: connection works`) : toast.error(`${info.name}: ${testMessage(res.test)}`),
                onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't run the test."),
              })
            }
          >
            Test connection
          </Button>
        )}
        <Button type="button" size="sm" disabled={!canSave || needWebhook} loading={save.isPending} onClick={onSave}>
          {p.configured ? "Save" : "Connect"}
        </Button>
      </div>
    </div>
  );
}

function WebhookUrl({ p, mode }: { p: ProviderSettings; mode: PaymentMode }) {
  const info = PROVIDER_INFO[p.provider];
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-[7px]">
      <span className="text-[13px] font-semibold text-ink-2">Webhook URL</span>
      <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-2.5 shadow-[inset_0_0_0_1px_var(--line)]">
        <code className="min-w-0 flex-1 break-all font-mono text-[13px]">{p.webhook_url}</code>
        <button
          type="button"
          aria-label="Copy webhook URL"
          className="shrink-0 rounded-full p-1.5 text-ink-2 hover:bg-sunken hover:text-foreground"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(p.webhook_url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? <Check className="size-4 text-brand" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      </div>
      <div className="text-[13px] text-muted">
        {info.webhookHint}
        {info.webhookEvents && (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {info.webhookEvents.map((e) => (
              <code key={e} className="rounded-md bg-sunken px-1.5 py-0.5 font-mono text-[12px] text-ink-2">
                {e}
              </code>
            ))}
          </span>
        )}{" "}
        {info.dashboard && (
          <a href={info.dashboard[mode]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-brand underline-offset-2 hover:underline">
            Open {info.name} <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}
