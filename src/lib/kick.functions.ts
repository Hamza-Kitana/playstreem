import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  briefFromInfo,
  KICK_PUSHER_FALLBACK,
  kickChannelEndpoints,
  parseKickChannel,
  type KickChannelBrief,
  type KickChannelInfo,
  type KickPusherConfig,
} from "./kick-channel";

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

export type { KickChannelBrief, KickChannelInfo } from "./kick-channel";

/** Cloudflare filters on header fingerprints, so try several profiles before giving up. */
const KICK_HEADER_PROFILES: Record<string, string>[] = [
  { accept: "application/json" },
  {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "user-agent": "Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    referer: "https://kick.com/",
    origin: "https://kick.com",
  },
  {},
];

async function fetchKickChannel(slug: string): Promise<KickChannelInfo | null> {
  for (const headers of KICK_HEADER_PROFILES) {
    for (const url of kickChannelEndpoints(slug)) {
      try {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
        if (res.status === 403) break;
        if (!res.ok) continue;
        const info = parseKickChannel(await res.json(), slug);
        if (info) return info;
      } catch {
        // try next
      }
    }
  }
  return null;
}

/** Server fallback when the browser can't reach Kick directly. */
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

const PUSHER_CONFIG_TTL_MS = 10 * 60 * 1000;
let pusherConfigCache: { value: KickPusherConfig; at: number } | null = null;

type KickRealtimeJson = {
  data?: {
    connections?: { provider?: string; credentials?: { app_key?: unknown; cluster?: unknown } }[];
  };
};

/** Kick's web client asks for a realtime descriptor; requesting Pusher only gets its current key. */
async function fetchKickPusherConfig(): Promise<KickPusherConfig | null> {
  const res = await fetch("https://web.kick.com/api/v1/realtime/connection", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-app-platform": "web",
      referer: "https://kick.com/",
    },
    body: JSON.stringify({
      client: { id: crypto.randomUUID(), type: "web" },
      capabilities: { accepted_providers: [{ provider: "pusher" }] },
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as KickRealtimeJson | null;
  const creds = json?.data?.connections?.find((c) => c.provider === "pusher")?.credentials;
  const appKey = typeof creds?.app_key === "string" ? creds.app_key : "";
  const cluster = typeof creds?.cluster === "string" ? creds.cluster : "";
  if (!/^[a-z0-9]{10,40}$/i.test(appKey) || !/^[a-z0-9-]{2,12}$/i.test(cluster)) return null;
  return { appKey, cluster };
}

export const getKickPusherConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<KickPusherConfig> => {
    if (pusherConfigCache && Date.now() - pusherConfigCache.at < PUSHER_CONFIG_TTL_MS) {
      return pusherConfigCache.value;
    }
    const value = await fetchKickPusherConfig().catch(() => null);
    if (!value) return pusherConfigCache?.value ?? KICK_PUSHER_FALLBACK;
    pusherConfigCache = { value, at: Date.now() };
    return value;
  },
);

/** Batch live-status + profile meta for verified streamers. */
export const checkKickLiveStatuses = createServerFn({ method: "POST" })
  .validator((input: unknown) => liveSchema.parse(input))
  .handler(async ({ data }): Promise<Record<string, KickChannelBrief>> => {
    const out: Record<string, KickChannelBrief> = {};
    await Promise.all(
      data.slugs.map(async (raw) => {
        const slug = raw.toLowerCase();
        const info = await fetchKickChannel(slug);
        out[slug] = briefFromInfo(info, slug);
      }),
    );
    return out;
  });
