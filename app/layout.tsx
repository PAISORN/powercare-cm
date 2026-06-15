import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power Plant CM Control Center",
  description: "ระบบแจ้งซ่อมและติดตามงาน Corrective Maintenance",
};

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
      timeZone: "Asia/Bangkok"
    }).format(new Date()));
    document.documentElement.dataset.theme = thaiHour >= 6 && thaiHour < 18 ? "day" : "night";
  } catch {
    document.documentElement.dataset.theme = "day";
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <Script id="theme-boot" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        {children}
      </body>
    </html>
  );
}
