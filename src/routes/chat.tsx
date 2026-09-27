import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BarChart3,
  Columns2,
  Crown,
  Gift,
  MessageSquareText,
  PlugZap,
  Radio,
  ShieldAlert,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Youtube,
} from "lucide-react";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { useChatAnalytics } from "@/contexts/ChatAnalyticsContext";
import { useT } from "@/contexts/LocaleContext";
import ChatEmoteText from "@/components/ChatEmoteText";
import ChatProfanityDialog from "@/components/ChatProfanityDialog";
import ChatStatsDialog from "@/components/ChatStatsDialog";
import ChatSupportersDialog from "@/components/ChatSupportersDialog";
import TikTokIcon from "@/components/TikTokIcon";
import ProfanityAlertBanner from "@/components/ProfanityAlertBanner";
import { Button } from "@/components/ui/button";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { isChatToneMuted, playChatTone, setChatToneMuted } from "@/lib/alert-sound";
import { cn } from "@/lib/utils";

type RowLabels = {
  gift: string;
  flagged: string;
  kicksUnit: string;
  giftNoMessage: string;
  superChat: string;
  superSticker: string;
  superChatNoMessage: string;
  memberLabel: string;
  memberJoined: string;
  giftedMembers: string;
  tiktokGift: string;
};

