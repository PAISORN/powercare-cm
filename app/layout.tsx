import type { Metadata } from "next";
import { NavigationExperience } from "../components/navigation-experience";
import { getBangkokTheme } from "../lib/date-time/bangkok-time";
import "./globals.css";

export const preferredRegion = "home";

export const metadata: Metadata = {
  title: "PowerCare",
  description: "แพลตฟอร์มบริหารงานซ่อมบำรุงและคลังอะไหล่",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialTheme = getBangkokTheme();

  return (
    <html data-theme={initialTheme} lang="th" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NavigationExperience />
        {children}
      </body>
    </html>
  );
}
