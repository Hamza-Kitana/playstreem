import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkKickLiveStatuses, resolveKickChannel } from "@/lib/kick.functions";
import {
  briefFromInfo,
  fetchKickChannelFromBrowser,
  type KickChannelBrief,
  type KickChannelInfo,
} from "@/lib/kick-channel";

/** Resolves a slug from the browser first, then falls back to the server function. */
export function useResolveKickChannel() {
  const serverResolve = useServerFn(resolveKickChannel);
  return useCallback(
    async (slug: string): Promise<KickChannelInfo> => {
      const direct = await fetchKickChannelFromBrowser(slug);
      if (direct) return direct;
      return serverResolve({ data: { slug } });
    },
    [serverResolve],
  );
}

/** Live status + avatars for several slugs; browser first, server for any misses. */
export function useKickLiveStatuses() {
  const serverCheck = useServerFn(checkKickLiveStatuses);
  return useCallback(
    async (slugs: string[]): Promise<Record<string, KickChannelBrief>> => {
      const out: Record<string, KickChannelBrief> = {};
      const missing: string[] = [];
      await Promise.all(
        slugs.map(async (raw) => {
          const slug = raw.toLowerCase();
          const info = await fetchKickChannelFromBrowser(slug);
          if (info) out[slug] = briefFromInfo(info, slug);
          else missing.push(slug);
        }),
      );
      if (missing.length > 0) {
        try {
          Object.assign(out, await serverCheck({ data: { slugs: missing } }));
        } catch {
          for (const slug of missing) out[slug] = briefFromInfo(null, slug);
        }
      }
      return out;
    },
    [serverCheck],
  );
}
