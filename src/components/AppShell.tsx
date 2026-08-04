import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ChevronDown, MessageSquareText } from "lucide-react";
import Background3D from "@/components/Background3D";
import AppHeader from "@/components/AppHeader";
import ChatFeed from "@/components/ChatFeed";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FULL_BLEED = new Set(["/about", "/contact", "/streamers"]);
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
  const fullBleed = FULL_BLEED.has(pathname);
  const onStreamers = pathname === "/streamers";
  const isOverlay = pathname === "/quiz/overlay";

  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    setChatOpen(loadChatOpenPreference());
  }, []);

  useEffect(() => {
    if (onStreamers) setChatOpen(false);
  }, [onStreamers]);

  const toggleChat = () => {
    setChatOpen((prev) => {
      const next = !prev;
      if (!onStreamers) saveChatOpenPreference(next);
      return next;
    });
  };

  // Popout quiz window: no site chrome — pure game window.
  if (isOverlay) {
    return <div className="min-h-screen bg-[#070d0c] text-foreground">{children}</div>;
  }

  return (
    <div className="relative min-h-screen">
      <Background3D />
      <AppHeader />
      <main
        className={cn(
          "pt-28 pb-24 sm:pt-32",
          fullBleed ? "w-full max-w-none px-0" : "mx-auto max-w-6xl px-4 sm:px-6",
        )}
      >
        {children}
      </main>
      <footer className="border-t border-border/50 py-10">
        <div
          className={cn(
            "flex flex-col items-center gap-2 px-4 text-center sm:px-6",
            fullBleed ? "w-full max-w-none" : "mx-auto max-w-6xl",
          )}
        >
          <p className="font-brand text-lg font-bold text-foreground">Al-Daboor</p>
          <p className="text-sm text-muted-foreground">ألعاب يقودها الشات على كيك</p>
        </div>
      </footer>

      {chatActive ? (
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
