const SESSION_KEY = "al-daboor-youtube-session";

export type YouTubeSession = {
  /** What the streamer typed (handle, channel or video link) — re-resolved on restore. */
  input: string;
};

export function loadYouTubeSession(): YouTubeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<YouTubeSession>;
    if (
      typeof parsed.input === "string" &&
      parsed.input.trim().length >= 2 &&
      parsed.input.length <= 300
    ) {
      return { input: parsed.input.trim() };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveYouTubeSession(session: YouTubeSession) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota */
  }
}

export function clearYouTubeSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
