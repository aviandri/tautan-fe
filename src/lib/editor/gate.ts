/** Card-level gate: client validation mirroring the BE (errors keyed like its details, e.g. "gate.password"). */
import type { GateInput, GateKind, SubscribeMode } from "../types";
import { httpUrlError } from "./sell-meta";

export type Kind = GateKind | "none";

/** Client checks mirroring the BE; errors keyed like its details ("gate.password"). */
export function validateGate(kind: Kind, f: GateFormState, hadPassword: boolean): { errors: Record<string, string>; gate: GateInput | null } {
  const e: Record<string, string> = {};
  const message = f.message.trim() || undefined;
  if (message && message.length > 200) e["gate.message"] = "At most 200 characters";
  switch (kind) {
    case "none":
      return { errors: e, gate: null };
    case "password": {
      if (f.password) {
        if ([...f.password].length < 4) e["gate.password"] = "At least 4 characters";
        else if (new TextEncoder().encode(f.password).length > 72) e["gate.password"] = "Too long";
      } else if (!hadPassword) e["gate.password"] = "Set a password";
      return { errors: e, gate: { kind, message, ...(f.password ? { password: f.password } : {}) } };
    }
    case "email":
      return { errors: e, gate: { kind, message, subscribe: f.subscribe } };
    case "age_18":
      return { errors: e, gate: { kind, message } };
    case "follow": {
      const url = f.followUrl.trim();
      const err = httpUrlError(url, true);
      if (err) e["gate.follow.url"] = err;
      return { errors: e, gate: { kind, message, follow: { platform: f.followPlatform, url } } };
    }
  }
}

export interface GateFormState {
  message: string;
  password: string;
  subscribe: SubscribeMode;
  followPlatform: string;
  followUrl: string;
}

