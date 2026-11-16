"use client";

import { useState, type FormEvent } from "react";
import type { BlockOf } from "@/lib/types";
import { ApiError, api } from "@/lib/api";
import { checkContact, type ContactErrors, type ContactFields } from "@/lib/contact-validate";
import s from "../forms.module.css";

function contactErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Too many messages. Please wait a minute and try again.";
    if (err.status === 400 || err.status === 422) return err.message;
    return "Something went wrong sending your message. Please try again.";
  }
  return "Couldn't reach the server. Check your connection and try again.";
}

type Fields = ContactFields;
type Errors = ContactErrors;
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

export function ContactFormBlock({ block, username, preview }: { block: BlockOf<"contact_form">; username: string; preview: boolean }) {
  // ids from the block id: unique per page, identical on server and client
  const uid = `contact-${block.id}`;
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
    const parsed = checkContact({ name: fd.get("name"), email: fd.get("email"), message: fd.get("message") });
    if (!parsed.ok) {
      setErrors(parsed.errors);
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
    <form id={`block-${block.id}`} className={s.form} onSubmit={onSubmit} noValidate aria-label={block.data.title || "Contact form"}>
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
