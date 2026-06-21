import Link from "next/link";
import { LogIn, Menu, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AppBrand } from "./app-brand";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)]/95 px-3 py-3 backdrop-blur md:px-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)]" aria-label="Open menu" type="button">
            <Menu size={18} />
          </button>
          <Link className="truncate text-2xl font-extrabold text-[var(--primary)]" href="/">
            <AppBrand />
          </Link>
        </div>
        <nav className="flex shrink-0 items-center gap-2 text-sm md:gap-3">
          <Link
            aria-label="Staff Login"
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--primary)] font-semibold text-white shadow-sm md:flex md:h-11 md:w-auto md:items-center md:gap-2 md:px-4 md:py-2"
            data-testid="staff-login-link"
            href="/login"
          >
            <LogIn size={16} />
            <span className="hidden md:inline">Staff Login</span>
          </Link>
          <ThemeToggle />
          <Link className="hidden items-center gap-2 md:flex" href="/tracking">
            <ShieldCheck size={16} />
            Track Work
          </Link>
        </nav>
      </div>
    </header>
  );
}
