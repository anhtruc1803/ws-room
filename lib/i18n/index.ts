import en from "./en";
import vi from "./vi";
import type { TranslationKeys } from "./en";

export type Locale = "en" | "vi";

export const locales: Locale[] = ["en", "vi"];

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  vi: "VI",
};

export const defaultLocale: Locale = "en";

export const translations: Record<Locale, TranslationKeys> = {
  en,
  vi,
};

export type { TranslationKeys };
