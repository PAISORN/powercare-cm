import { BriefcaseBusiness, CheckCircle2, UsersRound, Wrench } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { CmDateFilterBar } from "../../components/cm-date-filter-bar";
import { UserAvatar } from "../../components/user-avatar";
import { requireUser } from "../../lib/session";
import { canViewMemberWorkload } from "../../modules/auth/permission";
import type { CmDateFilterInput } from "../../modules/filters/cm-date-filter";
import { parseCmDateFilter } from "../../modules/filters/cm-date-filter";
import { getMembers, type MemberCategoryFilter } from "../../modules/members/member-query";

type MemberSearchParams = CmDateFilterInput & {
  category?: string;
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<MemberSearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const category = normalizeCategory(params.category);
  const dateInput: CmDateFilterInput = {
    mode: params.mode,
    date: params.date,
    startDate: params.startDate,
    endDate: params.endDate,
    month: params.month,
    year: params.year,
  };
  const canSeeMetrics = canViewMemberWorkload(user.role);
  const dateFilter = parseCmDateFilter(dateInput);
  const members = await getMembers({ viewerRole: user.role, category, dateFilter });
  const activeTotal = members.reduce((sum, member) => sum + (member.metrics?.active ?? 0), 0);
  const closedTotal = members.reduce((sum, member) => sum + (member.metrics?.closed ?? 0), 0);

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="rounded-t-3xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 px-5 py-7 text-white sm:px-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">
            <UsersRound aria-hidden="true" size={17} />
            Maintenance Members
          </p>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">สมาชิกทีมซ่อมบำรุง</h1>
          <p className="mt-2 text-sm text-white/85">รายชื่อทีมงาน แผนก และภาระงาน Corrective Maintenance</p>
        </div>

        <div className={`grid gap-px border-b border-[var(--line)] bg-[var(--line)] ${canSeeMetrics ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
          <SummaryMetric icon={UsersRound} label="สมาชิกทั้งหมด" value={members.length} />
          {canSeeMetrics ? <SummaryMetric icon={Wrench} label="กำลังรับผิดชอบ" value={activeTotal} /> : null}
          {canSeeMetrics ? <SummaryMetric icon={CheckCircle2} label="ปิดในช่วงที่เลือก" value={closedTotal} /> : null}
        </div>

        <form className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1.7fr_auto_auto] xl:items-end" method="get">
          <label className="grid gap-1 text-sm font-semibold">
            <span className="text-[var(--muted)]">Work Category</span>
            <select className="min-h-[52px] rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 py-3 outline-none" defaultValue={category ?? ""} name="category">
              <option value="">Overview - All Members</option>
              <option value="mechanical">Mechanical</option>
              <option value="electrical">Electrical</option>
            </select>
          </label>

          {canSeeMetrics ? (
            <CmDateFilterBar
              defaultDate={params.date}
              defaultEndDate={params.endDate}
              defaultMode={params.mode}
              defaultMonth={params.month}
              defaultStartDate={params.startDate}
              defaultYear={params.year}
            />
          ) : (
            <div className="hidden xl:block" />
          )}

          <button className="min-h-[52px] rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]" type="submit">
            Apply filters
          </button>
          <Link className="flex min-h-[52px] items-center justify-center rounded-2xl border border-[var(--line)] px-5 py-3 font-semibold hover:bg-[var(--soft)]" href="/members">
            Clear
          </Link>
        </form>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" aria-label="รายชื่อสมาชิก">
        {members.map((member) => {
          const content = (
            <>
              <div className="flex min-w-0 items-center gap-4">
                <UserAvatar
                  fullName={member.fullName}
                  hasPhoto={Boolean(member.profilePhoto)}
                  size="lg"
                  userId={member.id}
                  version={member.profilePhoto?.updatedAt.getTime()}
                />
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold">{member.fullName}</h2>
                  <p className="mt-1 truncate text-sm font-semibold text-[var(--primary)]">{member.role}</p>
                  <p className="mt-1 truncate text-sm text-[var(--muted)]">{member.department || "-"}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4 text-sm">
                <span className="text-[var(--muted)]">Category</span>
                <strong className="truncate text-right">{member.category?.name ?? "-"}</strong>
              </div>

              {member.metrics ? (
                <div className="mt-4 grid grid-cols-2 divide-x divide-[var(--line)] border-t border-[var(--line)] pt-4">
                  <MemberMetric icon={BriefcaseBusiness} label="กำลังรับผิดชอบ" value={member.metrics.active} />
                  <MemberMetric icon={CheckCircle2} label="ปิดแล้ว" value={member.metrics.closed} />
                </div>
              ) : null}
            </>
          );

          return member.metrics ? (
            <Link key={member.id} className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-[var(--primary)]" href={`/work?claimantId=${encodeURIComponent(member.id)}`}>
              {content}
            </Link>
          ) : (
            <article key={member.id} className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
              {content}
            </article>
          );
        })}
      </section>

      {members.length === 0 ? (
        <p className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">ไม่พบสมาชิกในหมวดหมู่ที่เลือก</p>
      ) : null}
    </AppShell>
  );
}

function normalizeCategory(value?: string): MemberCategoryFilter | undefined {
  return value === "electrical" || value === "mechanical" ? value : undefined;
}

function SummaryMetric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 bg-[var(--surface)] px-5 py-4">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--soft)] text-[var(--primary)]">
        <Icon aria-hidden="true" size={20} />
      </span>
      <div>
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <strong className="text-2xl">{value}</strong>
      </div>
    </div>
  );
}

function MemberMetric({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: number }) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
        <Icon aria-hidden="true" size={14} />
        {label}
      </p>
      <strong className="mt-1 block text-2xl">{value}</strong>
    </div>
  );
}
