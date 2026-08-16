import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, MessageSquareQuote, Sparkles, Users } from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
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
} from "@/components/ui/dialog";

type Hit = {
  id: number;
  user: string;
  color: string;
  at: number;
};

let hitSeq = 0;

export default function PhraseGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [phrase, setPhrase] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [wordOpen, setWordOpen] = useState(false);
  const [showWord, setShowWord] = useState(false);
  const session = useGameSession(90);

  const target = useMemo(() => normalizeAr(phrase), [phrase]);
  const latest = hits[0] ?? null;

  useNewMessages(messages, session.running, (m) => {
    const who = participantKey(m);
    if (!target) return;
    if (!who || session.hasParticipated(who)) return;

    const text = normalizeAr(m.text);
    if (!text) return;
    if (text !== target) return;
    if (!session.tryClaim(who)) return;

    hitSeq += 1;
    setHits((prev) => [{ id: hitSeq, user: m.user, color: m.color, at: Date.now() }, ...prev].slice(0, 40));
  });

  const start = () => {
    setHits([]);
    session.start();
  };

  return (
    <GameCard id="phrase" className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquareQuote className="size-5 text-primary" />
        <h4 className="text-lg font-extrabold">الجملة</h4>
      </div>

      <SessionControls
        running={session.running}
        chatActive={chatActive}
        durationSec={session.durationSec}
        left={session.left}
        participantCount={session.participantCount}
        canStart={Boolean(target)}
        startLabel="بدء الجلسة"
        stopLabel="إيقاف الجلسة"
        hint="اضغط «اكتب الكلمة السرية» وحطها بنافذة خاصة. ما بتطلع على شاشة البث — الجمهور يخمن في الشات."
        onDurationChange={session.setDurationSec}
        onStart={start}
        onStop={() => session.stop()}
      />

      <button
        type="button"
        disabled={session.running}
        onClick={() => {
          setShowWord(false);
          setWordOpen(true);
        }}
        className="flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-primary/50 bg-primary/10 px-5 py-5 text-right transition hover:border-primary hover:bg-primary/15 disabled:opacity-50"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_28px_-8px_var(--neon)]">
          <Lock className="size-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold sm:text-xl">
            {target ? "الكلمة السرية جاهزة" : "اضغط هنا واكتب الكلمة السرية"}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            {target
              ? "مخفية عن الشاشة — اضغط للتعديل قبل البدء"
              : "نافذة للستريمر فقط، الجمهور ما يشوف الكلمة"}
          </span>
        </span>
      </button>

      <Dialog
        open={wordOpen}
        onOpenChange={(open) => {
          setWordOpen(open);
          if (!open) setShowWord(false);
        }}
      >
        <DialogContent className="max-w-md border-primary/40 bg-[#0e1715] sm:rounded-3xl" dir="rtl">
          <DialogHeader className="text-right">
            <div className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Lock className="size-7" />
            </div>
            <DialogTitle className="text-center text-2xl font-extrabold">اكتب الكلمة هنا</DialogTitle>
            <DialogDescription className="text-center">
              هاي النافذة إلك أنت. سكّرها قبل ما توجّه الكاميرا على الشاشة.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input
              autoFocus
              type={showWord ? "text" : "password"}
              autoComplete="off"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="مثال: بيتزا"
              className="h-14 border-primary/40 bg-black/40 pe-12 text-center text-xl font-extrabold"
              disabled={session.running}
              onKeyDown={(e) => {
                if (e.key === "Enter" && phrase.trim()) {
                  setWordOpen(false);
                  setShowWord(false);
                }
              }}
            />
            <button
              type="button"
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setShowWord((v) => !v)}
              aria-label={showWord ? "إخفاء الكلمة" : "إظهار الكلمة"}
            >
              {showWord ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              className="h-12 w-full font-extrabold"
              disabled={!phrase.trim()}
              onClick={() => {
                setWordOpen(false);
                setShowWord(false);
              }}
            >
              تم — أخفي الكلمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spotlight — never reveal the secret word */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/25 bg-gradient-to-br from-primary/15 via-secondary/40 to-background p-8 text-center sm:p-12">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute right-8 bottom-0 size-40 rounded-full bg-[color-mix(in_oklab,var(--neon-2)_20%,transparent)] blur-3xl" />

        <p className="relative text-xs font-bold tracking-[0.28em] text-primary uppercase">خمّنوا في الشات</p>
        <p className="relative mx-auto mt-4 max-w-2xl font-brand text-3xl font-bold leading-snug sm:text-5xl">
          ؟؟؟
        </p>
        <p className="relative mt-3 text-sm font-bold text-muted-foreground">
          الكلمة مخفية — اللي يعرفها يكتبها في الشات
        </p>

        <div className="relative mx-auto mt-10 min-h-[7.5rem]">
          {latest ? (
            <div key={latest.id} className="animate-pop-in">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-1.5 text-xs font-extrabold text-primary">
                <Sparkles className="size-3.5" />
                كتب الكلمة السرية
              </p>
              <p
                className="mt-4 font-brand text-4xl font-bold tracking-tight sm:text-6xl"
                style={{
                  color: latest.color,
                  textShadow: `0 0 40px color-mix(in oklab, ${latest.color} 55%, transparent)`,
                }}
              >
                {latest.user}
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
              <Users className="size-8 opacity-40" />
              <p className="text-sm font-bold">
                {session.running ? "بانتظار أول واحد يخمن…" : "ابدأ الجلسة عشان تظهر الأسماء هنا"}
              </p>
            </div>
          )}
        </div>

        {session.running ? (
          <p className="relative mt-4 text-sm font-bold text-primary">
            اللي يخمن صح يظهر اسمه · {hits.length} مشارك
          </p>
        ) : null}
      </div>

      {/* Name wall */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h5 className="text-sm font-extrabold">الأسماء اللي خمّنت صح</h5>
          {hits.length > 0 && !session.running ? (
            <Button variant="ghost" size="sm" className="font-bold" onClick={() => setHits([])}>
              مسح القائمة
            </Button>
          ) : null}
        </div>

        {hits.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
            لما أحد يخمن الكلمة، اسمه يطلع هنا بهالة نيون.
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-2.5 sm:justify-start">
            {hits.map((h, i) => (
              <span
                key={h.id}
                className="animate-pop-in inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3.5 py-2 font-brand text-sm font-bold backdrop-blur-sm sm:text-base"
                style={{
                  animationDelay: `${Math.min(i, 8) * 40}ms`,
                  boxShadow: `0 0 24px -10px color-mix(in oklab, ${h.color} 70%, transparent)`,
                  borderColor: `color-mix(in oklab, ${h.color} 45%, transparent)`,
                  color: h.color,
                }}
              >
                <span className="grid size-6 place-items-center rounded-lg bg-white/10 text-[11px] text-foreground/80">
                  {i + 1}
                </span>
                {h.user}
              </span>
            ))}
          </div>
        )}
      </div>
    </GameCard>
  );
}
