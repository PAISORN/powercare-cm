import type { Metadata } from "next";
import { getCurrentUser } from "../lib/session";
import { getUserDisplayPreferences } from "../modules/settings/display-preferences-service";
import { Suspense } from "react";
import { ClientRuntimeErrorPopup } from "../components/client-runtime-error-popup";
import { NavigationExperience } from "../components/navigation-experience";
import { QueryErrorPopup } from "../components/query-error-popup";
import {
  parseDisplayPreferences,
  resolveThemePreference,
} from "../modules/settings/user-preferences";
import "./globals.css";

export const preferredRegion = "home";

export const metadata: Metadata = {
  title: "PowerCare",
  description: "แพลตฟอร์มบริหารงานซ่อมบำรุงและคลังอะไหล่",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const preferences = user ? await getUserDisplayPreferences(user.id) : parseDisplayPreferences();
  const themePreference = preferences.theme;
  const initialTheme = resolveThemePreference(themePreference);
  const initialBackground = preferences.background;
  const initialBackgroundBlur = preferences.backgroundBlur;
  const initialBackgroundBrightness = preferences.backgroundBrightness;
  const initialLanguage = preferences.language;

  return (
    <html
      data-background={initialBackground}
      data-preference-user={user?.id ?? ""}
      data-theme={initialTheme}
      data-theme-preference={themePreference}
      lang={initialLanguage}
      style={{
        "--background-blur": `${initialBackgroundBlur}px`,
        "--background-brightness": `${initialBackgroundBrightness}%`,
      } as React.CSSProperties}
      suppressHydrationWarning
    >
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
