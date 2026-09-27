import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { nextChatKey, type ChatMessage, type ChatStatus } from "@/hooks/useKickChat";
import { youTubeEmoteToken } from "@/lib/kick-emotes";
import { createTikTokToken } from "@/lib/tiktok.functions";

/** postMessage source tags shared with the browser extension (extension/tiktok/site.js). */
const FROM_EXTENSION = "al-daboor-tiktok-ext";
const TO_EXTENSION = "al-daboor-site";
const SESSION_KEY = "al-daboor-tiktok-session";
const EXTENSION_TIMEOUT_MS = 4000;
const MAX_RECONNECTS = 5;

export type TikTokMode = "direct" | "extension";
export type TikTokChatError =
  "noExtension" | "invalid" | "notLive" | "ended" | "busy" | "notConfigured" | "lost" | "failed";

type TikTokSession = { mode: "extension" } | { mode: "direct"; input: string };

type TikTokEvent =
  | { type: "chat"; id: string; user: string; userId?: string | null; text: string; at?: number }
  | {
      type: "gift";
      id: string;
      user: string;
      userId?: string | null;
      giftName: string;
      count: number;
      diamonds?: number;
      image?: string | null;
      at?: number;
    };

type ExtensionMessage =
  | { type: "hello"; version?: string }
  | { type: "status"; tabs: { tabId: number; channel: string }[] }
  | { type: "events"; channel: string | null; events: TikTokEvent[] };

/** Subset of the Euler Stream (tiktok-live-connector v2) event payloads we read. */
type EulerUser = { uniqueId?: string; nickname?: string };
type EulerMessage = {
  type: string;
  data?: {
    common?: { msgId?: string; createTime?: string };
    user?: EulerUser;
    comment?: string;
    emotes?: {
      placeInComment?: number;
      emote?: { emoteId?: string; image?: { imageUrl?: string } };
    }[];
    repeatCount?: number;
    repeatEnd?: number;
    groupId?: string;
    giftDetails?: {
      giftName?: string;
      diamondCount?: number;
      giftType?: number;
      giftImage?: { url?: string[] };
    };
  };
};

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
    const text = typeof event.text === "string" ? event.text.trim().slice(0, 800) : "";
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
  const diamonds = Number(event.diamonds);
  if (Number.isFinite(diamonds) && diamonds > 0) gift.giftDiamonds = Math.round(diamonds * count);
  if (typeof event.image === "string" && /^https:\/\//.test(event.image))
    gift.giftImage = event.image;
  return gift;
}

/** Inserts emote image tokens into a TikTok comment at their reported offsets. */
function commentWithEmotes(comment: string, emotes: NonNullable<EulerMessage["data"]>["emotes"]) {
  if (!emotes?.length) return comment;
  const chars = Array.from(comment);
  const sorted = [...emotes].sort((a, b) => (b.placeInComment ?? 0) - (a.placeInComment ?? 0));
  for (const e of sorted) {
    const url = e.emote?.image?.imageUrl;
    if (!url) continue;
    const at = Math.max(0, Math.min(chars.length, e.placeInComment ?? chars.length));
    chars.splice(at, 0, youTubeEmoteToken(url, `tt-${e.emote?.emoteId ?? "emote"}`));
  }
  return chars.join("");
}

function fromEuler(m: EulerMessage): TikTokEvent | null {
  const d = m.data;
  const user = d?.user?.nickname || d?.user?.uniqueId;
  if (!d || !user) return null;
  const id = d.common?.msgId ?? `${m.type}-${Date.now()}-${Math.random()}`;
  const at = Number(d.common?.createTime);
  const base = {
    id,
    user,
    userId: d.user?.uniqueId ?? null,
    at: at > 1e12 ? at : at > 1e9 ? at * 1000 : Date.now(),
  };
  if (m.type === "WebcastChatMessage") {
    const text = commentWithEmotes(d.comment ?? "", d.emotes);
    return text.trim() ? { type: "chat", ...base, text } : null;
  }
  if (m.type === "WebcastGiftMessage") {
    const details = d.giftDetails;
    // Streakable gifts repeat while the combo runs; only count the final total.
    if (details?.giftType === 1 && !d.repeatEnd) return null;
    return {
      type: "gift",
      ...base,
      id: d.groupId && d.groupId !== "0" ? `gift-${d.groupId}-${d.user?.uniqueId}` : id,
      giftName: details?.giftName ?? "Gift",
      count: d.repeatCount || 1,
      diamonds: details?.diamondCount ?? 0,
      image: details?.giftImage?.url?.[0] ?? null,
    };
  }
  return null;
}

function loadSession(): TikTokSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<TikTokSession>) : null;
    if (parsed?.mode === "extension") return { mode: "extension" };
    if (parsed?.mode === "direct" && typeof parsed.input === "string") {
      return { mode: "direct", input: parsed.input };
    }
  } catch {
    // Corrupt or unavailable storage: start disconnected.
  }
  return null;
}

function saveSession(session: TikTokSession | null) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable (private mode); the connection just won't persist.
  }
}

function errorFromServer(e: unknown): TikTokChatError {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("TT_INVALID")) return "invalid";
  if (msg.includes("TT_NOT_CONFIGURED")) return "notConfigured";
  if (msg.includes("TT_BUSY")) return "busy";
  return "failed";
}

