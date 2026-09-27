import { useCallback, useEffect, useRef, useState } from "react";
import { nextChatKey, type ChatMessage, type ChatStatus } from "@/hooks/useKickChat";

/** postMessage source tags shared with the browser extension (extension/tiktok/site.js). */
const FROM_EXTENSION = "al-daboor-tiktok-ext";
const TO_EXTENSION = "al-daboor-site";
const ENABLED_KEY = "al-daboor-tiktok-enabled";
const EXTENSION_TIMEOUT_MS = 4000;

export type TikTokChatError = "noExtension";

type TikTokEvent =
  | { type: "chat"; id: string; user: string; userId?: string | null; text: string; at?: number }
  | {
      type: "gift";
      id: string;
      user: string;
      userId?: string | null;
      giftName: string;
      count: number;
      image?: string | null;
      at?: number;
    };

type ExtensionMessage =
  | { type: "hello"; version?: string }
  | { type: "status"; tabs: { tabId: number; channel: string }[] }
  | { type: "events"; channel: string | null; events: TikTokEvent[] };

const PALETTE = ["#25f4ee", "#fe2c55", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa", "#f783ac"];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function toMessage(event: TikTokEvent): ChatMessage | null {
  const user = cleanText(event.user, 60);
  if (!user) return null;
  const id = cleanText(event.userId, 60) || user.toLowerCase();
  const at = typeof event.at === "number" && Number.isFinite(event.at) ? event.at : Date.now();
  const base: ChatMessage = {
    key: nextChatKey(),
    user,
    userKey: `tt:${id.toLowerCase()}`,
    color: colorFor(id),
    text: "",
    at,
    platform: "tiktok",
    kind: "chat",
  };
  if (event.type === "chat") {
    const text = cleanText(event.text, 500);
    return text ? { ...base, text } : null;
  }
  const giftName = cleanText(event.giftName, 60) || "Gift";
  const count = Math.max(1, Math.min(9999, Math.round(Number(event.count) || 1)));
  const gift: ChatMessage = {
    ...base,
    kind: "gift",
    supportType: "tiktokGift",
    text: `TikTok gift ${giftName} x${count}`,
    giftName,
    giftCount: count,
  };
  if (typeof event.image === "string" && /^https:\/\//.test(event.image))
    gift.giftImage = event.image;
  return gift;
}

function loadEnabled() {
  try {
    return window.localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveEnabled(value: boolean) {
  try {
    if (value) window.localStorage.setItem(ENABLED_KEY, "1");
    else window.localStorage.removeItem(ENABLED_KEY);
  } catch {
    // Storage unavailable (private mode); the toggle just won't persist.
  }
}

export function useTikTokChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [extension, setExtension] = useState<{ version: string | null } | null>(null);
  const [liveChannel, setLiveChannel] = useState<string | null>(null);
  const [extensionTimedOut, setExtensionTimedOut] = useState(false);
  const enabledRef = useRef(false);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    const initial = loadEnabled();
    enabledRef.current = initial;
    setEnabled(initial);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as ({ source?: string; version?: string } & ExtensionMessage) | null;
      if (!data || data.source !== FROM_EXTENSION) return;

      setExtension((prev) => prev ?? { version: data.version ?? null });
      if (data.type === "status") {
        setLiveChannel(data.tabs[0]?.channel ?? null);
        return;
      }
      if (data.type !== "events" || !enabledRef.current || !Array.isArray(data.events)) return;
      if (data.channel) setLiveChannel(data.channel);
      const fresh: ChatMessage[] = [];
      for (const e of data.events) {
        if (!e || typeof e.id !== "string" || seenIds.current.has(e.id)) continue;
        seenIds.current.add(e.id);
        const m = toMessage(e);
        if (m) fresh.push(m);
      }
      if (seenIds.current.size > 600) seenIds.current = new Set([...seenIds.current].slice(-300));
      if (fresh.length === 0) return;
      setMessages((prev) => {
        const next = [...prev, ...fresh];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });
    };

    window.addEventListener("message", onMessage);
    window.postMessage({ source: TO_EXTENSION, type: "ping" }, window.location.origin);
    const timeout = window.setTimeout(() => setExtensionTimedOut(true), EXTENSION_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
    };
  }, []);

  const connect = useCallback(() => {
    enabledRef.current = true;
    setEnabled(true);
    saveEnabled(true);
    seenIds.current.clear();
    setMessages([]);
    window.postMessage({ source: TO_EXTENSION, type: "ping" }, window.location.origin);
  }, []);

  const stop = useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    saveEnabled(false);
  }, []);

  let status: ChatStatus = "idle";
  let error: TikTokChatError | null = null;
  if (enabled) {
    if (!extension) {
      status = extensionTimedOut ? "error" : "connecting";
      if (extensionTimedOut) error = "noExtension";
    } else {
      status = liveChannel ? "live" : "connecting";
    }
  }

  return {
    messages,
    status,
    error,
    enabled,
    extensionInstalled: extension != null,
    extensionVersion: extension?.version ?? null,
    liveChannel,
    channel: enabled && liveChannel ? `tiktok.com/@${liveChannel}` : null,
    connect,
    stop,
  };
}

export type TikTokChatApi = ReturnType<typeof useTikTokChat>;
