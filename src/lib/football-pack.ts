import type { Locale } from "@/i18n/types";
import { getFootballPlayers, type FootballPlayer } from "@/lib/football-players";
import { FOOTBALL_TRIVIA_AR, FOOTBALL_TRIVIA_EN } from "@/lib/football-trivia";

export type FootballRound =
  | { kind: "trivia"; q: string; a: string; hard?: boolean }
  | { kind: "player"; player: FootballPlayer };

export const FOOTBALL_ROUND_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const n = (i + 1) * 10;
  return { value: String(n), label: String(n) };
});

export function clampFootballRounds(n: number) {
  return Math.min(150, Math.max(10, Math.round(n / 10) * 10));
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Build a mixed deck: trivia + player-guess rounds every `playerEvery` slots. */
export function buildFootballSession(
  locale: Locale,
  roundCount: number,
  playerEvery = 4,
): FootballRound[] {
  const count = clampFootballRounds(roundCount);
  const triviaPool = shuffle(
    locale === "en" ? FOOTBALL_TRIVIA_EN : FOOTBALL_TRIVIA_AR,
  );
  const playerPool = shuffle(getFootballPlayers(locale));

  const playerSlots = Math.min(Math.floor(count / playerEvery), playerPool.length);
  const triviaNeeded = count - playerSlots;

  const trivia = triviaPool.slice(0, triviaNeeded).map((t) => ({
    kind: "trivia" as const,
    q: t.q,
    a: t.a,
    hard: t.hard,
  }));

  const players = playerPool.slice(0, playerSlots).map((p) => ({
    kind: "player" as const,
    player: p,
  }));

  const deck: FootballRound[] = [];
  let ti = 0;
  let pi = 0;
  for (let i = 0; i < count; i++) {
    const isPlayerSlot = (i + 1) % playerEvery === 0 && pi < players.length;
    if (isPlayerSlot) {
      deck.push(players[pi]!);
      pi++;
    } else if (ti < trivia.length) {
      deck.push(trivia[ti]!);
      ti++;
    } else if (pi < players.length) {
      deck.push(players[pi]!);
      pi++;
    }
  }

  while (deck.length < count && ti < trivia.length) {
    deck.push(trivia[ti]!);
    ti++;
  }

  return deck.slice(0, count);
}

export function playerMatches(guess: string, player: FootballPlayer, normalize: (s: string) => string) {
  const g = normalize(guess);
  if (!g) return false;
  const keys = [player.name, ...player.aliases].map((x) => normalize(x)).filter(Boolean);
  return keys.some((key) => {
    if (g === key) return true;
    if (key.length >= 3 && g.includes(key)) return true;
    if (g.length >= 3 && key.includes(g)) return true;
    return false;
  });
}

export function triviaMatches(guess: string, answer: string, normalize: (s: string) => string) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g || !a) return false;
  if (g === a) return true;
  if (a.length >= 3 && g.includes(a)) return true;
  if (g.length >= 3 && a.includes(g)) return true;
  const gWords = g.split(/\s+/).filter((w) => w.length >= 2);
  const aWords = a.split(/\s+/).filter((w) => w.length >= 2);
  return gWords.some((w) => aWords.includes(w)) || aWords.some((w) => gWords.includes(w));
}

export type FootballPackState = {
  deck: FootballRound[];
  index: number;
  durationSec: number;
  scores: Record<string, number>;
  scoreColors: Record<string, string>;
};

const STORAGE_KEY = "al-daboor-football-pack";

export function saveFootballPack(state: FootballPackState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event("al-daboor-football-pack"));
  } catch {
    /* ignore */
  }
}

export function loadFootballPack(): FootballPackState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FootballPackState;
  } catch {
    return null;
  }
}
