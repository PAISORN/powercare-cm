"use client";

import Lenis from "lenis";
import { LogIn, Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ThemeToggle } from "../theme-toggle";

const navigationItems = [
  { id: "top", label: "หน้าแรก" },
  { id: "modules", label: "โมดูล" },
  { id: "platform", label: "แพลตฟอร์ม" },
  { id: "benefits", label: "ประโยชน์" },
  { id: "faq", label: "คำถามที่พบบ่อย" },
  { id: "announcements", label: "อัปเดต" },
  { id: "feedback", label: "ติดต่อเรา" },
] as const;

type NavigationId = (typeof navigationItems)[number]["id"];

const HEADER_OFFSET = 88;

export function LandingNavigation() {
  const [activeSection, setActiveSection] = useState<NavigationId>("top");
  const lenisRef = useRef<Lenis | null>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reducedMotion
      ? null
      : new Lenis({
          autoRaf: true,
          duration: 1.15,
          lerp: 0.09,
          smoothWheel: true,
          syncTouch: false,
          wheelMultiplier: 0.9,
        });
    lenisRef.current = lenis;

    let frame = 0;
    const updateActiveSection = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const marker = HEADER_OFFSET + 24;
        let nextSection: NavigationId = navigationItems[0].id;

        for (const item of navigationItems) {
          const section = document.getElementById(item.id);
          if (section && section.getBoundingClientRect().top <= marker) nextSection = item.id;
        }

        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
          nextSection = navigationItems.at(-1)?.id ?? nextSection;
        }
        setActiveSection((current) => (current === nextSection ? current : nextSection));
      });
    };

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    lenis?.on("scroll", updateActiveSection);
    updateActiveSection();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
      lenis?.off("scroll", updateActiveSection);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, []);

  function navigateToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const section = document.getElementById(id);
    if (!section) return;

    event.preventDefault();
    menuRef.current?.removeAttribute("open");
    setActiveSection(id as NavigationId);
    history.replaceState(null, "", `#${id}`);

    if (lenisRef.current) {
      lenisRef.current.scrollTo(section, { offset: -HEADER_OFFSET, duration: 1.15 });
    } else {
      const top = section.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  function renderLinks() {
    return navigationItems.map((item) => (
      <a
        aria-current={activeSection === item.id ? "location" : undefined}
        className={activeSection === item.id ? "is-active" : undefined}
        href={`#${item.id}`}
        key={item.id}
        onClick={(event) => navigateToSection(event, item.id)}
      >
        {item.label}
      </a>
    ));
  }

  return (
    <header className="landing-header">
      <div className="landing-container flex h-full items-center justify-between gap-4">
        <Link aria-label="PowerCare home" className="landing-wordmark" href="/">
          <span aria-hidden="true" className="landing-mark">PC</span>
          <span>PowerCare</span>
        </Link>
        <nav aria-label="เมนูหลัก" className="hidden items-center gap-7 lg:flex">
          {renderLinks()}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link className="landing-login-button" href="/login">
            <LogIn size={16} />
            <span className="hidden sm:inline">เข้าสู่ระบบ</span>
          </Link>
          <details className="landing-mobile-menu lg:hidden" ref={menuRef}>
            <summary aria-label="เปิดเมนู"><Menu size={19} /></summary>
            <div>{renderLinks()}</div>
          </details>
        </div>
      </div>
    </header>
  );
}
