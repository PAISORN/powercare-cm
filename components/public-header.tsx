import Link from "next/link";
import { LogIn } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AppBrand } from "./app-brand";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)]/95 px-3 py-3 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <Link className="min-w-0 truncate text-base font-extrabold text-[var(--primary)] sm:text-xl md:text-2xl" href="/">
          <AppBrand className="flex-nowrap whitespace-nowrap" versionClassName="hidden sm:inline" />
        </Link>
        <nav className="flex shrink-0 items-center gap-2 text-sm md:gap-3">
          <Link
            aria-label="Staff Login"
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary)] font-semibold text-white shadow-sm transition hover:bg-[var(--primary-strong)] md:flex md:h-10 md:w-auto md:items-center md:gap-2 md:px-4"
            data-testid="staff-login-link"
            href="/login"
          >
            <LogIn size={16} />
            <span className="hidden md:inline">Staff Login</span>
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
