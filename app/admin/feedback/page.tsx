import { MessageSquareText, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { formatThaiDateTime } from "../../../lib/date-time/bangkok-time";
import { requireUser } from "../../../lib/session";
import { canManageFeedback } from "../../../modules/auth/permission";
import { readOrganizationScope } from "../../../modules/organization/organization-scope-service";

export default async function AdminFeedbackPage() {
  const user = await requireUser();
  if (!canManageFeedback(user)) redirect("/dashboard");
  const scope = await readOrganizationScope();

  const feedbackItems = await db.publicFeedback.findMany({
    where: { organizationId: scope.organization.id },
    include: { plant: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
              <MessageSquareText size={16} />
              Public Feedback
            </p>
            <h1 className="mt-4 text-3xl font-extrabold">ความคิดเห็น / คำแนะนำ</h1>
            <p className="mt-2 max-w-3xl text-[var(--muted)]">
              รายการความคิดเห็นจากผู้ใช้งานหน้า Public สำหรับใช้ปรับปรุงระบบ PowerCare.CM ในรอบถัดไป
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--soft)] px-4 py-3 text-right">
            <p className="text-sm text-[var(--muted)]">รายการล่าสุด</p>
            <strong className="block text-3xl">{feedbackItems.length}</strong>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5">
        {feedbackItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--soft)] px-4 py-10 text-center text-[var(--muted)]">
            ยังไม่มีความคิดเห็นจากหน้า Public
          </div>
        ) : (
          <div className="grid gap-4">
            {feedbackItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--primary)]">
                      <UserRound aria-hidden="true" size={20} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-extrabold">{item.name}</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">{item.department || "ไม่ระบุหน่วยงาน"}</p>
                      <p className="mt-1 text-xs font-bold text-[var(--primary)]">Site: {item.plant?.name ?? "-"}</p>
                    </div>
                  </div>
                  <time className="text-sm font-semibold text-[var(--muted)]">{formatThaiDateTime(item.createdAt)}</time>
                </div>
                <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm leading-6">{item.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
