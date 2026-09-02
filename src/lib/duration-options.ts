import { useMemo } from "react";
import { getMessages } from "@/i18n";
import type { Locale } from "@/i18n/types";

export function getDurationOptions(locale: Locale) {
  const d = getMessages(locale).duration;
  return [
    { value: 30, label: d.s30 },
    { value: 60, label: d.m1 },
    { value: 90, label: d.m1_5 },
    { value: 120, label: d.m2 },
    { value: 180, label: d.m3 },
    { value: 300, label: d.m5 },
    { value: 0, label: d.unlimited },
  ] as const;
}

export function getZombieDurationOptions(locale: Locale) {
  const d = getMessages(locale).duration;
  return [
    { value: 180, label: d.m3 },
    { value: 300, label: d.m5 },
    { value: 600, label: d.m10 },
    { value: 900, label: d.m15 },
    { value: 1200, label: d.m20 },
    { value: 1500, label: d.m25 },
    { value: 1800, label: d.m30 },
    { value: 2400, label: d.m40 },
    { value: 2700, label: d.m45 },
    { value: 3000, label: d.m50 },
    { value: 3300, label: d.m55 },
    { value: 3600, label: d.h1 },
    { value: 0, label: d.unlimited },
  ] as const;
}

/** @deprecated Use getDurationOptions(locale) */
export const DURATION_OPTIONS = getDurationOptions("ar");

/** @deprecated Use getZombieDurationOptions(locale) */
export const ZOMBIE_DURATION_OPTIONS = getZombieDurationOptions("ar");
