import { useEffect, useRef } from "react";
import type { ChatMessage, ChatStatus } from "@/hooks/useKickChat";
import { cn } from "@/lib/utils";

const LABEL: Record<ChatStatus, string> = {
  idle: "غير متصل",
  connecting: "جاري الاتصال…",
  live: "مباشر",
  error: "انقطع الاتصال",
};

export default function ChatFeed({
  messages,
  status,
  channel,
  className,
}: {
  messages: ChatMessage[];
  status: ChatStatus;
  channel: string | null;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const live = status === "live";

  return (
    <div className={cn("glass flex flex-col overflow-hidden rounded-3xl", className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2.5 rounded-full",
              live ? "bg-primary animate-pulse-glow" : "bg-muted-foreground",
            )}
          />
          <span className="text-sm font-bold">{LABEL[status]}</span>
        </div>
        <span className="max-w-[9rem] truncate text-xs text-muted-foreground">
          {channel ?? "لا توجد قناة"}
        </span>
      </div>

      <div ref={boxRef} className="min-h-72 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-muted-foreground">
            بانتظار التعليقات من البث…
          </p>
        ) : (
          messages.slice(-80).map((m) => (
            <div key={m.key} className="animate-chat-in rounded-xl bg-secondary/40 px-3 py-2">
              <span className="text-sm font-bold" style={{ color: m.color }}>
                {m.user}
              </span>
              <span className="mx-1 text-muted-foreground">:</span>
              <span className="text-sm break-words">{m.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
