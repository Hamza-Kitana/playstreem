import {
  Armchair,
  BarChart3,
  Brain,
  Flag,
  MessageSquareQuote,
  Star,
  type LucideIcon,
} from "lucide-react";

export type GameLink = {
  to: "/quiz" | "/seat" | "/vote" | "/rate" | "/phrase" | "/flag";
  label: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
};

export const GAMES: GameLink[] = [
  {
    to: "/quiz",
    label: "أسئلة",
    title: "أسئلة وأجوبة",
    desc: "أول جواب صحيح من الشات يفوز بالنقطة.",
    icon: Brain,
    accent: "#3dff9a",
  },
  {
    to: "/seat",
    label: "كراسي",
    title: "الكراسي",
    desc: "دخول، لفّ، رقم على الكرسي — واحد يطلع كل جولة.",
    icon: Armchair,
    accent: "#5eead4",
  },
  {
    to: "/vote",
    label: "التصويت",
    title: "التصويت",
    desc: "نتائج تتحرك لحظياً مع كل صوت من الشات.",
    icon: BarChart3,
    accent: "#7dd3fc",
  },
  {
    to: "/rate",
    label: "تقييم",
    title: "تقييم شخص",
    desc: "الجمهور يقيّم من ٠ إلى ١٠ والمتوسط يظهر فوراً.",
    icon: Star,
    accent: "#fbbf24",
  },
  {
    to: "/phrase",
    label: "الجملة",
    title: "الجملة",
    desc: "حدد الكلام — واللي يكتبه يطلع اسمه كبير.",
    icon: MessageSquareQuote,
    accent: "#c4b5fd",
  },
  {
    to: "/flag",
    label: "اعرف العلم",
    title: "اعرف العلم",
    desc: "يطلع العلم — وأول واحد يكتب الدولة يفوز.",
    icon: Flag,
    accent: "#fb7185",
  },
];
