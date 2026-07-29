import { BANGKOK_TIME_ZONE } from "../lib/date-time/bangkok-time";

export const themeBootScript = `
(() => {
  const storageKey = "cm-theme-mode";
  const isTheme = (value) => value === "day" || value === "night";
  try {
    const savedTheme = sessionStorage.getItem(storageKey);
    if (isTheme(savedTheme)) {
      document.documentElement.dataset.theme = savedTheme;
      return;
    }
  } catch {}

  try {
    const thaiHour = Number(new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "${BANGKOK_TIME_ZONE}"
    }).format(new Date()));
    document.documentElement.dataset.theme = thaiHour >= 6 && thaiHour < 18 ? "day" : "night";
  } catch {
    document.documentElement.dataset.theme = "day";
  }
})();
`;
