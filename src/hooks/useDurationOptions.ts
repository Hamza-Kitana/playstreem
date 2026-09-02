import { useMemo } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { getDurationOptions, getZombieDurationOptions } from "@/lib/duration-options";

export function useDurationOptions() {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      options: getDurationOptions(locale),
      zombieOptions: getZombieDurationOptions(locale),
    }),
    [locale],
  );
}
