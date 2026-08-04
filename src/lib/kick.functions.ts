import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-zA-Z0-9_-]+$/, "اسم القناة غير صالح"),
});

export type KickChannelInfo = {
  slug: string;
  chatroomId: number;
  displayName: string;
  avatar: string | null;
  followers: number | null;
  isLive: boolean;
};

/** Resolves a Kick channel slug into its chatroom id (server-side to avoid CORS). */
export const resolveKickChannel = createServerFn({ method: "POST" })
  .validator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<KickChannelInfo> => {
    const slug = data.slug.toLowerCase();
    const endpoints = [
      `https://kick.com/api/v2/channels/${slug}`,
      `https://kick.com/api/v1/channels/${slug}`,
    ];

    let lastStatus = 0;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            accept: "application/json",
            "accept-language": "en-US,en;q=0.9",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          },
        });
        lastStatus = res.status;
        if (!res.ok) continue;
        const json = (await res.json()) as {
          chatroom?: { id?: number };
          user?: { username?: string; profile_pic?: string | null };
          followers_count?: number;
          livestream?: unknown;
        };
        const chatroomId = json.chatroom?.id;
        if (typeof chatroomId !== "number") continue;
        return {
          slug,
          chatroomId,
          displayName: json.user?.username ?? slug,
          avatar: json.user?.profile_pic ?? null,
          followers: typeof json.followers_count === "number" ? json.followers_count : null,
          isLive: Boolean(json.livestream),
        };
      } catch {
        // try next endpoint
      }
    }

    throw new Error(
      lastStatus === 404
        ? "لم يتم العثور على القناة. تأكد من اسم القناة في كيك."
        : "تعذّر الوصول إلى كيك حالياً. جرّب مرة أخرى بعد ثوانٍ.",
    );
  });
