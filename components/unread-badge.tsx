export function UnreadBadge({
  count,
  className = "",
  position = "card",
}: {
  count: number;
  className?: string;
  position?: "card" | "icon" | "cardEdge";
}) {
  if (count <= 0) return null;
  const positionClass =
    position === "icon"
      ? "right-0 top-0"
      : position === "cardEdge"
        ? "-right-2 -top-2"
        : "right-2 top-2";

  return (
    <span
      aria-label={`${count} unread items`}
      className={`pointer-events-none absolute ${positionClass} z-20 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-extrabold leading-none text-white shadow-md ring-2 ring-[var(--surface)] ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
