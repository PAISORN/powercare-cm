"use client";

import { ClipboardList, Home, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/activities", label: "งาน", Icon: ClipboardList },
  { href: "/inventory", label: "Store", Icon: Store },
  { href: "/profile", label: "โปรไฟล์", Icon: UserRound },
] as const;

export function MobilePrimaryNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--surface-raised)]/96 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_rgba(13,27,61,.12)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold transition-colors duration-200 ${
                active ? "text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"
              }`}
              href={href}
              key={href}
            >
              <span className={`grid size-8 place-items-center rounded-xl ${active ? "bg-[var(--primary)] text-white shadow-sm" : ""}`}>
                <Icon aria-hidden="true" size={20} strokeWidth={2} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
