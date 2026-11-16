export type ContactFields = { name: string; email: string; message: string };
export type ContactErrors = Partial<Record<keyof ContactFields, string>>;
type Fields = ContactFields;
type Errors = ContactErrors;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same rules the BE applies; plain checks keep this island small (no zod on the public page). */
export function checkContact(raw: { name: unknown; email: unknown; message: unknown }): { ok: true; data: Fields } | { ok: false; errors: Errors } {
  const name = String(raw.name ?? "").trim();
  const email = String(raw.email ?? "").trim();
  const message = String(raw.message ?? "").trim();
  const errors: Errors = {};
  if (!name) errors.name = "Enter your name";
  else if (name.length > 100) errors.name = "Keep it under 100 characters";
  if (!EMAIL.test(email) || email.length > 254) errors.email = "Enter a valid email address";
  if (!message) errors.message = "Write a message";
  else if (message.length > 2000) errors.message = "Keep it under 2000 characters";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: { name, email, message } };
}
