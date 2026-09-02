import { useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";

/** Syncs document lang/dir with the active locale (client-side). */
export default function LocaleHtmlSync() {
  const { locale, dir } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  return null;
}
