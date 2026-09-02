import { useMemo } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { getGames } from "@/lib/games";

export function useGames() {
  const { locale } = useLocale();
  return useMemo(() => getGames(locale), [locale]);
}
