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
};

type KickSender = {
  id?: number | string;
  username?: string;
  slug?: string;
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
    color: sender?.identity?.color ?? "#8ef0c0",
  };
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

  const push = useCallback((user: string, userKey: string, text: string, color: string) => {
    counter += 1;
    setMessages((prev) => {
      const next = [...prev, { key: counter, user, userKey, text, color, at: Date.now() }];
      return next.length > 220 ? next.slice(next.length - 220) : next;
    });
  }, []);

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
    (chatroomId: number, label: string, slug?: string) => {
      disconnectSockets();
      seenIds.current.clear();
      setError(null);
      setStatus("connecting");
      setChannel(label);

      const resolvedSlug =
        slug?.toLowerCase() ||
        label.replace(/^kick\.com\//i, "").split(/[/?#]/)[0]?.toLowerCase() ||
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
        ws.send(
          JSON.stringify({
            event: "pusher:subscribe",
            data: { auth: "", channel: `chatrooms.${chatroomId}.v2` },
          }),
        );
        if (resolvedSlug) {
          saveKickSession({ slug: resolvedSlug, chatroomId });
        }
        setStatus("live");
      };

      ws.onmessage = (ev) => {
        try {
          const frame = JSON.parse(String(ev.data)) as { event?: string; data?: string };
          if (!frame.event?.includes("ChatMessage") || !frame.data) return;
          const payload = JSON.parse(frame.data) as {
            id?: string | number;
            content?: string;
            sender?: KickSender;
            user?: KickSender;
          };
          const mid = payload.id != null ? String(payload.id) : "";
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
          const ident = identityFromSender(payload.sender ?? payload.user);
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
