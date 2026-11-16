import type { FormField } from "./types";
import { ApiError } from "./api";

// Client-side checks that mirror the BE rules for POST /public/{u}/form (SPEC P2-3), so most
// mistakes show under their field before a round trip. The BE stays the source of truth.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d\s.-]{6,24}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX: Partial<Record<FormField["type"], number>> = { text: 500, textarea: 5000 };

export type RawAnswers = Record<string, string | boolean | undefined>;

export function validateAnswers(fields: FormField[], raw: RawAnswers) {
  const answers: Record<string, string | number | boolean> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = raw[f.id];
    const name = f.label || "This field";
    if (f.type === "checkbox") {
      const checked = v === true || v === "on" || v === "true";
      if (f.required && !checked) errors[f.id] = `Tick "${name}" to continue`;
      answers[f.id] = checked;
      continue;
    }
    const str = typeof v === "string" ? v.trim() : "";
    if (!str) {
      if (f.required) errors[f.id] = `Fill in ${name.toLowerCase()}`;
      continue;
    }
    const max = MAX[f.type];
    if (max && str.length > max) {
      errors[f.id] = `Keep it under ${max} characters`;
      continue;
    }
    switch (f.type) {
      case "email":
        if (!EMAIL.test(str)) errors[f.id] = "Enter a valid email address";
        break;
      case "phone":
        if (!PHONE.test(str)) errors[f.id] = "Enter a phone number with digits only, plus + ( ) -";
        break;
      case "date":
        if (!DATE.test(str) || Number.isNaN(Date.parse(str))) errors[f.id] = "Pick a date";
        break;
      case "number":
        if (!Number.isFinite(Number(str))) errors[f.id] = "Enter a number";
        break;
      case "select":
        if (f.options && !f.options.includes(str)) errors[f.id] = "Choose one of the options";
        break;
    }
    if (!errors[f.id]) answers[f.id] = f.type === "number" ? Number(str) : str;
  }
  return { answers, errors, ok: Object.keys(errors).length === 0 };
}

/** Visitor-facing message for a failed public form/subscribe POST (api.public.*). */
export function formErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Too many tries. Please wait a few minutes and try again.";
    if (err.status === 400 || err.status === 422) return err.message;
    return "Something went wrong sending this. Please try again.";
  }
  // fetch() rejects with a TypeError when the network or CORS fails
  if (err instanceof TypeError) return "Couldn't reach the server. Check your connection and try again.";
  return "Something went wrong sending this. Please try again.";
}
