import { useEffect, useMemo, useRef, useState } from "react";
import { Star, UserRound } from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import SessionControls from "@/components/games/SessionControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/Reveal";

export default function RateGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [name, setName] = useState("");
  const [ratings, setRatings] = useState<number[]>([]);
  const [history, setHistory] = useState<{ name: string; avg: number; count: number }[]>([]);
  const session = useGameSession(60);

  const ratingsRef = useRef(ratings);
  const nameRef = useRef(name);
  ratingsRef.current = ratings;
  nameRef.current = name;

  const avg = useMemo(
    () => (ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0),
    [ratings],
  );

  const pushHistory = () => {
    const current = ratingsRef.current;
    const label = nameRef.current.trim();
    if (!label || current.length === 0) return;
    const a = current.reduce((x, y) => x + y, 0) / current.length;
    setHistory((h) => [{ name: label, avg: a, count: current.length }, ...h].slice(0, 8));
  };

  useEffect(() => {
    session.setOnExpire(() => {
      pushHistory();
    });
  }, [session.setOnExpire]);

  useNewMessages(messages, session.running, (m) => {
    const who = participantKey(m);
    if (!who) return;
    if (session.hasParticipated(who)) return;
    const t = normalizeAr(m.text);
    const n = Number(t.split(" ")[0]);
    if (!Number.isFinite(n) || n < 0 || n > 10) return;
    if (!session.tryClaim(who)) return;
    setRatings((r) => [...r, Math.round(n)]);
  });

  const dist = useMemo(() => {
    const d = Array.from({ length: 11 }, () => 0);
    for (const r of ratings) d[r] = (d[r] ?? 0) + 1;
    return d;
  }, [ratings]);
  const maxD = Math.max(...dist, 1);

  const start = () => {
    if (!name.trim()) return;
    setRatings([]);
    session.start();
  };

  const stop = () => {
    pushHistory();
    session.stop();
  };

  const pct = (avg / 10) * 100;

  return (
    <GameCard id="rate" className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Star className="size-5 text-accent" />
          <h4 className="text-lg font-extrabold">تقييم شخص</h4>
        </div>

        <div className="relative flex-1">
          <UserRound className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الشخص المراد تقييمه"
            className="h-12 pr-10 text-base"
            disabled={session.running}
          />
        </div>

        <SessionControls
          running={session.running}
          chatActive={chatActive}
          durationSec={session.durationSec}
          left={session.left}
          participantCount={session.participantCount}
          canStart={Boolean(name.trim())}
          startLabel="بدء التقييم"
          stopLabel="إيقاف التقييم"
          hint="كل حساب يقيّم مرة واحدة فقط من ٠ إلى ١٠ — أول رقم يُحتسب والباقي يُتجاهل."
          onDurationChange={session.setDurationSec}
          onStart={start}
          onStop={stop}
        />

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 to-transparent p-6 text-center">
          <div className="absolute -bottom-14 left-1/2 size-56 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
          <p className="relative text-xs font-bold tracking-widest text-accent">
            {session.running ? "التقييم مفتوح" : "متوسط التقييم"}
          </p>
          <p className="relative mt-1 text-6xl font-extrabold tabular-nums">
            <span className="shimmer-text">{avg.toFixed(1)}</span>
          </p>
          <p className="relative text-sm text-muted-foreground">{ratings.length} تقييم</p>
          <div className="relative mx-auto mt-5 h-3 max-w-sm overflow-hidden rounded-full bg-background/60">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary via-chart-3 to-accent transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex h-28 items-end gap-1.5">
          {dist.map((count, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-primary/80 transition-[height] duration-500"
                style={{ height: `${(count / maxD) * 80}px` }}
              />
              <span className="text-[10px] text-muted-foreground">{i}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-secondary/40 p-5">
        <h4 className="mb-4 text-lg font-extrabold">سجل التقييمات</h4>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد تقييمات منتهية بعد.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h, i) => (
              <li
                key={`${h.name}-${i}`}
                className="animate-pop-in flex items-center justify-between rounded-xl bg-background/50 px-3 py-2"
              >
                <span className="font-bold">{h.name}</span>
                <span className="text-sm">
                  <span className="font-extrabold text-primary">{h.avg.toFixed(1)}</span>
                  <span className="text-muted-foreground"> / {h.count} صوت</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {history.length > 0 ? (
          <Button
            variant="ghost"
            className="mt-4 w-full"
            disabled={session.running}
            onClick={() => setHistory([])}
          >
            مسح السجل
          </Button>
        ) : null}
      </div>
    </GameCard>
  );
}
