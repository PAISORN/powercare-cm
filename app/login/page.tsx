import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppBrand } from "../../components/app-brand";
import { ThemeToggle } from "../../components/theme-toggle";
import { LoginForm } from "../../components/login-form";
import { getCurrentUser, setSession } from "../../lib/session";
import { authenticate } from "../../modules/auth/auth-service";
import { defaultHomeHref } from "../../modules/auth/default-home-route";

async function login(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await authenticate(username, password);
  if (!user) redirect("/login?loginError=1");
  await setSession(user.id);
  const currentUser = await getCurrentUser();
  redirect(currentUser ? defaultHomeHref(currentUser) : "/dashboardcm");
}

export const metadata = { title: "เข้าสู่ระบบ | PowerCare" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; loginError?: string; loggedOut?: string }> }) {
  const { error, loginError, loggedOut } = await searchParams;
  if (error) redirect("/login?loginError=1");

  return (
    <main className="login-page">
      <header className="login-header">
        <div className="login-header-inner">
          <Link href="/" className="login-brand" aria-label="PowerCare หน้าแรก"><AppBrand className="flex-nowrap" versionClassName="hidden" /></Link>
          <nav aria-label="เมนูหน้าเข้าสู่ระบบ">
            <Link href="/" className="login-home-link"><ArrowLeft size={17} aria-hidden="true" /><span>กลับหน้าแรก</span></Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <section className="login-workspace" aria-label="เข้าสู่ระบบ PowerCare">
        <div className="login-photo-panel" data-reveal-ignore>
          <Image alt="" src="/landing/powercare-maintenance-hero.webp" fill sizes="(max-width: 767px) 100vw, 55vw" priority className="login-photo" />
          <div className="login-photo-copy">
            <h2>ทุกงานซ่อมบำรุง<br />เชื่อมต่อในระบบเดียว</h2>
            <p>จัดการงานซ่อม อะไหล่ และข้อมูลหน้างาน<br className="hidden lg:block" /> ด้วยสิทธิ์ที่เหมาะกับแต่ละทีม</p>
          </div>
        </div>
        <div className="login-form-panel"><LoginForm action={login} hasError={Boolean(loginError)} loggedOut={Boolean(loggedOut)} /></div>
      </section>
      <footer className="login-footer"><b>PowerCare</b><span>Maintenance operations platform</span></footer>
    </main>
  );
}
