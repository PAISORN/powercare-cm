"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { usePathname } from "next/navigation";

export function DashboardTypeNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/dashboardstore") ? "store" : pathname.startsWith("/dashboardcm") ? "cm" : undefined;

  if (mobile) {
    return (
      <details className="group relative">
        <summary aria-label="เปิดเมนูประเภท Dashboard" className="grid size-10 cursor-pointer list-none place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] [&::-webkit-details-marker]:hidden">
          <MoreVertical aria-hidden="true" size={20} />
        </summary>
        <nav aria-label="ประเภท Dashboard" className="absolute right-0 top-[calc(100%+0.65rem)] z-50 grid w-44 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] p-2 shadow-[var(--shadow)]">
          <MobileDashboardLink active={active === "cm"} href="/dashboardcm">CM</MobileDashboardLink>
          <span aria-disabled="true" className="flex min-h-11 cursor-not-allowed items-center rounded-xl px-3 text-sm font-extrabold text-[var(--muted)] opacity-45">PM</span>
          <MobileDashboardLink active={active === "store"} href="/dashboardstore">Store</MobileDashboardLink>
        </nav>
      </details>
    );
  }

  const tabClass = (selected: boolean) => [
    "relative inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
    selected
      ? "text-[var(--ink)] after:absolute after:inset-x-2 after:-bottom-[0.8rem] after:h-0.5 after:rounded-full after:bg-[var(--primary)]"
      : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]",
  ].join(" ");

  return (
    <nav aria-label="ประเภท Dashboard" className="flex h-full min-w-0 items-stretch gap-1">
      <Link aria-current={active === "cm" ? "page" : undefined} className={tabClass(active === "cm")} href="/dashboardcm">CM</Link>
      <button aria-disabled="true" className={`${tabClass(false)} cursor-not-allowed opacity-45`} disabled type="button">PM</button>
      <Link aria-current={active === "store" ? "page" : undefined} className={tabClass(active === "store")} href="/dashboardstore">Store</Link>
    </nav>
  );
}

function MobileDashboardLink({ active, children, href }: { active: boolean; children: React.ReactNode; href: string }) {
  return <Link aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-extrabold transition ${active ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--ink)] hover:bg-[var(--soft)]"}`} href={href}>{children}{active ? <span className="text-xs font-bold">กำลังใช้งาน</span> : null}</Link>;
}
