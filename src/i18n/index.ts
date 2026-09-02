import { ar } from "./messages/ar";
import { en } from "./messages/en";
import type { Locale, Messages } from "./types";

const catalogs: Record<Locale, Messages> = { ar, en };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

export type TranslateFn = (section: keyof Messages, key: string) => string;

export function createTranslator(locale: Locale): TranslateFn {
  const messages = getMessages(locale);
  return (section, key) => {
    const group = messages[section];
    if (group && typeof group === "object" && key in group) {
      const val = (group as Record<string, unknown>)[key];
      if (typeof val === "string") return val;
    }
    return `${String(section)}.${key}`;
  };
}

/** Shorthand for nested game meta: tGame('quiz', 'title') */
export function tGame(locale: Locale, id: string, field: "label" | "title" | "desc" | "tag") {
  return getMessages(locale).gameMeta[id]?.[field] ?? id;
}

/** Shorthand for nested games section: tGames('poll', 'title') */
export function tGames(locale: Locale, id: string, field: string) {
  const games = getMessages(locale).games[id];
  if (games && field in games) return games[field as keyof typeof games];
  return `${id}.${field}`;
}

export { ar, en };
