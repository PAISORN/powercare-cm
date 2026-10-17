"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

export type PmSetupTask = "pattern" | "calendar" | "settings";
const WorkspaceContext = createContext<{ task: PmSetupTask; select: (task: PmSetupTask) => void; hasPattern: boolean }>({ task: "calendar", select: () => {}, hasPattern: false });

export function PmSetupWorkspace({ initialTask, hasPattern, children }: { initialTask: PmSetupTask; hasPattern: boolean; children: ReactNode }) {
  const [task, select] = useState(initialTask);
  return <WorkspaceContext.Provider value={{ task, select, hasPattern }}>{children}</WorkspaceContext.Provider>;
}

export function PmSetupNavigation() {
  const { task, select, hasPattern } = useContext(WorkspaceContext);
  const nav = useRef<HTMLDivElement>(null);
  const tasks: { value: PmSetupTask; label: string }[] = [
    ...(hasPattern ? [{ value: "pattern" as const, label: "Pattern ต้นแบบ" }] : []),
    { value: "calendar", label: "ปฏิทินและรายเดือน" },
    { value: "settings", label: "ตั้งค่าแผน" },
  ];
  return <div aria-label="งาน Annual PM Setup" className={`mt-3 grid ${hasPattern ? "grid-cols-3" : "grid-cols-2"} gap-1 border-t border-slate-200 pt-1 sm:flex`} ref={nav} role="group">
    {tasks.map(({ value, label }, index) => <button
      aria-pressed={task === value} id={`pm-setup-tab-${value}`}
      className={`min-h-12 min-w-0 border-b-2 px-1 py-2 text-xs font-bold transition-colors sm:px-4 sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 ${task === value ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
      key={value} type="button" onClick={() => select(value)}
      onKeyDown={event => {
        const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!offset && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? tasks.length - 1 : (index + offset + tasks.length) % tasks.length;
        select(tasks[next].value);
        nav.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
      }}
    >{label}</button>)}
  </div>;
}

// Keep forms mounted while switching tasks so unsaved edits and filters survive.
export function PmSetupPanel({ task, children }: { task: PmSetupTask; children: ReactNode }) {
  const workspace = useContext(WorkspaceContext);
  return <div className={workspace.task === task ? "contents" : "hidden"} data-pm-setup-task={task}>{children}</div>;
}

export function PmSetupWorkspaceField() {
  const { task } = useContext(WorkspaceContext);
  return <input name="workspace" type="hidden" value={task} />;
}

export function PmSetupTaskLink({ children, task }: { children: ReactNode; task: PmSetupTask }) {
  const { select } = useContext(WorkspaceContext);
  return <button className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50" onClick={() => select(task)} type="button">{children}</button>;
}
