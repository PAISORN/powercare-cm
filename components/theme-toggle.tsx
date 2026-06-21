"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getBangkokTheme } from "../lib/date-time/bangkok-time";

const storageKey = "cm-theme-mode";

export function ThemeToggle() {
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<"day" | "night">("day");

  useEffect(() => {
    const savedTheme = sessionStorage.getItem(storageKey);
    const htmlTheme = document.documentElement.dataset.theme;
    const initial =
      htmlTheme === "day" || htmlTheme === "night"
        ? htmlTheme
        : savedTheme === "day" || savedTheme === "night"
          ? savedTheme
          : getBangkokTheme();
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
    setHydrated(true);
  }, []);

  function updateTheme(nextTheme: "day" | "night") {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    sessionStorage.setItem(storageKey, nextTheme);
  }

  function toggleTheme() {
    updateTheme(theme === "day" ? "night" : "day");
  }

  const displayTheme = hydrated ? theme : "day";

  return (
    <div className="relative" aria-label="Theme mode">
      <button
        aria-label={displayTheme === "day" ? "Day mode" : "Night mode"}
        aria-pressed={displayTheme === "night"}
        className={
          displayTheme === "day"
            ? "relative flex h-10 w-[88px] items-center justify-between overflow-hidden rounded-full bg-[var(--primary)] px-3 text-xs font-extrabold uppercase text-white shadow-sm transition md:h-11 md:w-[118px] md:px-4 md:text-sm"
            : "relative flex h-10 w-[88px] items-center justify-between overflow-hidden rounded-full bg-[var(--primary)] px-3 text-xs font-extrabold uppercase text-white shadow-sm transition md:h-11 md:w-[118px] md:px-4 md:text-sm"
        }
        onClick={toggleTheme}
        type="button"
      >
        <span className={displayTheme === "day" ? "pr-7 md:pr-9" : "pl-7 md:pl-9"}>{displayTheme === "day" ? "Day" : "Night"}</span>
        <span
          className={
            displayTheme === "day"
              ? "absolute right-1.5 grid h-7 w-7 place-items-center rounded-full bg-white text-[var(--primary)] transition md:h-8 md:w-8"
              : "absolute left-1.5 grid h-7 w-7 place-items-center rounded-full bg-white text-[var(--primary)] transition md:h-8 md:w-8"
          }
        >
          {displayTheme === "day" ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={16} />}
        </span>
      </button>
      <button
        aria-hidden="true"
        aria-label="Day"
        className={
          displayTheme === "day"
            ? "pointer-events-none absolute h-px w-px opacity-0"
            : "pointer-events-none absolute h-px w-px opacity-0"
        }
        data-testid="theme-day"
        onClick={() => updateTheme("day")}
        tabIndex={-1}
        type="button"
      >
        <Sun aria-hidden="true" size={18} />
      </button>
      <button
        aria-hidden="true"
        aria-label="Night"
        className={
          displayTheme === "night"
            ? "pointer-events-none absolute h-px w-px opacity-0"
            : "pointer-events-none absolute h-px w-px opacity-0"
        }
        data-testid="theme-night"
        onClick={() => updateTheme("night")}
        tabIndex={-1}
        type="button"
      >
        <Moon aria-hidden="true" size={18} />
      </button>
    </div>
  );
}
