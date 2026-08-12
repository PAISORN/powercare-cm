import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { requireUser } from "../../lib/session";
import { logoutAction } from "./actions";

export default async function LogoutPage() {
  const user = await requireUser();

  return (
    <AppShell>
      <section className="mx-auto mt-16 max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <h1 className="text-3xl font-bold">Logout</h1>
        <p className="mt-3 text-[var(--muted)]">Sign out from {user.fullName}?</p>
        <form action={logoutAction} className="mt-6 flex flex-wrap gap-3">
          <button aria-label="Confirm logout" className="rounded-md bg-red-600 px-4 py-3 font-semibold text-white">
            Confirm logout
          </button>
          <Link className="rounded-md border border-[var(--line)] px-4 py-3" href="/dashboardcm">
            Cancel
          </Link>
        </form>
      </section>
    </AppShell>
  );
}
