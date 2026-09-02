import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createTranslator, getMessages } from "@/i18n";
import {
  LOCALE_STORAGE_KEY,
  localeDir,
  type Locale,
  type Messages,
  type TranslateFn,
} from "@/i18n/types";

type LocaleContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  messages: Messages;
  t: TranslateFn;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function loadLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "ar") return stored;
  } catch {
    /* ignore */
  }
  return "ar";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    setLocaleState(loadLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "ar" ? "en" : "ar");
  }, [locale, setLocale]);

  const value = useMemo<LocaleContextValue>(() => {
    const messages = getMessages(locale);
    return {
      locale,
      dir: localeDir(locale),
      messages,
      t: createTranslator(locale),
      setLocale,
      toggleLocale,
    };
  }, [locale, setLocale, toggleLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Convenience: t('nav', 'home') */
export function useT() {
  const { t, locale, dir, messages, toggleLocale, setLocale } = useLocale();
  return { t, locale, dir, messages, toggleLocale, setLocale };
}
