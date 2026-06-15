import { redirect } from "next/navigation";
import { PublicHeader } from "../../components/public-header";
import { setSession } from "../../lib/session";
import { authenticate } from "../../modules/auth/auth-service";

async function login(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await authenticate(username, password);
  if (!user) redirect("/login?error=1");
  await setSession(user.id);
  redirect("/dashboard");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; loggedOut?: string }> }) {
  const { error, loggedOut } = await searchParams;

  return (
    <main>
      <PublicHeader />
      <section className="grid min-h-[calc(100vh-73px)] items-center px-5 py-10 lg:grid-cols-[1fr_420px] lg:px-12">
        <div className="cm-hero relative hidden min-h-[520px] overflow-hidden rounded-3xl p-10 text-white shadow-[var(--shadow)] lg:block">
          <div className="plant-skyline" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="relative z-10 max-w-2xl">
            <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">Staff Workspace</p>
            <h1 className="mt-6 text-5xl font-extrabold leading-tight">Control every CM job from one secure dashboard</h1>
            <p className="mt-5 text-white/85">Role based access for admin, engineer, and technician workflows.</p>
          </div>
        </div>
        <form action={login} className="mx-auto grid w-full max-w-sm gap-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <h1 className="text-3xl font-bold">Login</h1>
          {loggedOut ? <p className="rounded-xl bg-green-50 px-3 py-2 text-green-700">Logged out successfully.</p> : null}
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-red-700">Username หรือ password ไม่ถูกต้อง</p> : null}
          <input name="username" required placeholder="Username" className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3 text-[var(--ink)]" />
          <input name="password" required placeholder="Password" type="password" className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3 text-[var(--ink)]" />
          <button className="rounded-2xl bg-[var(--primary)] px-4 py-3 font-bold text-white shadow-sm">เข้าสู่ระบบ</button>
        </form>
      </section>
    </main>
  );
}
