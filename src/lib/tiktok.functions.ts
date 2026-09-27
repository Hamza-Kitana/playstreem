import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EULER_API = "https://api.eulerstream.com";
const UNIQUE_ID = /^[\w.]{2,24}$/;

export type TikTokToken = { uniqueId: string; token: string };

/** Accepts `@name`, `name`, or any tiktok.com/@name[/live] link. */
export function parseTikTokInput(raw: string): string | null {
  const value = raw.trim();
  const fromUrl = value.match(/tiktok\.com\/@([\w.]+)/i)?.[1];
  const candidate = (fromUrl ?? value.replace(/^@/, "")).toLowerCase();
  return UNIQUE_ID.test(candidate) ? candidate : null;
}

let accountIdPromise: Promise<number> | null = null;

function eulerHeaders(apiKey: string) {
  return { "x-api-key": apiKey, accept: "application/json", "content-type": "application/json" };
}

function loadAccountId(apiKey: string) {
  accountIdPromise ??= (async () => {
    const res = await fetch(`${EULER_API}/accounts/me`, {
      headers: eulerHeaders(apiKey),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => null)) as { account?: { id?: number } } | null;
    const id = json?.account?.id;
    if (!res.ok || typeof id !== "number") throw new Error("TT_FAILED");
    return id;
  })().catch((e) => {
    accountIdPromise = null;
    throw e;
  });
  return accountIdPromise;
}

const tokenSchema = z.object({ input: z.string().trim().min(2).max(300) });

/**
 * Issues a short-lived Euler Stream JWT that lets the browser open one WebSocket
 * to the given creator's TikTok LIVE, without exposing the API key.
 */
export const createTikTokToken = createServerFn({ method: "POST" })
  .validator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }): Promise<TikTokToken> => {
    const uniqueId = parseTikTokInput(data.input);
    if (!uniqueId) throw new Error("TT_INVALID");
    const apiKey = process.env.EULER_API_KEY;
    if (!apiKey) throw new Error("TT_NOT_CONFIGURED");

    const accountId = await loadAccountId(apiKey);
    const res = await fetch(`${EULER_API}/accounts/${accountId}/jwt/create`, {
      method: "POST",
      headers: eulerHeaders(apiKey),
      body: JSON.stringify({
        expireAfter: 60,
        websockets: { allowedCreators: [uniqueId], maxWebSockets: 1 },
      }),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => null)) as { token?: string } | null;
    if (res.status === 429) throw new Error("TT_BUSY");
    if (!res.ok || !json?.token) throw new Error("TT_FAILED");
    return { uniqueId, token: json.token };
  });
