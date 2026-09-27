import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type YouTubeChatItem = {
  id: string;
  author: string;
  authorId: string;
  text: string;
  at: number;
  kind: "chat" | "superchat";
  /** Formatted Super Chat / Super Sticker amount, e.g. "$5.00". */
  amount?: string;
};

export type YouTubeLiveInfo = {
  videoId: string;
  label: string;
  title: string | null;
  apiKey: string;
  clientVersion: string;
  continuation: string;
  initial: YouTubeChatItem[];
};

export type YouTubeChatPoll = {
  items: YouTubeChatItem[];
  continuation: string | null;
  timeoutMs: number;
};

const YT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
  // Skips the EU cookie-consent interstitial.
  cookie: "CONSENT=YES+cb; SOCS=CAI",
};

type Target =
  { kind: "video"; id: string; label: string } | { kind: "path"; path: string; label: string };

const VIDEO_ID = /^[\w-]{11}$/;

function parseInput(raw: string): Target[] {
  const value = raw.trim();
  if (!value) return [];

  if (/^@[\w.-]{2,60}$/.test(value)) {
    return [{ kind: "path", path: `/${value}/live`, label: `youtube.com/${value}` }];
  }

  let url: URL | null = null;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    url = null;
  }

  if (url && /(^|\.)youtu\.be$/i.test(url.hostname)) {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return VIDEO_ID.test(id) ? [{ kind: "video", id, label: `youtu.be/${id}` }] : [];
  }

  if (url && /(^|\.)youtube\.com$/i.test(url.hostname)) {
    const v = url.searchParams.get("v");
    if (v && VIDEO_ID.test(v)) return [{ kind: "video", id: v, label: `youtu.be/${v}` }];
    const parts = url.pathname.split("/").filter(Boolean);
    const [first, second] = parts;
    if (
      (first === "live" || first === "shorts" || first === "embed") &&
      second &&
      VIDEO_ID.test(second)
    ) {
      return [{ kind: "video", id: second, label: `youtu.be/${second}` }];
    }
    if (first?.startsWith("@") && /^@[\w.-]{2,60}$/.test(first)) {
      return [{ kind: "path", path: `/${first}/live`, label: `youtube.com/${first}` }];
    }
    if (
      (first === "channel" || first === "c" || first === "user") &&
      second &&
      /^[\w.-]{2,80}$/.test(second)
    ) {
      return [
        { kind: "path", path: `/${first}/${second}/live`, label: `youtube.com/${first}/${second}` },
      ];
    }
    return [];
  }

  // Bare text: try it as a handle first, then as a video id.
  const targets: Target[] = [];
  if (/^[\w.-]{2,60}$/.test(value)) {
    targets.push({ kind: "path", path: `/@${value}/live`, label: `youtube.com/@${value}` });
  }
  if (VIDEO_ID.test(value)) targets.push({ kind: "video", id: value, label: `youtu.be/${value}` });
  return targets;
}

