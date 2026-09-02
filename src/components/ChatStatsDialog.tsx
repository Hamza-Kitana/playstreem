import { Crown, MessageCircle, Trophy, Users } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { useChatAnalytics } from "@/contexts/ChatAnalyticsContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MEDAL = ["text-amber-400", "text-slate-300", "text-amber-700"];

export default function ChatStatsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { messages: t, locale } = useT();
  const p = t.pages.chat;
  const { topChatters, wins, totalMessages, uniqueChatters } = useChatAnalytics();

  const timeFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] max-w-xl overflow-hidden rounded-3xl border-primary/25 bg-background/95 p-0 shadow-[0_0_80px_-24px_var(--neon)] backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 bg-gradient-to-b from-primary/15 to-transparent px-6 py-5 text-start">
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
            <Trophy className="size-5 text-primary" />
            {p.statsTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {p.statsDesc}
          </DialogDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold">
              <MessageCircle className="size-3.5 text-primary" />
              {totalMessages} {p.messagesCount}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold">
              <Users className="size-3.5 text-primary" />
              {uniqueChatters} {p.chattersCount}
            </span>
          </div>
        </DialogHeader>

        <div className="grid max-h-[calc(90vh-11rem)] gap-0 overflow-y-auto sm:grid-cols-2">
          <section className="border-b border-white/10 p-5 sm:border-b-0 sm:border-e">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-primary">
              <MessageCircle className="size-4" />
              {p.topChatters}
            </h3>
            {topChatters.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{p.noData}</p>
            ) : (
              <ul className="space-y-2">
                {topChatters.slice(0, 12).map((row, i) => (
                  <li
                    key={row.userKey}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/25 px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-black",
                        i < 3 ? MEDAL[i] : "text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-extrabold"
                      style={{
                        color: row.color,
                        background: `color-mix(in oklab, ${row.color} 20%, transparent)`,
                      }}
                    >
                      {row.user.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold" style={{ color: row.color }}>
                        {row.user}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-extrabold text-primary tabular-nums">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-primary">
              <Crown className="size-4" />
              {p.winners}
            </h3>
            {wins.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{p.noWinners}</p>
            ) : (
              <ul className="space-y-2">
                {[...wins].reverse().slice(0, 12).map((row) => (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Crown className="size-4 shrink-0 text-amber-400" />
                      <span className="truncate text-sm font-extrabold" style={{ color: row.color }}>
                        {row.user}
                      </span>
                      <span className="ms-auto shrink-0 text-[10px] font-bold text-muted-foreground tabular-nums">
                        {timeFmt.format(row.at)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-amber-200/80">{row.game}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
