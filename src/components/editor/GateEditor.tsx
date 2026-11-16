"use client";

/**
 * Card-level gate ("Lock") editor. Saved explicitly with a button rather than
 * autosaved, so a half-typed password is never stored. The password is
 * write-only: the server only tells us has_password.
 */
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { errorMessage, useUpdateBlock } from "@/lib/editor/queries";
import { validateGate, type GateFormState, type Kind } from "@/lib/editor/gate";
import { SOCIAL_PLATFORMS } from "@/lib/social";
import type { Block, GateView, SubscribeMode } from "@/lib/types";
import { UrlField } from "./fields";
import { MoreOptions, Segmented } from "./fields-extra";
import { selectCls } from "@/components/ui/select";
import { GATE_LABEL } from "./gate-badge";

export { GATE_LABEL, GateBadge } from "./gate-badge";


const HINT: Record<Kind, string> = {
  none: "Anyone can see this card.",
  password: "Visitors type a password to open the card.",
  email: "Visitors leave their email to open the card. They're added to your Audience.",
  age_18: "Visitors confirm they're 18 or older.",
  follow: "Visitors are asked to follow you, then tap to open the card. It's on the honour system.",
};

function initial(g: GateView | undefined): GateFormState {
  return {
    message: g?.message ?? "",
    password: "",
    subscribe: g?.subscribe ?? "ask",
    followPlatform: g?.follow?.platform ?? "instagram",
    followUrl: g?.follow?.url ?? "",
  };
}


export function GateEditor({ block }: { block: Block }) {
  const current = block.gate;
  const [kind, setKind] = useState<Kind>(current?.kind ?? "none");
  const [f, setF] = useState<GateFormState>(() => initial(current));
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const update = useUpdateBlock();
  const hadPassword = current?.kind === "password" && !!current.has_password;
  const v = validateGate(kind, f, hadPassword);
  const errors = { ...(tried ? v.errors : {}), ...serverErrors };
  const set = (p: Partial<GateFormState>) => {
    setF((x) => ({ ...x, ...p }));
    setServerErrors({});
  };

  const unchanged =
    (kind === "none" && !current) ||
    (current &&
      kind === current.kind &&
      !f.password &&
      f.message.trim() === (current.message ?? "") &&
      (kind !== "email" || f.subscribe === (current.subscribe ?? "ask")) &&
      (kind !== "follow" || (f.followPlatform === current.follow?.platform && f.followUrl.trim() === current.follow?.url)));

  function save() {
    setTried(true);
    if (Object.keys(v.errors).length) return;
    update.mutate(
      { id: block.id, patch: { gate: v.gate } },
      {
        onSuccess: () => {
          setF((x) => ({ ...x, password: "" }));
          setTried(false);
          toast.success(v.gate ? "Card locked" : "Lock removed");
        },
        onError: (e) => {
          if (e instanceof ApiError && e.details) setServerErrors(e.details);
          else toast.error(errorMessage(e));
        },
      },
    );
  }

  return (
    <MoreOptions
      title="Lock"
      defaultOpen={false}
      badge={current ? <span className="rounded-full bg-[#6d28d9]/10 px-2 text-[11px] font-medium text-[#6d28d9]">{GATE_LABEL[current.kind]}</span> : null}
    >
      <Segmented<Kind>
        label="Who can open this card"
        value={kind}
        onChange={(k) => {
          setKind(k);
          setTried(false);
          setServerErrors({});
        }}
        options={[
          { value: "none", label: "Everyone" },
          { value: "password", label: "Password" },
          { value: "email", label: "Email" },
          { value: "age_18", label: "18+" },
          { value: "follow", label: "Follow" },
        ]}
      />
      <p className="-mt-2 text-[13px] text-muted">
        {HINT[kind]}
        {kind !== "none" && block.type === "folder" && " Links inside the folder are locked too."}
      </p>

      {kind === "password" && (
        <Field label={hadPassword ? "New password" : "Password"} error={errors["gate.password"]} hint={hadPassword ? "Leave empty to keep the current password" : "4 to 72 characters. Share it with the people you want to let in."}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              value={f.password}
              placeholder={hadPassword ? "••••••••" : ""}
              onChange={(e) => set({ password: e.target.value })}
            />
          )}
        </Field>
      )}

      {kind === "email" && (
        <Segmented<SubscribeMode>
          label="Add to your mailing list"
          value={f.subscribe}
          onChange={(subscribe) => set({ subscribe })}
          options={[
            { value: "ask", label: "Ask" },
            { value: "everyone", label: "Everyone" },
            { value: "none", label: "No" },
          ]}
        />
      )}

      {kind === "follow" && (
        <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
          <Field label="Platform" error={errors["gate.follow.platform"]}>
            {(p) => (
              <select {...p} value={f.followPlatform} onChange={(e) => set({ followPlatform: e.target.value })} className={selectCls}>
                {SOCIAL_PLATFORMS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <UrlField
            label="Your profile"
            value={f.followUrl}
            onChange={(followUrl) => set({ followUrl })}
            placeholder={SOCIAL_PLATFORMS.find((s) => s.id === f.followPlatform)?.placeholder}
            error={errors["gate.follow.url"]}
          />
        </div>
      )}

      {kind !== "none" && (
        <Field label="Message on the locked card (optional)" error={errors["gate.message"]}>
          {(p) => <Input {...p} value={f.message} maxLength={200} placeholder="Members only" onChange={(e) => set({ message: e.target.value })} />}
        </Field>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted">
          {current ? "Locked cards stay hidden on your public page until a visitor unlocks them." : "The lock is saved when you press the button."}
        </p>
        <Button size="sm" variant={kind === "none" ? "secondary" : "primary"} disabled={!!unchanged} loading={update.isPending} onClick={save}>
          {kind === "none" ? (current ? "Remove lock" : "No lock") : current ? "Save lock" : "Lock card"}
        </Button>
      </div>
    </MoreOptions>
  );
}
