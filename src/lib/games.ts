import {
  Armchair,
  BarChart3,
  Brain,
  Flag,
  MessageSquareQuote,
  Puzzle,
  Star,
  type LucideIcon,
} from "lucide-react";

export type GameLink = {
  to: "/quiz" | "/seat" | "/vote" | "/rate" | "/phrase" | "/flag" | "/riddle";
  label: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  image: string;
};

export const GAMES: GameLink[] = [
  {
    to: "/quiz",
    label: "أسئلة",
    title: "أسئلة وأجوبة",
    desc: "أول جواب صحيح من الشات يفوز بالنقطة.",
    icon: Brain,
    accent: "#3dff9a",
    image: "/games/quiz.png",
  },
  {
    to: "/seat",
    label: "كراسي",
    title: "الكراسي",
    desc: "دخول، لفّ، رقم على الكرسي — واحد يطلع كل جولة.",
    icon: Armchair,
    accent: "#5eead4",
    image: "/games/chairs.png",
  },
  {
    to: "/vote",
    label: "التصويت",
    title: "التصويت",
    desc: "نتائج تتحرك لحظياً مع كل صوت من الشات.",
    icon: BarChart3,
    accent: "#7dd3fc",
    image: "/games/vote.png",
  },
  {
    to: "/rate",
    label: "تقييم",
    title: "تقييم شخص",
    desc: "الجمهور يقيّم من ٠ إلى ١٠ والمتوسط يظهر فوراً.",
    icon: Star,
    accent: "#fbbf24",
    image: "/games/rate.png",
  },
  {
    to: "/phrase",
    label: "الجملة",
    title: "الجملة",
    desc: "كلمة سرية يخمنها الجمهور في الشات.",
    icon: MessageSquareQuote,
    accent: "#c4b5fd",
    image: "/games/phrase.png",
  },
  {
    to: "/flag",
    label: "اعرف العلم",
    title: "اعرف العلم",
    desc: "يطلع العلم — وأول واحد يكتب الدولة يفوز.",
    icon: Flag,
    accent: "#fb7185",
    image: "/games/flag.png",
  },
  {
    to: "/riddle",
    label: "ألغاز",
    title: "الألغاز",
    desc: "ألغاز صعبة تحتاج تفكير — أول حل صحيح من الشات يفوز.",
    icon: Puzzle,
    accent: "#fbbf24",
    image: "/games/riddle.png",
  },
];