const ChatRow = memo(function ChatRow({
  m,
  flagged,
  animate,
  time,
  labels,
}: {
  m: ChatMessage;
  flagged: boolean;
  animate: boolean;
  time: string;
  labels: RowLabels;
}) {
  // Decided once on mount so existing rows never replay the entry animation.
  const [slideIn] = useState(animate);
  const isGift = m.kind === "gift";
  const giftText = isGift ? m.giftMessage : undefined;
  const isMembership = m.supportType === "member" || m.supportType === "giftedMembers";
  const isTikTokGift = m.supportType === "tiktokGift";

  let chipText = "";
  let chipDetail: string | undefined;
  let emptyText: string | undefined;
  if (isGift) {
    switch (m.supportType) {
      case "superchat":
        chipText = labels.superChat;
        chipDetail = m.giftLabel;
        emptyText = labels.superChatNoMessage;
        break;
      case "sticker":
        chipText = labels.superSticker;
        chipDetail = m.giftLabel;
        break;
      case "member":
        chipText = labels.memberLabel;
        emptyText = m.giftLabel ?? labels.memberJoined;
        break;
      case "giftedMembers":
        chipText = labels.giftedMembers.replace("{n}", String(m.giftCount ?? 1));
        break;
      case "tiktokGift":
        chipText = labels.tiktokGift;
        chipDetail = `${m.giftName ?? ""} ×${m.giftCount ?? 1}`.trim();
        break;
      default:
        chipText = `${m.giftAmount ?? 0} ${labels.kicksUnit}`;
        chipDetail = m.giftName;
        emptyText = labels.giftNoMessage;
    }
  }

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 transition-colors sm:gap-3.5 sm:px-4 sm:py-3.5",
        slideIn && "animate-chat-in",
        flagged
          ? "border-rose-500/40 bg-rose-950/30"
          : isGift && isMembership
            ? "border-emerald-400/40 bg-gradient-to-l from-emerald-500/15 via-emerald-500/10 to-transparent shadow-[0_0_28px_-16px_rgba(52,211,153,0.9)]"
            : isTikTokGift
              ? "border-[#fe2c55]/40 bg-gradient-to-l from-[#fe2c55]/15 via-[#25f4ee]/5 to-transparent shadow-[0_0_28px_-16px_rgba(254,44,85,0.9)]"
              : isGift
                ? "border-amber-400/40 bg-gradient-to-l from-amber-500/15 via-amber-500/10 to-transparent shadow-[0_0_28px_-16px_rgba(251,191,36,0.9)]"
                : "border-white/5 bg-black/25 hover:border-primary/15 hover:bg-black/35",
      )}
    >
      <span
        className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full text-sm font-extrabold sm:size-11 sm:text-base"
        style={{
          color: m.color,
          background: `color-mix(in oklab, ${m.color} 22%, transparent)`,
          boxShadow: `0 0 20px -8px ${m.color}`,
        }}
      >
        {isGift ? (
          isMembership ? (
            <Crown className="size-4.5" />
          ) : m.giftImage ? (
            <img src={m.giftImage} alt="" className="size-7 object-contain" loading="lazy" />
          ) : (
            <Gift className="size-4.5" />
          )
        ) : (
          m.user.slice(0, 1)
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {m.platform === "youtube" ? (
            <span
              className="grid size-5 place-items-center rounded-md bg-red-500/20 text-red-400"
              title="YouTube"
            >
              <Youtube className="size-3.5" />
            </span>
          ) : m.platform === "tiktok" ? (
            <span
              className="grid size-5 place-items-center rounded-md bg-[#25f4ee]/15 text-[#25f4ee]"
              title="TikTok"
            >
              <TikTokIcon className="size-3.5" />
            </span>
          ) : null}
          <span className="text-sm font-extrabold sm:text-base" style={{ color: m.color }}>
            {m.user}
          </span>
          {isGift ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black tabular-nums",
                isMembership
                  ? "border-emerald-400/40 bg-emerald-400/20 text-emerald-200"
                  : isTikTokGift
                    ? "border-[#fe2c55]/40 bg-[#fe2c55]/20 text-rose-100"
                    : "border-amber-400/40 bg-amber-400/20 text-amber-200",
              )}
            >
              {isMembership ? <Crown className="size-3" /> : <Gift className="size-3" />}
              {chipText}
              {chipDetail ? (
                <span
                  className={
                    isMembership ? "font-bold text-emerald-100/70" : "font-bold text-amber-100/80"
                  }
                >
                  · <span dir="ltr">{chipDetail}</span>
                </span>
              ) : null}
            </span>
          ) : null}
          {flagged ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-extrabold text-rose-300">
              <ShieldAlert className="size-3" />
              {labels.flagged}
            </span>
          ) : null}
          <span className="text-[11px] text-muted-foreground tabular-nums sm:text-xs">{time}</span>
        </div>
        {isGift ? (
          giftText ? (
            <p
              className={cn(
                "mt-1.5 rounded-xl border bg-black/25 px-3 py-2 text-base leading-7 font-bold break-words sm:text-lg sm:leading-8",
                isMembership
                  ? "border-emerald-300/20 text-emerald-50"
                  : "border-amber-300/20 text-amber-50",
              )}
            >
              <ChatEmoteText text={giftText} size="lg" />
            </p>
          ) : emptyText ? (
            <p
              className={cn(
                "mt-1 text-sm font-semibold",
                isMembership ? "text-emerald-100/65" : "text-amber-100/55",
              )}
            >
              {emptyText}
            </p>
          ) : null
        ) : (
          <p
            className={cn(
              "mt-1 text-base leading-7 break-words sm:text-lg sm:leading-8",
              flagged ? "text-rose-100" : "text-foreground",
            )}
          >
            <ChatEmoteText text={m.text} size="lg" />
          </p>
        )}
      </div>
    </div>
  );
});

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
  const allBoxRef = useRef<HTMLDivElement | null>(null);
  const regularBoxRef = useRef<HTMLDivElement | null>(null);
  const supportBoxRef = useRef<HTMLDivElement | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [profanityOpen, setProfanityOpen] = useState(false);
  const [supportersOpen, setSupportersOpen] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [chatToneMuted, setChatToneMutedState] = useState(isChatToneMuted);
  const seenAnimKeys = useRef<Set<number>>(new Set());
  const chatToneReady = useRef(false);
  /** Rows mounted after the first batch slide in; the initial backlog renders still. */
  const animateArrivals = useRef(false);

  const supporterKeys = useMemo(
    () => new Set(analytics.topSupporters.map((s) => s.userKey)),
    [analytics.topSupporters],
  );

  // Newest always on top; hard-cap 100 (FIFO drop is in useKickChat).
  const latest = useMemo(
    () => [...chat.messages].sort((a, b) => b.at - a.at || b.key - a.key).slice(0, 100),
    [chat.messages],
  );

  const regularFeed = useMemo(() => {
    return latest.filter((m) => {
      if (m.kind === "gift") return false;
      return !supporterKeys.has(participantKey(m));
    });
  }, [latest, supporterKeys]);

  const supporterFeed = useMemo(() => {
    return latest.filter((m) => {
      if (m.kind === "gift") return true;
      return supporterKeys.has(participantKey(m));
    });
  }, [latest, supporterKeys]);

  const newestKey = latest[0]?.key;
  const newestRegularKey = regularFeed[0]?.key;
  const newestSupportKey = supporterFeed[0]?.key;

  useEffect(() => {
    let newest: ChatMessage | undefined;
    for (const m of latest) {
      if (!seenAnimKeys.current.has(m.key)) {
        newest ??= m;
        seenAnimKeys.current.add(m.key);
      }
    }
    if (seenAnimKeys.current.size > 300) {
      const liveKeys = new Set(latest.map((m) => m.key));
      for (const key of [...seenAnimKeys.current]) {
        if (!liveKeys.has(key)) seenAnimKeys.current.delete(key);
      }
    }
    if (!newest) return;

    // Skip the first buffered batch after connect/refresh — only live arrivals.
    if (chatToneReady.current) {
      playChatTone({ gift: newest.kind === "gift" });
    } else {
      chatToneReady.current = true;
    }
    animateArrivals.current = true;
  }, [latest]);

  const toggleChatTone = () => {
    const next = !chatToneMuted;
    setChatToneMutedState(next);
    setChatToneMuted(next);
    if (!next) playChatTone();
  };

  useEffect(() => {
    const boxes = splitView ? [regularBoxRef.current, supportBoxRef.current] : [allBoxRef.current];
    for (const el of boxes) {
      if (el && el.scrollTop < 160) el.scrollTop = 0;
    }
  }, [newestKey, newestRegularKey, newestSupportKey, splitView]);

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [locale],
  );

  const rowLabels = useMemo<RowLabels>(
    () => ({
      gift: p.gift,
      flagged: p.flagged,
      kicksUnit: p.kicksUnit,
      giftNoMessage: p.giftNoMessage,
      superChat: p.superChat,
      superSticker: p.superSticker,
      superChatNoMessage: p.superChatNoMessage,
      memberLabel: p.memberLabel,
      memberJoined: p.memberJoined,
      giftedMembers: p.giftedMembers,
      tiktokGift: p.tiktokGift,
    }),
    [p],
  );

  const kickOn = chat.kick.status === "live" || chat.kick.status === "connecting";
  const youtubeOn = chat.youtube.status === "live" || chat.youtube.status === "connecting";
  const tiktokOn = chat.tiktok.status === "live" || chat.tiktok.status === "connecting";
  const activeCount = [kickOn, youtubeOn, tiktokOn].filter(Boolean).length;
  const pageTitle =
    activeCount > 1
      ? kickOn && youtubeOn && !tiktokOn
        ? p.titleBoth
        : p.titleMulti
      : youtubeOn
        ? p.titleYoutube
        : tiktokOn
          ? p.titleTiktok
          : p.title;
  const supporterEmptyText =
    youtubeOn && activeCount === 1 ? p.supporterChatEmptyYoutube : p.supporterChatEmpty;

  const renderMessages = (items: ChatMessage[], empty: ReactNode) => {
    if (!live) {
      return (
        <div className="grid min-h-[40vh] place-items-center px-4 text-center">
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
      );
    }
    if (items.length === 0) return empty;

    return items.map((m) => (
      <ChatRow
        key={m.key}
        m={m}
        flagged={analytics.flaggedMessageKeys.has(m.key)}
        animate={animateArrivals.current}
        time={timeFmt.format(m.at)}
        labels={rowLabels}
      />
    ));
  };

  return (
    <div className="relative flex w-full flex-col gap-4 px-3 pb-4 sm:px-5 lg:px-8">
      <ProfanityAlertBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-primary uppercase">
            <MessageSquareText className="size-3.5" />
            {pageTitle}
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
              className={cn(
                "size-2 rounded-full",
                live ? "animate-pulse bg-primary" : "bg-muted-foreground/50",
              )}
            />
            {live ? nav.live : chat.status === "connecting" ? t.common.loading : nav.offline}
          </span>
          {chat.kick.channel ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-2xl bg-black/30 px-3 py-2 text-xs font-bold text-muted-foreground"
              dir="ltr"
            >
              <Radio className="size-3.5 text-primary" />
              {chat.kick.channel}
            </span>
          ) : null}
          {chat.youtube.channel ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-2xl bg-black/30 px-3 py-2 text-xs font-bold text-muted-foreground"
              dir="ltr"
            >
              <Youtube className="size-3.5 text-red-400" />
              {chat.youtube.channel}
            </span>
          ) : null}
          {chat.tiktok.channel ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-2xl bg-black/30 px-3 py-2 text-xs font-bold text-muted-foreground"
              dir="ltr"
            >
              <TikTokIcon className="size-3.5 text-[#25f4ee]" />
              {chat.tiktok.channel}
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn(
              "h-9 gap-1.5 font-extrabold transition",
              chatToneMuted
                ? "border border-white/10 text-muted-foreground"
                : "border border-cyan-400/35 bg-gradient-to-r from-cyan-500/20 to-primary/15 text-cyan-50 shadow-[0_0_22px_-10px_rgba(34,211,238,0.75)]",
            )}
            onClick={toggleChatTone}
            title={chatToneMuted ? p.chatToneOn : p.chatToneOff}
            aria-label={chatToneMuted ? p.chatToneOn : p.chatToneOff}
          >
            {chatToneMuted ? (
              <VolumeX className="size-3.5" />
            ) : (
              <Volume2 className="size-3.5 text-cyan-300" />
            )}
            {chatToneMuted ? p.chatToneOffLabel : p.chatToneOnLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn(
              "h-9 gap-1.5 font-extrabold transition",
              splitView
                ? "border border-amber-400/40 bg-gradient-to-r from-amber-500/25 to-primary/15 text-amber-50 shadow-[0_0_24px_-10px_rgba(251,191,36,0.7)]"
                : "border border-white/10",
            )}
            onClick={() => setSplitView((v) => !v)}
          >
            <Columns2 className="size-3.5" />
            {splitView ? p.splitOff : p.splitOn}
          </Button>
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
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-amber-300">
              {analytics.wins.length}
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "glass h-[calc(100vh-9.5rem)] min-h-[30rem] overflow-hidden rounded-3xl border shadow-[0_0_60px_-28px_var(--neon)] transition-[border-color] duration-500",
          splitView ? "border-amber-400/25" : "border-primary/20",
        )}
      >
        {!splitView ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-black/40 via-primary/5 to-black/40 px-4 py-3 sm:px-6">
              <p className="text-sm font-extrabold">{p.comments}</p>
              <p className="text-xs font-bold text-muted-foreground tabular-nums">
                {latest.length} {p.visibleCount}
              </p>
            </div>
            <div
              ref={allBoxRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 [overflow-anchor:none] sm:px-5 sm:py-5 lg:px-8"
            >
              {renderMessages(
                latest,
                <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">
                  {p.waiting}
                </div>,
              )}
            </div>
          </div>
        ) : (
          <div className="grid h-full min-h-0 grid-cols-1 grid-rows-2 divide-y divide-white/10 lg:grid-cols-2 lg:grid-rows-1 lg:divide-x lg:divide-y-0 lg:divide-white/10">
            {/* In RTL, first grid cell is on the right = regular comments */}
            <section className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-l from-primary/10 via-black/30 to-black/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
                    <MessageSquareText className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-white">{p.regularChat}</p>
                    <p className="text-[11px] font-bold text-white/45">{p.regularChatHint}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-extrabold text-white/70 tabular-nums">
                  {regularFeed.length}
                </span>
              </div>
              <div
                ref={regularBoxRef}
                className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3 [overflow-anchor:none] sm:px-4"
              >
                {renderMessages(
                  regularFeed,
                  <div className="grid min-h-[30vh] place-items-center px-4 text-center text-sm text-muted-foreground">
                    {p.regularEmpty}
                  </div>,
                )}
              </div>
            </section>

            <section className="flex min-h-0 flex-col bg-gradient-to-b from-amber-500/[0.06] to-transparent">
              <div className="flex items-center justify-between gap-2 border-b border-amber-400/20 bg-gradient-to-l from-amber-500/15 via-amber-500/5 to-black/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-[0_8px_20px_-10px_rgba(251,191,36,0.9)]">
                    <Gift className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-amber-50">{p.supporterChat}</p>
                    <p className="text-[11px] font-bold text-amber-100/55">{p.supporterChatHint}</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-extrabold text-amber-100 tabular-nums">
                  {supporterFeed.length}
                </span>
              </div>
              <div
                ref={supportBoxRef}
                className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3 [overflow-anchor:none] sm:px-4"
              >
                {renderMessages(
                  supporterFeed,
                  <div className="grid min-h-[30vh] place-items-center px-4 text-center">
                    <div>
                      <Gift className="mx-auto size-9 text-amber-400/60" />
                      <p className="mt-3 text-sm font-bold text-muted-foreground">
                        {supporterEmptyText}
                      </p>
                    </div>
                  </div>,
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <ChatStatsDialog open={statsOpen} onOpenChange={setStatsOpen} />
      <ChatSupportersDialog open={supportersOpen} onOpenChange={setSupportersOpen} />
      <ChatProfanityDialog open={profanityOpen} onOpenChange={setProfanityOpen} />
    </div>
  );
}
