"use client";

import {
  Check,
  Clock3,
  Globe2,
  ImageIcon,
  Info,
  Moon,
  Palette,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { getBangkokTheme } from "../lib/date-time/bangkok-time";
import {
  BACKGROUND_BLUR_COOKIE,
  BACKGROUND_BRIGHTNESS_COOKIE,
  BACKGROUND_PREFERENCE_COOKIE,
  DEFAULT_BACKGROUND_BLUR,
  DEFAULT_BACKGROUND_BRIGHTNESS,
  LANGUAGE_PREFERENCE_COOKIE,
  MAX_BACKGROUND_BLUR,
  MAX_BACKGROUND_BRIGHTNESS,
  MIN_BACKGROUND_BLUR,
  MIN_BACKGROUND_BRIGHTNESS,
  PREFERENCE_COOKIE_MAX_AGE,
  THEME_PREFERENCE_COOKIE,
  type BackgroundPreference,
  type LanguagePreference,
  type ThemePreference,
} from "../modules/settings/user-preferences";

type Props = {
  initialBackground: BackgroundPreference;
  initialBackgroundBlur: number;
  initialBackgroundBrightness: number;
  initialLanguage: LanguagePreference;
  initialTheme: ThemePreference;
};

const themeOptions = [
  { value: "auto", label: "อัตโนมัติ", description: "เปลี่ยนตามเวลา กรุงเทพฯ", icon: Clock3 },
  { value: "day", label: "สว่าง", description: "พื้นหลังสีสว่าง เหมาะกับการใช้งานทั่วไป", icon: Sun },
  { value: "night", label: "กลางคืน", description: "พื้นหลังสีเข้ม ถนอมสายตา", icon: Moon },
] as const;

const backgroundOptions = [
  { value: "original", label: "พื้นหลังเดิม", description: "โทนน้ำเงินเข้มพร้อมลายเฟือง" },
  { value: "blue-gray", label: "ฟ้าเทาไล่เฉด", description: "กล่องสีขาวเด่น อ่านง่าย" },
  { value: "plain", label: "สีอ่อนเรียบ", description: "พื้นหลังสีอ่อน สบายตา" },
  { value: "image-blue-mist", label: "Blue Mist", description: "ฟ้า–ม่วงอ่อน สะอาดและสบายตา" },
  { value: "image-aurora-flow", label: "Aurora Flow", description: "ฟ้า เขียว และม่วงแบบออโรรา" },
  { value: "image-soft-sunset", label: "Soft Sunset", description: "ชมพู พีช และฟ้าโทนอุ่น" },
  { value: "image-midnight-indigo", label: "Midnight Indigo", description: "น้ำเงินเข้ม–ม่วง เหมาะกับ Night mode" },
  { value: "image-mint-lavender", label: "Mint Lavender", description: "มิ้นต์–ม่วงอ่อน ให้บรรยากาศโปร่ง" },
  { value: "image-prism-cloud", label: "Prism Cloud", description: "หลายสีแบบนุ่มนวลและทันสมัย" },
] as const satisfies ReadonlyArray<{
  value: BackgroundPreference;
  label: string;
  description: string;
}>;

const backgroundImages: Partial<Record<BackgroundPreference, string>> = {
  "image-blue-mist": "/backgrounds/01-blue-mist.webp",
  "image-aurora-flow": "/backgrounds/02-aurora-flow.webp",
  "image-soft-sunset": "/backgrounds/03-soft-sunset.webp",
  "image-midnight-indigo": "/backgrounds/04-midnight-indigo.webp",
  "image-mint-lavender": "/backgrounds/05-mint-lavender.webp",
  "image-prism-cloud": "/backgrounds/06-prism-cloud.webp",
};

export function SettingsPreferencesForm({
  initialBackground,
  initialBackgroundBlur,
  initialBackgroundBrightness,
  initialLanguage,
  initialTheme,
}: Props) {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const [background, setBackground] = useState<BackgroundPreference>(initialBackground);
  const [backgroundBlur, setBackgroundBlur] = useState(initialBackgroundBlur);
  const [backgroundBrightness, setBackgroundBrightness] = useState(initialBackgroundBrightness);
  const [language, setLanguage] = useState<LanguagePreference>(initialLanguage);
  const [saved, setSaved] = useState(false);
  const imageSelected = isImageBackground(background);

  function chooseTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    setSaved(false);
  }

  function chooseBackground(nextBackground: BackgroundPreference) {
    setBackground(nextBackground);
    setSaved(false);
  }

  function resetPreferences() {
    setTheme("auto");
    setBackground("original");
    setBackgroundBlur(DEFAULT_BACKGROUND_BLUR);
    setBackgroundBrightness(DEFAULT_BACKGROUND_BRIGHTNESS);
    setLanguage("th");
    setSaved(false);
  }

  function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    writePreferenceCookie(THEME_PREFERENCE_COOKIE, theme);
    writePreferenceCookie(BACKGROUND_PREFERENCE_COOKIE, background);
    writePreferenceCookie(BACKGROUND_BLUR_COOKIE, String(backgroundBlur));
    writePreferenceCookie(BACKGROUND_BRIGHTNESS_COOKIE, String(backgroundBrightness));
    writePreferenceCookie(LANGUAGE_PREFERENCE_COOKIE, language);

    document.documentElement.dataset.themePreference = theme;
    document.documentElement.dataset.theme = theme === "auto" ? getBangkokTheme() : theme;
    document.documentElement.dataset.background = background;
    document.documentElement.style.setProperty("--background-blur", `${backgroundBlur}px`);
    document.documentElement.style.setProperty("--background-brightness", `${backgroundBrightness}%`);
    document.documentElement.lang = language;
    setSaved(true);
  }

  return (
    <form className="grid gap-5" onSubmit={savePreferences}>
      {saved ? (
        <p className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700" role="status">
          <Check aria-hidden="true" size={18} />
          บันทึกการตั้งค่าเรียบร้อยแล้ว
        </p>
      ) : null}

      <SettingsSection
        description="เลือกรูปแบบแสงของหน้าจอ"
        icon={<Sun aria-hidden="true" size={22} />}
        title="ธีม"
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <ChoiceCard
                checked={theme === option.value}
                description={option.description}
                key={option.value}
                label={option.label}
                name="theme"
                onChange={() => chooseTheme(option.value)}
                value={option.value}
              >
                <Icon aria-hidden="true" className="text-[var(--primary)]" size={25} />
              </ChoiceCard>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        description="เลือกบรรยากาศพื้นหลังของพื้นที่ทำงาน"
        icon={<Palette aria-hidden="true" size={22} />}
        title="พื้นหลัง"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {backgroundOptions.map((option) => (
            <label
              className={choiceClass(background === option.value)}
              key={option.value}
            >
              <span className="flex items-start gap-3">
                <input
                  checked={background === option.value}
                  className="mt-1 size-5 accent-[var(--primary)]"
                  name="background"
                  onChange={() => chooseBackground(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>
                  <strong className="block">{option.label}</strong>
                  <span className="mt-1 block text-sm text-[var(--muted)]">{option.description}</span>
                </span>
              </span>
              <BackgroundSwatch
                background={option.value}
                blur={backgroundBlur}
                brightness={backgroundBrightness}
              />
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <BackgroundPreview
            background={background}
            blur={backgroundBlur}
            brightness={backgroundBrightness}
          />

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--primary)] shadow-sm">
                <SlidersHorizontal aria-hidden="true" size={20} />
              </span>
              <span>
                <strong className="block">ปรับแต่งภาพพื้นหลัง</strong>
                <span className="mt-1 block text-sm text-[var(--muted)]">ค่าจะใช้กับพื้นหลังชนิดภาพทั้ง 6 แบบ</span>
              </span>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-bold" htmlFor="background-blur">
              <span className="flex items-center justify-between gap-3">
                <span>ความเบลอ</span>
                <output className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-[var(--primary)]" htmlFor="background-blur">
                  {backgroundBlur}px
                </output>
              </span>
              <input
                aria-label="ความเบลอของภาพพื้นหลัง"
                className="w-full accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!imageSelected}
                id="background-blur"
                max={MAX_BACKGROUND_BLUR}
                min={MIN_BACKGROUND_BLUR}
                onChange={(event) => {
                  setBackgroundBlur(Number(event.currentTarget.value));
                  setSaved(false);
                }}
                step="1"
                type="range"
                value={backgroundBlur}
              />
            </label>

            <label className="mt-5 grid gap-2 text-sm font-bold" htmlFor="background-brightness">
              <span className="flex items-center justify-between gap-3">
                <span>ความสว่างของภาพ</span>
                <output className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-[var(--primary)]" htmlFor="background-brightness">
                  {backgroundBrightness}%
                </output>
              </span>
              <input
                aria-label="ความสว่างของภาพพื้นหลัง"
                className="w-full accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!imageSelected}
                id="background-brightness"
                max={MAX_BACKGROUND_BRIGHTNESS}
                min={MIN_BACKGROUND_BRIGHTNESS}
                onChange={(event) => {
                  setBackgroundBrightness(Number(event.currentTarget.value));
                  setSaved(false);
                }}
                step="1"
                type="range"
                value={backgroundBrightness}
              />
            </label>

            {!imageSelected ? (
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                <ImageIcon aria-hidden="true" size={15} />
                เลือก Blue Mist ถึง Prism Cloud เพื่อเปิดการปรับแต่งภาพ
              </p>
            ) : null}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        description="เลือกภาษาสำหรับเมนูและข้อความในระบบ"
        icon={<Globe2 aria-hidden="true" size={22} />}
        title="ภาษา"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <ChoiceCard
            checked={language === "th"}
            description="พร้อมใช้งาน"
            label="ภาษาไทย"
            name="language"
            onChange={() => {
              setLanguage("th");
              setSaved(false);
            }}
            value="th"
          >
            <span aria-hidden="true" className="text-2xl">🇹🇭</span>
          </ChoiceCard>

          <label className="flex min-h-24 cursor-not-allowed items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-4 opacity-65">
            <input className="size-5" disabled name="language" type="radio" value="en" />
            <span aria-hidden="true" className="text-2xl">🇬🇧</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <strong>English</strong>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">เร็ว ๆ นี้</span>
              </span>
              <span className="mt-1 block text-sm text-[var(--muted)]">กำลังปรับข้อความให้ครบทุกหน้า</span>
            </span>
          </label>
        </div>
      </SettingsSection>

      <section className="flex flex-col gap-4 rounded-3xl border border-[var(--line)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
          <Info aria-hidden="true" size={17} />
          การตั้งค่ามีผลกับอุปกรณ์และเบราว์เซอร์นี้
        </p>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 font-bold hover:bg-[var(--soft)]" onClick={resetPreferences} type="button">
            <RotateCcw aria-hidden="true" size={17} />
            คืนค่าเริ่มต้น
          </button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 font-bold text-white shadow-sm hover:bg-[var(--primary-strong)]" type="submit">
            <Save aria-hidden="true" size={18} />
            บันทึกการตั้งค่า
          </button>
        </div>
      </section>
    </form>
  );
}

function SettingsSection({ children, description, icon, title }: { children: ReactNode; description: string; icon: ReactNode; title: string }) {
  return (
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow)] sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--soft)] text-[var(--primary)]">{icon}</span>
        <span>
          <h2 className="text-xl font-extrabold">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </span>
      </header>
      {children}
    </section>
  );
}

