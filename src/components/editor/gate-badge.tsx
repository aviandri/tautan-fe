import { Lock } from "lucide-react";
import type { GateKind, GateView } from "@/lib/types";

export const GATE_LABEL: Record<GateKind, string> = {
  password: "Password",
  email: "Email",
  age_18: "18+",
  follow: "Follow",
};

/** The lock badge shown on a card row. */
export function GateBadge({ gate }: { gate?: GateView }) {
  if (!gate) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[#6d28d9]">
      · <Lock className="size-3" aria-hidden /> {GATE_LABEL[gate.kind]}
    </span>
  );
}
