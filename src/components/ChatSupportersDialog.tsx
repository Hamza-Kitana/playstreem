import { Crown, Gift, Sparkles, Youtube } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { useChatAnalytics } from "@/contexts/ChatAnalyticsContext";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { formatSupportAmount } from "@/lib/chat-analytics-store";
import TikTokIcon from "@/components/TikTokIcon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const RANK_STYLE = [
  {
    ring: "border-amber-300/70",
    glow: "0 0 28px -8px rgba(251,191,36,0.85)",
    badge: "bg-gradient-to-br from-amber-200 to-amber-500 text-amber-950",
    row: "border-amber-400/35 bg-gradient-to-l from-amber-500/15 via-amber-500/5 to-transparent",
  },
  {
    ring: "border-slate-200/50",
    glow: "0 0 24px -10px rgba(226,232,240,0.55)",
    badge: "bg-gradient-to-br from-slate-100 to-slate-400 text-slate-900",
    row: "border-slate-300/25 bg-gradient-to-l from-slate-400/10 via-transparent to-transparent",
  },
  {
    ring: "border-orange-400/45",
    glow: "0 0 24px -10px rgba(251,146,60,0.55)",
    badge: "bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950",
    row: "border-orange-400/25 bg-gradient-to-l from-orange-500/10 via-transparent to-transparent",
  },
];

export default function ChatSupportersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { messages: t, locale, dir } = useT();
  const p = t.pages.chat;
  const { topSupporters, totalKicks, superChatTotals } = useChatAnalytics();
  const chat = useKickChatContext();
  const numLocale = locale === "ar" ? "ar" : "en";
  const kickOn = chat.kick.status === "live" || chat.kick.status === "connecting";
  const youtubeOn = chat.youtube.status === "live" || chat.youtube.status === "connecting";
  const tiktokOn = chat.tiktok.status === "live" || chat.tiktok.status === "connecting";
  const youtubeOnly = youtubeOn && !kickOn && !tiktokOn;
  const showKicks = totalKicks > 0 || kickOn || (!youtubeOn && !tiktokOn);
  const multi = [kickOn, youtubeOn, tiktokOn].filter(Boolean).length > 1;
  const desc = multi
    ? p.supportersDescBoth
    : youtubeOnly
      ? p.supportersDescYoutube
      : tiktokOn
        ? p.supportersDescBoth
        : p.supportersDesc;
  const emptyText = youtubeOnly ? p.supportersEmptyYoutube : p.supportersEmpty;
  const superChatEntries = Object.entries(superChatTotals).filter(([, v]) => v > 0);

  const timeFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const kicksFmt = new Intl.NumberFormat(locale === "ar" ? "ar" : "en");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,740px)] max-w-lg overflow-hidden rounded-3xl border-amber-400/35 bg-background/95 p-0 shadow-[0_0_90px_-20px_rgba(251,191,36,0.65)] backdrop-blur-xl"
        dir={dir}
      >
        <DialogHeader className="relative overflow-hidden border-b border-amber-400/20 bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent px-6 py-5 pe-14 text-start">
          <div
            className="pointer-events-none absolute -end-8 -top-10 size-40 rounded-full bg-amber-400/20 blur-3xl"
            aria-hidden
          />
          <DialogTitle className="relative flex items-center gap-2 text-xl font-extrabold">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-[0_8px_24px_-10px_rgba(251,191,36,0.9)]">
              <Gift className="size-5" />
            </span>
            {p.supportersTitle}
          </DialogTitle>
          <DialogDescription className="relative text-sm text-muted-foreground">
            {desc}
          </DialogDescription>
          <div className="relative mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-100">
              <Crown className="size-3.5 text-amber-300" />
              {topSupporters.length} {p.supportersPeople}
            </span>
            {showKicks ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-black/30 px-3 py-1 text-xs font-bold text-amber-100 tabular-nums">
                <Sparkles className="size-3.5 text-amber-300" />
                {kicksFmt.format(totalKicks)} {p.kicksUnit}
              </span>
            ) : null}
            {superChatEntries.map(([currency, value]) => (
              <span
                key={currency}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1 text-xs font-bold text-red-100 tabular-nums"
              >
                <Youtube className="size-3.5 text-red-400" />
                <span dir="ltr">{formatSupportAmount(currency, value, numLocale)}</span>
              </span>
            ))}
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-12rem)] overflow-y-auto p-5">
          {topSupporters.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-amber-400/25 bg-amber-500/5 px-4 py-12 text-center">
              <Gift className="mx-auto size-10 text-amber-400/70" />
              <p className="mt-3 text-sm font-bold text-muted-foreground">{emptyText}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {topSupporters.map((row, i) => {
                const style = RANK_STYLE[i];
                return (
                  <li
                    key={row.userKey}
                    className={cn(
                      "rounded-2xl border px-3.5 py-3 transition",
                      style?.row ?? "border-white/8 bg-black/25",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-full text-xs font-black",
                          style?.badge ?? "bg-white/10 text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-full border text-sm font-extrabold",
                          style?.ring ?? "border-white/10",
                        )}
                        style={{
                          color: row.color,
                          background: `color-mix(in oklab, ${row.color} 22%, transparent)`,
                          boxShadow: style?.glow,
                        }}
                      >
                        {row.user.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p
                            className="truncate text-base font-extrabold"
                            style={{ color: row.color }}
                          >
                            {row.user}
                          </p>
                          {i === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-200">
                              <Crown className="size-3" />
                              {p.topSupporter}
                            </span>
                          ) : null}
                          <span className="ms-auto text-[11px] font-bold text-muted-foreground tabular-nums">
                            {timeFmt.format(row.lastAt)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-bold">
                          {row.kicks > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-amber-200 tabular-nums">
                              <Gift className="size-3" />
                              {kicksFmt.format(row.kicks)} {p.kicksUnit}
                            </span>
                          ) : null}
                          {Object.entries(row.superChats ?? {}).map(([currency, value]) => (
                            <span
                              key={currency}
                              className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-red-200 tabular-nums"
                            >
                              <Youtube className="size-3" />
                              <span dir="ltr">
                                {formatSupportAmount(currency, value, numLocale)}
                              </span>
                            </span>
                          ))}
                          {row.memberships ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-emerald-200 tabular-nums">
                              <Crown className="size-3" />
                              {p.membershipsCount.replace("{n}", kicksFmt.format(row.memberships))}
                            </span>
                          ) : null}
                          {row.giftedMembers ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-emerald-200 tabular-nums">
                              <Gift className="size-3" />
                              {p.giftedMembersCount.replace(
                                "{n}",
                                kicksFmt.format(row.giftedMembers),
                              )}
                            </span>
                          ) : null}
                          {row.tiktokGifts ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#fe2c55]/20 px-2.5 py-0.5 text-rose-100 tabular-nums">
                              <TikTokIcon className="size-3" />
                              {p.tiktokGiftsCount.replace("{n}", kicksFmt.format(row.tiktokGifts))}
                              {row.tiktokDiamonds
                                ? ` · 💎${kicksFmt.format(row.tiktokDiamonds)}`
                                : ""}
                            </span>
                          ) : null}
                          <span className="text-muted-foreground tabular-nums">
                            {row.gifts} {p.giftEvents}
                          </span>
                          <span className="text-white/35">·</span>
                          <span className="text-amber-100/70 tabular-nums">
                            {p.lastGift}:{" "}
                            <span dir="ltr">
                              {row.lastLabel ?? `${kicksFmt.format(row.lastAmount)} ${p.kicksUnit}`}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
