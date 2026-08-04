import { useState } from "react";
import { Armchair, MessageCircleQuestion, Shuffle, Trash2, UserPlus } from "lucide-react";
import type { ChatMessage } from "@/hooks/useKickChat";
import { useGameSession } from "@/hooks/useGameSession";
import { useNewMessages } from "@/hooks/useNewMessages";
import SessionControls from "@/components/games/SessionControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard } from "@/components/Reveal";

type Ask = { key: number; user: string; text: string; color: string };

export default function HotSeatGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [candidates, setCandidates] = useState<string[]>(["أبو فهد", "سمسم", "لؤي"]);
  const [draft, setDraft] = useState("");
  const [seated, setSeated] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [asks, setAsks] = useState<Ask[]>([]);
  const session = useGameSession(120);

  useNewMessages(messages, session.running, (m) => {
    const text = m.text.trim();
    if (!text.includes("?") && !text.includes("؟")) return;
    if (session.hasParticipated(m.user)) return;
    if (!session.tryClaim(m.user)) return;
    setAsks((prev) => [{ key: m.key, user: m.user, text, color: m.color }, ...prev].slice(0, 24));
  });

  const spin = () => {
    if (candidates.length === 0 || session.running) return;
    setSpinning(true);
    let ticks = 0;
    const id = setInterval(() => {
      setSeated(candidates[Math.floor(Math.random() * candidates.length)] ?? null);
      ticks += 1;
      if (ticks > 18) {
        clearInterval(id);
        setSpinning(false);
      }
    }, 90);
  };

  const start = () => {
    setAsks([]);
    session.start();
  };

  return (
    <GameCard id="seat" className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <SessionControls
          running={session.running}
          chatActive={chatActive}
          durationSec={session.durationSec}
          left={session.left}
          participantCount={session.participantCount}
          canStart={Boolean(seated)}
          startLabel="بدء الأسئلة"
          stopLabel="إيقاف الأسئلة"
          hint="كل مشاهد يرسل سؤال واحد فقط أثناء الجلسة (لازم يحتوي ؟)."
          onDurationChange={session.setDurationSec}
          onStart={start}
          onStop={() => session.stop()}
        />

        <div className="relative grid place-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-accent/20 to-transparent p-8 text-center">
          <div className="animate-spin-slow absolute size-72 rounded-full border border-dashed border-accent/30" />
          <div className="absolute size-52 rounded-full bg-accent/15 blur-3xl" />
          <Armchair
            className={`relative size-16 text-accent ${spinning ? "animate-bounce" : "animate-float-slow"}`}
          />
          <p className="relative mt-4 text-xs font-bold tracking-widest text-accent">
            الجالس على الكرسي
          </p>
          <p
            className={`relative mt-1 text-3xl font-extrabold sm:text-4xl ${
              spinning ? "blur-[1px]" : "animate-pop-in"
            }`}
          >
            {seated ?? "لا أحد بعد"}
          </p>
          <div className="relative mt-6">
            <Button
              onClick={spin}
              disabled={spinning || candidates.length === 0 || session.running}
              className="font-extrabold"
            >
              <Shuffle className="size-4" /> اختيار عشوائي
            </Button>
          </div>
          {!seated ? (
            <p className="relative mt-3 text-xs text-muted-foreground">اختر الجالس أولاً ثم ابدأ الجلسة.</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={session.running}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                setCandidates((c) => [...c, draft.trim()]);
                setDraft("");
              }
            }}
            placeholder="أضف مرشحاً للكرسي"
            className="flex-1"
          />
          <Button
            variant="outline"
            disabled={session.running}
            onClick={() => {
              if (!draft.trim()) return;
              setCandidates((c) => [...c, draft.trim()]);
              setDraft("");
            }}
          >
            <UserPlus className="size-4" /> إضافة
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {candidates.map((c, i) => (
            <span
              key={`${c}-${i}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs"
            >
              {c}
              {!session.running ? (
                <Trash2
                  className="size-3.5 cursor-pointer opacity-50 hover:opacity-100"
                  onClick={() => setCandidates((l) => l.filter((_, k) => k !== i))}
                />
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-secondary/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="size-5 text-primary" />
            <h4 className="text-lg font-extrabold">أسئلة الجمهور</h4>
          </div>
          {asks.length > 0 && !session.running ? (
            <Button variant="ghost" size="sm" onClick={() => setAsks([])}>
              مسح
            </Button>
          ) : null}
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {asks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ابدأ الجلسة وسيظهر هنا سؤال واحد من كل مشاهد.
            </p>
          ) : (
            asks.map((a) => (
              <div key={a.key} className="animate-chat-in rounded-xl bg-background/50 p-3">
                <span className="text-sm font-bold" style={{ color: a.color }}>
                  {a.user}
                </span>
                <p className="text-sm">{a.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </GameCard>
  );
}
