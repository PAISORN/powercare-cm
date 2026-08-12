import type { Metadata } from "next";
import Script from "next/script";
import { NavigationExperience } from "../components/navigation-experience";
import { themeBootScript } from "./theme-boot-script";
import "./globals.css";

export const preferredRegion = "home";

export const metadata: Metadata = {
  title: "PowerCare",
  description: "แพลตฟอร์มบริหารงานซ่อมบำรุงและคลังอะไหล่",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="theme-boot" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <NavigationExperience />
        {children}
      </body>
    </html>
  );
}
