import { useMemo, useState } from "react";
import { BarChart3, Plus, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/hooks/useKickChat";
import { useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import SessionControls from "@/components/games/SessionControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/Reveal";

export default function PollGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [options, setOptions] = useState<string[]>(["نعم", "لا", "ما بعرف"]);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState("هل نكمل التحدي؟");
  const [votes, setVotes] = useState<number[]>([0, 0, 0]);
  const session = useGameSession(60);

  useNewMessages(messages, session.running, (m) => {
    if (session.hasParticipated(m.user)) return;
    const t = normalizeAr(m.text);
    const n = Number(t.split(" ")[0]);
    if (!Number.isInteger(n) || n < 1 || n > options.length) return;
    if (!session.tryClaim(m.user)) return;
    setVotes((v) => v.map((c, i) => (i === n - 1 ? c + 1 : c)));
  });

  const total = votes.reduce((a, b) => a + b, 0);
  const leader = useMemo(() => (total ? votes.indexOf(Math.max(...votes)) : -1), [votes, total]);

  const start = () => {
    setVotes(options.map(() => 0));
    session.start();
  };

  const stop = () => session.stop();

  return (
    <GameCard id="vote" className="space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <h4 className="text-lg font-extrabold">التصويت</h4>
      </div>

      <SessionControls
        running={session.running}
        chatActive={chatActive}
        durationSec={session.durationSec}
        left={session.left}
        participantCount={session.participantCount}
        canStart={options.length >= 2}
        startLabel="بدء التصويت"
        stopLabel="إيقاف التصويت"
        hint="كل مشاهد يصوّت مرة واحدة فقط أثناء الجلسة بكتابة رقم الخيار في الشات (١، ٢، ٣…)."
        onDurationChange={session.setDurationSec}
        onStart={start}
        onStop={stop}
      />

      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="h-12 text-base font-bold"
        placeholder="سؤال التصويت"
        disabled={session.running}
      />

      <div className="space-y-3">
        {options.map((opt, i) => {
          const pct = total ? Math.round((votes[i]! / total) * 100) : 0;
          return (
            <div
              key={`${opt}-${i}`}
              className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                leader === i && total > 0
                  ? "border-primary/60 neon-ring"
                  : "border-border bg-secondary/30"
              }`}
            >
              <div
                className="absolute inset-y-0 right-0 bg-gradient-to-l from-primary/35 to-accent/25 transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3 font-bold">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-background/70 text-sm">
                    {i + 1}
                  </span>
                  <span className="truncate">{opt}</span>
                  {!session.running ? (
                    <Trash2
                      className="size-3.5 shrink-0 cursor-pointer opacity-40 hover:opacity-100"
                      onClick={() => {
                        setOptions((l) => l.filter((_, k) => k !== i));
                        setVotes((v) => v.filter((_, k) => k !== i));
                      }}
                    />
                  ) : null}
                </span>
                <span className="shrink-0 font-extrabold tabular-nums">
                  {pct}% <span className="text-xs text-muted-foreground">({votes[i]})</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {!session.running ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="أضف خياراً"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !draft.trim()) return;
              setOptions((o) => [...o, draft.trim()]);
              setVotes((v) => [...v, 0]);
              setDraft("");
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              if (!draft.trim()) return;
              setOptions((o) => [...o, draft.trim()]);
              setVotes((v) => [...v, 0]);
              setDraft("");
            }}
          >
            <Plus className="size-4" /> إضافة
          </Button>
        </div>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        مجموع الأصوات الصحيحة: <span className="font-extrabold text-foreground tabular-nums">{total}</span>
      </p>
    </GameCard>
  );
}
