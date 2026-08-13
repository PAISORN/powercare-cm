"use client";

import { ClipboardList, Home, Plus, Store, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobilePrimaryNav({ elevated = false, homeHref = "/dashboardcm" }: { elevated?: boolean; homeHref?: string }) {
  const pathname = usePathname();
  const alternateDashboard = homeHref === "/dashboardstore"
    ? { href: "/dashboardcm", label: "CM", Icon: Wrench }
    : { href: "/dashboardstore", label: "Store", Icon: Store };
  const leftItems = [
    { href: homeHref, label: "Dashboard", Icon: Home },
    { href: "/activities", label: "งาน", Icon: ClipboardList },
  ];
  const rightItems = [alternateDashboard, { href: "/profile", label: "โปรไฟล์", Icon: UserRound }];
  const createActive = pathname === "/request" || pathname.startsWith("/request/");

  return (
    <nav
      aria-label="เมนูหลัก"
      className={`fixed inset-x-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))] ${elevated?"z-[250]":"z-50"} px-2 pb-2 pt-2 md:hidden`}
    >
      <svg aria-hidden="true" className="mobile-primary-nav-surface pointer-events-none absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_-8px_18px_rgba(13,27,61,.16)]" preserveAspectRatio="none" viewBox="0 0 500 80">
        <path d="M 24 1 H 194 C 201 1 206 9 206 20 A 44 44 0 0 0 294 20 C 294 9 299 1 306 1 H 476 Q 499 1 499 24 V 79 H 1 V 24 Q 1 1 24 1 Z" fill="var(--surface-raised)" stroke="var(--line)" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="relative z-10 mx-auto grid max-w-lg grid-cols-[1fr_1fr_4.5rem_1fr_1fr] items-end">
        {leftItems.map((item) => <MobileNavItem active={isActive(pathname, item.href, homeHref)} key={item.href} {...item} />)}

        <div className="relative min-h-14" aria-hidden="true" />
        <Link
          aria-current={createActive ? "page" : undefined}
          aria-label="แจ้งซ่อม"
          className={`absolute left-1/2 top-3 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white shadow-[0_8px_18px_rgba(37,99,235,.3)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${createActive ? "bg-[var(--primary-strong)]" : "bg-[var(--primary)] hover:bg-[var(--primary-strong)]"}`}
          href="/request"
        >
          <Plus aria-hidden="true" size={31} strokeWidth={2} />
        </Link>

        {rightItems.map((item) => <MobileNavItem active={isActive(pathname, item.href, homeHref)} key={item.href} {...item} />)}
      </div>
    </nav>
  );
}

function MobileNavItem({ active, href, Icon, label }: { active: boolean; href: string; Icon: typeof Home; label: string }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 min-w-0 flex-col items-center justify-end gap-1 rounded-2xl px-1 pb-1 text-[0.6875rem] font-bold transition-colors duration-200 ${active ? "text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"}`}
      href={href}
    >
      <Icon aria-hidden="true" size={21} strokeWidth={active ? 2.4 : 2} />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string, homeHref: string) {
  return pathname === href || (href !== homeHref && pathname.startsWith(`${href}/`));
}
