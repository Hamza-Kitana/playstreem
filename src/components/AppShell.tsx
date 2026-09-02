import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ChevronDown, MessageSquareText } from "lucide-react";
import Background3D from "@/components/Background3D";
import AppHeader from "@/components/AppHeader";
import ChatFeed from "@/components/ChatFeed";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FULL_BLEED = new Set(["/about", "/contact", "/streamers", "/chat"]);
const GAME_ROUTES = new Set(["/quiz", "/seat", "/vote", "/rate", "/phrase", "/flag", "/riddle", "/zombie"]);
const CHAT_OPEN_KEY = "al-daboor-side-chat-open";

function loadChatOpenPreference() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(CHAT_OPEN_KEY) !== "0";
  } catch {
    return true;
  }
}

function saveChatOpenPreference(open: boolean) {
  try {
    localStorage.setItem(CHAT_OPEN_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export default function AppShell({ children }: { children: ReactNode }) {
  const chat = useKickChatContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const chatActive = chat.status === "live";
  const isHome = pathname === "/";
  const isGame = GAME_ROUTES.has(pathname);
  const fullBleed = FULL_BLEED.has(pathname) || isHome || isGame;
  const onStreamers = pathname === "/streamers";
  const onChatPage = pathname === "/chat";
  const isOverlay = pathname === "/quiz/overlay";

  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    setChatOpen(loadChatOpenPreference());
  }, []);

  useEffect(() => {
    if (onStreamers || onChatPage) setChatOpen(false);
  }, [onStreamers, onChatPage]);

  const toggleChat = () => {
    setChatOpen((prev) => {
      const next = !prev;
      if (!onStreamers && !onChatPage) saveChatOpenPreference(next);
      return next;
    });
  };

  // Popout quiz window: no site chrome — pure game window.
  if (isOverlay) {
    return <div className="min-h-screen bg-[#070613] text-foreground">{children}</div>;
  }

  return (
    <div
      className={cn(
        "surface-royal relative text-foreground",
        isHome || isGame ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <Background3D />
      <AppHeader />
      <main
        key={pathname}
        className={cn(
          "route-fade",
          isHome
            ? "h-dvh w-full max-w-none px-3 pt-[4.75rem] pb-3 sm:px-5 sm:pt-[5.25rem]"
            : isGame
              ? "flex h-dvh max-w-none flex-col overflow-hidden px-1.5 pt-[4rem] pb-1.5 sm:px-3 sm:pt-[4.5rem] lg:px-4"
              : fullBleed
                ? "w-full max-w-none px-0 pt-24 pb-16"
                : "mx-auto w-full max-w-7xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28",
        )}
      >
        <div className={cn(isGame && "flex min-h-0 flex-1 flex-col")}>{children}</div>
      </main>
      {!isHome && !isGame ? (
        <footer className="border-t border-white/10 bg-black/40 py-8 backdrop-blur">
          <div
            className={cn(
              "flex flex-col items-center gap-1 px-4 text-center sm:px-6",
              fullBleed ? "w-full max-w-none" : "mx-auto max-w-6xl",
            )}
          >
            <p className="font-brand text-lg font-bold">
              <span className="shimmer-text">Al-Daboor</span>
            </p>
            <p className="text-sm text-white/55">ألعاب يقودها الشات على كيك</p>
          </div>
        </footer>
      ) : null}

      {chatActive && !onChatPage && !isHome ? (
        <div className="fixed bottom-5 left-5 z-30 hidden flex-col items-start gap-2 xl:flex">
          <Button
            type="button"
            size="sm"
            variant={chatOpen ? "secondary" : "default"}
            className="h-9 gap-1.5 rounded-xl font-bold shadow-lg"
            onClick={toggleChat}
            aria-expanded={chatOpen}
            aria-controls="side-chat-panel"
          >
            {chatOpen ? (
              <>
                <ChevronDown className="size-3.5" />
                إخفاء الشات
              </>
            ) : (
              <>
                <MessageSquareText className="size-3.5" />
                إظهار الشات
              </>
            )}
          </Button>

          {chatOpen ? (
            <div id="side-chat-panel" className="animate-pop-in w-72">
              <ChatFeed
                messages={chat.messages}
                status={chat.status}
                channel={chat.channel}
                className="max-h-80"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
