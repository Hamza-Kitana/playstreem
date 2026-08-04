import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import type { ChatMessage } from "@/hooks/useKickChat";
import { useGameSession } from "@/hooks/useGameSession";
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

const DEFAULT_QS: Q[] = [
  { q: "ما هي عاصمة الأردن؟", a: "عمان" },
  { q: "كم عدد لاعبي فريق كرة القدم داخل الملعب؟", a: "11" },
  { q: "ما أكبر كوكب في المجموعة الشمسية؟", a: "المشتري" },
];

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
  const [scores, setScores] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState(0);
  const session = useGameSession(60);
  const settled = useRef(false);

  const current = list[index];
  const answerKey = useMemo(() => normalizeAr(current?.a ?? ""), [current]);

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
    const hit = text === answerKey || text.split(" ").includes(answerKey) || text.includes(answerKey);
    if (!hit) return;

    settled.current = true;
    setWinner({ user: m.user, answer: m.text, color: m.color });
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    session.stop();
  });

  const prepareQuestion = (nextIndex: number) => {
    setIndex(nextIndex);
    settled.current = false;
    setWinner(null);
    setAttempts(0);
    session.clearParticipants();
  };

  const start = () => {
    if (!current) return;
    settled.current = false;
    setWinner(null);
    setAttempts(0);
    session.start();
  };

  /** Advance to next question — works even while the round is live. */
  const next = () => {
    if (list.length < 1) return;
    const nextIndex = (index + 1) % list.length;
    prepareQuestion(nextIndex);
    // Keep an active round going for the new question (fresh answers).
    if (session.running) {
      session.start();
    }
  };

  const selectQuestion = (i: number) => {
    if (i === index && !winner) return;
    prepareQuestion(i);
    if (session.running) session.start();
  };

  const addQuestion = () => {
    if (!draftQ.trim() || !draftA.trim()) return;
    setList((l) => [...l, { q: draftQ.trim(), a: draftA.trim() }]);
    setDraftQ("");
    setDraftA("");
  };

  const removeQuestion = (i: number) => {
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
  };

  const top = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <GameCard id="quiz" className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <SessionControls
          running={session.running}
          chatActive={chatActive}
          durationSec={session.durationSec}
          left={session.left}
          participantCount={session.participantCount}
          canStart={Boolean(current)}
          startLabel="بدء الجولة"
          stopLabel="إيقاف الجولة"
          hint="كل مشاهد يجاوب مرة واحدة فقط بالسؤال. أول إجابة صحيحة تفوز. تقدر تنتقل للسؤال التالي أثناء الجولة."
          onDurationChange={session.setDurationSec}
          onStart={start}
          onStop={() => session.stop()}
        />

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/70 to-secondary/20 p-6">
          <div className="absolute -top-16 -left-16 size-52 rounded-full bg-primary/20 blur-3xl" />
          <p className="relative text-xs font-bold tracking-widest text-primary">
            سؤال {list.length ? index + 1 : 0} من {list.length}
          </p>
          <h3 className="relative mt-3 text-2xl font-extrabold sm:text-3xl">
            {current?.q ?? "أضف سؤالاً للبدء"}
          </h3>
          <p className="relative mt-2 text-sm text-muted-foreground">
            الجواب: {session.running ? "مخفي أثناء الجولة" : (current?.a ?? "—")}
          </p>

          {session.running ? (
            <div className="relative mt-5 text-sm font-bold text-primary">
              بانتظار الإجابات من الشات · محاولات: {attempts}
            </div>
          ) : null}

          {winner ? (
            <div className="animate-pop-in relative mt-5 rounded-2xl border border-primary/40 bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Crown className="size-5" />
                <span className="font-extrabold">الفائز</span>
              </div>
              <p className="mt-1 text-xl font-extrabold" style={{ color: winner.color }}>
                {winner.user}
              </p>
              <p className="text-sm text-muted-foreground">إجابته: {winner.answer}</p>
            </div>
          ) : null}

          <div className="relative mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={next} disabled={list.length < 1}>
              <RotateCcw className="size-4" /> السؤال التالي
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-muted-foreground">قائمة الأسئلة ({list.length})</p>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="font-bold">
                  <Plus className="size-4" /> إضافة أسئلة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md border-border/60 bg-background sm:rounded-3xl" dir="rtl">
                <DialogHeader className="text-right">
                  <DialogTitle className="text-xl font-extrabold">إضافة أسئلة</DialogTitle>
                  <DialogDescription className="text-right">
                    اكتب السؤال والجواب، اضغط إضافة، وقدّر تضيف أكثر من سؤال قبل ما تقفل النافذة.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold">السؤال</span>
                    <Input
                      value={draftQ}
                      onChange={(e) => setDraftQ(e.target.value)}
                      placeholder="اكتب سؤالاً جديداً"
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

                  {list.length > 0 ? (
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-border/50 bg-secondary/30 p-3">
                      {list.map((item, i) => (
                        <div
                          key={`${item.q}-${i}`}
                          className="flex items-start justify-between gap-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-bold">{item.q}</p>
                            <p className="truncate text-xs text-muted-foreground">الجواب: {item.a}</p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                            onClick={() => removeQuestion(i)}
                            aria-label="حذف السؤال"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <DialogFooter className="sm:justify-start">
                  <Button variant="secondary" className="font-bold" onClick={() => setAddOpen(false)}>
                    تم
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-wrap gap-2">
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">ما في أسئلة بعد — افتح نافذة الإضافة.</p>
            ) : (
              list.map((item, i) => (
                <button
                  key={`${item.q}-${i}`}
                  type="button"
                  onClick={() => selectQuestion(i)}
                  className={`group inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                    i === index
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-accent/50"
                  }`}
                >
                  <span className="max-w-40 truncate">{item.q}</span>
                  <Trash2
                    className="size-3.5 opacity-50 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeQuestion(i);
                    }}
                  />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-secondary/40 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="size-5 text-accent" />
          <h4 className="text-lg font-extrabold">لوحة المتصدرين</h4>
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد نقاط بعد.</p>
        ) : (
          <ol className="space-y-2">
            {top.map(([user, pts], i) => (
              <li
                key={user}
                className="animate-pop-in flex items-center justify-between rounded-xl bg-background/50 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <span
                    className={`grid size-6 place-items-center rounded-lg text-xs ${
                      i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {user}
                </span>
                <span className="font-extrabold text-primary">{pts}</span>
              </li>
            ))}
          </ol>
        )}
        {top.length > 0 ? (
          <Button variant="ghost" className="mt-4 w-full" onClick={() => setScores({})}>
            تصفير النقاط
          </Button>
        ) : null}
      </div>
    </GameCard>
  );
}
