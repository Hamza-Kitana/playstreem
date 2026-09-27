export type KickChannelInfo = {
  slug: string;
  chatroomId: number;
  /** Kick channel id — used for gift/Kicks events on `channel.{id}`. */
  channelId: number;
  displayName: string;
  avatar: string | null;
  followers: number | null;
  isLive: boolean;
};

export type KickChannelBrief = {
  isLive: boolean;
  avatar: string | null;
  displayName: string;
};

type KickChannelJson = {
  id?: number;
  chatroom?: { id?: number };
  user?: { username?: string; profile_pic?: string | null };
  followers_count?: number;
  livestream?: unknown;
};

export function kickChannelEndpoints(slug: string) {
  return [`https://kick.com/api/v2/channels/${slug}`, `https://kick.com/api/v1/channels/${slug}`];
}

export function parseKickChannel(json: unknown, slug: string): KickChannelInfo | null {
  if (!json || typeof json !== "object") return null;
  const data = json as KickChannelJson;
  const chatroomId = data.chatroom?.id;
  const channelId = data.id;
  if (typeof chatroomId !== "number" || typeof channelId !== "number") return null;
  return {
    slug,
    chatroomId,
    channelId,
    displayName: data.user?.username ?? slug,
    avatar: data.user?.profile_pic ?? null,
    followers: typeof data.followers_count === "number" ? data.followers_count : null,
    isLive: Boolean(data.livestream),
  };
}

export function briefFromInfo(info: KickChannelInfo | null, slug: string): KickChannelBrief {
  return {
    isLive: Boolean(info?.isLive),
    avatar: info?.avatar ?? null,
    displayName: info?.displayName ?? slug,
  };
}

/**
 * Browser-side lookup. Kick's Cloudflare often blocks server fetches (403) while
 * real browsers pass, and the channel API allows cross-origin reads.
 */
export async function fetchKickChannelFromBrowser(
  slug: string,
  timeoutMs = 8000,
): Promise<KickChannelInfo | null> {
  if (typeof window === "undefined") return null;
  const clean = slug.toLowerCase();
  for (const url of kickChannelEndpoints(clean)) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        credentials: "omit",
        signal: ctrl.signal,
      });
      if (!res.ok) continue;
      const info = parseKickChannel(await res.json(), clean);
      if (info) return info;
    } catch {
      // try next endpoint
    } finally {
      window.clearTimeout(timer);
    }
  }
  return null;
}
