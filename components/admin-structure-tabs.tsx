import Link from "next/link";

type AdminStructureTab = "organization" | "sites" | "users";

const tabs: { href: string; key: AdminStructureTab; label: string; note: string }[] = [
  {
    href: "/admin/organization",
    key: "organization",
    label: "Organization",
    note: "Create company / organization",
  },
  {
    href: "/admin/sites",
    key: "sites",
    label: "Sites",
    note: "Create site under organization",
  },
  {
    href: "/admin/users",
    key: "users",
    label: "Users",
    note: "Create admins and members",
  },
];

export function AdminStructureTabs({ activeTab }: { activeTab: AdminStructureTab }) {
  return (
    <nav
      aria-label="Organization, site, and user setup"
      className="mt-6 grid gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow)] md:grid-cols-3"
    >
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={[
              "rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5",
              active
                ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                : "border-[var(--line)] bg-[var(--soft)] text-[var(--ink)] hover:border-[var(--primary)]",
            ].join(" ")}
            href={tab.href}
            key={tab.key}
          >
            <span className="block text-base font-extrabold">{tab.label}</span>
            <span className={active ? "mt-1 block text-xs font-semibold text-white/80" : "mt-1 block text-xs font-semibold text-[var(--muted)]"}>
              {tab.note}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
