import { cookies } from "next/headers";
import { Settings2 } from "lucide-react";
import { SettingsPreferencesForm } from "../../components/settings-preferences-form";
import { requireUser } from "../../lib/session";
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
} from "../../modules/settings/user-preferences";

export default async function UserSettingsPage() {
  await requireUser();
  const cookieStore = await cookies();
  const initialTheme = parseThemePreference(cookieStore.get(THEME_PREFERENCE_COOKIE)?.value);
  const initialBackground = parseBackgroundPreference(cookieStore.get(BACKGROUND_PREFERENCE_COOKIE)?.value);
  const initialBackgroundBlur = parseBackgroundBlur(cookieStore.get(BACKGROUND_BLUR_COOKIE)?.value);
  const initialBackgroundBrightness = parseBackgroundBrightness(cookieStore.get(BACKGROUND_BRIGHTNESS_COOKIE)?.value);
  const initialLanguage = parseLanguagePreference(cookieStore.get(LANGUAGE_PREFERENCE_COOKIE)?.value);

  return (
    <>
      <div className="personal-settings-page mx-auto grid w-full max-w-6xl gap-5">
        <header className="personal-settings-header flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/45 bg-white/80 text-[var(--primary)] shadow-sm">
              <Settings2 aria-hidden="true" size={22} />
            </span>
            <h1 className="mt-3 text-3xl font-extrabold">การตั้งค่าส่วนบุคคล</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base">ปรับรูปแบบการแสดงผลให้เหมาะกับการใช้งานของคุณ</p>
          </div>
        </header>

        <SettingsPreferencesForm
          initialBackground={initialBackground}
          initialBackgroundBlur={initialBackgroundBlur}
          initialBackgroundBrightness={initialBackgroundBrightness}
          initialLanguage={initialLanguage}
          initialTheme={initialTheme}
        />
      </div>
    </>
  );
}