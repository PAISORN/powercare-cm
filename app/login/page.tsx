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

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main>
      <PublicHeader />
      <form action={login} className="mx-auto mt-12 grid max-w-sm gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
        <h1 className="text-2xl font-bold">Login</h1>
        {error ? <p className="text-red-600">Username หรือ password ไม่ถูกต้อง</p> : null}
        <input name="username" required placeholder="Username" className="rounded-md border p-3 text-black" />
        <input name="password" required placeholder="Password" type="password" className="rounded-md border p-3 text-black" />
        <button className="rounded-md bg-[var(--primary)] px-4 py-3 text-white">เข้าสู่ระบบ</button>
      </form>
    </main>
  );
}
