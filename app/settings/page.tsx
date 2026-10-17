import { Settings2 } from "lucide-react";
import { SettingsPreferencesForm } from "../../components/settings-preferences-form";
import { requireUser } from "../../lib/session";
import { getUserDisplayPreferences } from "../../modules/settings/display-preferences-service";

export default async function UserSettingsPage() {
  const user = await requireUser();
  const preferences = await getUserDisplayPreferences(user.id);

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
          key={user.id}
          preferenceOwner={user.id}
          initialBackground={preferences.background}
          initialBackgroundBlur={preferences.backgroundBlur}
          initialBackgroundBrightness={preferences.backgroundBrightness}
          initialLanguage={preferences.language}
          initialTheme={preferences.theme}
        />
      </div>
    </>
  );
}
