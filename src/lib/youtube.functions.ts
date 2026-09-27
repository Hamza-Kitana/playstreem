import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { youTubeEmoteToken } from "./kick-emotes";

export type YouTubeChatItem = {
  id: string;
  author: string;
  authorId: string;
  /** Message text; custom emojis / stickers are `[ytemote:…]` tokens. */
  text: string;
  at: number;
  kind: "chat" | "superchat" | "sticker" | "member" | "giftMembers";
  /** Formatted Super Chat / Super Sticker amount, e.g. "$5.00". */
  amount?: string;
  /** Membership headline from YouTube, e.g. "Member for 6 months". */
  detail?: string;
  /** Number of memberships gifted. */
  count?: number;
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

type Thumbnails = { thumbnails?: { url?: string; width?: number }[] };
type Accessible = { accessibility?: { accessibilityData?: { label?: string } } };

type Run = {
  text?: string;
  emoji?: {
    emojiId?: string;
    isCustomEmoji?: boolean;
    shortcuts?: string[];
    image?: Thumbnails & Accessible;
  };
};

type Text = { runs?: Run[]; simpleText?: string };

function largestThumb(image: Thumbnails | undefined) {
  let best: { url?: string; width?: number } | undefined;
  for (const t of image?.thumbnails ?? []) {
    if (t.url && (!best || (t.width ?? 0) > (best.width ?? 0))) best = t;
  }
  const url = best?.url;
  if (!url) return null;
  return url.startsWith("//") ? `https:${url}` : url;
}

function runsToText(value: Text | undefined) {
  if (!value) return "";
  if (typeof value.simpleText === "string") return value.simpleText.trim();
  if (!Array.isArray(value.runs)) return "";
  return value.runs
    .map((r) => {
      if (typeof r.text === "string") return r.text;
      if (!r.emoji) return "";
      if (!r.emoji.isCustomEmoji) return r.emoji.emojiId ?? "";
      const url = largestThumb(r.emoji.image);
      const name =
        r.emoji.shortcuts?.[0]?.replace(/^:|:$/g, "") ??
        r.emoji.image?.accessibility?.accessibilityData?.label ??
        "emoji";
      return url ? youTubeEmoteToken(url, name) : `:${name}:`;
    })
    .join("")
    .trim();
}

function cleanAuthor(name: string) {
  return name.replace(/^[\s\u200e\u200f\u202a-\u202e\u2066-\u2069]*@/, "").trim() || "YouTube";
}

type Renderer = {
  id?: string;
  message?: Text;
  authorName?: Text;
  authorExternalChannelId?: string;
  timestampUsec?: string;
  purchaseAmountText?: Text;
  sticker?: Thumbnails & Accessible;
  headerPrimaryText?: Text;
  headerSubtext?: Text;
  header?: { liveChatSponsorshipsHeaderRenderer?: { authorName?: Text; primaryText?: Text } };
};

function baseItem(
  renderer: Renderer,
  kind: YouTubeChatItem["kind"],
  authorName?: Text,
): YouTubeChatItem | null {
  if (!renderer.id) return null;
  const author = runsToText(authorName ?? renderer.authorName);
  const at = Number(renderer.timestampUsec) / 1000;
  return {
    id: renderer.id,
    author: cleanAuthor(author),
    authorId: renderer.authorExternalChannelId ?? (author || renderer.id),
    text: runsToText(renderer.message),
    at: Number.isFinite(at) && at > 0 ? at : Date.now(),
    kind,
  };
}

type ChatItem = {
  liveChatTextMessageRenderer?: Renderer;
  liveChatPaidMessageRenderer?: Renderer;
  liveChatPaidStickerRenderer?: Renderer;
  liveChatMembershipItemRenderer?: Renderer;
  liveChatSponsorshipsGiftPurchaseAnnouncementRenderer?: Renderer;
};

function parseChatItem(item: ChatItem): YouTubeChatItem | null {
  if (item.liveChatTextMessageRenderer) {
    const parsed = baseItem(item.liveChatTextMessageRenderer, "chat");
    return parsed?.text ? parsed : null;
  }
  if (item.liveChatPaidMessageRenderer) {
    const r = item.liveChatPaidMessageRenderer;
    const parsed = baseItem(r, "superchat");
    const amount = runsToText(r.purchaseAmountText);
    if (parsed && amount) parsed.amount = amount;
    return parsed;
  }
  if (item.liveChatPaidStickerRenderer) {
    const r = item.liveChatPaidStickerRenderer;
    const parsed = baseItem(r, "sticker");
    if (!parsed) return null;
    const amount = runsToText(r.purchaseAmountText);
    if (amount) parsed.amount = amount;
    const url = largestThumb(r.sticker);
    if (url) {
      parsed.text = youTubeEmoteToken(
        url,
        r.sticker?.accessibility?.accessibilityData?.label ?? "sticker",
      );
    }
    return parsed;
  }
  if (item.liveChatMembershipItemRenderer) {
    const r = item.liveChatMembershipItemRenderer;
    const parsed = baseItem(r, "member");
    if (!parsed) return null;
    const detail = runsToText(r.headerPrimaryText) || runsToText(r.headerSubtext);
    if (detail) parsed.detail = detail;
    return parsed;
  }
  if (item.liveChatSponsorshipsGiftPurchaseAnnouncementRenderer) {
    const r = item.liveChatSponsorshipsGiftPurchaseAnnouncementRenderer;
    const header = r.header?.liveChatSponsorshipsHeaderRenderer;
    const parsed = baseItem(r, "giftMembers", header?.authorName);
    if (!parsed) return null;
    const count = Number(runsToText(header?.primaryText).match(/\d+/)?.[0]);
    parsed.count = Number.isFinite(count) && count > 0 ? count : 1;
    return parsed;
  }
  return null;
}

type ChatAction = { addChatItemAction?: { item?: ChatItem } };

function actionsToItems(actions: ChatAction[] | undefined): YouTubeChatItem[] {
  const out: YouTubeChatItem[] = [];
  for (const action of actions ?? []) {
    const item = action.addChatItemAction?.item;
    const parsed = item ? parseChatItem(item) : null;
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
