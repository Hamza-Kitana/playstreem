import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, RotateCcw, Trophy } from "lucide-react";
import type { ChatMessage } from "@/hooks/useKickChat";
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
import {
  loadQuizPack,
  saveQuizPack,
  type QuizQuestion,
} from "@/lib/quiz-pack";
import { DURATION_OPTIONS } from "@/hooks/useGameSession";
import { Play, Square } from "lucide-react";

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
  /** page = full popout route; modal = dialog over the quiz page */
  variant?: "page" | "modal";
}) {
  const isModal = variant === "modal";
  const initial = loadQuizPack();
  const [list, setList] = useState<QuizQuestion[]>(initial.questions);
  const [index, setIndex] = useState(initial.index);
  const [durationSec, setDurationSec] = useState(initial.durationSec);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState(0);
  const session = useGameSession(initial.durationSec);
  const settled = useRef(false);

  // Keep session duration select in sync
  useEffect(() => {
    session.setDurationSec(durationSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when pack duration changes
  }, [durationSec]);

  // Reload pack if parent page updates questions
  useEffect(() => {
    const sync = () => {
      const pack = loadQuizPack();
      setList(pack.questions);
      setDurationSec(pack.durationSec);
      setIndex((i) => Math.min(i, Math.max(pack.questions.length - 1, 0)));
    };
    window.addEventListener("storage", sync);
    window.addEventListener("al-daboor-quiz-pack", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("al-daboor-quiz-pack", sync);
    };
  }, []);

  const current = list[index];
  const upcoming = list.length > 1 ? list[(index + 1) % list.length] : null;
  const answerKey = useMemo(() => normalizeAr(current?.a ?? ""), [current]);
  const urgent = session.left != null && session.left <= 10;

  useEffect(() => {
    if (session.running) settled.current = false;
  }, [session.running]);

  useNewMessages(messages, session.running, (m) => {
    if (!answerKey || settled.current) return;
    if (session.hasParticipated(m.user)) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    if (!session.tryClaim(m.user)) return;
    setAttempts((n) => n + 1);
    if (!answersMatch(text, answerKey)) return;
    settled.current = true;
    setWinner({ user: m.user, answer: m.text, color: m.color });
    setWinnerOpen(true);
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    session.stop();
  });

  const persistIndex = (nextIndex: number) => {
    const pack = loadQuizPack();
    saveQuizPack({ ...pack, index: nextIndex, questions: list, durationSec });
  };

  const prepareQuestion = (nextIndex: number) => {
    setIndex(nextIndex);
    persistIndex(nextIndex);
    settled.current = false;
    setWinner(null);
    setWinnerOpen(false);
    setAttempts(0);
    session.clearParticipants();
  };

  const start = () => {
    if (!current) return;
    settled.current = false;
    setWinner(null);
    setWinnerOpen(false);
    setAttempts(0);
    session.start();
  };

  const next = () => {
    if (list.length < 1) return;
    prepareQuestion((index + 1) % list.length);
  };

  const nextAndStart = () => {
    if (list.length < 1) return;
    prepareQuestion((index + 1) % list.length);
    settled.current = false;
    session.start();
  };

  const top = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const clockLabel = session.running
    ? session.left == null
      ? "∞"
      : formatClock(session.left)
    : formatClock(durationSec > 0 ? durationSec : 0);

  return (
    <div
      className={`flex flex-col bg-[#070d0c] text-foreground ${
        isModal ? "max-h-[92vh]" : "min-h-screen"
      }`}
    >
      <div
        className={`flex flex-1 flex-col border border-white/10 bg-gradient-to-b from-[#121c1a] to-[#0a1210] ${
          isModal ? "max-h-[92vh] overflow-y-auto rounded-3xl" : "min-h-screen"
        }`}
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
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              session.running ? "bg-destructive text-white" : "bg-white/10 text-muted-foreground"
            }`}
          >
            {session.running ? "LIVE" : "READY"}
          </span>
        </header>

        {/* Compact controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/25 px-3 py-2">
          <select
            value={durationSec}
            disabled={session.running}
            onChange={(e) => {
              const v = Number(e.target.value);
              setDurationSec(v);
              const pack = loadQuizPack();
              saveQuizPack({ ...pack, durationSec: v, questions: list, index });
            }}
            className="h-9 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 text-xs font-bold"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {session.running ? (
            <Button size="sm" variant="destructive" className="h-9 font-extrabold" onClick={() => session.stop()}>
              <Square className="size-3.5" /> إيقاف
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-9 font-extrabold"
              disabled={!chatActive || !current}
              onClick={start}
            >
              <Play className="size-3.5" /> بدء
            </Button>
          )}
        </div>

        {!chatActive ? (
          <p className="bg-destructive/15 px-3 py-2 text-center text-xs font-bold text-destructive">
            اربط كيك أو شغّل التجريبي عشان الشات يشتغل داخل النافذة.
          </p>
        ) : null}

        <div
          className={`border-b border-white/10 px-4 py-6 text-center ${
            session.running ? (urgent ? "bg-destructive/15" : "bg-primary/10") : ""
          }`}
        >
          <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">العداد</p>
          <p
            className={`mt-1 font-brand font-bold tabular-nums ${
              isModal ? "text-5xl" : "text-6xl"
            } ${
              session.running ? (urgent ? "text-destructive" : "shimmer-text") : "text-foreground/75"
            }`}
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
          className={`relative flex flex-1 flex-col justify-center px-5 text-center ${
            isModal ? "py-8" : "py-10"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_20%,color-mix(in_oklab,var(--neon)_14%,transparent),transparent_70%)]" />
          <p className="relative text-[11px] font-extrabold tracking-[0.28em] text-primary">
            سؤال {list.length ? index + 1 : 0} / {list.length}
          </p>
          <h1
            className={`relative mt-5 text-balance font-extrabold leading-snug ${
              isModal ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
            }`}
          >
            {current?.q ?? "لا يوجد سؤال"}
          </h1>
          <p className="relative mt-5 text-sm text-muted-foreground">الجمهور يكتب الجواب في الشات</p>
          <Button
            variant="secondary"
            size="sm"
            className="relative mx-auto mt-8 font-bold"
            onClick={next}
            disabled={list.length < 2}
          >
            <RotateCcw className="size-3.5" /> السؤال التالي
          </Button>
        </div>

        <div className="border-t border-dashed border-white/12 bg-black/30 px-4 py-4 text-center">
          <p className="text-[10px] font-bold tracking-[0.22em] text-muted-foreground uppercase">التالي</p>
          <p className="mt-1 text-sm font-extrabold">{upcoming?.q ?? "— نهاية القائمة —"}</p>
        </div>

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
        open={winnerOpen && Boolean(winner)}
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
            <Button
              className="w-full font-extrabold"
              onClick={() => {
                setWinnerOpen(false);
                nextAndStart();
              }}
              disabled={list.length < 2}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
