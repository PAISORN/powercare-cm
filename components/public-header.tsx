import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function PublicHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface)] px-8 py-4">
      <Link className="font-bold" href="/">
        Power Plant CM Control Center
      </Link>
      <nav className="flex flex-wrap items-center gap-3">
        <ThemeToggle />
        <Link className="rounded-md bg-[var(--primary)] px-4 py-2 text-white" href="/request">
          แจ้งซ่อม
        </Link>
        <Link className="rounded-md border border-[var(--line)] px-4 py-2" href="/tracking">
          ติดตามสถานะ
        </Link>
        <Link className="rounded-md border border-[var(--line)] px-4 py-2" href="/login">
          Login
        </Link>
      </nav>
    </header>
  );
}
