import { useMemo } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { createGameMoments } from "@/lib/game-moments";

export function useGameMoments() {
  const { locale } = useLocale();
  return useMemo(() => createGameMoments(locale), [locale]);
}
