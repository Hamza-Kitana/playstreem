import {
  Armchair,
  BarChart3,
  Brain,
  CircleDot,
  Clapperboard,
  Flag,
  MessageSquareQuote,
  Paintbrush,
  Puzzle,
  Skull,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { getMessages } from "@/i18n";
import type { Locale } from "@/i18n/types";

export type GameId =
  | "quiz"
  | "seat"
  | "vote"
  | "rate"
  | "phrase"
  | "flag"
  | "riddle"
  | "zombie"
  | "roulette"
  | "football"
  | "draw"
  | "movie";

export type GameLink = {
  id: GameId;
  to:
    | "/quiz"
    | "/seat"
    | "/vote"
    | "/rate"
    | "/phrase"
    | "/flag"
    | "/riddle"
    | "/zombie"
    | "/roulette"
    | "/football"
    | "/draw"
    | "/movie";
  label: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  glow: string;
  tag: string;
  image: string;
};

const GAME_DEFS: Omit<GameLink, "label" | "title" | "desc" | "tag">[] = [
  {
    id: "quiz",
    to: "/quiz",
    icon: Brain,
    accent: "#8b5cf6",
    glow: "#c084fc",
    image: "/games/quiz.png",
  },
  {
    id: "seat",
    to: "/seat",
    icon: Armchair,
    accent: "#22d3ee",
    glow: "#7dd3fc",
    image: "/games/chairs.png",
  },
  {
    id: "vote",
    to: "/vote",
    icon: BarChart3,
    accent: "#38bdf8",
    glow: "#60a5fa",
    image: "/games/vote.png",
  },
  {
    id: "rate",
    to: "/rate",
    icon: Star,
    accent: "#facc15",
    glow: "#fde047",
    image: "/games/rate.png",
  },
  {
    id: "phrase",
    to: "/phrase",
    icon: MessageSquareQuote,
    accent: "#a78bfa",
    glow: "#d8b4fe",
    image: "/games/phrase.png",
  },
  {
    id: "flag",
    to: "/flag",
    icon: Flag,
    accent: "#f472b6",
    glow: "#f9a8d4",
    image: "/games/flag.png",
  },
  {
    id: "riddle",
    to: "/riddle",
    icon: Puzzle,
    accent: "#fb923c",
    glow: "#fdba74",
    image: "/games/riddle.png",
  },
  {
    id: "zombie",
    to: "/zombie",
    icon: Skull,
    accent: "#f43f5e",
    glow: "#fb7185",
    image: "/games/zombie.svg",
  },
  {
    id: "roulette",
    to: "/roulette",
    icon: CircleDot,
    accent: "#f59e0b",
    glow: "#fbbf24",
    image: "/games/roulette.svg",
  },
  {
    id: "football",
    to: "/football",
    icon: Trophy,
    accent: "#22c55e",
    glow: "#4ade80",
    image: "/games/football.svg",
  },
  {
    id: "draw",
    to: "/draw",
    icon: Paintbrush,
    accent: "#fb7185",
    glow: "#fda4af",
    image: "/games/draw.svg",
  },
  {
    id: "movie",
    to: "/movie",
    icon: Clapperboard,
    accent: "#eab308",
    glow: "#fde68a",
    image: "/games/movie.svg",
  },
];

export function getGames(locale: Locale): GameLink[] {
  const meta = getMessages(locale).gameMeta;
  return GAME_DEFS.map((def) => ({
    ...def,
    label: meta[def.id].label,
    title: meta[def.id].title,
    desc: meta[def.id].desc,
    tag: meta[def.id].tag,
  }));
}

/** @deprecated Use getGames(locale) or useGames() */
export const GAMES = getGames("ar");
