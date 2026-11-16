"use client";

import { Check, Loader2, X } from "lucide-react";
import type { UsernameStatus } from "@/lib/use-username-check";

export function UsernameStatusLine({ status, host }: { status: UsernameStatus; host: string }) {
  switch (status.state) {
    case "idle":
      return <span className="text-muted">Your page will live at {host}/yourname</span>;
    case "unchanged":
      return <span className="text-muted">This is your current username.</span>;
    case "invalid":
      return <span className="text-danger">{status.message}</span>;
    case "checking":
      return (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking…
        </span>
      );
    case "available":
      return (
        <span className="inline-flex items-center gap-1.5 text-brand">
          <Check className="size-3.5" aria-hidden /> Available
        </span>
      );
    case "taken":
      return (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <X className="size-3.5" aria-hidden /> Already taken
        </span>
      );
    case "error":
      return <span className="text-muted">{status.message}</span>;
  }
}