function ChoiceCard({ checked, children, description, label, name, onChange, value }: { checked: boolean; children: ReactNode; description: string; label: string; name: string; onChange: () => void; value: string }) {
  return (
    <label className={choiceClass(checked)}>
      <input checked={checked} className="size-5 shrink-0 accent-[var(--primary)]" name={name} onChange={onChange} type="radio" value={value} />
      {children}
      <span className="min-w-0">
        <strong className="block">{label}</strong>
        <span className="mt-1 block text-sm text-[var(--muted)]">{description}</span>
      </span>
    </label>
  );
}

function BackgroundSwatch({ background, blur, brightness }: { background: BackgroundPreference; blur: number; brightness: number }) {
  return (
    <span aria-hidden="true" className="relative mt-4 block h-20 overflow-hidden rounded-xl border border-black/5 bg-[var(--soft)] shadow-inner">
      <span
        className="absolute -inset-3 bg-cover bg-center"
        style={{
          ...backgroundVisualStyle(background),
          filter: isImageBackground(background) ? `blur(${Math.min(blur, 18)}px) brightness(${brightness}%)` : undefined,
        }}
      />
    </span>
  );
}

function BackgroundPreview({ background, blur, brightness }: { background: BackgroundPreference; blur: number; brightness: number }) {
  return (
    <div className="relative min-h-64 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--soft)]">
      <div
        aria-hidden="true"
        className="absolute -inset-12 bg-cover bg-center transition duration-300"
        style={{
          ...backgroundVisualStyle(background),
          filter: isImageBackground(background) ? `blur(${blur}px) brightness(${brightness}%)` : undefined,
        }}
      />
      <div className="relative z-10 grid min-h-64 place-items-center p-5">
        <div className="w-full max-w-sm rounded-2xl border border-white/65 bg-white/85 p-4 text-slate-900 shadow-xl backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">ตัวอย่าง</p>
          <p className="mt-2 text-lg font-extrabold">PowerCare Workspace</p>
          <p className="mt-1 text-sm text-slate-600">ตรวจสอบความชัดของการ์ดและข้อความบนพื้นหลัง</p>
        </div>
      </div>
    </div>
  );
}

function backgroundVisualStyle(background: BackgroundPreference): CSSProperties {
  const image = backgroundImages[background];
  if (image) {
    return {
      backgroundColor: "#b9cce0",
      backgroundImage: `url("${image}")`,
    };
  }
  if (background === "original") {
    return { backgroundImage: "linear-gradient(135deg,#16315c,#37628f 55%,#b8ccdf)" };
  }
  if (background === "blue-gray") {
    return { backgroundImage: "linear-gradient(110deg,#aebecd,#cbd7e1 48%,#e8eef3)" };
  }
  return { backgroundColor: "#f5f7f7" };
}

function isImageBackground(background: BackgroundPreference) {
  return background.startsWith("image-");
}

function choiceClass(checked: boolean) {
  return `cursor-pointer rounded-2xl border px-4 py-4 transition focus-within:ring-2 focus-within:ring-[var(--primary)] ${checked ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface-raised))] shadow-sm" : "border-[var(--line)] bg-[var(--surface-raised)] hover:bg-[var(--soft)]"} flex min-h-24 items-center gap-3`;
}

function writePreferenceCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
}