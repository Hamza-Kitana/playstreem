import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Play, RotateCcw, Square, Trophy } from "lucide-react";
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

function answersMatch(guess: string, answerKey: string) {
  if (!guess || !answerKey) return false;
  if (guess === answerKey) return true;
  if (guess.split(" ").includes(answerKey)) return true;
  if (answerKey.length >= 2 && guess.includes(answerKey)) return true;
  return false;
}

export default function QuizOverlayStage({
  messages,
  chatActive,
  variant = "page",
}: {
  messages: ChatMessage[];
  chatActive: boolean;
  variant?: "page" | "modal";
}) {
  const isModal = variant === "modal";
  const initial = loadQuizPack();
  const [list, setList] = useState<QuizQuestion[]>(initial.questions);
  const [index, setIndex] = useState(Math.min(initial.index, Math.max(initial.questions.length - 1, 0)));
  const [durationSec, setDurationSec] = useState(initial.durationSec);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreColors, setScoreColors] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const session = useGameSession(initial.durationSec);
  const settled = useRef(false);

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
    };
    window.addEventListener("storage", sync);
    window.addEventListener("al-daboor-quiz-pack", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("al-daboor-quiz-pack", sync);
    };
  }, []);

  const current = finished ? undefined : list[index];
  const hasNext = index < list.length - 1;
  const upcoming = hasNext ? list[index + 1] : null;
  const answerKey = useMemo(() => normalizeAr(current?.a ?? ""), [current]);
  const urgent = session.left != null && session.left <= 10;

  useEffect(() => {
    if (session.running) settled.current = false;
  }, [session.running]);

  useNewMessages(messages, session.running && !finished, (m) => {
    const who = participantKey(m);
    if (!answerKey || settled.current || !who) return;
    if (session.hasParticipated(who)) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    if (!session.tryClaim(who)) return;
    setAttempts((n) => n + 1);
    if (!answersMatch(text, answerKey)) return;
    settled.current = true;
    setWinner({ user: m.user, answer: m.text, color: m.color });
    setWinnerOpen(true);
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    setScoreColors((c) => ({ ...c, [m.user]: m.color }));
    session.stop();
  });

  const persistIndex = (nextIndex: number) => {
    const pack = loadQuizPack();
    saveQuizPack({ ...pack, index: nextIndex, questions: list, durationSec });
  };

  const showFinal = () => {
    session.stop();
    setFinished(true);
    setWinnerOpen(false);
    setWinner(null);
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
    setWinner(null);
    setWinnerOpen(false);
    setAttempts(0);
    session.clearParticipants();
  };

  const start = () => {
    if (!current || finished) return;
    settled.current = false;
    setWinner(null);
    setWinnerOpen(false);
    setAttempts(0);
    session.start();
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
    settled.current = false;
    // start after state flush
    window.setTimeout(() => session.start(), 0);
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
        "flex flex-col bg-[#070d0c] text-foreground",
        isModal ? "max-h-[92vh]" : "min-h-screen",
      )}
    >
      <div
        className={cn(
          "flex flex-1 flex-col border border-white/10 bg-gradient-to-b from-[#121c1a] to-[#0a1210]",
          isModal ? "max-h-[92vh] overflow-y-auto rounded-3xl" : "min-h-screen",
        )}
      >
        <header className="flex items-center gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <p className="flex-1 text-center font-brand text-xs font-bold tracking-[0.2em] text-primary uppercase">
            Al-Daboor · أسئلة
          </p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
              finished
                ? "bg-primary/20 text-primary"
                : session.running
                  ? "bg-destructive text-white"
                  : "bg-white/10 text-muted-foreground",
            )}
          >
            {finished ? "END" : session.running ? "LIVE" : "READY"}
          </span>
        </header>

        <div className="border-b border-white/10 bg-black/25 px-4 py-3">
          {finished ? (
            <Button
              className="h-14 w-full text-base font-extrabold shadow-[0_0_36px_-10px_var(--neon)]"
              onClick={() => setFinalOpen(true)}
            >
              <Trophy className="size-5" /> عرض النتيجة النهائية
            </Button>
          ) : session.running ? (
            <Button
              variant="destructive"
              className="h-14 w-full text-base font-extrabold"
              onClick={() => session.stop()}
            >
              <Square className="size-5" /> إيقاف الجولة
            </Button>
          ) : (
            <Button
              className="h-14 w-full text-lg font-extrabold shadow-[0_0_48px_-8px_var(--neon)]"
              disabled={!chatActive || !current}
              onClick={start}
            >
              <Play className="size-6 fill-current" /> بدء
            </Button>
          )}
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            المدة تتحدد من برّا النافذة · حالياً{" "}
            <span className="font-bold text-foreground">
              {durationSec > 0 ? formatClock(durationSec) : "بدون حد"}
            </span>
          </p>
        </div>

        {!chatActive ? (
          <p className="bg-destructive/15 px-3 py-2 text-center text-xs font-bold text-destructive">
            اربط كيك عشان الشات يشتغل داخل النافذة.
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
          <>
            <div
              className={cn(
                "border-b border-white/10 px-4 py-6 text-center",
                session.running ? (urgent ? "bg-destructive/15" : "bg-primary/10") : "",
              )}
            >
              <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">العداد</p>
              <p
                className={cn(
                  "mt-1 font-brand font-bold tabular-nums",
                  isModal ? "text-6xl sm:text-7xl" : "text-6xl",
                  session.running
                    ? urgent
                      ? "text-destructive"
                      : "shimmer-text"
                    : "text-foreground/75",
                )}
              >
                {clockLabel}
              </p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {session.running
                  ? `محاولات ${attempts} · مشاركون ${session.participantCount}`
                  : "نافذة البث جاهزة"}
              </p>
            </div>

            <div
              className={cn(
                "relative flex flex-1 flex-col justify-center px-5 text-center",
                isModal ? "py-8" : "py-10",
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_20%,color-mix(in_oklab,var(--neon)_14%,transparent),transparent_70%)]" />
              <p className="relative text-[11px] font-extrabold tracking-[0.28em] text-primary">
                سؤال {list.length ? index + 1 : 0} / {list.length}
              </p>
              <h1 className="relative mt-5 text-balance text-3xl font-extrabold leading-snug sm:text-4xl">
                {current?.q ?? "لا يوجد سؤال"}
              </h1>
              <p className="relative mt-5 text-sm text-muted-foreground">الجمهور يكتب الجواب في الشات</p>
              <Button
                variant="secondary"
                size="sm"
                className="relative mx-auto mt-8 font-bold"
                onClick={next}
                disabled={list.length < 1}
              >
                <RotateCcw className="size-3.5" /> {hasNext ? "السؤال التالي" : "إنهاء وإظهار النتيجة"}
              </Button>
            </div>

            <div className="border-t border-dashed border-white/12 bg-black/30 px-4 py-4 text-center">
              <p className="text-[10px] font-bold tracking-[0.22em] text-muted-foreground uppercase">التالي</p>
              <p className="mt-1 text-sm font-extrabold">{upcoming?.q ?? "— آخر سؤال / النتيجة —"}</p>
            </div>
          </>
        )}

        <div className="border-t border-white/10 bg-black/40 px-3 py-3">
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
            <DialogTitle className="text-xl font-extrabold">جابها!</DialogTitle>
            <DialogDescription>أول جواب صحيح من الشات</DialogDescription>
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
                    nextAndStart();
                  }}
                >
                  السؤال التالي وابدأ
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-bold"
                  onClick={() => {
                    setWinnerOpen(false);
                    next();
                  }}
                >
                  السؤال التالي فقط
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
            <DialogDescription>
              بعد {list.length} سؤال — بدون إعادة للأسئلة
            </DialogDescription>
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
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
