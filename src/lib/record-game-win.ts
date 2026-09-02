export type GameWinDetail = {
  user: string;
  userKey?: string;
  color: string;
  game: string;
};

export const GAME_WIN_EVENT = "daboor:game-win";

/** Record a game win for the chat stats panel (round or session champion). */
export function recordGameWin(detail: GameWinDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<GameWinDetail>(GAME_WIN_EVENT, { detail }));
}
