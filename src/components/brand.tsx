/** Tautan wordmark: two linked rings + name. Original mark. */
export function Logo({ className = "", withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--brand)" />
        <circle cx="12.5" cy="16" r="5.5" fill="none" stroke="#fff" strokeWidth="2.6" />
        <circle cx="19.5" cy="16" r="5.5" fill="none" stroke="var(--accent)" strokeWidth="2.6" />
      </svg>
      {withText && <span className="text-[17px] font-semibold tracking-tight">tautan</span>}
    </span>
  );
}

export const PUBLIC_HOST =
  process.env.NEXT_PUBLIC_SITE_HOST ?? "tautan.id";
