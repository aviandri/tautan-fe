"use client";

import { useState, type FormEvent } from "react";
import type { BlockOf, FormField } from "@/lib/types";
import { validateAnswers, type RawAnswers } from "@/lib/form-validate";
import { api, ApiError } from "@/lib/api";
import { formErrorMessage } from "@/lib/form-validate";
import s from "../public.module.css";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; message: string } | { kind: "error"; message: string };

function Sent({ title, message }: { title?: string; message: string }) {
  return (
    <div className={s.form} role="status">
      {title ? <p className={s.formTitle}>{title}</p> : null}
      <p className={s.formStatus} style={{ textAlign: "left" }}>
        {message}
      </p>
    </div>
  );
}

// ---------- email signup ----------

export function EmailSignupBlock({ block, username, preview }: { block: BlockOf<"email_signup">; username: string; preview: boolean }) {
  const d = block.data;
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const id = `signup-${block.id}`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview || status.kind === "sending") return;
    const fd = new FormData(e.currentTarget);
    if (fd.get("company")) return setStatus({ kind: "sent", message: d.success_message || "You're on the list." });
    const { errors, answers } = validateAnswers([{ id: "email", type: "email", label: "Email", required: true }], {
      email: String(fd.get("email") ?? ""),
    });
    if (errors.email) return setError(errors.email);
    setError(null);
    setStatus({ kind: "sending" });
    try {
      const r = await api.public.subscribe(username, { block_id: block.id, email: String(answers.email) });
      setStatus({ kind: "sent", message: r.success_message || d.success_message || "You're on the list." });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof ApiError && err.details?.email ? err.details.email : formErrorMessage(err) });
    }
  }

  if (status.kind === "sent") return <Sent title={d.title} message={status.message} />;
  return (
    <form id={`block-${block.id}`} className={s.form} onSubmit={onSubmit} noValidate aria-label={d.title || "Email signup"}>
      {d.title ? <p className={s.formTitle}>{d.title}</p> : null}
      {d.description ? <p className={s.formDesc}>{d.description}</p> : null}
      <label htmlFor={id} className={s.srOnly}>
        Email
      </label>
      <div className={s.signupRow}>
        <input
          id={id}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={s.input}
          placeholder={d.placeholder || "you@example.com"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          disabled={preview}
        />
        <button className={s.btn} type="submit" disabled={preview || status.kind === "sending"} style={{ width: "auto", justifyContent: "center" }}>
          {status.kind === "sending" ? "Sending…" : d.button_label || "Subscribe"}
        </button>
      </div>
      {error ? (
        <span id={`${id}-err`} className={s.fieldError}>
          {error}
        </span>
      ) : null}
      <Honeypot />
      {status.kind === "error" ? (
        <p className={s.formStatus} role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}

function Honeypot() {
  return (
    <div className={s.honeypot} aria-hidden>
      <label>
        Company
        <input name="company" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

// ---------- form ----------

const AUTOCOMPLETE: Partial<Record<FormField["type"], string>> = { email: "email", phone: "tel" };
const INPUT_TYPE: Partial<Record<FormField["type"], string>> = { email: "email", phone: "tel", date: "date", number: "number", text: "text" };

export function FormBlock({ block, username, preview }: { block: BlockOf<"form">; username: string; preview: boolean }) {
  const d = block.data;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fields = d.fields ?? [];
  const base = `form-${block.id}`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview || status.kind === "sending") return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const ok = d.success_message || "Thanks, your answers are in.";
    if (fd.get("company")) return setStatus({ kind: "sent", message: ok });
    const raw: RawAnswers = {};
    for (const f of fields) raw[f.id] = f.type === "checkbox" ? fd.get(f.id) === "on" : String(fd.get(f.id) ?? "");
    const v = validateAnswers(fields, raw);
    setErrors(v.errors);
    if (!v.ok) {
      const first = fields.find((f) => v.errors[f.id]);
      if (first) form.querySelector<HTMLElement>(`#${CSS.escape(`${base}-${first.id}`)}`)?.focus();
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const r = await api.public.form(username, {
        block_id: block.id,
        answers: v.answers,
        subscribe: d.subscribe === "ask" ? fd.get("__subscribe") === "on" : undefined,
      });
      form.reset();
      setStatus({ kind: "sent", message: r.success_message || ok });
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setStatus({ kind: "error", message: formErrorMessage(err) });
    }
  }

  if (status.kind === "sent") return <Sent title={d.title} message={status.message} />;

  return (
    <form id={`block-${block.id}`} className={s.form} onSubmit={onSubmit} noValidate aria-label={d.title || "Form"}>
      {d.title ? <p className={s.formTitle}>{d.title}</p> : null}
      {d.description ? <p className={s.formDesc}>{d.description}</p> : null}
      {fields.map((f) => {
        const id = `${base}-${f.id}`;
        const err = errors[f.id];
        const common = {
          id,
          name: f.id,
          required: f.required,
          disabled: preview,
          "aria-invalid": err ? true : undefined,
          "aria-describedby": err ? `${id}-err` : undefined,
        };
        const labelText = `${f.label}${f.required ? "" : " (optional)"}`;
        if (f.type === "checkbox") {
          return (
            <div key={f.id} className={s.field}>
              <label className={s.checkRow} htmlFor={id}>
                <input type="checkbox" {...common} />
                <span>{labelText}</span>
              </label>
              {err ? <span id={`${id}-err`} className={s.fieldError}>{err}</span> : null}
            </div>
          );
        }
        return (
          <div key={f.id} className={s.field}>
            <label htmlFor={id} className={d.hide_labels ? s.srOnly : undefined}>
              {labelText}
            </label>
            {f.type === "textarea" ? (
              <textarea {...common} className={s.input} rows={4} placeholder={f.placeholder || (d.hide_labels ? f.label : undefined)} />
            ) : f.type === "select" ? (
              <select {...common} className={s.input} defaultValue="">
                <option value="" disabled>
                  {f.placeholder || "Choose one"}
                </option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                className={s.input}
                type={INPUT_TYPE[f.type] ?? "text"}
                autoComplete={AUTOCOMPLETE[f.type]}
                inputMode={f.type === "number" ? "decimal" : undefined}
                placeholder={f.placeholder || (d.hide_labels ? f.label : undefined)}
              />
            )}
            {err ? <span id={`${id}-err`} className={s.fieldError}>{err}</span> : null}
          </div>
        );
      })}
      {d.subscribe === "ask" ? (
        <label className={s.checkRow}>
          <input type="checkbox" name="__subscribe" disabled={preview} />
          <span>Email me updates</span>
        </label>
      ) : null}
      <Honeypot />
      <button className={s.btn} type="submit" disabled={preview || status.kind === "sending"} style={{ justifyContent: "center" }}>
        {status.kind === "sending" ? "Sending…" : d.button_label || "Send"}
      </button>
      {status.kind === "error" ? (
        <p className={s.formStatus} role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
