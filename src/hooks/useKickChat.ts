import { useCallback, useEffect, useRef, useState } from "react";
import { clearKickSession, saveKickSession } from "@/lib/kick-session";

export type ChatMessage = {
  key: number;
  /** Display name in chat. */
  user: string;
  /** Stable Kick account id/slug — used so each person can act once. */
  userKey: string;
  color: string;
  text: string;
  at: number;
  /** Regular chat vs Kick gift/tip event. */
  kind?: "chat" | "gift";
  /** Gifted Kick amount when kind is gift. */
  giftAmount?: number;
};

type KickSender = {
  id?: number | string;
  username?: string;
  slug?: string;
  username_color?: string;
  identity?: { color?: string };
};

/** Unique key for one-vote / one-rating / one-attempt rules. */
export function participantKey(m: Pick<ChatMessage, "user" | "userKey">) {
  return (m.userKey || m.user).trim().toLowerCase();
}

function identityFromSender(sender?: KickSender | null) {
  const username = String(sender?.username ?? "").trim();
  const slug = String(sender?.slug ?? "").trim();
  const id = sender?.id;
  const user = username || slug || "مشاهد";
  const userKey =
    id != null && String(id).trim() !== ""
      ? `id:${id}`
      : slug
        ? `slug:${slug.toLowerCase()}`
        : username
          ? `user:${username.toLowerCase()}`
          : "";
  return {
    user,
    userKey,
    color: sender?.identity?.color ?? sender?.username_color ?? "#8ef0c0",
  };
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** Best-effort Kick gift amount from varied Pusher payload shapes. */
function extractGiftAmount(payload: Record<string, unknown>): number | null {
  const gift = asRecord(payload.gift);
  const direct =
    asNumber(gift?.amount) ??
    asNumber(payload.amount) ??
    asNumber(payload.kicks) ??
    asNumber(payload.total) ??
    asNumber(payload.gift_amount) ??
    asNumber(payload.quantity);
  if (direct != null && direct > 0) return Math.round(direct);

  const nested = [payload.data, payload.transaction, payload.tip].filter(
    (x): x is Record<string, unknown> => !!x && typeof x === "object",
  );
  for (const obj of nested) {
    const nestedGift = asRecord(obj.gift);
    const n =
      asNumber(nestedGift?.amount) ??
      asNumber(obj.amount) ??
      asNumber(obj.kicks) ??
      asNumber(obj.total) ??
      asNumber(obj.quantity);
    if (n != null && n > 0) return Math.round(n);
  }
  return null;
}

function eventLooksLikeGift(eventName: string) {
  const e = eventName.toLowerCase();
  return (
    e === "kicksgifted" ||
    e.includes("kicksgifted") ||
    e.includes("kicks.gifted") ||
    e.includes("gift") ||
    e.includes("kicksgift") ||
    e.includes("kicks_gift") ||
    e.includes("tip") ||
    e.includes("celebration")
  );
}

function giftMessageId(eventName: string, payload: Record<string, unknown>, amount: number) {
  const tx = payload.gift_transaction_id ?? asRecord(payload.gift)?.gift_transaction_id;
  if (tx != null && String(tx).trim() !== "") return `gift:${tx}`;
  if (payload.id != null) return `gift:${payload.id}`;
  const sender = asRecord(payload.sender) ?? asRecord(payload.user);
  const senderId = sender?.id ?? sender?.username ?? "";
  return `gift:${eventName}:${senderId}:${amount}:${Date.now()}`;
}

function kickSubscribeChannels(chatroomId: number, channelId?: number) {
  const channels = new Set<string>([
    `chatrooms.${chatroomId}.v2`,
    `chatrooms.${chatroomId}`,
    `chatroom_${chatroomId}`,
  ]);
  if (channelId != null) {
    channels.add(`channel.${channelId}`);
    channels.add(`channel_${channelId}`);
  }
  return Array.from(channels);
}

export type ChatStatus = "idle" | "connecting" | "live" | "error";

const KICK_WS =
  "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false";

let counter = 0;

export function useKickChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const seenIds = useRef(new Set<string>());

  const push = useCallback(
    (
      user: string,
      userKey: string,
      text: string,
      color: string,
      extra?: { kind?: "chat" | "gift"; giftAmount?: number },
    ) => {
      counter += 1;
      setMessages((prev) => {
        const next = [
          ...prev,
          {
            key: counter,
            user,
            userKey,
            text,
            color,
            at: Date.now(),
            kind: extra?.kind ?? "chat",
            giftAmount: extra?.giftAmount,
          },
        ];
        return next.length > 220 ? next.slice(next.length - 220) : next;
      });
    },
    [],
  );

  const disconnectSockets = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  /** Full stop — drops the session so refresh won't reconnect. */
  const stop = useCallback(() => {
    disconnectSockets();
    clearKickSession();
    setStatus("idle");
    setChannel(null);
  }, [disconnectSockets]);

  const connect = useCallback(
    (chatroomId: number, label: string, slug?: string, channelId?: number) => {
      disconnectSockets();
      seenIds.current.clear();
      setError(null);
      setStatus("connecting");
      setChannel(label);

      const resolvedSlug =
        slug?.toLowerCase() ||
        label
          .replace(/^kick\.com\//i, "")
          .split(/[/?#]/)[0]
          ?.toLowerCase() ||
        "";

      let ws: WebSocket;
      try {
        ws = new WebSocket(KICK_WS);
      } catch {
        setStatus("error");
        setError("تعذّر فتح الاتصال بالبث.");
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        for (const ch of kickSubscribeChannels(chatroomId, channelId)) {
          ws.send(
            JSON.stringify({
              event: "pusher:subscribe",
              data: { auth: "", channel: ch },
            }),
          );
        }
        if (resolvedSlug) {
          saveKickSession({ slug: resolvedSlug, chatroomId, channelId });
        }
        setStatus("live");
      };

      ws.onmessage = (ev) => {
        try {
          const frame = JSON.parse(String(ev.data)) as { event?: string; data?: string };
          if (!frame.event || !frame.data) return;
          if (frame.event.startsWith("pusher:") || frame.event.startsWith("pusher_internal:")) return;

          const eventName = frame.event;
          const isChat = eventName.includes("ChatMessage");
          const isGift = eventLooksLikeGift(eventName);
          if (!isChat && !isGift) return;

          const payload = JSON.parse(frame.data) as Record<string, unknown> & {
            id?: string | number;
            content?: string;
            sender?: KickSender;
            user?: KickSender;
          };

          const ident = identityFromSender(payload.sender ?? payload.user);

          if (isGift) {
            const amount = extractGiftAmount(payload);
            if (amount == null || amount <= 0) return;
            const mid = giftMessageId(eventName, payload, amount);
            if (seenIds.current.has(mid)) return;
            seenIds.current.add(mid);
            if (seenIds.current.size > 400) {
              const first = seenIds.current.values().next().value;
              if (first) seenIds.current.delete(first);
            }
            push(ident.user, ident.userKey, `هدية ${amount} كيك`, ident.color, {
              kind: "gift",
              giftAmount: amount,
            });
            return;
          }

          const mid =
            payload.id != null
              ? String(payload.id)
              : `${eventName}:${payload.content ?? ""}:${ident.userKey}`;
          if (mid) {
            if (seenIds.current.has(mid)) return;
            seenIds.current.add(mid);
            if (seenIds.current.size > 400) {
              const first = seenIds.current.values().next().value;
              if (first) seenIds.current.delete(first);
            }
          }

          const text = payload.content?.trim();
          if (!text) return;
          push(ident.user, ident.userKey, text, ident.color);
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setError("انقطع الاتصال بشات كيك.");
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          setStatus((s) => (s === "live" ? "error" : s));
        }
      };
    },
    [disconnectSockets, push],
  );

  useEffect(() => () => disconnectSockets(), [disconnectSockets]);

  return { messages, status, error, channel, connect, stop, setError };
}
