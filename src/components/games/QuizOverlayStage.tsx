import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Play, RotateCcw, Square, Trophy } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { formatClock, useGameSession } from "@/hooks/useGameSession";
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
import { loadQuizPack, saveQuizPack, type QuizQuestion } from "@/lib/quiz-pack";
import { cn } from "@/lib/utils";

type Winner = { user: string; answer: string; color: string };

type RoundReveal = {
  reason: "winner" | "timeout" | "stopped";
  winner: Winner | null;
  correctAnswer: string;
};

function answersMatch(guess: string, answerKey: string) {
  if (!guess || !answerKey) return false;
  if (guess === answerKey) return true;
  if (guess.split(" ").includes(answerKey)) return true;
  if (answerKey.length >= 2 && guess.includes(answerKey)) return true;
  return false;
}

export default function QuizOverlayStage({
  messages: chatMessages,
  chatActive,
  variant = "page",
}: {
  messages: ChatMessage[];
  chatActive: boolean;
  variant?: "page" | "modal";
}) {
  const { messages, dir } = useT();
  const c = messages.common;
  const isModal = variant === "modal";
  const initial = loadQuizPack();
  const [list, setList] = useState<QuizQuestion[]>(initial.questions);
  const [index, setIndex] = useState(Math.min(initial.index, Math.max(initial.questions.length - 1, 0)));
  const [durationSec, setDurationSec] = useState(initial.durationSec);
  const [reveal, setReveal] = useState<RoundReveal | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreColors, setScoreColors] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const session = useGameSession(initial.durationSec);
  const settled = useRef(false);
  const autoStartedFor = useRef<number | null>(null);

  useEffect(() => {
    session.setDurationSec(durationSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSec]);

  useEffect(() => {
    const sync = () => {
      const pack = loadQuizPack();
      setList(pack.questions);
      setDurationSec(pack.durationSec);
      setIndex((i) => Math.min(i, Math.max(pack.questions.length - 1, 0)));
      setFinished(false);
      autoStartedFor.current = null;
    };
    window.addEventListener("storage", sync);
    window.addEventListener("al-daboor-quiz-pack", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("al-daboor-quiz-pack", sync);
    };
  }, []);

  const current = finished ? undefined : list[index];
  const currentRef = useRef(current);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const endRound = (reason: RoundReveal["reason"], win?: Winner) => {
    if (settled.current || finished) return;
    const q = currentRef.current;
    if (!q) return;
    settled.current = true;
    session.stop();
    setReveal({
      reason,
      winner: win ?? null,
      correctAnswer: q.a,
    });
  };
  const hasNext = index < list.length - 1;
  const upcoming = hasNext ? list[index + 1] : null;
  const answerKey = useMemo(() => normalizeAr(current?.a ?? ""), [current]);
  const urgent = session.left != null && session.left <= 10;

  useEffect(() => {
    if (session.running) settled.current = false;
  }, [session.running]);

  useEffect(() => {
    session.setOnExpire(() => {
      endRound("timeout");
    });
    return () => session.setOnExpire(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.setOnExpire, finished, index]);

  /** Begin accepting chat answers as soon as a fresh question is ready. */
  useEffect(() => {
    if (!chatActive || finished || reveal || !current) return;
    if (session.running) {
      autoStartedFor.current = index;
      return;
    }
    if (autoStartedFor.current === index) return;
    autoStartedFor.current = index;
    settled.current = false;
    setAttempts(0);
    session.clearParticipants();
    session.start(durationSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, chatActive, finished, reveal, current, durationSec]);

  useNewMessages(chatMessages, session.running && !finished && !reveal, (m) => {
    const who = participantKey(m);
    if (!answerKey || settled.current || !who) return;
    if (session.hasParticipated(who)) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    if (!session.tryClaim(who)) return;
    setAttempts((n) => n + 1);
    if (!answersMatch(text, answerKey)) return;
    const win = { user: m.user, answer: m.text, color: m.color };
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    setScoreColors((col) => ({ ...col, [m.user]: m.color }));
    endRound("winner", win);
  });

  const persistIndex = (nextIndex: number) => {
    const pack = loadQuizPack();
    saveQuizPack({ ...pack, index: nextIndex, questions: list, durationSec });
  };

  const showFinal = () => {
    session.stop();
    setFinished(true);
    setReveal(null);
    setFinalOpen(true);
  };

  const prepareQuestion = (nextIndex: number) => {
    if (nextIndex >= list.length) {
      showFinal();
      return;
    }
    setIndex(nextIndex);
    persistIndex(nextIndex);
    settled.current = false;
    setReveal(null);
    setAttempts(0);
    session.clearParticipants();
    autoStartedFor.current = null;
  };

  const start = () => {
    if (!current || finished || reveal) return;
    settled.current = false;
    setReveal(null);
    setAttempts(0);
    autoStartedFor.current = index;
    session.start(durationSec);
  };

  const next = () => {
    if (finished) return;
    if (!hasNext) {
      showFinal();
      return;
    }
    prepareQuestion(index + 1);
  };

  const nextAndStart = () => {
    if (finished) return;
    if (!hasNext) {
      showFinal();
      return;
    }
    prepareQuestion(index + 1);
  };

  const ranking = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = ranking.slice(0, 6);
  const champion = ranking[0];

  const clockLabel = session.running
    ? session.left == null
      ? "∞"
      : formatClock(session.left)
    : formatClock(durationSec > 0 ? durationSec : 0);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-primary/25 bg-gradient-to-b from-[#161029] to-[#0a0817] text-foreground",
        isModal ? "max-h-[92vh]" : "h-full",
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/35 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-primary uppercase">
            {list.length ? `${index + 1} / ${list.length}` : "—"}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-extrabold",
              finished
                ? "bg-primary/20 text-primary"
                : reveal
                  ? "bg-amber-500/25 text-amber-200"
                  : session.running
                    ? "bg-destructive text-white"
                    : "bg-white/10 text-muted-foreground",
            )}
          >
            {finished ? "END" : reveal ? "ANSWER" : session.running ? "LIVE" : "READY"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!reveal && !finished ? (
            <span
              className={cn(
                "font-brand text-2xl font-black tabular-nums sm:text-3xl",
                urgent && session.running ? "text-destructive" : "text-white",
              )}
            >
              {clockLabel}
            </span>
          ) : null}

          {finished ? (
            <Button className="h-10 font-extrabold" onClick={() => setFinalOpen(true)}>
              <Trophy className="size-4" /> {c.finalResult}
            </Button>
          ) : reveal ? (
            <Button
              className="h-11 gap-2 rounded-xl px-5 text-sm font-extrabold shadow-[0_0_28px_-8px_var(--neon)]"
              onClick={() => {
                if (!hasNext) {
                  showFinal();
                  return;
                }
                nextAndStart();
              }}
            >
              <Play className="size-4 fill-current" />
              {hasNext ? c.questionNextStart : c.finalResult}
            </Button>
          ) : session.running ? (
            <Button
              variant="destructive"
              className="h-10 gap-1.5 font-extrabold"
              onClick={() => endRound("stopped")}
            >
              <Square className="size-3.5" /> {c.stop}
            </Button>
          ) : (
            <Button
              className="h-10 gap-1.5 font-extrabold"
              disabled={!chatActive || !current}
              onClick={start}
            >
              <Play className="size-3.5 fill-current" /> {c.startBtn}
            </Button>
          )}
        </div>
      </header>

      {!chatActive ? (
        <p className="shrink-0 bg-destructive/15 px-3 py-2 text-center text-xs font-bold text-destructive">
          {c.connectKick}
        </p>
      ) : null}

      {finished ? (
        <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
          <Trophy className="size-12 text-primary" />
          <h1 className="mt-4 text-3xl font-extrabold">انتهت الأسئلة</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            خلصت الـ {list.length} سؤال — هذي النتيجة النهائية.
          </p>
          {champion ? (
            <p className="mt-6 font-brand text-4xl font-bold" style={{ color: scoreColors[champion[0]] }}>
              {champion[0]}
              <span className="ms-2 text-lg text-primary">({champion[1]})</span>
            </p>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">ما في نقاط بهالجولة.</p>
          )}
          <Button className="mt-8 font-extrabold" onClick={() => setFinalOpen(true)}>
            عرض الترتيب الكامل
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-4 text-center sm:px-6",
              isModal ? "py-6" : "py-5",
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_20%,color-mix(in_oklab,var(--neon)_14%,transparent),transparent_70%)]" />

            {reveal ? (
              <div className="relative mx-auto w-full max-w-xl animate-pop-in space-y-5 rounded-3xl border border-white/10 bg-black/35 p-6 sm:p-8">
                <p className="text-xs font-extrabold tracking-[0.28em] text-amber-200/80 uppercase">
                  {c.questionEnded}
                </p>
                <p className="text-sm font-bold text-muted-foreground">
                  {reveal.reason === "winner"
                    ? c.firstCorrect
                    : reveal.reason === "timeout"
                      ? c.timeoutNoCorrect
                      : c.stoppedManualQ}
                </p>

                {reveal.winner ? (
                  <div className="space-y-2">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                      <Crown className="size-7" />
                    </div>
                    <p
                      className="font-brand text-3xl font-extrabold sm:text-4xl"
                      style={{ color: reveal.winner.color }}
                    >
                      {reveal.winner.user}
                    </p>
                    <p className="text-sm text-muted-foreground">كتب: {reveal.winner.answer}</p>
                  </div>
                ) : (
                  <p className="text-lg font-extrabold text-amber-200/90">
                    {reveal.reason === "timeout" ? c.timeUp : c.noCorrectAnswer}
                  </p>
                )}

                <div className="rounded-2xl border border-primary/35 bg-primary/10 px-5 py-5 shadow-[0_0_40px_-12px_var(--neon)]">
                  <p className="text-[11px] font-extrabold tracking-[0.28em] text-primary uppercase">
                    الإجابة الصحيحة
                  </p>
                  <p className="mt-3 text-balance text-3xl font-extrabold leading-snug text-foreground sm:text-4xl">
                    {reveal.correctAnswer}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  السؤال كان: <span className="font-bold text-foreground/90">{current?.q}</span>
                </p>

                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
                  <Button
                    className="h-12 min-w-[12rem] gap-2 rounded-2xl font-extrabold"
                    onClick={() => {
                      if (!hasNext) {
                        showFinal();
                        return;
                      }
                      nextAndStart();
                    }}
                  >
                    <Play className="size-4 fill-current" />
                    {hasNext ? c.questionNextStart : c.finalResult}
                  </Button>
                  {hasNext ? (
                    <Button variant="outline" className="h-12 rounded-2xl font-bold" onClick={next}>
                      {c.next}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <p className="relative text-[11px] font-extrabold tracking-[0.28em] text-primary">
                  سؤال {list.length ? index + 1 : 0} / {list.length}
                </p>
                <h1 className="relative mt-4 text-balance text-3xl font-extrabold leading-snug sm:text-4xl lg:text-5xl">
                  {current?.q ?? c.noQuestion}
                </h1>
                <p className="relative mt-4 text-base text-muted-foreground sm:text-lg">
                  {session.running
                    ? `${c.firstCorrect} · ${attempts} محاولة · ${session.participantCount} مشارك`
                    : c.broadcastReady}
                </p>
                {!session.running ? (
                  <Button
                    className="relative mx-auto mt-8 h-12 gap-2 rounded-2xl px-6 font-extrabold"
                    disabled={!chatActive || !current}
                    onClick={start}
                  >
                    <Play className="size-4 fill-current" /> {c.startBtn}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="relative mx-auto mt-8 font-bold"
                    onClick={next}
                    disabled={list.length < 1}
                  >
                    <RotateCcw className="size-3.5" /> {hasNext ? c.questionNext : c.finishShowResult}
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-dashed border-white/12 bg-black/30 px-4 py-3 text-center sm:py-3.5">
            <p className="text-xs font-bold tracking-[0.22em] text-muted-foreground uppercase">التالي</p>
            <p className="mt-1 text-base font-extrabold sm:text-lg">
              {upcoming?.q ?? "— آخر سؤال / النتيجة —"}
            </p>
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-white/10 bg-black/40 px-3 py-2.5 sm:py-3">
        <div className="mb-2 flex items-center gap-2">
          <Trophy className="size-4 text-accent" />
          <span className="text-sm font-extrabold sm:text-base">المتصدرين</span>
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

      <Dialog open={finalOpen} onOpenChange={setFinalOpen}>
        <DialogContent className="max-w-md border-primary/40 bg-[#0c1513] sm:rounded-2xl" dir={dir}>
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Trophy className="size-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold">{c.finalResult}</DialogTitle>
            <DialogDescription>بعد {list.length} سؤال — بدون إعادة للأسئلة</DialogDescription>
          </DialogHeader>
          {champion ? (
            <div className="text-center">
              <p className="text-xs font-bold text-muted-foreground">المتصدّر</p>
              <p
                className="mt-1 font-brand text-4xl font-bold"
                style={{ color: scoreColors[champion[0]] }}
              >
                {champion[0]}
              </p>
              <p className="mt-1 text-sm font-extrabold text-primary">{champion[1]} نقطة</p>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">ما انحسبت نقاط بهالجلسة.</p>
          )}
          {ranking.length > 0 ? (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3">
              {ranking.map(([user, pts], i) => (
                <div key={user} className="flex items-center justify-between gap-2 text-sm font-bold">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={i === 0 ? "text-primary" : "text-muted-foreground"}>{i + 1}</span>
                    <span className="truncate" style={{ color: scoreColors[user] }}>
                      {user}
                    </span>
                  </span>
                  <span className="tabular-nums text-primary">{pts}</span>
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button className="w-full font-extrabold" onClick={() => setFinalOpen(false)}>
              {c.ok}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
