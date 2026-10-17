import { getBangkokTheme } from "../../lib/date-time/bangkok-time";

export const THEME_PREFERENCE_COOKIE = "powercare-theme";
export const BACKGROUND_PREFERENCE_COOKIE = "powercare-background";
export const LANGUAGE_PREFERENCE_COOKIE = "powercare-language";
export const BACKGROUND_BLUR_COOKIE = "powercare-background-blur";
export const BACKGROUND_BRIGHTNESS_COOKIE = "powercare-background-brightness";
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const themePreferences = ["auto", "day", "night"] as const;
export const backgroundPreferences = [
  "original",
  "blue-gray",
  "plain",
  "image-maintenance",
  "image-industrial-campus",
  "image-control-room",
  "image-plant-dawn",
  "image-mechanical-hall",
  "image-blue-mist",
  "image-aurora-flow",
  "image-soft-sunset",
  "image-midnight-indigo",
  "image-mint-lavender",
  "image-prism-cloud",
] as const;
export const languagePreferences = ["th"] as const;
export const DEFAULT_BACKGROUND: BackgroundPreference = "image-maintenance";
export const DEFAULT_BACKGROUND_BLUR = 0;
export const MIN_BACKGROUND_BLUR = 0;
export const MAX_BACKGROUND_BLUR = 40;
export const DEFAULT_BACKGROUND_BRIGHTNESS = 100;
export const MIN_BACKGROUND_BRIGHTNESS = 45;
export const MAX_BACKGROUND_BRIGHTNESS = 140;

export type ThemePreference = (typeof themePreferences)[number];
export type BackgroundPreference = (typeof backgroundPreferences)[number];
export type LanguagePreference = (typeof languagePreferences)[number];

export type DisplayPreferences = {
  theme: ThemePreference;
  background: BackgroundPreference;
  backgroundBlur: number;
  backgroundBrightness: number;
  language: LanguagePreference;
};

export function parseDisplayPreferences(serialized?: string | null): DisplayPreferences {
  let value: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(serialized ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) value = parsed as Record<string, unknown>;
  } catch { /* Malformed legacy values fall back to safe defaults. */ }
  return {
    theme: parseThemePreference(typeof value.theme === "string" ? value.theme : undefined),
    background: parseBackgroundPreference(typeof value.background === "string" ? value.background : undefined),
    backgroundBlur: parseBackgroundBlur(typeof value.backgroundBlur === "number" ? String(value.backgroundBlur) : undefined),
    backgroundBrightness: parseBackgroundBrightness(typeof value.backgroundBrightness === "number" ? String(value.backgroundBrightness) : undefined),
    language: parseLanguagePreference(typeof value.language === "string" ? value.language : undefined),
  };
}

export function parseThemePreference(value: string | undefined): ThemePreference {
  return themePreferences.includes(value as ThemePreference) ? (value as ThemePreference) : "auto";
}

export function parseBackgroundPreference(value: string | undefined): BackgroundPreference {
  return backgroundPreferences.includes(value as BackgroundPreference) ? (value as BackgroundPreference) : DEFAULT_BACKGROUND;
}

export function parseBackgroundBlur(value: string | undefined) {
  return parseBoundedInteger(value, DEFAULT_BACKGROUND_BLUR, MIN_BACKGROUND_BLUR, MAX_BACKGROUND_BLUR);
}

export function parseBackgroundBrightness(value: string | undefined) {
  return parseBoundedInteger(value, DEFAULT_BACKGROUND_BRIGHTNESS, MIN_BACKGROUND_BRIGHTNESS, MAX_BACKGROUND_BRIGHTNESS);
}

export function parseLanguagePreference(value: string | undefined): LanguagePreference {
  return languagePreferences.includes(value as LanguagePreference) ? (value as LanguagePreference) : "th";
}

function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function resolveThemePreference(preference: ThemePreference, now = new Date()): "day" | "night" {
  return preference === "auto" ? getBangkokTheme(now) : preference;
}
