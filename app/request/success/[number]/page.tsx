import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "../../../../components/app-shell";
import { PublicHeader } from "../../../../components/public-header";
import { db } from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";

export default async function RequestSuccessPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await getCurrentUser();
  const { number } = await params;
  const work = await db.cmWork.findUnique({ where: { number }, select: { number: true } });
  const isSuccess = Boolean(work);

  return (
    <SuccessShell signedIn={Boolean(user)}>
      <section className="mx-auto max-w-2xl px-5 py-12 md:px-8">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-7 text-center shadow-[var(--shadow)] md:p-10">
          <div
            aria-label={isSuccess ? "request-success-icon" : "request-failed-icon"}
            className={
              isSuccess
                ? "mx-auto grid h-28 w-28 place-items-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-100"
                : "mx-auto grid h-28 w-28 place-items-center rounded-full bg-red-50 text-red-500 ring-8 ring-red-100"
            }
          >
            {isSuccess ? <CheckCircle2 aria-hidden="true" size={78} strokeWidth={2.5} /> : <XCircle aria-hidden="true" size={78} strokeWidth={2.5} />}
          </div>

          <h1 className="mt-8 text-3xl font-extrabold">{isSuccess ? "ส่งแจ้งซ่อมสำเร็จ" : "ส่งแจ้งซ่อมไม่สำเร็จ"}</h1>
          {isSuccess ? (
            <>
              <p className="mt-4 text-lg">
                เลขที่แจ้งซ่อม: <strong>{number}</strong>
              </p>
              <p className="mt-2 text-[var(--muted)]">กรุณาจดเลขที่แจ้งซ่อมไว้สำหรับติดตามสถานะ</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-lg font-semibold">ไม่พบข้อมูลการแจ้งซ่อมในระบบ</p>
              <p className="mt-2 text-[var(--muted)]">กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบการบันทึกข้อมูล</p>
            </>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {isSuccess ? (
              <Link className="rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white shadow-sm" href={`/tracking?number=${number}`}>
                ติดตามสถานะ
              </Link>
            ) : null}
            <Link className="rounded-2xl border border-[var(--line)] px-5 py-3 font-bold" href="/request">
              แจ้งซ่อมรายการใหม่
            </Link>
          </div>
        </div>
      </section>
    </SuccessShell>
  );
}

function SuccessShell({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  if (signedIn) return <AppShell>{children}</AppShell>;

  return (
    <main>
      <PublicHeader />
      {children}
    </main>
  );
}
