import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/session";
import { RoleName } from "../modules/cm-work/cm-work-types";
import { ThemeToggle } from "./theme-toggle";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--line)] bg-[var(--surface)] p-5 md:block">
        <h1 className="font-bold">CM Control Center</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{user.fullName}</p>
        <p className="text-xs text-[var(--muted)]">
          {user.role}
          {user.category ? ` · ${user.category.name}` : ""}
        </p>
        <nav className="mt-6 grid gap-3">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/work">รายการงานทั้งหมด</Link>
          <Link href="/reports">Export</Link>
          <Link href="/profile">Profile</Link>
          {user.role === RoleName.ADMIN ? <Link href="/admin/users">Admin</Link> : null}
        </nav>
      </aside>
      <main className="min-h-screen p-6 md:ml-64 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold md:hidden">CM Control Center</p>
            <p className="text-sm text-[var(--muted)] md:hidden">{user.fullName}</p>
          </div>
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
