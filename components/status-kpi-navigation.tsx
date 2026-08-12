"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type MouseEvent, type ReactNode } from "react";

export function StatusKpiNavigation({
  ariaLabel,
  children,
  className,
  href,
  readAction,
  status,
  unreadCount,
}: {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  href: string;
  readAction?: (formData: FormData) => void | Promise<void>;
  status: string;
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (!readAction || unreadCount <= 0) return;

    event.preventDefault();
    const formData = new FormData();
    formData.set("group", status);
    startTransition(async () => {
      await readAction(formData);
      router.push(href, { scroll: false });
    });
  }

  return (
    <Link
      aria-busy={pending || undefined}
      aria-label={ariaLabel}
      className={`${className} ${pending ? "pointer-events-none opacity-80" : ""}`}
      href={href}
      onClick={navigate}
      scroll={false}
    >
      {children}
    </Link>
  );
}
