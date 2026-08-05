import { useEffect, useRef, useState } from "react";
import { Crown, Flag, Play, RotateCcw, Square, Trophy } from "lucide-react";
import type { ChatMessage } from "@/hooks/useKickChat";
import { DURATION_OPTIONS, formatClock, useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FLAG_BANK,
  flagImageUrl,
  shuffleFlags,
  type FlagItem,
} from "@/lib/flags";
import { cn } from "@/lib/utils";

type Winner = { user: string; answer: string; color: string };

function answersMatch(guess: string, flag: FlagItem) {
  if (!guess) return false;
  const keys = [flag.name, ...(flag.aliases ?? [])].map((x) => normalizeAr(x)).filter(Boolean);
  return keys.some((key) => {
    if (!key) return false;
    if (guess === key) return true;
    if (key.length >= 3 && guess.includes(key)) return true;
    if (guess.length >= 3 && key.includes(guess)) return true;
    return false;
  });
}

export default function FlagGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [deck, setDeck] = useState<FlagItem[]>(() => shuffleFlags(FLAG_BANK));
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreColors, setScoreColors] = useState<Record<string, string>>({});
  const [winner, setWinner] = useState<Winner | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [imgOk, setImgOk] = useState(true);
  const session = useGameSession(45);
  const settled = useRef(false);

  const current = finished ? undefined : deck[index];
  const hasNext = index < deck.length - 1;
  const urgent = session.left != null && session.left <= 10;

  useEffect(() => {
    setImgOk(true);
  }, [current?.code]);

  useEffect(() => {
    if (session.running) settled.current = false;
  }, [session.running]);

  useNewMessages(messages, session.running && !finished, (m) => {
    if (!current || settled.current) return;
    if (session.hasParticipated(m.user)) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    if (!session.tryClaim(m.user)) return;
    setAttempts((n) => n + 1);
    if (!answersMatch(text, current)) return;
    settled.current = true;
    setWinner({ user: m.user, answer: m.text, color: m.color });
    setWinnerOpen(true);
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    setScoreColors((c) => ({ ...c, [m.user]: m.color }));
    session.stop();
  });

  const showFinal = () => {
    session.stop();
    setFinished(true);
    setWinnerOpen(false);
    setWinner(null);
    setFinalOpen(true);
  };

  const goNext = (andStart: boolean) => {
    if (!hasNext) {
      showFinal();
      return;
    }
    const resume = andStart || session.running;
    session.stop();
    setIndex((i) => i + 1);
    settled.current = false;
    setWinner(null);
    setWinnerOpen(false);
    setAttempts(0);
    session.clearParticipants();
    // Next flag during a live round keeps guessing on and resets the countdown.
    if (resume) window.setTimeout(() => session.start(), 0);
  };

  const start = () => {
    if (!current || finished) return;
    settled.current = false;
    setWinner(null);
    setWinnerOpen(false);
    setAttempts(0);
    session.start();
  };

  const restartAll = () => {
    session.stop();
    setDeck(shuffleFlags(FLAG_BANK));
    setIndex(0);
    setScores({});
    setScoreColors({});
    setWinner(null);
    setWinnerOpen(false);
    setFinished(false);
    setFinalOpen(false);
    setAttempts(0);
    settled.current = false;
  };

  const ranking = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = ranking.slice(0, 6);
  const champion = ranking[0];

  const clockLabel = session.running
    ? session.left == null
      ? "∞"
      : formatClock(session.left)
    : formatClock(session.durationSec > 0 ? session.durationSec : 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="glass rounded-3xl border border-primary/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[9rem] flex-1">
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">مدة الجولة</label>
            <select
              value={session.durationSec}
              disabled={session.running || finished}
              onChange={(e) => session.setDurationSec(Number(e.target.value))}
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm font-bold"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {finished ? (
            <Button className="h-11 font-extrabold" onClick={restartAll}>
              <RotateCcw className="size-4" /> جولة جديدة (٢٠ علم)
            </Button>
          ) : session.running ? (
            <Button variant="destructive" className="h-11 font-extrabold" onClick={() => session.stop()}>
              <Square className="size-4" /> إيقاف
            </Button>
          ) : (
            <Button className="h-11 font-extrabold" disabled={!chatActive || !current} onClick={start}>
              <Play className="size-4" /> بدء
            </Button>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          شاشة تعرض العلم — الجمهور يكتب اسم الدولة في الشات. أول جواب صحيح يفوز بالنقطة. فيه {FLAG_BANK.length} علم
          (سهلة وصعبة)، بدون تكرار لين تخلص.
        </p>
        {!chatActive ? (
          <p className="mt-1 text-[11px] font-bold text-destructive">اربط كيك قبل البدء.</p>
        ) : null}
      </div>

      <div className="glass overflow-hidden rounded-[1.75rem] border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Flag className="size-4 text-primary" />
            <span className="text-sm font-extrabold">اعرف العلم</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {finished ? "انتهت" : `علم ${index + 1} / ${deck.length}`}
            {current?.hard ? " · صعب" : ""}
          </span>
        </div>

        {finished ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Trophy className="size-12 text-primary" />
            <h2 className="mt-4 text-3xl font-extrabold">انتهت الجولة</h2>
            <p className="mt-2 text-sm text-muted-foreground">خلصت الـ {deck.length} علم</p>
            {champion ? (
              <p className="mt-6 font-brand text-4xl font-bold" style={{ color: scoreColors[champion[0]] }}>
                {champion[0]}
                <span className="ms-2 text-lg text-primary">({champion[1]})</span>
              </p>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">ما في نقاط.</p>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <Button className="font-extrabold" onClick={() => setFinalOpen(true)}>
                النتيجة
              </Button>
              <Button variant="outline" className="font-bold" onClick={restartAll}>
                من جديد
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "border-b border-white/10 px-4 py-5 text-center",
                session.running ? (urgent ? "bg-destructive/15" : "bg-primary/10") : "",
              )}
            >
              <p className="text-[10px] font-bold tracking-[0.28em] text-muted-foreground uppercase">العداد</p>
              <p
                className={cn(
                  "mt-1 font-brand text-5xl font-bold tabular-nums sm:text-6xl",
                  session.running
                    ? urgent
                      ? "text-destructive"
                      : "shimmer-text"
                    : "text-foreground/70",
                )}
              >
                {clockLabel}
              </p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {session.running
                  ? `محاولات ${attempts} · مشاركون ${session.participantCount}`
                  : "اضغط بدء عشان الجمهور يجيب"}
              </p>
            </div>

            <div className="relative grid place-items-center bg-gradient-to-b from-[#0e1715] to-[#0a1210] px-4 py-8 sm:py-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,color-mix(in_oklab,var(--neon)_14%,transparent),transparent_70%)]" />
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-black/40 shadow-[0_20px_60px_-24px_black]",
                  session.running ? "border-primary/50" : "border-white/10",
                )}
              >
                {current && imgOk ? (
                  <img
                    src={flagImageUrl(current.code, 640)}
                    alt="علم الدولة"
                    className="block h-auto max-h-[min(42vh,280px)] w-[min(92vw,34rem)] object-cover"
                    onError={() => setImgOk(false)}
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="grid h-48 w-[min(92vw,34rem)] place-items-center text-sm text-muted-foreground">
                    تعذّر تحميل العلم
                  </div>
                )}
              </div>
              <p className="relative mt-6 text-sm font-bold text-muted-foreground">
                اكتبوا اسم الدولة في الشات
              </p>
              {!session.running ? (
                <p className="relative mt-2 text-[11px] text-muted-foreground/80">
                  الإجابة الصحيحة مخفية عن الشاشة — بس الشات يقدر يخمّن
                </p>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                className="relative mt-6 font-bold"
                onClick={() => goNext(false)}
                disabled={finished}
              >
                <RotateCcw className="size-3.5" />
                {hasNext
                  ? session.running
                    ? "العلم التالي (إعادة العداد)"
                    : "العلم التالي"
                  : "إنهاء وإظهار النتيجة"}
              </Button>
            </div>
          </>
        )}

        <div className="border-t border-white/10 bg-black/35 px-3 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="size-3.5 text-accent" />
            <span className="text-xs font-extrabold">المتصدرين</span>
          </div>
          {top.length === 0 ? (
            <p className="text-center text-[11px] text-muted-foreground">الفائزون يظهرون هنا</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {top.map(([user, pts], i) => (
                <span
                  key={user}
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] font-bold"
                >
                  <span className={i === 0 ? "text-primary" : "text-muted-foreground"}>{i + 1}</span>
                  {user}
                  <span className="text-primary">{pts}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={winnerOpen && Boolean(winner) && !finished}
        onOpenChange={(open) => {
          setWinnerOpen(open);
          if (!open) setWinner(null);
        }}
      >
        <DialogContent className="max-w-sm border-primary/40 bg-[#0c1513] sm:rounded-2xl" dir="rtl">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Crown className="size-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold">عرف العلم!</DialogTitle>
            <DialogDescription>
              الدولة: <span className="font-bold text-foreground">{current?.name}</span>
            </DialogDescription>
          </DialogHeader>
          {winner ? (
            <p
              className="animate-pop-in py-2 text-center font-brand text-4xl font-bold"
              style={{ color: winner.color }}
            >
              {winner.user}
            </p>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            {hasNext ? (
              <>
                <Button
                  className="w-full font-extrabold"
                  onClick={() => {
                    setWinnerOpen(false);
                    goNext(true);
                  }}
                >
                  العلم التالي وابدأ
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-bold"
                  onClick={() => {
                    setWinnerOpen(false);
                    goNext(false);
                  }}
                >
                  العلم التالي فقط
                </Button>
              </>
            ) : (
              <Button
                className="w-full font-extrabold"
                onClick={() => {
                  setWinnerOpen(false);
                  showFinal();
                }}
              >
                النتيجة النهائية
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finalOpen} onOpenChange={setFinalOpen}>
        <DialogContent className="max-w-md border-primary/40 bg-[#0c1513] sm:rounded-2xl" dir="rtl">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Trophy className="size-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold">النتيجة النهائية</DialogTitle>
            <DialogDescription>بعد {deck.length} علم</DialogDescription>
          </DialogHeader>
          {champion ? (
            <p className="text-center font-brand text-4xl font-bold" style={{ color: scoreColors[champion[0]] }}>
              {champion[0]}
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">ما انحسبت نقاط.</p>
          )}
          {ranking.length > 0 ? (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3">
              {ranking.map(([user, pts], i) => (
                <div key={user} className="flex items-center justify-between text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <span className={i === 0 ? "text-primary" : "text-muted-foreground"}>{i + 1}</span>
                    <span style={{ color: scoreColors[user] }}>{user}</span>
                  </span>
                  <span className="text-primary tabular-nums">{pts}</span>
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button className="w-full font-extrabold" onClick={() => setFinalOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
