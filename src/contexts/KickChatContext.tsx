import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useKickChat } from "@/hooks/useKickChat";
import { resolveKickChannel } from "@/lib/kick.functions";
import {
  clearKickSession,
  loadKickSession,
  loadLegacyKickSlug,
  saveKickSession,
} from "@/lib/kick-session";

type KickChatValue = ReturnType<typeof useKickChat>;

const KickChatContext = createContext<KickChatValue | null>(null);

export function KickChatProvider({ children }: { children: ReactNode }) {
  const chat = useKickChat();
  const resolve = useServerFn(resolveKickChannel);
  const restored = useRef(false);

  // Reconnect last Kick channel after refresh (any page).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (typeof window === "undefined") return;

    const session = loadKickSession();
    if (session) {
      if (session.channelId) {
        chat.connect(session.chatroomId, `kick.com/${session.slug}`, session.slug, session.channelId);
        return;
      }
      let cancelled = false;
      void (async () => {
        try {
          const info = await resolve({ data: { slug: session.slug } });
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
        const info = await resolve({ data: { slug: legacy } });
        if (cancelled) return;
        saveKickSession({ slug: info.slug, chatroomId: info.chatroomId, channelId: info.channelId });
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

  return <KickChatContext.Provider value={chat}>{children}</KickChatContext.Provider>;
}

export function useKickChatContext() {
  const value = useContext(KickChatContext);
  if (!value) {
    throw new Error("useKickChatContext must be used within KickChatProvider");
  }
  return value;
}
