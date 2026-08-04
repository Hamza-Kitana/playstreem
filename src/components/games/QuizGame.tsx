import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, RotateCcw, Plus, Trash2, Trophy } from "lucide-react";
import type { ChatMessage } from "@/hooks/useKickChat";
import { useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import SessionControls from "@/components/games/SessionControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/Reveal";

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

  const start = () => {
    if (!current) return;
    settled.current = false;
    setWinner(null);
    setAttempts(0);
    session.start();
  };

  const next = () => {
    setIndex((i) => (i + 1) % Math.max(list.length, 1));
    settled.current = false;
    setWinner(null);
    setAttempts(0);
    session.stop();
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
          hint="كل مشاهد يجاوب مرة واحدة فقط بالجولة. أول إجابة صحيحة تفوز وتوقف الجلسة."
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
              بانتظار الإجابات من الشات · محاولات صحيحة الاستلام: {attempts}
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

          <div className="relative mt-6">
            <Button variant="secondary" onClick={next} disabled={list.length < 1 || session.running}>
              <RotateCcw className="size-4" /> السؤال التالي
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="اكتب سؤالاً جديداً"
              className="flex-1"
              disabled={session.running}
            />
            <Input
              value={draftA}
              onChange={(e) => setDraftA(e.target.value)}
              placeholder="الإجابة"
              className="sm:w-44"
              disabled={session.running}
            />
            <Button
              variant="outline"
              disabled={session.running}
              onClick={() => {
                if (!draftQ.trim() || !draftA.trim()) return;
                setList((l) => [...l, { q: draftQ.trim(), a: draftA.trim() }]);
                setDraftQ("");
                setDraftA("");
              }}
            >
              <Plus className="size-4" /> إضافة
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {list.map((item, i) => (
              <button
                key={`${item.q}-${i}`}
                type="button"
                disabled={session.running}
                onClick={() => {
                  setIndex(i);
                  setWinner(null);
                  session.stop();
                }}
                className={`group inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50 ${
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
                    if (session.running) return;
                    setList((l) => l.filter((_, k) => k !== i));
                    setIndex(0);
                  }}
                />
              </button>
            ))}
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
          <Button variant="ghost" className="mt-4 w-full" onClick={() => setScores({})} disabled={session.running}>
            تصفير النقاط
          </Button>
        ) : null}
      </div>
    </GameCard>
  );
}
