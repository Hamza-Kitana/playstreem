import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import type { ChatMessage } from "@/hooks/useKickChat";
import { formatClock, useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import SessionControls from "@/components/games/SessionControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const clockLabel = session.running
    ? session.left == null
      ? "∞"
      : formatClock(session.left)
    : formatClock(session.durationSec > 0 ? session.durationSec : 0);

  return (
    <div className="space-y-8">
      {/* Controls stay on page — compact toolbar */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-secondary/20 px-4 py-3">
          <div>
            <p className="text-sm font-extrabold">تحضير الجولة</p>
            <p className="text-xs text-muted-foreground">عدّل الأسئلة، بعدين ابدأ — النافذة الكبيرة للبث.</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="font-bold" disabled={session.running}>
                <Plus className="size-4" /> الأسئلة ({list.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-border/60 bg-background sm:rounded-3xl" dir="rtl">
              <DialogHeader className="text-right">
                <DialogTitle className="text-xl font-extrabold">الأسئلة والأجوبة</DialogTitle>
                <DialogDescription className="text-right">
                  جهّز القائمة قبل ما تفتح نافذة البث للجمهور.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Input
                  value={draftQ}
                  onChange={(e) => setDraftQ(e.target.value)}
                  placeholder="السؤال"
                  className="h-11"
                />
                <Input
                  value={draftA}
                  onChange={(e) => setDraftA(e.target.value)}
                  placeholder="الإجابة"
                  className="h-11"
                />
                <Button
                  className="w-full font-extrabold"
                  onClick={addQuestion}
                  disabled={!draftQ.trim() || !draftA.trim()}
                >
                  <Plus className="size-4" /> إضافة
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
                        className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-destructive"
                        onClick={() => removeQuestion(i)}
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

        <SessionControls
          running={session.running}
          chatActive={chatActive}
          durationSec={session.durationSec}
          left={session.left}
          participantCount={session.participantCount}
          canStart={Boolean(current)}
          startLabel="بدء الجولة"
          stopLabel="إيقاف الجولة"
          hint="النافذة العائمة تحت هي عرض البث. أول جواب صحيح يفتح نافذة الفائز."
          onDurationChange={session.setDurationSec}
          onStart={start}
          onStop={() => session.stop()}
        />
      </div>

      {/* Floating external window */}
      <div className="relative mx-auto max-w-[34rem] px-2 sm:max-w-[38rem]">
        {/* Soft depth behind the window */}
        <div
          className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] opacity-80 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--neon) 35%, transparent), transparent 65%)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-8 -bottom-6 -z-10 h-16 rounded-full bg-black/50 blur-2xl" />

        <div
          className="animate-pop-in relative overflow-hidden rounded-[1.35rem] border border-white/18 shadow-[0_50px_120px_-28px_rgba(0,0,0,0.85),0_0_0_1px_color-mix(in_oklab,var(--neon)_22%,transparent),0_0_80px_-24px_color-mix(in_oklab,var(--neon)_45%,transparent)]"
          style={{
            background:
              "linear-gradient(165deg, oklch(0.19 0.03 160 / 0.97), oklch(0.12 0.025 180 / 0.98) 55%, oklch(0.1 0.02 200 / 0.99))",
          }}
        >
          {/* Window chrome */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_8px_#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e] shadow-[0_0_8px_#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840] shadow-[0_0_8px_#28c840]" />
            </div>
            <p className="flex-1 text-center font-brand text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
              Al-Daboor · أسئلة
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                session.running
                  ? "bg-destructive/90 text-white"
                  : "bg-white/10 text-muted-foreground"
              }`}
            >
              {session.running ? "LIVE" : "READY"}
            </span>
          </div>

          {/* Timer strip — top of window body */}
          <div
            className={`border-b border-white/10 px-6 py-5 text-center ${
              session.running
                ? urgent
                  ? "bg-destructive/15"
                  : "bg-primary/10"
                : "bg-white/[0.03]"
            }`}
          >
            <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">العداد</p>
            <p
              className={`mt-1 font-brand text-5xl font-bold tabular-nums tracking-tight sm:text-6xl ${
                session.running
                  ? urgent
                    ? "text-destructive"
                    : "shimmer-text"
                  : "text-foreground/70"
              }`}
            >
              {clockLabel}
            </p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {session.running
                ? `محاولات ${attempts} · مشاركون ${session.participantCount}`
                : "جاهز للبث"}
            </p>
          </div>

          {/* Question — main pane */}
          <div className="relative px-6 py-10 text-center sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,color-mix(in_oklab,var(--neon)_12%,transparent),transparent_70%)]" />
            <p className="relative text-[11px] font-extrabold tracking-[0.28em] text-primary">
              سؤال {list.length ? index + 1 : 0} / {list.length}
            </p>
            <h3 className="relative mt-5 text-balance text-3xl font-extrabold leading-[1.35] sm:text-4xl">
              {current?.q ?? "أضف سؤالاً من التحضير"}
            </h3>
            <p className="relative mt-5 text-sm text-muted-foreground">الجمهور يكتب الجواب في الشات</p>
            <Button
              variant="secondary"
              size="sm"
              className="relative mt-7 font-bold"
              onClick={next}
              disabled={list.length < 2}
            >
              <RotateCcw className="size-3.5" /> السؤال التالي
            </Button>
          </div>

          {/* Next question — footer of window */}
          <div className="border-t border-dashed border-white/12 bg-black/25 px-6 py-4 text-center">
            <p className="text-[10px] font-bold tracking-[0.22em] text-muted-foreground uppercase">
              التالي
            </p>
            <p className="mt-1.5 text-sm font-extrabold text-foreground/85 sm:text-base">
              {upcoming?.q ?? "— نهاية القائمة —"}
            </p>
          </div>
        </div>
      </div>

      {/* Scores — companion strip under the window */}
      <div className="mx-auto max-w-[38rem] rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-accent" />
            <h4 className="text-sm font-extrabold">المتصدرين</h4>
          </div>
          {top.length > 0 ? (
            <Button variant="ghost" size="sm" className="h-8 font-bold" onClick={() => setScores({})}>
              تصفير
            </Button>
          ) : null}
        </div>
        {top.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">الفائزون يظهرون هنا.</p>
        ) : (
          <ol className="flex flex-wrap justify-center gap-2">
            {top.map(([user, pts], i) => (
              <li
                key={user}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold"
              >
                <span
                  className={`grid size-5 place-items-center rounded-md text-[10px] ${
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}
                >
                  {i + 1}
                </span>
                {user}
                <span className="text-primary">{pts}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Winner floating window */}
      <Dialog
        open={winnerOpen && Boolean(winner)}
        onOpenChange={(open) => {
          setWinnerOpen(open);
          if (!open) setWinner(null);
        }}
      >
        <DialogContent
          className="max-w-sm overflow-hidden border-primary/40 p-0 sm:rounded-[1.35rem]"
          dir="rtl"
          style={{
            background:
              "linear-gradient(165deg, oklch(0.18 0.04 155 / 0.98), oklch(0.11 0.03 180 / 0.99))",
            boxShadow:
              "0 40px 100px -20px rgba(0,0,0,0.85), 0 0 60px -16px color-mix(in oklab, var(--neon) 50%, transparent)",
          }}
        >
          <div className="flex items-center gap-3 border-b border-white/10 bg-black/35 px-4 py-3">
            <div className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <p className="flex-1 text-center font-brand text-[11px] font-bold tracking-wide text-primary">
              الفائز
            </p>
          </div>

          <div className="px-6 py-8 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-[0_0_40px_-8px_var(--neon)]">
              <Crown className="size-7" />
            </div>
            <DialogHeader className="mt-4 space-y-1">
              <DialogTitle className="text-center text-xl font-extrabold">جابها!</DialogTitle>
              <DialogDescription className="text-center">أول جواب صحيح من الشات</DialogDescription>
            </DialogHeader>
            {winner ? (
              <div className="mt-5 space-y-2">
                <p
                  className="animate-pop-in font-brand text-4xl font-bold tracking-tight"
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
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-white/10 bg-black/25 p-4 sm:flex-col sm:space-x-0">
            <Button
              className="h-11 w-full font-extrabold"
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
              className="h-10 w-full font-bold"
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
