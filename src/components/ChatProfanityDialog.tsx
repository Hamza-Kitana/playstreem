import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { useChatAnalytics } from "@/contexts/ChatAnalyticsContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ChatProfanityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { messages: t, locale, dir } = useT();
  const p = t.pages.chat;
  const { profanityLog } = useChatAnalytics();

  const timeFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const offenders = useMemo(() => {
    const map = new Map<
      string,
      { user: string; color: string; count: number; lastText: string; lastAt: number }
    >();
    for (const row of profanityLog) {
      const key = row.user.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (row.at >= existing.lastAt) {
          existing.lastText = row.text;
          existing.lastAt = row.at;
          existing.user = row.user;
          existing.color = row.color;
        }
      } else {
        map.set(key, {
          user: row.user,
          color: row.color,
          count: 1,
          lastText: row.text,
          lastAt: row.at,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
  }, [profanityLog]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,720px)] max-w-lg overflow-hidden rounded-3xl border-rose-500/30 bg-background/95 p-0 shadow-[0_0_80px_-24px_rgba(244,63,94,0.55)] backdrop-blur-xl"
        dir={dir}
      >
        <DialogHeader className="border-b border-rose-500/20 bg-gradient-to-b from-rose-500/15 to-transparent px-6 py-5 pe-14 text-start">
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
            <ShieldAlert className="size-5 text-rose-400" />
            {p.profanityListTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {p.profanityListDesc}
          </DialogDescription>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-200">
              <ShieldAlert className="size-3.5" />
              {offenders.length} {p.profanityPeople}
            </span>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-11rem)] overflow-y-auto p-5">
          {offenders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{p.profanityEmpty}</p>
          ) : (
            <ul className="space-y-2.5">
              {offenders.map((row) => (
                <li
                  key={row.user.toLowerCase()}
                  className="rounded-2xl border border-rose-500/20 bg-rose-950/25 px-3.5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-extrabold"
                      style={{
                        color: row.color,
                        background: `color-mix(in oklab, ${row.color} 22%, transparent)`,
                        boxShadow: `0 0 18px -8px ${row.color}`,
                      }}
                    >
                      {row.user.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-base font-extrabold" style={{ color: row.color }}>
                          {row.user}
                        </p>
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-extrabold text-rose-300 tabular-nums">
                          {row.count}×
                        </span>
                        <span className="ms-auto text-[11px] font-bold text-muted-foreground tabular-nums">
                          {timeFmt.format(row.lastAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-rose-100/85">{row.lastText}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
