"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { locales, localeLabels, type Locale } from "@/lib/i18n";

/**
 * Compact language toggle — EN | VI
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex items-center rounded-md border border-gray-700 overflow-hidden text-xs font-medium">
      {locales.map((loc: Locale) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`px-2 py-1 transition-colors cursor-pointer ${
            locale === loc
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
          }`}
        >
          {localeLabels[loc]}
        </button>
      ))}
    </div>
  );
}
