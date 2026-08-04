import { useCallback, useEffect, useRef, useState } from "react";
import { clearKickSession, saveKickSession } from "@/lib/kick-session";

export type ChatMessage = {
  key: number;
  user: string;
  color: string;
  text: string;
  at: number;
};

export type ChatStatus = "idle" | "connecting" | "live" | "demo" | "error";

const KICK_WS =
  "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false";

const DEMO_USERS = [
  "أبو_فهد",
  "Ghaith99",
  "سمسم",
  "MrKick",
  "لؤي",
  "نور",
  "الشبح",
  "Zeko",
  "ريماس",
  "حمودي",
];
const DEMO_WORDS = [
  "هههههه",
  "يا وحش",
  "٧",
  "١٠",
  "الأردن",
  "برشلونة",
  "نعم",
  "لا",
  "سوطه",
  "٤٢",
  "الكرسي إلي",
  "يلا بسرعة",
  "٩",
  "القاهرة",
  "٣",
];

let counter = 0;

export function useKickChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const demoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const push = useCallback((user: string, text: string, color: string) => {
    counter += 1;
    setMessages((prev) => {
      const next = [...prev, { key: counter, user, text, color, at: Date.now() }];
      return next.length > 220 ? next.slice(next.length - 220) : next;
    });
  }, []);

  const disconnectSockets = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    if (demoRef.current) clearInterval(demoRef.current);
    demoRef.current = null;
  }, []);

  /** Full stop — drops the session so refresh won't reconnect. */
  const stop = useCallback(() => {
    disconnectSockets();
    clearKickSession();
    setStatus("idle");
    setChannel(null);
  }, [disconnectSockets]);

  const startDemo = useCallback(() => {
    disconnectSockets();
    clearKickSession();
    setError(null);
    setStatus("demo");
    setChannel("وضع تجريبي");
    demoRef.current = setInterval(
      () => {
        const u = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)]!;
        const w = DEMO_WORDS[Math.floor(Math.random() * DEMO_WORDS.length)]!;
        push(u, w, `oklch(0.8 0.17 ${Math.floor(Math.random() * 360)})`);
      },
      900 + Math.random() * 900,
    );
  }, [disconnectSockets, push]);

  const connect = useCallback(
    (chatroomId: number, label: string, slug?: string) => {
      disconnectSockets();
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
            content?: string;
            sender?: { username?: string; identity?: { color?: string } };
          };
          const text = payload.content?.trim();
          if (!text) return;
          push(
            payload.sender?.username ?? "مشاهد",
            text,
            payload.sender?.identity?.color ?? "#8ef0c0",
          );
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

  return { messages, status, error, channel, connect, startDemo, stop, setError };
}
