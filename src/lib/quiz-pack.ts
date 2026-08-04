export type QuizQuestion = { q: string; a: string };

export const DEFAULT_QUIZ_QUESTIONS: QuizQuestion[] = [
  { q: "ما هي عاصمة الأردن؟", a: "عمان" },
  { q: "كم عدد أركان الإسلام؟", a: "5" },
  { q: "ما أول شهر في السنة الهجرية؟", a: "محرم" },
  { q: "في أي دولة تقع مدينة البتراء؟", a: "الاردن" },
  { q: "كم ركعة في صلاة الفجر؟", a: "2" },
  { q: "من هو خاتم الأنبياء والمرسلين؟", a: "محمد" },
  { q: "ما اسم البحر المالح غرب الأردن؟", a: "البحر الميت" },
  { q: "كم عدد الصلوات المفروضة يومياً؟", a: "5" },
  { q: "ما اسم عملة الأردن؟", a: "دينار" },
  { q: "في أي مدينة أردنية يقع المدرج الروماني؟", a: "عمان" },
];

const PACK_KEY = "al-daboor-quiz-pack";

export type QuizPack = {
  questions: QuizQuestion[];
  durationSec: number;
  index: number;
};

export function loadQuizPack(): QuizPack {
  if (typeof window === "undefined") {
    return { questions: DEFAULT_QUIZ_QUESTIONS, durationSec: 60, index: 0 };
  }
  try {
    const raw = localStorage.getItem(PACK_KEY);
    if (!raw) return { questions: DEFAULT_QUIZ_QUESTIONS, durationSec: 60, index: 0 };
    const parsed = JSON.parse(raw) as Partial<QuizPack>;
    const questions =
      Array.isArray(parsed.questions) && parsed.questions.length > 0
        ? parsed.questions.filter((x) => x && typeof x.q === "string" && typeof x.a === "string")
        : DEFAULT_QUIZ_QUESTIONS;
    return {
      questions,
      durationSec: typeof parsed.durationSec === "number" ? parsed.durationSec : 60,
      index: typeof parsed.index === "number" ? parsed.index : 0,
    };
  } catch {
    return { questions: DEFAULT_QUIZ_QUESTIONS, durationSec: 60, index: 0 };
  }
}

export function saveQuizPack(pack: QuizPack) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PACK_KEY, JSON.stringify(pack));
    window.dispatchEvent(new CustomEvent("al-daboor-quiz-pack"));
  } catch {
    /* ignore */
  }
}

export const QUIZ_POPOUT_NAME = "al-daboor-quiz-window";

export function openQuizPopout() {
  if (typeof window === "undefined") return null;
  const w = 460;
  const h = 780;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2));
  return window.open(
    "/quiz/overlay",
    QUIZ_POPOUT_NAME,
    `popup=yes,width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no`,
  );
}
