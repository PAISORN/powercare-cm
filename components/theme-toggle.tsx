"use client";

import { useEffect, useState } from "react";

function getThailandHour() {
  const thaiTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return thaiTime.getHours();
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"day" | "night">("day");

  useEffect(() => {
    const hour = getThailandHour();
    const initial = hour >= 6 && hour < 18 ? "day" : "night";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function updateTheme(nextTheme: "day" | "night") {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <div className="grid h-10 w-44 grid-cols-2 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1">
      <button
        className={theme === "day" ? "rounded-full bg-[var(--primary)] text-white" : "text-[var(--muted)]"}
        onClick={() => updateTheme("day")}
        type="button"
      >
        Day
      </button>
      <button
        className={theme === "night" ? "rounded-full bg-[var(--primary)] text-white" : "text-[var(--muted)]"}
        onClick={() => updateTheme("night")}
        type="button"
      >
        Night
      </button>
    </div>
  );
}
