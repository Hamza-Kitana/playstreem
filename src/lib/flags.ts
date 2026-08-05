/** Flag trivia bank — mix of easy and hard nations. */

export type FlagItem = {
  code: string;
  name: string;
  /** Extra accepted chat answers (already readable Arabic / short forms). */
  aliases?: string[];
  hard?: boolean;
};

export const FLAG_BANK: FlagItem[] = [
  { code: "jo", name: "الاردن", aliases: ["الاردن", "اردن", "jordan"] },
  { code: "sa", name: "السعودية", aliases: ["السعوديه", "سعودية", "سعوديه", "المملكة"] },
  { code: "eg", name: "مصر", aliases: ["القاهرة", "جمهورية مصر"] },
  { code: "ps", name: "فلسطين", aliases: ["القدس"] },
  { code: "ae", name: "الامارات", aliases: ["الامارات", "الإمارات", "دبي", "ابو ظبي"] },
  { code: "tr", name: "تركيا", aliases: ["انقرا", "انقرة"] },
  { code: "jp", name: "اليابان", aliases: ["طوكيو"] },
  { code: "br", name: "البرازيل", aliases: ["برازيل"] },
  { code: "fr", name: "فرنسا", aliases: ["باريس"] },
  { code: "us", name: "امريكا", aliases: ["الولايات المتحدة", "اميركا", "امريكا", "usa"] },
  { code: "kz", name: "كازاخستان", aliases: ["كزاخستان"], hard: true },
  { code: "np", name: "نيبال", aliases: ["نيپال", "nepal"], hard: true },
  { code: "bw", name: "بوتسوانا", aliases: ["بتسوانا"], hard: true },
  { code: "bb", name: "بربادوس", aliases: ["باربادوس"], hard: true },
  { code: "md", name: "مولدوفا", aliases: ["ملدوفا"], hard: true },
  { code: "sr", name: "سورينام", aliases: ["سورينام"], hard: true },
  { code: "mu", name: "موريشيوس", aliases: ["موريشيوس", "موريشيس"], hard: true },
  { code: "bt", name: "بوتان", aliases: ["بهوتان"], hard: true },
  { code: "ad", name: "اندورا", aliases: ["أندورا", "اندورا"], hard: true },
  { code: "km", name: "جزر القمر", aliases: ["القمر", "جزرالقمر"], hard: true },
];

export function flagImageUrl(code: string, width = 640) {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}

export function shuffleFlags(items: FlagItem[] = FLAG_BANK): FlagItem[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
