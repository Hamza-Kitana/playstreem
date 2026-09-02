import {
  Armchair,
  BarChart3,
  Brain,
  Flag,
  MessageSquareQuote,
  Puzzle,
  Skull,
  Star,
  type LucideIcon,
} from "lucide-react";

export type GameLink = {
  to: "/quiz" | "/seat" | "/vote" | "/rate" | "/phrase" | "/flag" | "/riddle" | "/zombie";
  label: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  /** Solid brand hex for badges + rings */
  accent: string;
  /** Secondary color for gradient (from accent → glow) */
  glow: string;
  /** Short tagline shown on card */
  tag: string;
  image: string;
};

/** Ordered from the "far right" of the RTL grid so cards line up right→left visually. */
export const GAMES: GameLink[] = [
  {
    to: "/quiz",
    label: "أسئلة",
    title: "أسئلة وأجوبة",
    desc: "أول جواب صحيح من الشات يفوز بالنقطة. أسئلة سهلة وصعبة بمكتبة كاملة.",
    icon: Brain,
    accent: "#8b5cf6",
    glow: "#c084fc",
    tag: "ذكاء",
    image: "/games/quiz.png",
  },
  {
    to: "/seat",
    label: "كراسي",
    title: "الكراسي الموسيقية",
    desc: "لفّ ودخول ورقم على الكرسي — واحد يطلع بكل جولة والفائز يوصل للنهاية.",
    icon: Armchair,
    accent: "#22d3ee",
    glow: "#7dd3fc",
    tag: "أكشن",
    image: "/games/chairs.png",
  },
  {
    to: "/vote",
    label: "التصويت",
    title: "التصويت المباشر",
    desc: "خيارات على الشاشة، الشات يصوّت، والنتائج تتحرّك لحظياً بأشرطة أنيقة.",
    icon: BarChart3,
    accent: "#38bdf8",
    glow: "#60a5fa",
    tag: "تصويت",
    image: "/games/vote.png",
  },
  {
    to: "/rate",
    label: "تقييم",
    title: "تقييم شخص",
    desc: "الجمهور يقيّم من ٠ إلى ١٠ والمتوسط يظهر فوراً بلوحة ذهبية.",
    icon: Star,
    accent: "#facc15",
    glow: "#fde047",
    tag: "ترفيه",
    image: "/games/rate.png",
  },
  {
    to: "/phrase",
    label: "الجملة",
    title: "الجملة السرّية",
    desc: "كلمة مخفية يخمنها الجمهور — كل تخمين قريب بيقرّبك للفوز.",
    icon: MessageSquareQuote,
    accent: "#a78bfa",
    glow: "#d8b4fe",
    tag: "ألغاز",
    image: "/games/phrase.png",
  },
  {
    to: "/flag",
    label: "اعرف العلم",
    title: "اعرف العلم",
    desc: "علم يطلع — وأول واحد يكتب اسم الدولة في الشات يفوز بالجولة.",
    icon: Flag,
    accent: "#f472b6",
    glow: "#f9a8d4",
    tag: "معرفة",
    image: "/games/flag.png",
  },
  {
    to: "/riddle",
    label: "ألغاز",
    title: "ألغاز صعبة",
    desc: "ألغاز تحتاج تفكير — أول حل صحيح من الشات يقطف النقطة.",
    icon: Puzzle,
    accent: "#fb923c",
    glow: "#fdba74",
    tag: "تحدّي",
    image: "/games/riddle.png",
  },
  {
    to: "/zombie",
    label: "زومبي",
    title: "شوتر الزومبي",
    desc: "اكتب زومبي بالشات — ينزل وحش. الستريمر يطلق النار في ماب مغلقة.",
    icon: Skull,
    accent: "#f43f5e",
    glow: "#fb7185",
    tag: "أكشن",
    image: "/games/zombie.svg",
  },
];
