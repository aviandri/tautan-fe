// Shared by the client nav and the server-rendered page, so it must not be "use client".

export const NAV_LINKS = [
  { href: "#blocks", label: "Blocks" },
  { href: "#themes", label: "Themes" },
  { href: "#analytics", label: "Analytics" },
  { href: "#questions", label: "Questions" },
];

export function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid h-8 w-8 place-items-center rounded-[10px] bg-brand text-[17px] font-bold leading-none text-brand-ink ${className}`}
      aria-hidden
    >
      t
    </span>
  );
}
