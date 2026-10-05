"use client";

import { Search, UserPlus, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { UserAvatar } from "../user-avatar";

type AssigneeOption = { id: string; fullName: string; role: string; hasPhoto?: boolean; photoVersion?: number };

export function PmAnnualTeamPicker({ users, dateLabel, dateTime }: { users: AssigneeOption[]; dateLabel?: string; dateTime?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [leadUserId, setLeadUserId] = useState("");
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized
      ? users.filter((user) =>
          `${user.fullName} ${user.role}`.toLocaleLowerCase().includes(normalized),
        )
      : users;
  }, [query, users]);
  const lead = users.find((user) => user.id === leadUserId);
  const collaborators = users.filter((user) => collaboratorIds.includes(user.id));
  const teamSize = (lead ? 1 : 0) + collaborators.length;
  const teamMembers = [lead, ...collaborators].filter((user): user is AssigneeOption => Boolean(user));

  function selectLead(userId: string) {
    setLeadUserId(userId);
    setCollaboratorIds((current) => current.filter((id) => id !== userId));
  }

  function toggleCollaborator(userId: string) {
    if (!leadUserId && !collaboratorIds.includes(userId)) {
      setLeadUserId(userId);
      return;
    }
    setCollaboratorIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  return (
    <div className="grid gap-3 px-2">
      {leadUserId ? <input name="leadUserId" type="hidden" value={leadUserId} /> : null}
      {collaboratorIds.map((userId) => (
        <input key={userId} name="collaboratorUserIds" type="hidden" value={userId} />
      ))}

      <div className="flex min-h-10 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center" aria-label={teamSize ? `ทีม PM ${teamMembers.map((user) => user.fullName).join(", ")}` : "ยังไม่ได้เลือกทีม PM"}>
          {teamMembers.length ? teamMembers.slice(0, 3).map((user, index) => (
            <span className={`${index ? "-ml-2" : ""} [&>span]:!size-10`} key={user.id} title={user.fullName}>
              <UserAvatar fullName={user.fullName} hasPhoto={Boolean(user.hasPhoto)} size="sm" userId={user.id} version={user.photoVersion} />
            </span>
          )) : <span className="grid size-10 place-items-center rounded-full border-2 border-white bg-sky-100 text-sky-800 shadow-md" title="ยังไม่ได้เลือกทีม PM"><UsersRound aria-hidden="true" size={18} /></span>}
          {teamMembers.length > 3 ? <span className="-ml-2 grid size-10 place-items-center rounded-full border-2 border-white bg-slate-700 text-xs font-black text-white shadow-md">+{teamMembers.length - 3}</span> : null}
        </div>
        {dateLabel ? <time className="shrink-0 text-base font-semibold tabular-nums" dateTime={dateTime}>{dateLabel}</time> : null}
      </div>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-emerald-500 bg-white px-5 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
        onClick={() => setOpen(true)}
        type="button"
      >
        <UserPlus aria-hidden="true" size={20} />
        {teamSize ? `แก้ไขผู้ร่วม PM (${teamSize})` : "เพิ่มผู้ร่วม PM"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[110] grid place-items-center p-4">
          <button
            aria-label="ปิดหน้าต่างเลือกผู้ร่วม PM"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            type="button"
          />
          <section
            aria-label="เลือกผู้ร่วม PM"
            aria-modal="true"
            className="relative z-10 flex max-h-[85dvh] w-full min-w-0 max-w-xl flex-col overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h3 className="text-xl font-extrabold">เพิ่มผู้ร่วม PM</h3>
                <p className="mt-1 text-sm text-slate-600">
                  ทีมที่เลือกจะถูกมอบหมายให้ PM Work ทุก Main Asset ในรายการนี้
                </p>
              </div>
              <button
                aria-label="ปิดหน้าต่างเลือกผู้ร่วม PM"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </header>

            <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
              <label className="grid min-w-0 gap-1.5 text-sm font-bold">
                ผู้รับผิดชอบหลัก
                <select
                  aria-label="ผู้รับผิดชอบหลัก"
                  className="min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3"
                  onChange={(event) => selectLead(event.target.value)}
                  value={leadUserId}
                >
                  <option value="">ยังไม่มอบหมาย</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} · {user.role}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-normal text-slate-500">
                  หากยังไม่เลือก ระบบจะตั้งคนแรกที่กดเป็นผู้รับผิดชอบหลักอัตโนมัติ
                </span>
              </label>

              <div className="mt-5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-bold">
                    ผู้ร่วม PM
                    <span className="relative">
                      <Search
                        aria-hidden="true"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={17}
                      />
                      <input
                        aria-label="ค้นหาผู้ร่วม PM"
                        className="min-h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3"
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="ค้นหาชื่อหรือบทบาท..."
                        type="search"
                        value={query}
                      />
                    </span>
                  </label>
                  <span className="pb-2 text-xs font-bold text-slate-500">
                    เลือกแล้ว {collaboratorIds.length} คน
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {visibleUsers
                    .filter((user) => user.id !== leadUserId)
                    .map((user) => {
                      const selected = collaboratorIds.includes(user.id);
                      return (
                        <label
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                            selected
                              ? "border-emerald-500 bg-emerald-50 font-bold"
                              : "border-slate-200 hover:border-emerald-300"
                          }`}
                          key={user.id}
                        >
                          <input
                            checked={selected}
                            className="size-4 accent-emerald-600"
                            onChange={() => toggleCollaborator(user.id)}
                            type="checkbox"
                          />
                          <span className="min-w-0">
                            <span className="block truncate">{user.fullName}</span>
                            <span className="block text-xs font-normal text-slate-500">
                              {user.role}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  {!visibleUsers.filter((user) => user.id !== leadUserId).length ? (
                    <p className="col-span-full rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                      ไม่พบผู้ใช้งานที่มีสิทธิ์ดำเนินการ PM
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                className="min-h-11 rounded-xl px-4 font-bold text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  setLeadUserId("");
                  setCollaboratorIds([]);
                  setQuery("");
                }}
                type="button"
              >
                ล้างทีม
              </button>
              <button
                className="min-h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700"
                onClick={() => setOpen(false)}
                type="button"
              >
                ยืนยันทีม PM
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
