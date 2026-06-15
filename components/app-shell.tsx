import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, FileSpreadsheet, History, Home, LogOut, PlusCircle, Search, Settings, UserRound, Wrench } from "lucide-react";
import { getCurrentUser } from "../lib/session";
import { RoleName } from "../modules/cm-work/cm-work-types";
import { ThemeToggle } from "./theme-toggle";
import { UserAvatar } from "./user-avatar";

const mainLinks = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "All Work", href: "/work", icon: Wrench },
  { label: "Reports", href: "/reports", icon: FileSpreadsheet },
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Create Request", href: "/request", icon: PlusCircle },
  { label: "Track Work", href: "/tracking", icon: Search },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[var(--line)] bg-[var(--surface)] p-5 md:block">
        <Link className="text-2xl font-extrabold text-[var(--primary)]" href="/dashboard">
          PowerCare.CM
        </Link>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[var(--soft)] p-3">
          <span data-testid="sidebar-user-avatar">
            <UserAvatar fullName={user.fullName} hasPhoto={Boolean(user.profilePhoto)} size="md" userId={user.id} version={user.profilePhoto?.updatedAt.getTime()} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{user.fullName}</p>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {user.role}
              {user.category ? ` - ${user.category.name}` : ""}
            </p>
          </div>
        </div>

        <nav className="mt-6 grid gap-2">
          {mainLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-[var(--soft)]">
                <Icon size={17} className="text-[var(--primary)]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {user.role === RoleName.ADMIN ? (
            <>
              <Link href="/admin/users" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-[var(--soft)]">
                <Settings size={17} className="text-[var(--primary)]" />
                <span>Admin</span>
              </Link>
              <Link href="/admin/history" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-[var(--soft)]">
                <History size={17} className="text-[var(--primary)]" />
                <span>History</span>
              </Link>
            </>
          ) : null}
          <Link href="/logout" className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-600 hover:bg-red-50">
            <LogOut aria-hidden="true" size={17} />
            <span>Logout</span>
          </Link>
        </nav>
      </aside>

      <main className="min-h-screen p-5 md:ml-72 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-2 rounded-3xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 shadow-[var(--shadow)] md:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white shadow-sm transition hover:bg-[var(--primary-strong)]" href="/dashboard" aria-label="Home" title="Home">
              <Home size={18} />
            </Link>
            <div className="min-w-0">
              <p className="font-bold md:hidden">PowerCare.CM</p>
              <p className="truncate text-sm text-[var(--muted)]">{user.fullName}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <Link href="/logout" className="grid h-10 w-10 place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm transition hover:bg-red-100 md:hidden" aria-label="Logout" title="Logout">
              <LogOut aria-hidden="true" size={16} />
            </Link>
            <ThemeToggle />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
