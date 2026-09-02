import type { Locale } from "@/i18n/types";

export type DrawWord = {
  id: string;
  ar: string;
  en: string;
  aliasesAr: string[];
  aliasesEn: string[];
  category: "animals" | "food" | "objects" | "nature" | "sport" | "people";
};

export const DRAW_WORDS: DrawWord[] = [
  { id: "cat", ar: "قط", en: "cat", aliasesAr: ["قطة", "قطه"], aliasesEn: ["kitten"], category: "animals" },
  { id: "dog", ar: "كلب", en: "dog", aliasesAr: ["كلبه"], aliasesEn: ["puppy"], category: "animals" },
  { id: "lion", ar: "اسد", en: "lion", aliasesAr: ["أسد"], aliasesEn: [], category: "animals" },
  { id: "elephant", ar: "فيل", en: "elephant", aliasesAr: [], aliasesEn: [], category: "animals" },
  { id: "giraffe", ar: "زرافه", en: "giraffe", aliasesAr: ["زرافة"], aliasesEn: [], category: "animals" },
  { id: "dolphin", ar: "دلفين", en: "dolphin", aliasesAr: ["دولفين"], aliasesEn: [], category: "animals" },
  { id: "penguin", ar: "بطريق", en: "penguin", aliasesAr: [], aliasesEn: [], category: "animals" },
  { id: "butterfly", ar: "فراشه", en: "butterfly", aliasesAr: ["فراشة"], aliasesEn: [], category: "animals" },
  { id: "bee", ar: "نحله", en: "bee", aliasesAr: ["نحلة"], aliasesEn: [], category: "animals" },
  { id: "horse", ar: "حصان", en: "horse", aliasesAr: ["خيل"], aliasesEn: [], category: "animals" },
  { id: "camel", ar: "جمل", en: "camel", aliasesAr: ["ناقه", "ناقة"], aliasesEn: [], category: "animals" },
  { id: "fox", ar: "ثعلب", en: "fox", aliasesAr: [], aliasesEn: [], category: "animals" },
  { id: "owl", ar: "بومه", en: "owl", aliasesAr: ["بومة"], aliasesEn: [], category: "animals" },
  { id: "crocodile", ar: "تمساح", en: "crocodile", aliasesAr: [], aliasesEn: ["croc"], category: "animals" },
  { id: "kangaroo", ar: "كنغر", en: "kangaroo", aliasesAr: ["كنجارو"], aliasesEn: [], category: "animals" },
  { id: "pizza", ar: "بيتزا", en: "pizza", aliasesAr: ["بيتزا"], aliasesEn: [], category: "food" },
  { id: "burger", ar: "برغر", en: "burger", aliasesAr: ["برجر", "همبرغر"], aliasesEn: ["hamburger"], category: "food" },
  { id: "banana", ar: "موز", en: "banana", aliasesAr: [], aliasesEn: [], category: "food" },
  { id: "apple", ar: "تفاح", en: "apple", aliasesAr: ["تفاحه", "تفاحة"], aliasesEn: [], category: "food" },
  { id: "watermelon", ar: "بطيخ", en: "watermelon", aliasesAr: [], aliasesEn: [], category: "food" },
  { id: "icecream", ar: "ايس كريم", en: "ice cream", aliasesAr: ["آيس كريم", "بوظه", "بوظة"], aliasesEn: ["icecream"], category: "food" },
  { id: "cake", ar: "كيكه", en: "cake", aliasesAr: ["كعكه", "كعكة", "كيكة"], aliasesEn: [], category: "food" },
  { id: "coffee", ar: "قهوه", en: "coffee", aliasesAr: ["قهوة"], aliasesEn: [], category: "food" },
  { id: "tea", ar: "شاي", en: "tea", aliasesAr: [], aliasesEn: [], category: "food" },
  { id: "sushi", ar: "سوشي", en: "sushi", aliasesAr: [], aliasesEn: [], category: "food" },
  { id: "umbrella", ar: "مظله", en: "umbrella", aliasesAr: ["مظلة", "شمسيه"], aliasesEn: [], category: "objects" },
  { id: "glasses", ar: "نظاره", en: "glasses", aliasesAr: ["نظارة"], aliasesEn: ["eyeglasses"], category: "objects" },
  { id: "watch", ar: "ساعه", en: "watch", aliasesAr: ["ساعة"], aliasesEn: ["clock"], category: "objects" },
  { id: "phone", ar: "هاتف", en: "phone", aliasesAr: ["جوال", "موبايل"], aliasesEn: ["mobile", "smartphone"], category: "objects" },
  { id: "key", ar: "مفتاح", en: "key", aliasesAr: [], aliasesEn: [], category: "objects" },
  { id: "chair", ar: "كرسي", en: "chair", aliasesAr: [], aliasesEn: [], category: "objects" },
  { id: "book", ar: "كتاب", en: "book", aliasesAr: [], aliasesEn: [], category: "objects" },
  { id: "pencil", ar: "قلم", en: "pencil", aliasesAr: ["قلام"], aliasesEn: ["pen"], category: "objects" },
  { id: "scissors", ar: "مقص", en: "scissors", aliasesAr: [], aliasesEn: [], category: "objects" },
  { id: "ladder", ar: "سلم", en: "ladder", aliasesAr: [], aliasesEn: [], category: "objects" },
  { id: "fan", ar: "مروحه", en: "fan", aliasesAr: ["مروحة"], aliasesEn: [], category: "objects" },
  { id: "sun", ar: "شمس", en: "sun", aliasesAr: [], aliasesEn: [], category: "nature" },
  { id: "moon", ar: "قمر", en: "moon", aliasesAr: [], aliasesEn: [], category: "nature" },
  { id: "star", ar: "نجمه", en: "star", aliasesAr: ["نجمة"], aliasesEn: [], category: "nature" },
  { id: "tree", ar: "شجره", en: "tree", aliasesAr: ["شجرة"], aliasesEn: [], category: "nature" },
  { id: "flower", ar: "ورده", en: "flower", aliasesAr: ["وردة", "زهره", "زهرة"], aliasesEn: ["rose"], category: "nature" },
  { id: "mountain", ar: "جبل", en: "mountain", aliasesAr: [], aliasesEn: [], category: "nature" },
  { id: "sea", ar: "بحر", en: "sea", aliasesAr: ["محيط"], aliasesEn: ["ocean"], category: "nature" },
  { id: "cloud", ar: "سحابه", en: "cloud", aliasesAr: ["سحابة", "غيمه"], aliasesEn: [], category: "nature" },
  { id: "rainbow", ar: "قوس قزح", en: "rainbow", aliasesAr: ["قوسقزح"], aliasesEn: [], category: "nature" },
  { id: "volcano", ar: "بركان", en: "volcano", aliasesAr: [], aliasesEn: [], category: "nature" },
  { id: "football", ar: "كره قدم", en: "football", aliasesAr: ["كرة قدم", "كوره"], aliasesEn: ["soccer"], category: "sport" },
  { id: "basketball", ar: "كره سله", en: "basketball", aliasesAr: ["كرة سلة"], aliasesEn: [], category: "sport" },
  { id: "tennis", ar: "تنس", en: "tennis", aliasesAr: ["مضرب"], aliasesEn: ["racket"], category: "sport" },
  { id: "bike", ar: "دراجه", en: "bike", aliasesAr: ["دراجة", "بسكليت"], aliasesEn: ["bicycle"], category: "sport" },
  { id: "swim", ar: "سباحه", en: "swimming", aliasesAr: ["سباحة"], aliasesEn: ["swim"], category: "sport" },
  { id: "doctor", ar: "طبيب", en: "doctor", aliasesAr: ["دكتور"], aliasesEn: [], category: "people" },
  { id: "pilot", ar: "طيار", en: "pilot", aliasesAr: [], aliasesEn: [], category: "people" },
  { id: "chef", ar: "طباخ", en: "chef", aliasesAr: ["شيف"], aliasesEn: ["cook"], category: "people" },
  { id: "police", ar: "شرطي", en: "police", aliasesAr: ["شرطه"], aliasesEn: ["cop", "policeman"], category: "people" },
  { id: "clown", ar: "مهرج", en: "clown", aliasesAr: [], aliasesEn: [], category: "people" },
  { id: "plane", ar: "طياره", en: "plane", aliasesAr: ["طائرة"], aliasesEn: ["airplane"], category: "objects" },
  { id: "car", ar: "سياره", en: "car", aliasesAr: ["سيارة"], aliasesEn: [], category: "objects" },
  { id: "ship", ar: "سفينه", en: "ship", aliasesAr: ["سفينة", "باخره"], aliasesEn: ["boat"], category: "objects" },
  { id: "rocket", ar: "صاروخ", en: "rocket", aliasesAr: [], aliasesEn: [], category: "objects" },
  { id: "house", ar: "بيت", en: "house", aliasesAr: ["منزل"], aliasesEn: ["home"], category: "objects" },
  { id: "mosque", ar: "مسجد", en: "mosque", aliasesAr: ["جامع"], aliasesEn: [], category: "objects" },
  { id: "train", ar: "قطار", en: "train", aliasesAr: [], aliasesEn: [], category: "objects" },
  { id: "robot", ar: "روبوت", en: "robot", aliasesAr: ["روبرت"], aliasesEn: [], category: "objects" },
  { id: "dinosaur", ar: "ديناصور", en: "dinosaur", aliasesAr: [], aliasesEn: ["dino"], category: "animals" },
  { id: "ghost", ar: "شبح", en: "ghost", aliasesAr: ["عفريت"], aliasesEn: [], category: "people" },
  { id: "crown", ar: "تاج", en: "crown", aliasesAr: [], aliasesEn: [], category: "objects" },
  { id: "heart", ar: "قلب", en: "heart", aliasesAr: [], aliasesEn: [], category: "objects" },
];

export const DRAW_ROUND_OPTIONS = [
  { value: "5", label: "5" },
  { value: "8", label: "8" },
  { value: "10", label: "10" },
  { value: "12", label: "12" },
  { value: "15", label: "15" },
];

export function shuffleDrawWords(count: number): DrawWord[] {
  const arr = [...DRAW_WORDS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

export function drawWordLabel(word: DrawWord, locale: Locale) {
  return locale === "en" ? word.en : word.ar;
}

export function drawWordMatches(guess: string, word: DrawWord, normalize: (s: string) => string) {
  const g = normalize(guess);
  if (!g) return false;
  const keys = [word.ar, word.en, ...word.aliasesAr, ...word.aliasesEn]
    .map((x) => normalize(x))
    .filter(Boolean);
  return keys.some((key) => g === key || (key.length >= 3 && g.includes(key)) || (g.length >= 3 && key.includes(g)));
}
