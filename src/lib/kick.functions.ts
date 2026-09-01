import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-zA-Z0-9_-]+$/, "اسم القناة غير صالح");

const schema = z.object({
  slug: slugSchema,
});

const liveSchema = z.object({
  slugs: z.array(slugSchema).min(1).max(24),
});

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

const KICK_HEADERS = {
  accept: "application/json",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
};

async function fetchKickChannel(slug: string): Promise<KickChannelInfo | null> {
  const endpoints = [
    `https://kick.com/api/v2/channels/${slug}`,
    `https://kick.com/api/v1/channels/${slug}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: KICK_HEADERS });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        id?: number;
        chatroom?: { id?: number };
        user?: { username?: string; profile_pic?: string | null };
        followers_count?: number;
        livestream?: unknown;
      };
      const chatroomId = json.chatroom?.id;
      const channelId = json.id;
      if (typeof chatroomId !== "number" || typeof channelId !== "number") continue;
      return {
        slug,
        chatroomId,
        channelId,
        displayName: json.user?.username ?? slug,
        avatar: json.user?.profile_pic ?? null,
        followers: typeof json.followers_count === "number" ? json.followers_count : null,
        isLive: Boolean(json.livestream),
      };
    } catch {
      // try next
    }
  }
  return null;
}

/** Resolves a Kick channel slug into its chatroom id (server-side to avoid CORS). */
export const resolveKickChannel = createServerFn({ method: "POST" })
  .validator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<KickChannelInfo> => {
    const slug = data.slug.toLowerCase();
    const info = await fetchKickChannel(slug);
    if (!info) {
      throw new Error("تعذّر الوصول إلى كيك حالياً. جرّب مرة أخرى بعد ثوانٍ.");
    }
    return info;
  });

/** Batch live-status check for verified streamers page. */
export const checkKickLiveStatuses = createServerFn({ method: "POST" })
  .validator((input: unknown) => liveSchema.parse(input))
  .handler(async ({ data }): Promise<Record<string, boolean>> => {
    const out: Record<string, boolean> = {};
    await Promise.all(
      data.slugs.map(async (raw) => {
        const slug = raw.toLowerCase();
        const info = await fetchKickChannel(slug);
        out[slug] = Boolean(info?.isLive);
      }),
    );
    return out;
  });
