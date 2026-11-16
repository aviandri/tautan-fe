import type { SimpleIcon } from "simple-icons";


/** Real simple-icons mark, or a neutral monogram when there is none (never a look-alike). */
export function Mark({ icon, label, size = 20 }: { icon: SimpleIcon | null; label: string; size?: number }) {
  if (icon)
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0" style={{ color: `#${icon.hex}` }}>
        <path d={icon.path} fill="currentColor" />
      </svg>
    );
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-foreground/10 font-semibold text-foreground/70"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {label.slice(0, 1)}
    </span>
  );
}

