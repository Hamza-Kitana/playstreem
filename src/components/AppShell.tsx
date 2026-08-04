import type { ReactNode } from "react";
import Background3D from "@/components/Background3D";
import AppHeader from "@/components/AppHeader";
import ChatFeed from "@/components/ChatFeed";
import { useKickChatContext } from "@/contexts/KickChatContext";

export default function AppShell({ children }: { children: ReactNode }) {
  const chat = useKickChatContext();
  const chatActive = chat.status === "live" || chat.status === "demo";

  return (
    <div className="relative min-h-screen">
      <Background3D />
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pt-32 pb-24 sm:px-6">{children}</main>
      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6">
          <p className="font-brand text-lg font-bold text-foreground">Al-Daboor</p>
          <p className="text-sm text-muted-foreground">ألعاب يقودها الشات على كيك</p>
        </div>
      </footer>

      {chatActive ? (
        <div className="animate-pop-in fixed bottom-6 left-6 z-30 hidden w-72 xl:block">
          <ChatFeed
            messages={chat.messages}
            status={chat.status}
            channel={chat.channel}
            className="max-h-80"
          />
        </div>
      ) : null}
    </div>
  );
}
