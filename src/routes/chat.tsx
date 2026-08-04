import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { MessageSquareText, PlugZap, Radio } from "lucide-react";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "الشات — Al-Daboor" },
      { name: "description", content: "اقرأ شات كيك كامل العرض مباشرة مع Al-Daboor." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const chat = useKickChatContext();
  const live = chat.status === "live";
  const boxRef = useRef<HTMLDivElement | null>(null);
  const latest = chat.messages.slice(-120);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages]);

  return (
    <div className="flex w-full flex-col gap-4 px-3 pb-4 sm:px-5 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-primary uppercase">
            <MessageSquareText className="size-3.5" />
            Kick Chat
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
            <span className="shimmer-text">الشات مباشر</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            بعرض كامل من اليمين لليسار — التعليقات تنزل أولاً بأول.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-extrabold",
              live
                ? "border border-primary/30 bg-primary/15 text-primary"
                : "bg-secondary text-muted-foreground",
            )}
          >
            <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-primary" : "bg-muted-foreground/50")} />
            {live ? "مباشر" : chat.status === "connecting" ? "جاري الاتصال…" : "غير متصل"}
          </span>
          {chat.channel ? (
            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-black/30 px-3 py-2 text-xs font-bold text-muted-foreground" dir="ltr">
              <Radio className="size-3.5 text-primary" />
              {chat.channel}
            </span>
          ) : null}
          {!live ? (
            <Button asChild size="sm" className="h-9 font-extrabold">
              <Link to="/connect">
                <PlugZap className="size-3.5" />
                اربط القناة
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="glass flex min-h-[calc(100vh-9.5rem)] flex-1 flex-col overflow-hidden rounded-3xl border border-primary/20 shadow-[0_0_60px_-28px_var(--neon)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/25 px-4 py-3 sm:px-6">
          <p className="text-sm font-extrabold">التعليقات</p>
          <p className="text-xs font-bold text-muted-foreground tabular-nums">
            {latest.length} رسالة ظاهرة
          </p>
        </div>

        <div
          ref={boxRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 lg:px-8"
        >
          {!live ? (
            <div className="grid min-h-[50vh] place-items-center px-4 text-center">
              <div>
                <MessageSquareText className="mx-auto size-10 text-primary/70" />
                <p className="mt-4 text-lg font-extrabold">الشات فاضي لحد ما تربط</p>
                <p className="mt-2 text-sm text-muted-foreground">اربط قناة كيك عشان التعليقات تطلع هنا بعرض كامل.</p>
                <Button asChild className="mt-5 font-extrabold">
                  <Link to="/connect">
                    <PlugZap className="size-4" />
                    صفحة الربط
                  </Link>
                </Button>
              </div>
            </div>
          ) : latest.length === 0 ? (
            <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">
              بانتظار أول تعليق من البث…
            </div>
          ) : (
            latest.map((m) => (
              <div
                key={m.key}
                className="animate-chat-in flex w-full items-start gap-3 rounded-2xl border border-white/5 bg-black/25 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5"
              >
                <span
                  className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold sm:size-10 sm:text-base"
                  style={{
                    color: m.color,
                    background: `color-mix(in oklab, ${m.color} 22%, transparent)`,
                    boxShadow: `0 0 20px -8px ${m.color}`,
                  }}
                >
                  {m.user.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-extrabold sm:text-base" style={{ color: m.color }}>
                      {m.user}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {new Date(m.at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1 text-base leading-7 break-words text-foreground sm:text-lg sm:leading-8">
                    {m.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
