import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Gift,
  MessageSquareText,
  PlugZap,
  Radio,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { useChatAnalytics } from "@/contexts/ChatAnalyticsContext";
import { useT } from "@/contexts/LocaleContext";
import ChatEmoteText from "@/components/ChatEmoteText";
import ChatProfanityDialog from "@/components/ChatProfanityDialog";
import ChatStatsDialog from "@/components/ChatStatsDialog";
import ChatSupportersDialog from "@/components/ChatSupportersDialog";
import ProfanityAlertBanner from "@/components/ProfanityAlertBanner";
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
  const analytics = useChatAnalytics();
  const { messages: t, locale } = useT();
  const p = t.pages.chat;
  const nav = t.nav;
  const live = chat.status === "live";
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [profanityOpen, setProfanityOpen] = useState(false);
  const [supportersOpen, setSupportersOpen] = useState(false);
  // FIFO queue: oldest first, newest last — max 100 (also capped in useKickChat).
  const latest = chat.messages.length > 100 ? chat.messages.slice(-100) : chat.messages;
  const newestKey = latest.at(-1)?.key;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [newestKey]);

  const timeFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="relative flex w-full flex-col gap-4 px-3 pb-4 sm:px-5 lg:px-8">
      <ProfanityAlertBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-primary uppercase">
            <MessageSquareText className="size-3.5" />
            {p.title}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
            <span className="shimmer-text">{p.liveTitle}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{p.liveSubtitle}</p>
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
            <span
              className={cn("size-2 rounded-full", live ? "animate-pulse bg-primary" : "bg-muted-foreground/50")}
            />
            {live ? nav.live : chat.status === "connecting" ? t.common.loading : nav.offline}
          </span>
          {chat.channel ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-2xl bg-black/30 px-3 py-2 text-xs font-bold text-muted-foreground"
              dir="ltr"
            >
              <Radio className="size-3.5 text-primary" />
              {chat.channel}
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 gap-1.5 font-extrabold"
            onClick={() => setStatsOpen(true)}
          >
            <BarChart3 className="size-3.5" />
            {p.statsBtn}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 gap-1.5 border border-amber-400/35 bg-gradient-to-r from-amber-500/20 to-amber-400/10 font-extrabold text-amber-100 hover:from-amber-500/30 hover:to-amber-400/20 hover:text-amber-50"
            onClick={() => setSupportersOpen(true)}
          >
            <Gift className="size-3.5 text-amber-300" />
            {p.supportersBtn}
            {analytics.topSupporters.length > 0 ? (
              <span className="rounded-full bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-amber-50">
                {analytics.topSupporters.length}
              </span>
            ) : null}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 gap-1.5 border border-rose-500/30 bg-rose-500/10 font-extrabold text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
            onClick={() => setProfanityOpen(true)}
          >
            <ShieldAlert className="size-3.5" />
            {p.profanityBtn}
            {analytics.profanityLog.length > 0 ? (
              <span className="rounded-full bg-rose-500/30 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-rose-100">
                {new Set(analytics.profanityLog.map((x) => x.user.toLowerCase())).size}
              </span>
            ) : null}
          </Button>
          {!live ? (
            <Button asChild size="sm" className="h-9 font-extrabold">
              <Link to="/connect">
                <PlugZap className="size-3.5" />
                {p.connectChannel}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {live ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase">
              <MessageSquareText className="size-3.5 text-primary" />
              {p.comments}
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{analytics.totalMessages}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase">
              <Users className="size-3.5 text-primary" />
              {p.chattersCount}
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{analytics.uniqueChatters}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 sm:col-span-1">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200/80 uppercase">
              <Sparkles className="size-3.5 text-amber-400" />
              {p.winners}
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-amber-300">{analytics.wins.length}</p>
          </div>
        </div>
      ) : null}

      <div className="glass flex min-h-[calc(100vh-9.5rem)] flex-1 flex-col overflow-hidden rounded-3xl border border-primary/20 shadow-[0_0_60px_-28px_var(--neon)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-black/40 via-primary/5 to-black/40 px-4 py-3 sm:px-6">
          <p className="text-sm font-extrabold">{p.comments}</p>
          <p className="text-xs font-bold text-muted-foreground tabular-nums">
            {latest.length} {p.visibleCount}
          </p>
        </div>

        <div
          ref={boxRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 lg:px-8"
        >
          {!live ? (
            <div className="grid min-h-[50vh] place-items-center px-4 text-center">
              <div>
                <MessageSquareText className="mx-auto size-10 text-primary/70" />
                <p className="mt-4 text-lg font-extrabold">{p.emptyTitle}</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.emptyDesc}</p>
                <Button asChild className="mt-5 font-extrabold">
                  <Link to="/connect">
                    <PlugZap className="size-4" />
                    {p.connectPage}
                  </Link>
                </Button>
              </div>
            </div>
          ) : latest.length === 0 ? (
            <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">{p.waiting}</div>
          ) : (
            latest.map((m) => {
              const flagged = analytics.flaggedMessageKeys.has(m.key);
              const isGift = m.kind === "gift";
              const isNewest = m.key === newestKey;
              return (
                <div
                  key={m.key}
                  className={cn(
                    "flex w-full items-start gap-3.5 rounded-2xl border px-4 py-3.5 transition-colors sm:gap-4 sm:px-5 sm:py-4",
                    isNewest && "animate-chat-in",
                    flagged
                      ? "border-rose-500/40 bg-rose-950/30"
                      : isGift
                        ? "border-amber-500/25 bg-amber-500/10"
                        : "border-white/5 bg-black/25 hover:border-primary/15 hover:bg-black/35",
                  )}
                >
                  <span
                    className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-full text-base font-extrabold sm:size-12 sm:text-lg"
                    style={{
                      color: m.color,
                      background: `color-mix(in oklab, ${m.color} 22%, transparent)`,
                      boxShadow: `0 0 20px -8px ${m.color}`,
                    }}
                  >
                    {isGift ? <Gift className="size-5" /> : m.user.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <span className="text-base font-extrabold sm:text-lg" style={{ color: m.color }}>
                        {m.user}
                      </span>
                      {isGift ? (
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-extrabold text-amber-300">
                          {p.gift}
                        </span>
                      ) : null}
                      {flagged ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-extrabold text-rose-300">
                          <ShieldAlert className="size-3.5" />
                          {p.flagged}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground tabular-nums sm:text-sm">
                        {timeFmt.format(m.at)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 text-lg leading-8 break-words sm:text-xl sm:leading-9",
                        flagged ? "text-rose-100" : isGift ? "font-bold text-amber-100" : "text-foreground",
                      )}
                    >
                      <ChatEmoteText text={m.text} size="lg" />
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ChatStatsDialog open={statsOpen} onOpenChange={setStatsOpen} />
      <ChatSupportersDialog open={supportersOpen} onOpenChange={setSupportersOpen} />
      <ChatProfanityDialog open={profanityOpen} onOpenChange={setProfanityOpen} />
    </div>
  );
}
