import type { Locale } from "@/i18n/types";
import { FLAG_BANK, type FlagItem } from "@/lib/flags";
import { QUIZ_BANK, type QuizQuestion } from "@/lib/quiz-pack";
import { QUIZ_BANK_EN } from "@/lib/quiz-pack-en";
import { RIDDLE_BANK, type Riddle } from "@/lib/riddles";
import { RIDDLE_BANK_EN } from "@/lib/riddles-en";

const FLAG_BANK_EN: FlagItem[] = [
  { code: "jo", name: "Jordan", aliases: ["jordan"] },
  { code: "sa", name: "Saudi Arabia", aliases: ["saudi", "ksa"] },
  { code: "eg", name: "Egypt", aliases: ["cairo"] },
  { code: "ps", name: "Palestine", aliases: ["palestinian"] },
  { code: "ae", name: "United Arab Emirates", aliases: ["uae", "emirates", "dubai"] },
  { code: "tr", name: "Turkey", aliases: ["turkiye", "ankara"] },
  { code: "jp", name: "Japan", aliases: ["tokyo"] },
  { code: "br", name: "Brazil", aliases: ["brasil"] },
  { code: "fr", name: "France", aliases: ["paris"] },
  { code: "us", name: "United States", aliases: ["usa", "america", "us"] },
  { code: "kz", name: "Kazakhstan", aliases: ["kazak"], hard: true },
  { code: "np", name: "Nepal", aliases: ["nepal"], hard: true },
  { code: "bw", name: "Botswana", aliases: ["botswana"], hard: true },
  { code: "bb", name: "Barbados", aliases: ["barbados"], hard: true },
  { code: "md", name: "Moldova", aliases: ["moldova"], hard: true },
  { code: "sr", name: "Suriname", aliases: ["surinam"], hard: true },
  { code: "mu", name: "Mauritius", aliases: ["mauritius"], hard: true },
  { code: "bt", name: "Bhutan", aliases: ["bhutan"], hard: true },
  { code: "ad", name: "Andorra", aliases: ["andorra"], hard: true },
  { code: "km", name: "Comoros", aliases: ["comoro"], hard: true },
];

export function getFlagBank(locale: Locale): FlagItem[] {
  return locale === "en" ? FLAG_BANK_EN : FLAG_BANK;
}

export function getQuizBank(locale: Locale): QuizQuestion[] {
  return locale === "en" ? QUIZ_BANK_EN : QUIZ_BANK;
}

export function getRiddleBank(locale: Locale): Riddle[] {
  return locale === "en" ? RIDDLE_BANK_EN : RIDDLE_BANK;
}
