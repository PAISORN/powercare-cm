"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getBangkokTheme } from "../lib/date-time/bangkok-time";
import { saveDisplayPreferences } from "../app/settings/actions";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<"day" | "night">("day");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const htmlTheme = document.documentElement.dataset.theme;
    const initial = htmlTheme === "day" || htmlTheme === "night" ? htmlTheme : getBangkokTheme();
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
    setHydrated(true);
    // Settings and account changes can update the root theme without remounting
    // the navbar. Keep its icon and next-toggle value in sync with that source.
    const observer = new MutationObserver(() => {
      const current = document.documentElement.dataset.theme;
      if (current === "day" || current === "night") setTheme(current);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  async function updateTheme(nextTheme: "day" | "night") {
    setError("");
    if (document.documentElement.dataset.preferenceUser) {
      setSaving(true);
      try {
        const result = await saveDisplayPreferences({ theme: nextTheme }, document.documentElement.dataset.preferenceUser);
        if (!result.ok) { setError(result.error); return; }
      } catch { setError("บันทึกธีมไม่สำเร็จ กรุณาลองใหม่"); return; }
      finally { setSaving(false); }
    }
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.dataset.themePreference = nextTheme;
  }

  function toggleTheme() {
    updateTheme(theme === "day" ? "night" : "day");
  }

  const displayTheme = hydrated ? theme : "day";

  if (compact) {
    const isDay = displayTheme === "day";

    return (
      <div aria-label="Theme mode" className="relative">
        {error ? <span role="alert" className="absolute right-0 top-full z-50 w-64 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</span> : null}
        <button
          disabled={saving}
          aria-label={isDay ? "Day mode" : "Night mode"}
          aria-pressed={!isDay}
          className={`grid size-10 shrink-0 place-items-center rounded-full border shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${isDay ? "border-amber-300/70 bg-amber-400 text-white hover:bg-amber-500" : "border-slate-400/60 bg-slate-600 text-white hover:bg-slate-700"}`}
          data-testid="theme-toggle-compact"
          onClick={toggleTheme}
          title={isDay ? "Switch to night mode" : "Switch to day mode"}
          type="button"
        >
          {isDay ? <Sun aria-hidden="true" size={19} /> : <Moon aria-hidden="true" size={18} />}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" aria-label="Theme mode">
      {error ? <span role="alert" className="absolute right-0 top-full z-50 w-64 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</span> : null}
      <button
        disabled={saving}
        aria-label={displayTheme === "day" ? "Day mode" : "Night mode"}
        aria-pressed={displayTheme === "night"}
        className="relative flex h-9 w-16 shrink-0 items-center justify-between overflow-hidden rounded-full bg-[var(--primary)] px-2 text-white shadow-sm transition-colors hover:bg-[var(--primary-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
        onClick={toggleTheme}
        title={displayTheme === "day" ? "Switch to night mode" : "Switch to day mode"}
        type="button"
      >
        <Sun aria-hidden="true" className={`relative z-10 ${displayTheme === "day" ? "text-[var(--primary)]" : "text-white"}`} size={15} />
        <Moon aria-hidden="true" className={`relative z-10 ${displayTheme === "night" ? "text-[var(--primary)]" : "text-white"}`} size={14} />
        <span
          aria-hidden="true"
          className={`absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow-sm transition-transform duration-300 ${displayTheme === "night" ? "translate-x-7" : "translate-x-0"}`}
        />
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
