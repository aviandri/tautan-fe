/**
 * Dashboard UI primitives. Small on purpose: one button family, one field
 * family, consistent focus rings and hover/press feedback.
 */
"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { forwardRef, useId } from "react";

export const cx = clsx;

// ---------- Button ----------

type ButtonVariant = "primary" | "dark" | "secondary" | "soft" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

/** Kartu buttons: pills that step up on hover and press in on click. */
const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-brand-hover",
  dark: "bg-foreground text-background hover:bg-ink-2",
  secondary: "bg-surface text-foreground shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--foreground)]",
  soft: "bg-sunken text-foreground hover:bg-line",
  ghost: "text-foreground hover:bg-sunken",
  danger: "bg-danger text-white hover:brightness-90",
};
const sizes: Record<ButtonSize, string> = {
  sm: "h-[38px] px-4 text-[14px] gap-1.5",
  md: "h-12 px-[22px] text-[15px] gap-2",
  lg: "h-14 px-7 text-[17px] gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold",
        "transition-[background-color,box-shadow,transform,opacity,filter] duration-150 ease-k",
        "hover:-translate-y-px active:translate-y-0 active:scale-[.97]",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-9 items-center justify-center rounded-full text-ink-2 transition-[background-color,transform] duration-150 ease-k",
        "hover:bg-sunken hover:text-foreground active:scale-[.92]",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------- Fields ----------

/** Kartu inputs: soft fill with a hairline, white with an ink ring when focused. */
const ring = "shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-2)]";
const ringFocus = "focus:bg-surface focus:shadow-[inset_0_0_0_2px_var(--foreground)] focus:outline-none";
const ringBad = "aria-[invalid=true]:shadow-[inset_0_0_0_2px_var(--danger)]";
const inputBase =
  `w-full rounded-2xl border-0 bg-background px-4 text-[15px] font-medium text-foreground placeholder:font-normal placeholder:text-muted/70 ` +
  `transition-[box-shadow,background-color] duration-150 ${ring} ${ringFocus} ${ringBad} disabled:opacity-60`;

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cx(inputBase, "h-12", className)} {...rest} />;
  },
);

/** Input with a fixed text prefix (e.g. "tautan.id/") that sits flush with the value. */
export const PrefixInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { prefix: string }
>(function PrefixInput({ prefix, className, ...rest }, ref) {
  return (
    <div
      className={cx(
        "flex h-12 w-full items-center rounded-2xl bg-background pl-4 text-[15px] font-medium",
        "transition-[box-shadow,background-color] duration-150",
        ring,
        "focus-within:bg-surface focus-within:shadow-[inset_0_0_0_2px_var(--foreground)]",
        "has-[[aria-invalid=true]]:shadow-[inset_0_0_0_2px_var(--danger)]",
      )}
    >
      <span className="select-none text-muted">{prefix}</span>
      <input
        ref={ref}
        className={cx("h-full min-w-0 flex-1 bg-transparent pr-3.5 text-foreground outline-none", className)}
        {...rest}
      />
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(inputBase, "min-h-24 py-3 leading-relaxed", className)} {...rest} />;
});

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const msgId = `${id}-msg`;
  return (
    <div className={cx("flex flex-col gap-[7px]", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": error || hint ? msgId : undefined })}
      {error ? (
        <p id={msgId} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <div id={msgId} className="text-[13px] text-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-7 w-[46px] shrink-0 items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:opacity-50",
        checked ? "bg-brand" : "bg-line-2",
      )}
    >
      <span
        className={cx(
          "inline-block size-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-transform duration-200 ease-k",
          checked ? "translate-x-[21px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx("size-5 animate-spin text-muted", className)} aria-label="Loading" />;
}

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-[28px] bg-surface shadow-card", className)} {...rest} />;
}

export function Alert({ children, tone = "danger" }: { children: React.ReactNode; tone?: "danger" | "info" }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx(
        "rounded-[18px] px-4 py-3 text-sm font-medium",
        tone === "danger" ? "bg-danger/[.08] text-danger" : "bg-brand-soft text-brand-hover",
      )}
    >
      {children}
    </div>
  );
}