async function fetchText(url: string) {
  const res = await fetch(url, { headers: YT_HEADERS, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  return res.text();
}

async function videoIdFromPath(path: string): Promise<{ id: string; title: string | null } | null> {
  const html = await fetchText(`https://www.youtube.com${path}`);
  if (!html) return null;
  const canonical = html.match(/<link rel="canonical" href="[^"]*[?&]v=([\w-]{11})/);
  if (!canonical?.[1]) return null;
  const title = html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? null;
  return { id: canonical[1], title };
}

type Run = {
  text?: string;
  emoji?: { emojiId?: string; isCustomEmoji?: boolean; shortcuts?: string[] };
};

function runsToText(runs: Run[] | undefined) {
  if (!Array.isArray(runs)) return "";
  return runs
    .map((r) => {
      if (typeof r.text === "string") return r.text;
      if (r.emoji)
        return r.emoji.isCustomEmoji ? (r.emoji.shortcuts?.[0] ?? "") : (r.emoji.emojiId ?? "");
      return "";
    })
    .join("")
    .trim();
}

type Renderer = {
  id?: string;
  message?: { runs?: Run[] };
  authorName?: { simpleText?: string };
  authorExternalChannelId?: string;
  timestampUsec?: string;
  purchaseAmountText?: { simpleText?: string };
};

function toItem(
  renderer: Renderer | undefined,
  kind: YouTubeChatItem["kind"],
): YouTubeChatItem | null {
  if (!renderer?.id) return null;
  const text = runsToText(renderer.message?.runs);
  if (kind === "chat" && !text) return null;
  const at = Number(renderer.timestampUsec) / 1000;
  const item: YouTubeChatItem = {
    id: renderer.id,
    author:
      renderer.authorName?.simpleText?.replace(/^[\s\u200e\u200f\u202a-\u202e\u2066-\u2069]*@/, "").trim() ||
      "YouTube",
    authorId: renderer.authorExternalChannelId ?? renderer.authorName?.simpleText ?? renderer.id,
    text,
    at: Number.isFinite(at) && at > 0 ? at : Date.now(),
    kind,
  };
  const amount = renderer.purchaseAmountText?.simpleText;
  if (amount) item.amount = amount;
  return item;
}

type ChatAction = {
  addChatItemAction?: {
    item?: {
      liveChatTextMessageRenderer?: Renderer;
      liveChatPaidMessageRenderer?: Renderer;
      liveChatPaidStickerRenderer?: Renderer;
    };
  };
};

function actionsToItems(actions: ChatAction[] | undefined): YouTubeChatItem[] {
  const out: YouTubeChatItem[] = [];
  for (const action of actions ?? []) {
    const item = action.addChatItemAction?.item;
    if (!item) continue;
    const parsed =
      toItem(item.liveChatTextMessageRenderer, "chat") ??
      toItem(item.liveChatPaidMessageRenderer, "superchat") ??
      toItem(item.liveChatPaidStickerRenderer, "superchat");
    if (parsed) out.push(parsed);
  }
  return out;
}

type Continuation = Record<string, { continuation?: string; timeoutMs?: number } | undefined>;

function readContinuation(list: Continuation[] | undefined) {
  const first = list?.[0];
  if (!first) return null;
  for (const value of Object.values(first)) {
    if (value?.continuation)
      return { token: value.continuation, timeoutMs: value.timeoutMs ?? 5000 };
  }
  return null;
}

async function openLiveChat(videoId: string) {
  const html = await fetchText(`https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`);
  if (!html) return null;
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)?.[1];
  const raw = html.match(/ytInitialData"?\]?\s*=\s*(\{.+?\});\s*<\/script>/s)?.[1];
  if (!apiKey || !clientVersion || !raw) return null;
  let renderer: { actions?: ChatAction[]; continuations?: Continuation[] } | undefined;
  try {
    renderer = (JSON.parse(raw) as { contents?: { liveChatRenderer?: typeof renderer } }).contents
      ?.liveChatRenderer;
  } catch {
    return null;
  }
  const next = readContinuation(renderer?.continuations);
  if (!renderer || !next) return null;
  return {
    apiKey,
    clientVersion,
    continuation: next.token,
    initial: actionsToItems(renderer.actions),
  };
}

const resolveSchema = z.object({ input: z.string().trim().min(2).max(300) });

/** Resolves a YouTube channel / video link into a live chat cursor. */
export const resolveYouTubeLive = createServerFn({ method: "POST" })
  .validator((input: unknown) => resolveSchema.parse(input))
  .handler(async ({ data }): Promise<YouTubeLiveInfo> => {
    const targets = parseInput(data.input);
    if (targets.length === 0) throw new Error("YT_INVALID");

    for (const target of targets) {
      let videoId: string;
      let title: string | null = null;
      if (target.kind === "video") {
        videoId = target.id;
      } else {
        const found = await videoIdFromPath(target.path).catch(() => null);
        if (!found) continue;
        videoId = found.id;
        title = found.title;
      }
      const chat = await openLiveChat(videoId).catch(() => null);
      if (!chat) continue;
      return { videoId, label: target.label, title, ...chat, initial: chat.initial.slice(-25) };
    }
    throw new Error("YT_NOT_LIVE");
  });

const pollSchema = z.object({
  continuation: z.string().min(10).max(4000),
  apiKey: z.string().regex(/^[\w-]{20,80}$/),
  clientVersion: z.string().regex(/^[\d.]{3,30}$/),
});

/** Fetches chat actions that arrived since the given cursor. */
export const pollYouTubeChat = createServerFn({ method: "POST" })
  .validator((input: unknown) => pollSchema.parse(input))
  .handler(async ({ data }): Promise<YouTubeChatPoll> => {
    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?prettyPrint=false&key=${data.apiKey}`,
      {
        method: "POST",
        headers: { ...YT_HEADERS, "content-type": "application/json" },
        body: JSON.stringify({
          context: { client: { clientName: "WEB", clientVersion: data.clientVersion } },
          continuation: data.continuation,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) throw new Error("YT_POLL_FAILED");
    const json = (await res.json()) as {
      continuationContents?: {
        liveChatContinuation?: { actions?: ChatAction[]; continuations?: Continuation[] };
      };
    };
    const live = json.continuationContents?.liveChatContinuation;
    const next = readContinuation(live?.continuations);
    return {
      items: actionsToItems(live?.actions),
      continuation: next?.token ?? null,
      timeoutMs: next?.timeoutMs ?? 5000,
    };
  });
