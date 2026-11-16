/**
 * P3-C Engage cards: editor metadata and validators (mirror SPEC "P3-C/D: implemented (BE)").
 * Errors are keyed by dotted path, like the BE's invalid_data details.
 */
import { Gift, HelpCircle, Magnet, Vote } from "lucide-react";
import type { BlockDataMap } from "../types";
import { SHOW_RESULTS, SUBSCRIBE_MODES } from "../constants";
import { compact, maxLen, plural, put, required, withSchedule, type BlockMeta, type FieldErrors } from "./meta-core";
import { httpUrlError, imageUrlError, newItemId } from "./sell-meta";

export type EngageType = "poll" | "ask_me" | "lead_magnet" | "giveaway";

export const OPTION_ID_RE = /^[a-z0-9_-]{1,40}$/;
const trim = (s: string | undefined) => (s ?? "").trim();
const validIso = (s: string | undefined) => !!s && !Number.isNaN(Date.parse(s));

/** Drop keys the server adds to page reads; they must never be saved back. */
export function stripKeys<T extends object>(d: T, keys: string[]): T {
  const out = { ...d } as Record<string, unknown>;
  for (const k of keys) delete out[k];
  return out as T;
}

export function newOption(taken: string[]): BlockDataMap["poll"]["options"][number] {
  return { id: newItemId(taken), label: "" };
}

/** A week from now, rounded to the hour (RFC 3339). */
export function inAWeek(): string {
  const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function subscribeError(v: string | undefined) {
  return v && !(SUBSCRIBE_MODES as readonly string[]).includes(v) ? "Pick an option" : null;
}

export const ENGAGE_META: { [K in EngageType]: BlockMeta<K> } = {
  poll: {
    type: "poll",
    label: "Poll",
    description: "One question, 2 to 5 answers",
    icon: Vote,
    tint: "#0e7490",
    defaultData: () => {
      const a = newOption([]);
      return { question: "", options: [a, newOption([a.id])], show_results: "after_vote" };
    },
    needsInputFirst: true,
    summary: (d) => d.question || "No question yet",
    validate: withSchedule<"poll">((d) => {
      const e: FieldErrors = {};
      const question = trim(d.question);
      put(e, "question", required(question) ? "Ask a question" : maxLen(question, 200));
      const options = d.options.map((o) => ({ id: o.id, label: trim(o.label) }));
      if (options.length < 2) put(e, "options", "Add at least 2 answers");
      if (options.length > 5) put(e, "options", "Up to 5 answers");
      const seen = new Set<string>();
      options.forEach((o, i) => {
        put(e, `options.${i}.label`, required(o.label) ? "Add an answer" : maxLen(o.label, 80));
        if (!OPTION_ID_RE.test(o.id) || seen.has(o.id)) put(e, `options.${i}.id`, "Remove and re-add this answer");
        seen.add(o.id);
      });
      if (d.show_results && !SHOW_RESULTS.includes(d.show_results)) put(e, "show_results", "Pick an option");
      if (d.ends_at && !validIso(d.ends_at)) put(e, "ends_at", "Pick a date and time");
      const data = compact(stripKeys({ ...d, question, options }, ["results", "closed"]), ["ends_at"]);
      return { errors: e, data };
    }),
  },
  ask_me: {
    type: "ask_me",
    label: "Ask me anything",
    description: "Anonymous questions into your inbox",
    icon: HelpCircle,
    tint: "#9333ea",
    defaultData: () => ({ prompt: "Ask me anything", public_answers: false }),
    needsInputFirst: false,
    summary: (d) => d.prompt || "Ask me anything",
    validate: withSchedule<"ask_me">((d) => {
      const e: FieldErrors = {};
      const prompt = trim(d.prompt);
      put(e, "prompt", required(prompt) ? "Add a prompt" : maxLen(prompt, 200));
      put(e, "placeholder", maxLen(d.placeholder, 100));
      put(e, "button_label", maxLen(d.button_label, 40));
      const data = compact(stripKeys({ ...d, prompt }, ["answers"]), ["placeholder", "button_label"]);
      return { errors: e, data };
    }),
  },
  lead_magnet: {
    type: "lead_magnet",
    label: "Free download",
    description: "A file in exchange for an email",
    icon: Magnet,
    tint: "#be185d",
    defaultData: () => ({ title: "Free guide", file_url: "", subscribe: "ask" }),
    needsInputFirst: true,
    summary: (d) => d.title || "Free download",
    validate: withSchedule<"lead_magnet">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      const file_url = trim(d.file_url);
      put(e, "title", required(title) ? "Add a title" : maxLen(title, 100));
      put(e, "description", maxLen(d.description, 300));
      put(e, "file_url", file_url ? imageUrlError(file_url) : "Upload a file or paste a link");
      put(e, "cover_url", imageUrlError(d.cover_url));
      put(e, "button_label", maxLen(d.button_label, 40));
      put(e, "success_message", maxLen(d.success_message, 200));
      put(e, "subscribe", subscribeError(d.subscribe));
      const data = compact({ ...d, title, file_url }, ["description", "cover_url", "button_label", "success_message"]);
      return { errors: e, data };
    }),
  },
  giveaway: {
    type: "giveaway",
    label: "Giveaway",
    description: "Entries by email, you draw a winner",
    icon: Gift,
    tint: "#dc2626",
    defaultData: () => ({ title: "", prize: "", ends_at: inAWeek(), steps: [], subscribe: "ask" }),
    needsInputFirst: true,
    summary: (d) => d.title || d.prize || "Giveaway",
    validate: withSchedule<"giveaway">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      const prize = trim(d.prize);
      put(e, "title", required(title) ? "Add a title" : maxLen(title, 100));
      put(e, "prize", required(prize) ? "What can people win?" : maxLen(prize, 200));
      if (!validIso(d.ends_at)) put(e, "ends_at", "Pick when entries close");
      if (d.steps.length > 5) put(e, "steps", "Up to 5 steps");
      const steps = d.steps.map((s) => ({ label: trim(s.label), url: trim(s.url) }));
      steps.forEach((s, i) => {
        put(e, `steps.${i}.label`, required(s.label) ? "Add a label" : maxLen(s.label, 80));
        put(e, `steps.${i}.url`, httpUrlError(s.url, true));
      });
      put(e, "rules_url", httpUrlError(d.rules_url, false));
      put(e, "subscribe", subscribeError(d.subscribe));
      const data = compact(stripKeys({ ...d, title, prize, steps, rules_url: trim(d.rules_url) }, ["ended", "entry_count", "winner"]), ["rules_url"]);
      return { errors: e, data };
    }),
  },
};

export const pollSummary = (n: number) => plural(n, "answer");
