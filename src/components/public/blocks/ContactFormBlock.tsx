"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import type { BlockOf } from "@/lib/types";
import { ApiError, api } from "@/lib/api";
import { usePublic } from "../context";
import s from "../public.module.css";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100, "Keep it under 100 characters"),
  email: z.string().trim().email("Enter a valid email address").max(254),
  message: z.string().trim().min(1, "Write a message").max(2000, "Keep it under 2000 characters"),
});

function contactErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Too many messages. Please wait a minute and try again.";
    if (err.status === 400 || err.status === 422) return err.message;
    return "Something went wrong sending your message. Please try again.";
  }
  return "Couldn't reach the server. Check your connection and try again.";
}

type Fields = z.infer<typeof contactSchema>;
type Errors = Partial<Record<keyof Fields, string>>;
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

export function ContactFormBlock({ block }: { block: BlockOf<"contact_form"> }) {
  const { username, preview } = usePublic();
  const uid = useId();
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview || status.kind === "sending") return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    // honeypot: bots fill every field; people never see this one
    if (fd.get("company")) {
      setStatus({ kind: "sent" });
      return;
    }
    const parsed = contactSchema.safeParse({ name: fd.get("name"), email: fd.get("email"), message: fd.get("message") });
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof Fields;
        errs[k] ??= issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setStatus({ kind: "sending" });
    try {
      await api.public.contact(username, { block_id: block.id, ...parsed.data });
      form.reset();
      setStatus({ kind: "sent" });
    } catch (err) {
      setStatus({ kind: "error", message: contactErrorMessage(err) });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className={s.form} role="status">
        <p className={s.formTitle}>Message sent</p>
        <p className={s.formStatus} style={{ textAlign: "left" }}>
          Thanks, your message is on its way.
        </p>
      </div>
    );
  }

  const field = (name: keyof Fields, label: string, el: "input" | "textarea", type = "text", auto?: string) => {
    const id = `${uid}-${name}`;
    const errId = `${id}-err`;
    const props = {
      id,
      name,
      className: s.input,
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? errId : undefined,
      disabled: preview,
    };
    return (
      <label className={s.field} htmlFor={id}>
        {label}
        {el === "textarea" ? <textarea {...props} rows={4} /> : <input {...props} type={type} autoComplete={auto} />}
        {errors[name] ? (
          <span id={errId} className={s.fieldError}>
            {errors[name]}
          </span>
        ) : null}
      </label>
    );
  };

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate aria-label={block.data.title || "Contact form"}>
      {block.data.title ? <p className={s.formTitle}>{block.data.title}</p> : null}
      {field("name", "Name", "input", "text", "name")}
      {field("email", "Email", "input", "email", "email")}
      {field("message", "Message", "textarea")}
      <div className={s.honeypot} aria-hidden>
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button className={s.btn} type="submit" disabled={preview || status.kind === "sending"} style={{ justifyContent: "center" }}>
        {status.kind === "sending" ? "Sending…" : block.data.button_label || "Send"}
      </button>
      {status.kind === "error" ? (
        <p className={s.formStatus} role="alert">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
