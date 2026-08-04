import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import type { ChatMessage } from "@/hooks/useKickChat";
import { formatClock, useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import SessionControls from "@/components/games/SessionControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/Reveal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Q = { q: string; a: string };
type Winner = { user: string; answer: string; color: string };

/** 10 starter questions — Jordan + faith + general useful trivia. */
const DEFAULT_QS: Q[] = [
  { q: "ما هي عاصمة الأردن؟", a: "عمان" },
  { q: "كم عدد أركان الإسلام؟", a: "5" },
  { q: "ما أول شهر في السنة الهجرية؟", a: "محرم" },
  { q: "في أي دولة تقع مدينة البتراء؟", a: "الاردن" },
  { q: "كم ركعة في صلاة الفجر؟", a: "2" },
  { q: "من هو خاتم الأنبياء والمرسلين؟", a: "محمد" },
  { q: "ما اسم البحر المالح غرب الأردن؟", a: "البحر الميت" },
  { q: "كم عدد الصلوات المفروضة يومياً؟", a: "5" },
  { q: "ما اسم عملة الأردن؟", a: "دينار" },
  { q: "في أي مدينة أردنية يقع المدرج الروماني؟", a: "عمان" },
];

function answersMatch(guess: string, answerKey: string) {
  if (!guess || !answerKey) return false;
  if (guess === answerKey) return true;
  if (guess.split(" ").includes(answerKey)) return true;
  // Allow short answers inside longer chat lines.
  if (answerKey.length >= 2 && guess.includes(answerKey)) return true;
  return false;
}

export default function QuizGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [list, setList] = useState<Q[]>(DEFAULT_QS);
  const [draftQ, setDraftQ] = useState("");
  const [draftA, setDraftA] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState(0);
  const session = useGameSession(60);
  const settled = useRef(false);

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
    const w = { user: m.user, answer: m.text, color: m.color };
    setWinner(w);
    setWinnerOpen(true);
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    session.stop();
  });

  const prepareQuestion = (nextIndex: number) => {
    setIndex(nextIndex);
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

  const addQuestion = () => {
    if (!draftQ.trim() || !draftA.trim()) return;
    setList((l) => [...l, { q: draftQ.trim(), a: draftA.trim() }]);
    setDraftQ("");
    setDraftA("");
  };

  const removeQuestion = (i: number) => {
    if (session.running) return;
    setList((l) => {
      const nextList = l.filter((_, k) => k !== i);
      setIndex((cur) => {
        if (nextList.length === 0) return 0;
        if (i < cur) return cur - 1;
        if (i === cur) return Math.min(cur, nextList.length - 1);
        return cur;
      });
      return nextList;
    });
    settled.current = false;
    setWinner(null);
    setWinnerOpen(false);
  };

  const top = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <GameCard id="quiz" className="space-y-6">
      {/* Setup */}
      <div className="rounded-3xl border border-border/60 bg-secondary/25 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-extrabold">قبل ما تبدأ — جهّز الأسئلة</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              فيه ١٠ أسئلة جاهزة (أردن + دين + عام). عدّل أو أضف قبل ما تشغّل الجولة.
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="font-bold" disabled={session.running}>
                <Plus className="size-4" /> إضافة / تعديل
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-border/60 bg-background sm:rounded-3xl" dir="rtl">
              <DialogHeader className="text-right">
                <DialogTitle className="text-xl font-extrabold">الأسئلة والأجوبة</DialogTitle>
                <DialogDescription className="text-right">
                  أضف أسئلة قبل الجولة. الجواب يبقى مخفي عن الشاشة ويظهر من الشات فقط.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold">السؤال</span>
                  <Input
                    value={draftQ}
                    onChange={(e) => setDraftQ(e.target.value)}
                    placeholder="اكتب السؤال"
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addQuestion();
                      }
                    }}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold">الإجابة الصحيحة</span>
                  <Input
                    value={draftA}
                    onChange={(e) => setDraftA(e.target.value)}
                    placeholder="الإجابة"
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addQuestion();
                      }
                    }}
                  />
                </label>
                <Button
                  className="w-full font-extrabold"
                  onClick={addQuestion}
                  disabled={!draftQ.trim() || !draftA.trim()}
                >
                  <Plus className="size-4" /> إضافة للقائمة
                </Button>

                <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-border/50 bg-secondary/30 p-3">
                  {list.map((item, i) => (
                    <div key={`${item.q}-${i}`} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-bold">
                          <span className="ml-1 text-primary">{i + 1}.</span>
                          {item.q}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">الجواب: {item.a}</p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                        onClick={() => removeQuestion(i)}
                        aria-label="حذف"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="sm:justify-start">
                <Button variant="secondary" className="font-bold" onClick={() => setAddOpen(false)}>
                  تم
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!session.running ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {list.map((item, i) => (
              <button
                key={`${item.q}-${i}`}
                type="button"
                onClick={() => prepareQuestion(i)}
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  i === index
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border bg-background/40 text-muted-foreground hover:border-primary/35"
                }`}
              >
                <span className="opacity-60">{i + 1}</span>
                <span className="max-w-44 truncate">{item.q}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <SessionControls
        running={session.running}
        chatActive={chatActive}
        durationSec={session.durationSec}
        left={session.left}
        participantCount={session.participantCount}
        canStart={Boolean(current)}
        startLabel="بدء الجولة"
        stopLabel="إيقاف الجولة"
        hint="السؤال في النافذة الكبيرة بالنص. العداد فوقه، والسؤال التالي تحته. أول إجابة صحيحة تفوز."
        onDurationChange={session.setDurationSec}
        onStart={start}
        onStop={() => session.stop()}
      />

      {/* Center stage */}
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
        {/* Timer window — above */}
        <div
          className={`w-full rounded-[1.75rem] border px-6 py-5 text-center transition ${
            session.running
              ? urgent
                ? "border-destructive/50 bg-destructive/10 shadow-[0_0_40px_-12px_oklch(0.65_0.2_25)]"
                : "border-primary/40 bg-primary/10 shadow-[0_0_40px_-12px_var(--neon)]"
              : "border-border/60 bg-secondary/30"
          }`}
        >
          <p className="text-xs font-bold tracking-[0.25em] text-muted-foreground uppercase">العداد</p>
          <p
            className={`mt-2 font-brand text-5xl font-bold tabular-nums sm:text-6xl ${
              session.running
                ? urgent
                  ? "text-destructive"
                  : "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {session.running
              ? session.left == null
                ? "∞"
                : formatClock(session.left)
              : formatClock(session.durationSec > 0 ? session.durationSec : 0)}
          </p>
          <p className="mt-2 text-sm font-bold text-muted-foreground">
            {session.running
              ? `محاولات: ${attempts} · مشاركون: ${session.participantCount}`
              : "اضغط بدء الجولة لما تكون جاهز"}
          </p>
        </div>

        {/* Question window — center */}
        <div className="relative w-full overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-secondary/80 via-background to-secondary/40 p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <p className="relative text-xs font-extrabold tracking-[0.28em] text-primary">
            سؤال {list.length ? index + 1 : 0} من {list.length}
          </p>
          <h3 className="relative mt-6 text-3xl font-extrabold leading-snug sm:text-4xl lg:text-5xl">
            {current?.q ?? "أضف سؤالاً من نافذة التحضير"}
          </h3>
          <p className="relative mt-5 text-sm text-muted-foreground">
            الجواب مخفي — الجمهور يكتب بالشات
          </p>

          <div className="relative mt-8 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" className="font-bold" onClick={next} disabled={list.length < 2}>
              <RotateCcw className="size-4" /> السؤال التالي
            </Button>
          </div>
        </div>

        {/* Next question — below */}
        <div className="w-full rounded-[1.5rem] border border-dashed border-border/70 bg-secondary/20 px-5 py-4 text-center">
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">السؤال التالي</p>
          <p className="mt-2 text-base font-extrabold text-foreground/90 sm:text-lg">
            {upcoming?.q ?? "— آخر سؤال بالقائمة —"}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-3xl border border-border/50 bg-secondary/30 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-accent" />
            <h4 className="text-lg font-extrabold">لوحة المتصدرين</h4>
          </div>
          {top.length > 0 ? (
            <Button variant="ghost" size="sm" className="font-bold" onClick={() => setScores({})}>
              تصفير
            </Button>
          ) : null}
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">أول فائز يظهر هنا بالنقاط.</p>
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {top.map(([user, pts], i) => (
              <li
                key={user}
                className="animate-pop-in flex items-center justify-between rounded-2xl bg-background/50 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-lg text-xs ${
                      i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate">{user}</span>
                </span>
                <span className="font-extrabold text-primary">{pts}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Winner — second window */}
      <Dialog
        open={winnerOpen && Boolean(winner)}
        onOpenChange={(open) => {
          setWinnerOpen(open);
          if (!open) setWinner(null);
        }}
      >
        <DialogContent
          className="max-w-md overflow-hidden border-primary/40 bg-background sm:rounded-[2rem]"
          dir="rtl"
        >
          <div className="pointer-events-none absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          <DialogHeader className="relative text-center sm:text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary/15 text-primary shadow-[0_0_40px_-8px_var(--neon)]">
              <Crown className="size-8" />
            </div>
            <DialogTitle className="mt-4 text-2xl font-extrabold">جابها!</DialogTitle>
            <DialogDescription className="text-center text-base">
              أول واحد كتب الجواب الصحيح بالشات
            </DialogDescription>
          </DialogHeader>

          {winner ? (
            <div className="relative space-y-3 py-4 text-center">
              <p
                className="animate-pop-in font-brand text-4xl font-bold tracking-tight sm:text-5xl"
                style={{
                  color: winner.color,
                  textShadow: `0 0 42px color-mix(in oklab, ${winner.color} 55%, transparent)`,
                }}
              >
                {winner.user}
              </p>
              <p className="text-sm text-muted-foreground">
                إجابته: <span className="font-bold text-foreground">{winner.answer}</span>
              </p>
            </div>
          ) : null}

          <DialogFooter className="relative flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              className="h-12 w-full font-extrabold"
              onClick={() => {
                setWinnerOpen(false);
                nextAndStart();
              }}
              disabled={list.length < 2}
            >
              <RotateCcw className="size-4" /> السؤال التالي وابدأ
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full font-bold"
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
    </GameCard>
  );
}
