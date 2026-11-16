import type { FormAnswer, FormSubmission } from "@/lib/types";

/** Display value for a stored answer. */
export function answerText(a: Pick<FormAnswer, "type" | "value"> | undefined): string {
  if (!a || a.value === null || a.value === undefined || a.value === "") return "";
  if (a.type === "checkbox" || typeof a.value === "boolean") return a.value ? "Yes" : "No";
  if (a.type === "date" && typeof a.value === "string") {
    const d = new Date(`${a.value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? a.value : d.toLocaleDateString("en", { dateStyle: "medium" });
  }
  return String(a.value);
}

/**
 * Columns for a submissions table: field ids in first-seen order across the
 * loaded submissions (newest first), labelled with the most recent label.
 */
export function answerColumns(subs: FormSubmission[]): { field_id: string; label: string }[] {
  const cols = new Map<string, string>();
  for (const s of subs) for (const a of s.answers) if (!cols.has(a.field_id)) cols.set(a.field_id, a.label);
  return [...cols].map(([field_id, label]) => ({ field_id, label }));
}

/** A one-line summary: the email answer, else the first non-empty answer. */
export function submissionTitle(s: Pick<FormSubmission, "answers">): string {
  const email = s.answers.find((a) => a.type === "email" && a.value);
  const name = s.answers.find((a) => a.field_id === "name" && a.value);
  if (name && email) return `${answerText(name)} · ${answerText(email)}`;
  return answerText(email ?? name ?? s.answers.find((a) => answerText(a))) || "Empty response";
}
