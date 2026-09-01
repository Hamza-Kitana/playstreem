const SESSION_KEY = "al-daboor-kick-session";
/** @deprecated migrated into SESSION_KEY */
const LEGACY_SLUG_KEY = "al-daboor-kick-channel";

export type KickSession = {
  slug: string;
  chatroomId: number;
  channelId?: number;
};

export function loadKickSession(): KickSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<KickSession>;
      if (
        typeof parsed.slug === "string" &&
        /^[a-z0-9_-]{2,60}$/i.test(parsed.slug) &&
        typeof parsed.chatroomId === "number" &&
        Number.isFinite(parsed.chatroomId)
      ) {
        const channelId =
          typeof parsed.channelId === "number" && Number.isFinite(parsed.channelId)
            ? parsed.channelId
            : undefined;
        return { slug: parsed.slug.toLowerCase(), chatroomId: parsed.chatroomId, channelId };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Old installs only saved the slug — return it so we can re-resolve chatroom id once. */
export function loadLegacyKickSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const slug = localStorage.getItem(LEGACY_SLUG_KEY);
    if (slug && /^[a-z0-9_-]{2,60}$/i.test(slug)) return slug.toLowerCase();
  } catch {
    /* ignore */
  }
  return null;
}

export function saveKickSession(session: KickSession) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(LEGACY_SLUG_KEY, session.slug);
  } catch {
    /* ignore quota */
  }
}

export function clearKickSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SLUG_KEY);
  } catch {
    /* ignore */
  }
}
