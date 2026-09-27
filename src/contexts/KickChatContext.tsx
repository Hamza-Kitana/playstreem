import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useKickChat, type ChatMessage, type ChatStatus } from "@/hooks/useKickChat";
import { useResolveKickChannel } from "@/hooks/useResolveKickChannel";
import { useYouTubeChat, type YouTubeChatApi } from "@/hooks/useYouTubeChat";
import {
  clearKickSession,
  loadKickSession,
  loadLegacyKickSlug,
  saveKickSession,
} from "@/lib/kick-session";
import { loadYouTubeSession } from "@/lib/youtube-session";

type KickChatApi = ReturnType<typeof useKickChat>;

type KickChatValue = Omit<KickChatApi, "messages" | "status" | "channel"> & {
  /** Kick + YouTube messages merged in arrival order (max 100). */
  messages: ChatMessage[];
  /** Live when any platform is live. */
  status: ChatStatus;
  /** Kick channel label, falling back to the YouTube label. */
  channel: string | null;
  kick: Pick<KickChatApi, "status" | "channel" | "error" | "stop">;
  youtube: YouTubeChatApi;
};

const KickChatContext = createContext<KickChatValue | null>(null);

function combineStatus(a: ChatStatus, b: ChatStatus): ChatStatus {
  if (a === "live" || b === "live") return "live";
  if (a === "connecting" || b === "connecting") return "connecting";
  if (a === "error" || b === "error") return "error";
  return "idle";
}

export function KickChatProvider({ children }: { children: ReactNode }) {
  const chat = useKickChat();
  const youtube = useYouTubeChat();
  const resolve = useResolveKickChannel();
  const restored = useRef(false);

  // Reconnect last Kick channel after refresh (any page).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (typeof window === "undefined") return;

    const ytSession = loadYouTubeSession();
    if (ytSession) void youtube.connect(ytSession.input);

    const session = loadKickSession();
    if (session) {
      if (session.channelId) {
        chat.connect(
          session.chatroomId,
          `kick.com/${session.slug}`,
          session.slug,
          session.channelId,
        );
        return;
      }
      let cancelled = false;
      void (async () => {
        try {
          const info = await resolve(session.slug);
          if (cancelled) return;
          saveKickSession({
            slug: info.slug,
            chatroomId: info.chatroomId,
            channelId: info.channelId,
          });
          chat.connect(info.chatroomId, `kick.com/${info.slug}`, info.slug, info.channelId);
        } catch {
          chat.connect(session.chatroomId, `kick.com/${session.slug}`, session.slug);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const legacy = loadLegacyKickSlug();
    if (!legacy) return;

    let cancelled = false;
    void (async () => {
      try {
        const info = await resolve(legacy);
        if (cancelled) return;
        saveKickSession({
          slug: info.slug,
          chatroomId: info.chatroomId,
          channelId: info.channelId,
        });
        chat.connect(info.chatroomId, `kick.com/${info.slug}`, info.slug, info.channelId);
      } catch {
        clearKickSession();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot restore on mount
  }, []);

  const messages = useMemo(() => {
    if (youtube.messages.length === 0) return chat.messages;
    if (chat.messages.length === 0) return youtube.messages;
    const merged = [...chat.messages, ...youtube.messages].sort((a, b) => a.key - b.key);
    return merged.length > 100 ? merged.slice(merged.length - 100) : merged;
  }, [chat.messages, youtube.messages]);

  const { stop: stopKick } = chat;
  const { stop: stopYouTube } = youtube;
  const stop = useCallback(() => {
    stopKick();
    stopYouTube();
  }, [stopKick, stopYouTube]);

  const value: KickChatValue = {
    ...chat,
    messages,
    status: combineStatus(chat.status, youtube.status),
    channel: chat.channel ?? youtube.channel,
    stop,
    kick: { status: chat.status, channel: chat.channel, error: chat.error, stop: stopKick },
    youtube,
  };

  return <KickChatContext.Provider value={value}>{children}</KickChatContext.Provider>;
}

export function useKickChatContext() {
  const value = useContext(KickChatContext);
  if (!value) {
    throw new Error("useKickChatContext must be used within KickChatProvider");
  }
  return value;
}
