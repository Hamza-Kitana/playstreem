import { ar } from "./messages/ar";

export type Locale = "ar" | "en";

export type Messages = typeof ar;

export const LOCALES: Locale[] = ["ar", "en"];

export const LOCALE_STORAGE_KEY = "al-daboor-locale";

export function localeDir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