export function useTikTokChat() {
  const issueToken = useServerFn(createTikTokToken);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<TikTokMode | null>(null);
  const [directStatus, setDirectStatus] = useState<ChatStatus>("idle");
  const [directChannel, setDirectChannel] = useState<string | null>(null);
  const [directError, setDirectError] = useState<TikTokChatError | null>(null);
  const [extension, setExtension] = useState<{ version: string | null } | null>(null);
  const [extensionChannel, setExtensionChannel] = useState<string | null>(null);
  const [extensionTimedOut, setExtensionTimedOut] = useState(false);
  const modeRef = useRef<TikTokMode | null>(null);
  const seenIds = useRef(new Set<string>());
  const generation = useRef(0);
  const socket = useRef<WebSocket | null>(null);
  const retryTimer = useRef<number | null>(null);

  const addEvents = useCallback((events: TikTokEvent[]) => {
    const fresh: ChatMessage[] = [];
    for (const e of events) {
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
  }, []);

  const closeSocket = () => {
    if (retryTimer.current != null) {
      window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    const ws = socket.current;
    socket.current = null;
    if (ws) {
      ws.onclose = null;
      ws.onmessage = null;
      ws.close();
    }
  };

  const switchMode = (next: TikTokMode | null) => {
    modeRef.current = next;
    setMode(next);
  };

  const connectDirect = useCallback(
    async (input: string) => {
      const gen = ++generation.current;
      closeSocket();
      switchMode("direct");
      seenIds.current.clear();
      setMessages([]);
      setDirectError(null);
      setDirectStatus("connecting");

      let reconnects = 0;
      const open = async (): Promise<boolean> => {
        let issued;
        try {
          issued = await issueToken({ data: { input } });
        } catch (e) {
          if (gen !== generation.current) return false;
          setDirectStatus("error");
          setDirectError(errorFromServer(e));
          return false;
        }
        if (gen !== generation.current) return false;
        saveSession({ mode: "direct", input });
        setDirectChannel(issued.uniqueId);

        const ws = new WebSocket(
          `wss://ws.eulerstream.com?uniqueId=${encodeURIComponent(issued.uniqueId)}&jwtKey=${encodeURIComponent(issued.token)}`,
        );
        socket.current = ws;
        ws.onmessage = (event) => {
          if (gen !== generation.current) return;
          let payload: { messages?: EulerMessage[] };
          try {
            payload = JSON.parse(String(event.data)) as { messages?: EulerMessage[] };
          } catch {
            return;
          }
          const events: TikTokEvent[] = [];
          for (const m of payload.messages ?? []) {
            if (m.type === "roomInfo" || m.type === "tiktok.connect") {
              reconnects = 0;
              setDirectStatus("live");
              continue;
            }
            const e = fromEuler(m);
            if (e) events.push(e);
          }
          if (events.length > 0) {
            setDirectStatus("live");
            addEvents(events);
          }
        };
        ws.onclose = (event) => {
          if (gen !== generation.current) return;
          socket.current = null;
          const fatal: Record<number, TikTokChatError> = {
            4404: "notLive",
            4005: "ended",
            4429: "busy",
            4400: "invalid",
            4401: "failed",
            4403: "failed",
          };
          const code = fatal[event.code];
          if (code) {
            setDirectStatus("error");
            setDirectError(code);
            if (code === "notLive" || code === "invalid") saveSession(null);
            return;
          }
          if (reconnects >= MAX_RECONNECTS) {
            setDirectStatus("error");
            setDirectError("lost");
            return;
          }
          reconnects += 1;
          setDirectStatus("connecting");
          retryTimer.current = window.setTimeout(
            () => void open(),
            Math.min(15000, 1000 * 2 ** reconnects),
          );
        };
        return true;
      };
      return open();
    },
    [issueToken, addEvents],
  );

  const connectExtension = useCallback(() => {
    generation.current += 1;
    closeSocket();
    switchMode("extension");
    saveSession({ mode: "extension" });
    seenIds.current.clear();
    setMessages([]);
    window.postMessage({ source: TO_EXTENSION, type: "ping" }, window.location.origin);
  }, []);

  const stop = useCallback(() => {
    generation.current += 1;
    closeSocket();
    switchMode(null);
    saveSession(null);
    setDirectStatus("idle");
    setDirectChannel(null);
    setDirectError(null);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as ({ source?: string; version?: string } & ExtensionMessage) | null;
      if (!data || data.source !== FROM_EXTENSION) return;

      setExtension((prev) => prev ?? { version: data.version ?? null });
      if (data.type === "status") {
        setExtensionChannel(data.tabs[0]?.channel ?? null);
        return;
      }
      if (data.type !== "events" || modeRef.current !== "extension") return;
      if (!Array.isArray(data.events)) return;
      if (data.channel) setExtensionChannel(data.channel);
      addEvents(data.events);
    };

    window.addEventListener("message", onMessage);
    window.postMessage({ source: TO_EXTENSION, type: "ping" }, window.location.origin);
    const timeout = window.setTimeout(() => setExtensionTimedOut(true), EXTENSION_TIMEOUT_MS);

    const session = loadSession();
    if (session?.mode === "extension") connectExtension();
    else if (session?.mode === "direct") void connectDirect(session.input);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
      generation.current += 1;
      closeSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot listener + session restore
  }, []);

  let status: ChatStatus = "idle";
  let error: TikTokChatError | null = null;
  let liveChannel: string | null = null;
  if (mode === "direct") {
    status = directStatus;
    error = directError;
    liveChannel = directChannel;
  } else if (mode === "extension") {
    liveChannel = extensionChannel;
    if (!extension) {
      status = extensionTimedOut ? "error" : "connecting";
      if (extensionTimedOut) error = "noExtension";
    } else {
      status = extensionChannel ? "live" : "connecting";
    }
  }

  return {
    messages,
    status,
    error,
    mode,
    extensionInstalled: extension != null,
    extensionChannel,
    channel: status === "live" && liveChannel ? `tiktok.com/@${liveChannel}` : null,
    connect: connectDirect,
    connectExtension,
    stop,
  };
}

export type TikTokChatApi = ReturnType<typeof useTikTokChat>;
