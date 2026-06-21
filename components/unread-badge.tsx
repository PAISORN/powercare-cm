export function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;

  return (
    <span
      aria-label={`${count} unread items`}
      className={`pointer-events-none absolute -right-2 -top-2 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-extrabold leading-none text-white shadow-md ring-2 ring-[var(--surface)] ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
