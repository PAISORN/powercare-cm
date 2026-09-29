import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ClientRuntimeErrorPopup } from "../components/client-runtime-error-popup";
import { NavigationExperience } from "../components/navigation-experience";
import { QueryErrorPopup } from "../components/query-error-popup";
import {
  BACKGROUND_BLUR_COOKIE,
  BACKGROUND_BRIGHTNESS_COOKIE,
  BACKGROUND_PREFERENCE_COOKIE,
  LANGUAGE_PREFERENCE_COOKIE,
  THEME_PREFERENCE_COOKIE,
  parseBackgroundBlur,
  parseBackgroundBrightness,
  parseBackgroundPreference,
  parseLanguagePreference,
  parseThemePreference,
  resolveThemePreference,
} from "../modules/settings/user-preferences";
import "./globals.css";

export const preferredRegion = "home";

export const metadata: Metadata = {
  title: "PowerCare",
  description: "แพลตฟอร์มบริหารงานซ่อมบำรุงและคลังอะไหล่",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const themePreference = parseThemePreference(cookieStore.get(THEME_PREFERENCE_COOKIE)?.value);
  const initialTheme = resolveThemePreference(themePreference);
  const initialBackground = parseBackgroundPreference(cookieStore.get(BACKGROUND_PREFERENCE_COOKIE)?.value);
  const initialBackgroundBlur = parseBackgroundBlur(cookieStore.get(BACKGROUND_BLUR_COOKIE)?.value);
  const initialBackgroundBrightness = parseBackgroundBrightness(cookieStore.get(BACKGROUND_BRIGHTNESS_COOKIE)?.value);
  const initialLanguage = parseLanguagePreference(cookieStore.get(LANGUAGE_PREFERENCE_COOKIE)?.value);

  return (
    <html
      data-background={initialBackground}
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