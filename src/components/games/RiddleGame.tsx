import { useEffect, useRef, useState } from "react";
import { Crown, Eye, EyeOff, Lightbulb, Play, Puzzle, RotateCcw, Square, Trophy } from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
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
import { pickRiddleRound, riddleMatches, RIDDLE_BANK, RIDDLE_ROUND, type Riddle } from "@/lib/riddles";
import { cn } from "@/lib/utils";

type Winner = { user: string; answer: string; color: string };

export default function RiddleGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [deck, setDeck] = useState<Riddle[]>(() => pickRiddleRound());
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreColors, setScoreColors] = useState<Record<string, string>>({});
  const [winner, setWinner] = useState<Winner | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [hintOn, setHintOn] = useState(false);
  const [peekAnswer, setPeekAnswer] = useState(false);
  const session = useGameSession(120);
  const settled = useRef(false);

  const current = finished ? undefined : deck[index];
  const hasNext = index < deck.length - 1;
  const urgent = session.left != null && session.left <= 15;

  useEffect(() => {
    setHintOn(false);
    setPeekAnswer(false);
  }, [current?.id]);

  useEffect(() => {
    if (session.running) settled.current = false;
  }, [session.running]);

  useNewMessages(messages, session.running && !finished, (m) => {
    if (!current || settled.current) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    setAttempts((n) => n + 1);
    if (!riddleMatches(m.text, current, normalizeAr)) return;
    const who = participantKey(m);
    if (!who) return;
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
    setDeck(pickRiddleRound());
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
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">مدة اللغز</label>
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
              <RotateCcw className="size-4" /> جولة جديدة ({RIDDLE_ROUND} ألغاز)
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
          ألغاز تحتاج تفكير — الحل ما يظهر على الشاشة. الجمهور يخمن في الشات، وأول جواب صحيح يفوز. فيه {RIDDLE_BANK.length}{" "}
          لغز، والجولة {RIDDLE_ROUND} بدون تكرار. تقدر تفتح تلميح أو تشوف الحل أنت بس.
        </p>
        {!chatActive ? (
          <p className="mt-1 text-[11px] font-bold text-destructive">اربط كيك قبل البدء.</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-amber-500/20 bg-[#0b100e] shadow-[0_24px_80px_-32px_black]">
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-l from-amber-500/10 to-transparent px-4 py-3">
          <div className="flex items-center gap-2">
            <Puzzle className="size-4 text-amber-300" />
            <span className="text-sm font-extrabold">غرفة الألغاز</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {finished ? "انتهت" : `لغز ${index + 1} / ${deck.length}`}
          </span>
        </div>

        {finished ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Trophy className="size-12 text-amber-300" />
            <h2 className="mt-4 text-3xl font-extrabold">انتهت الجولة</h2>
            <p className="mt-2 text-sm text-muted-foreground">خلصت الـ {deck.length} ألغاز</p>
            {champion ? (
              <p className="mt-6 font-brand text-4xl font-bold" style={{ color: scoreColors[champion[0]] }}>
                {champion[0]}
                <span className="ms-2 text-lg text-amber-300">({champion[1]})</span>
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
                "border-b border-white/10 px-4 py-4 text-center",
                session.running ? (urgent ? "bg-destructive/15" : "bg-amber-500/10") : "",
              )}
            >
              <p className="text-[10px] font-bold tracking-[0.28em] text-muted-foreground uppercase">العداد</p>
              <p
                className={cn(
                  "mt-1 font-brand text-5xl font-bold tabular-nums sm:text-6xl",
                  session.running ? (urgent ? "text-destructive" : "text-amber-200") : "text-foreground/70",
                )}
              >
                {clockLabel}
              </p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {session.running ? `تخمينات ${attempts}` : "اضغط بدء عشان الجمهور يفكر"}
              </p>
            </div>

            <div className="relative px-4 py-8 sm:px-8 sm:py-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_20%,rgba(251,191,36,0.12),transparent_70%)]" />
              <div
                className={cn(
                  "relative mx-auto max-w-xl rounded-[1.6rem] border px-5 py-8 sm:px-8 sm:py-10",
                  session.running ? "border-amber-400/40 bg-black/35" : "border-white/10 bg-black/25",
                )}
              >
                <p className="text-center text-[11px] font-extrabold tracking-[0.35em] text-amber-200/80">
                  {current?.category}
                </p>
                <div className="mx-auto mt-4 mb-6 h-px w-24 bg-gradient-to-l from-transparent via-amber-400/70 to-transparent" />
                <div className="space-y-3 text-center">
                  {current?.lines.map((line) => (
                    <p key={line} className="text-xl font-extrabold leading-relaxed text-white sm:text-2xl">
                      {line}
                    </p>
                  ))}
                </div>
                {hintOn && current ? (
                  <p className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-center text-sm font-bold text-amber-100">
                    تلميح: {current.hint}
                  </p>
                ) : null}
                {peekAnswer && current ? (
                  <p className="mt-3 text-center text-xs font-bold text-muted-foreground">
                    الحل (لك أنت): <span className="text-primary">{current.answer}</span>
                  </p>
                ) : null}
              </div>

              <p className="relative mt-6 text-center text-sm font-bold text-muted-foreground">
                اكتبوا الحل في الشات — أول إصابة تفوز
              </p>

              <div className="relative mt-5 flex flex-wrap justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="font-bold"
                  onClick={() => setHintOn((v) => !v)}
                  disabled={!current}
                >
                  <Lightbulb className="size-3.5" />
                  {hintOn ? "إخفاء التلميح" : "تلميح"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-bold"
                  onClick={() => setPeekAnswer((v) => !v)}
                  disabled={!current}
                >
                  {peekAnswer ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {peekAnswer ? "خبّئ الحل" : "الحل (ستريمر)"}
                </Button>
                <Button variant="secondary" size="sm" className="font-bold" onClick={() => goNext(false)} disabled={finished}>
                  <RotateCcw className="size-3.5" />
                  {hasNext ? (session.running ? "اللغز التالي (إعادة العداد)" : "اللغز التالي") : "إنهاء وإظهار النتيجة"}
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="border-t border-white/10 bg-black/35 px-3 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="size-3.5 text-amber-300" />
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
                  <span className={i === 0 ? "text-amber-300" : "text-muted-foreground"}>{i + 1}</span>
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
        <DialogContent className="max-w-sm border-amber-400/30 bg-[#0c1513] sm:rounded-2xl" dir="rtl">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
              <Crown className="size-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold">فكّ اللغز!</DialogTitle>
            <DialogDescription>
              الحل: <span className="font-bold text-foreground">{current?.answer}</span>
            </DialogDescription>
          </DialogHeader>
          {winner ? (
            <p className="animate-pop-in py-2 text-center font-brand text-4xl font-bold" style={{ color: winner.color }}>
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
                  اللغز التالي وابدأ
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-bold"
                  onClick={() => {
                    setWinnerOpen(false);
                    goNext(false);
                  }}
                >
                  اللغز التالي فقط
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
        <DialogContent className="max-w-md border-amber-400/30 bg-[#0c1513] sm:rounded-2xl" dir="rtl">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
              <Trophy className="size-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold">النتيجة النهائية</DialogTitle>
            <DialogDescription>بعد {deck.length} ألغاز</DialogDescription>
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
                    <span className={i === 0 ? "text-amber-300" : "text-muted-foreground"}>{i + 1}</span>
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
