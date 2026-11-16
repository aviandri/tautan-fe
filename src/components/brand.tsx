/** Tautan wordmark (Kartu): two overlapping rounded tiles, magenta over ink, plus the name. */
export function Logo({ className = "", withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden>
        <rect x="2" y="2" width="15" height="15" rx="7.5" fill="#d0106f" />
        <rect x="11" y="11" width="15" height="15" rx="7.5" fill="#000" />
      </svg>
      {withText && <span className="text-[22px] font-bold tracking-[-0.03em]">tautan</span>}
    </span>
  );
}

export const PUBLIC_HOST =
  process.env.NEXT_PUBLIC_SITE_HOST ?? "tautan.id";


