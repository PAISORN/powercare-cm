"use client";

import Link from "next/link";
import { Bell, CheckCheck, X } from "lucide-react";
import { useState } from "react";
import { UnreadBadge } from "./unread-badge";

type BellNotification = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationBell({ unreadCount, notifications }: { unreadCount: number; notifications: BellNotification[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-sm transition hover:bg-[var(--soft)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:h-10 sm:w-10"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Bell aria-hidden="true" size={19} />
        <UnreadBadge count={unreadCount} className="-right-1 -top-1" />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
            <div>
              <p className="font-bold">Notifications</p>
              <p className="text-xs text-[var(--muted)]">{unreadCount} unread</p>
            </div>
            <button aria-label="Close notifications" className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--soft)]" onClick={() => setOpen(false)} type="button">
              <X size={17} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length ? notifications.map((notification) => (
              <form action="/notifications/read" key={notification.id} method="post">
                <input name="notificationId" type="hidden" value={notification.id} />
                <button className={`relative block w-full rounded-xl px-3 py-3 text-left hover:bg-[var(--soft)] ${notification.readAt ? "" : "bg-[var(--soft)]"}`} type="submit">
                  {!notification.readAt ? <span aria-hidden="true" className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-600" /> : null}
                  <strong className="block pr-5 text-sm">{notification.title}</strong>
                  <span className="mt-1 block text-xs text-[var(--muted)]">{notification.message}</span>
                </button>
              </form>
            )) : <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">No notifications</p>}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[var(--line)] p-3">
            <Link className="rounded-xl border border-[var(--line)] px-3 py-2 text-center text-sm font-semibold hover:bg-[var(--soft)]" href="/notifications" onClick={() => setOpen(false)}>
              View all
            </Link>
            <form action="/notifications/read-all" method="post">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white" type="submit">
                <CheckCheck size={16} /> Read all
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
