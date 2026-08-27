import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientRuntimeErrorPopup } from "../components/client-runtime-error-popup";
import { NavigationExperience } from "../components/navigation-experience";
import { QueryErrorPopup } from "../components/query-error-popup";
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
        <ClientRuntimeErrorPopup />
        <Suspense fallback={null}>
          <QueryErrorPopup />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
