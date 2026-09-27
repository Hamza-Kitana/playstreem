import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { nextChatKey, type ChatMessage, type ChatStatus } from "@/hooks/useKickChat";
import { pollYouTubeChat, resolveYouTubeLive, type YouTubeChatItem } from "@/lib/youtube.functions";
import { clearYouTubeSession, saveYouTubeSession } from "@/lib/youtube-session";

export type YouTubeChatError = "invalid" | "notLive" | "lost" | "failed";

const POLL_MS = 2500;
const MAX_FAILURES = 6;
const PALETTE = [
  "#ff6b6b",
  "#ffa94d",
  "#ffd43b",
  "#69db7c",
  "#38d9a9",
  "#4dabf7",
  "#9775fa",
  "#f783ac",
];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

function toMessage(item: YouTubeChatItem): ChatMessage {
  const base: ChatMessage = {
    key: nextChatKey(),
    user: item.author,
    userKey: `yt:${item.authorId}`,
    color: colorFor(item.authorId),
    text: item.text,
    at: item.at,
    platform: "youtube",
    kind: "chat",
  };
  if (item.kind === "chat") return base;

  const gift: ChatMessage = { ...base, kind: "gift" };
  if (item.text) gift.giftMessage = item.text;
  switch (item.kind) {
    case "superchat":
    case "sticker":
      gift.supportType = item.kind;
      gift.text =
        `${item.kind === "sticker" ? "Super Sticker" : "Super Chat"} ${item.amount ?? ""}`.trim();
      if (item.amount) gift.giftLabel = item.amount;
      break;
    case "member":
      gift.supportType = "member";
      gift.text = "YouTube membership";
      if (item.detail) gift.giftLabel = item.detail;
      break;
    case "giftMembers":
      gift.supportType = "giftedMembers";
      gift.text = `Gifted ${item.count ?? 1} memberships`;
      gift.giftCount = item.count ?? 1;
      break;
  }
  return gift;
}

export function useYouTubeChat() {
  const resolve = useServerFn(resolveYouTubeLive);
  const poll = useServerFn(pollYouTubeChat);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<YouTubeChatError | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const generation = useRef(0);
  const timer = useRef<number | null>(null);
  const seenIds = useRef(new Set<string>());

  const clearTimer = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const addItems = useCallback((items: YouTubeChatItem[]) => {
    const fresh: ChatMessage[] = [];
    for (const item of items) {
      if (seenIds.current.has(item.id)) continue;
      seenIds.current.add(item.id);
      fresh.push(toMessage(item));
    }
    if (seenIds.current.size > 600) {
      seenIds.current = new Set([...seenIds.current].slice(-300));
    }
    if (fresh.length === 0) return;
    setMessages((prev) => {
      const next = [...prev, ...fresh];
      return next.length > 100 ? next.slice(next.length - 100) : next;
    });
  }, []);

  const stop = useCallback(() => {
    generation.current += 1;
    clearTimer();
    clearYouTubeSession();
    setStatus("idle");
    setChannel(null);
    setError(null);
  }, []);

  const connect = useCallback(
    async (input: string) => {
      const gen = ++generation.current;
      clearTimer();
      seenIds.current.clear();
      setMessages([]);
      setError(null);
      setStatus("connecting");

      let info;
      try {
        info = await resolve({ data: { input } });
      } catch (e) {
        if (gen !== generation.current) return false;
        const code = e instanceof Error && e.message.includes("YT_INVALID") ? "invalid" : "notLive";
        setStatus("error");
        setError(code);
        return false;
      }
      if (gen !== generation.current) return false;

      saveYouTubeSession({ input });
      setChannel(info.label);
      addItems(info.initial);
      setStatus("live");

      const { apiKey, clientVersion } = info;
      let cursor = info.continuation;
      let failures = 0;

      const tick = async () => {
        if (gen !== generation.current) return;
        try {
          const res = await poll({ data: { continuation: cursor, apiKey, clientVersion } });
          if (gen !== generation.current) return;
          failures = 0;
          if (res.continuation) cursor = res.continuation;
          addItems(res.items);
          setStatus("live");
          timer.current = window.setTimeout(tick, POLL_MS);
        } catch {
          if (gen !== generation.current) return;
          failures += 1;
          if (failures >= MAX_FAILURES) {
            setStatus("error");
            setError("lost");
            return;
          }
          setStatus("connecting");
          timer.current = window.setTimeout(tick, Math.min(15000, 1000 * 2 ** failures));
        }
      };
      timer.current = window.setTimeout(tick, POLL_MS);
      return true;
    },
    [resolve, poll, addItems],
  );

  useEffect(
    () => () => {
      generation.current += 1;
      clearTimer();
    },
    [],
  );

  return { messages, status, error, channel, connect, stop };
}

export type YouTubeChatApi = ReturnType<typeof useYouTubeChat>;
