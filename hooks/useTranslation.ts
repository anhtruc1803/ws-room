"use client";

import { useContext } from "react";
import { I18nContext } from "@/components/providers/I18nProvider";

/**
 * Hook to access translations and locale switching.
 *
 * Usage:
 *   const { t, locale, setLocale } = useTranslation();
 *   t.landing.createRoom  // → "Create Incident Room" or "Tạo phòng sự cố"
 */
export function useTranslation() {
  return useContext(I18nContext);
}
