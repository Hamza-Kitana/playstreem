import { normalizeAr } from "@/hooks/useNewMessages";

/** Arabic + English terms — normalized before matching. */
const BLOCKED = [
  "كس",
  "كسم",
  "شرموط",
  "شرموطة",
  "زب",
  "طيز",
  "عرص",
  "منيوك",
  "منيوكة",
  "متناك",
  "متناكة",
  "نيك",
  "ينيك",
  "لعنه",
  "لعنت",
  "يلعن",
  "ابن الكلب",
  "ابن كلب",
  "كلب",
  "حمار",
  "غبي",
  "احا",
  "اخرس",
  "خرا",
  "خراء",
  "fuck",
  "fucking",
  "fucker",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "pussy",
  "whore",
  "slut",
  "cunt",
  "nigger",
  "nigga",
];

const normalizedBlocked = BLOCKED.map((w) => normalizeAr(w)).filter(Boolean);

export type ProfanityHit = {
  term: string;
};

/** Returns the first matched blocked term, if any. */
export function detectProfanity(raw: string): ProfanityHit | null {
  const text = normalizeAr(raw);
  if (!text || text.length < 2) return null;

  for (let i = 0; i < normalizedBlocked.length; i++) {
    const term = normalizedBlocked[i];
    if (term.length < 2) continue;
    if (text.includes(term)) {
      return { term: BLOCKED[i] };
    }
  }
  return null;
}
