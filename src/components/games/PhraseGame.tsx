import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Eye,
  EyeOff,
  Lock,
  MessageSquareQuote,
  Sparkles,
  Square,
  Users,
} from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { formatClock, useGameSession } from "@/hooks/useGameSession";
import { useDurationOptions } from "@/hooks/useDurationOptions";
import { useGameMoments } from "@/hooks/useGameMoments";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GameStage, { type Phase } from "@/components/games/GameStage";
import SelectField from "@/components/games/SelectField";
import type { GameMoment } from "@/lib/game-moments";

const ACCENT = "#a78bfa";
const GLOW = "#d8b4fe";

type Hit = {
  id: number;
  user: string;
  color: string;
  at: number;
};

let hitSeq = 0;

export default function PhraseGame({
  messages: chatMessages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const { messages, dir } = useT();
  const { options: durationOptions } = useDurationOptions();
  const { loseMoment, stoppedMoment, successMoment } = useGameMoments();
  const g = messages.games.phrase;
  const c = messages.common;

  const [phase, setPhase] = useState<Phase>("setup");
  const [phrase, setPhrase] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [wordOpen, setWordOpen] = useState(false);
  const [showWord, setShowWord] = useState(false);
  const [moment, setMoment] = useState<GameMoment | null>(null);
  const session = useGameSession(90);
  const hitsRef = useRef(hits);
  hitsRef.current = hits;

  useEffect(() => {
    session.setOnExpire(() => {
      const count = hitsRef.current.length;
      setMoment(
        count > 0
          ? successMoment(g.sessionEnded, `${count} ${g.guessedCorrect}`)
          : loseMoment(g.timeoutNoGuess),
      );
    });
    return () => session.setOnExpire(null);
  }, [session.setOnExpire, successMoment, loseMoment, g.sessionEnded, g.guessedCorrect, g.timeoutNoGuess]);

  const target = useMemo(() => normalizeAr(phrase), [phrase]);
  const latest = hits[0] ?? null;
  const urgent = session.left != null && session.left <= 10;

  useNewMessages(chatMessages, session.running, (m) => {
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
    setMoment(null);
    setHits([]);
    session.start();
    setPhase("playing");
  };

  const backToSetup = () => {
    session.stop();
    setMoment(null);
    setPhase("setup");
  };

  const clockLabel = session.running
    ? session.left == null
      ? "∞"
      : formatClock(session.left)
    : formatClock(session.durationSec > 0 ? session.durationSec : 0);

  return (
    <>
    <GameStage
      phase={phase}
      accent={ACCENT}
      glow={GLOW}
      icon={<MessageSquareQuote />}
      title={g.title}
      description={g.desc}
      chatActive={chatActive}
      canStart={Boolean(target)}
      setupCtaLabel={target ? g.setupCta : g.setupCtaNeed}
      startLabel={g.start}
      onGoReady={() => {
        if (target) setPhase("ready");
      }}
      onStart={start}
      onBackToSetup={backToSetup}
      moment={moment}
      onDismissMoment={() => setMoment(null)}
      settings={
        <div className="space-y-4">
          <SelectField
            label={c.duration}
            icon={<Clock className="size-4" />}
            accent={ACCENT}
            value={String(session.durationSec)}
            onChange={(v) => session.setDurationSec(Number(v))}
            options={durationOptions.map((o) => ({ value: String(o.value), label: o.label }))}
          />

          <button
            type="button"
            onClick={() => {
              setShowWord(false);
              setWordOpen(true);
            }}
            className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed px-5 py-5 text-right transition"
            style={{
              borderColor: `${ACCENT}66`,
              background: target ? `${ACCENT}18` : `${ACCENT}0d`,
            }}
          >
            <span
              className="grid size-14 shrink-0 place-items-center rounded-2xl text-white transition group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})`,
                boxShadow: `0 15px 40px -12px ${ACCENT}`,
              }}
            >
              <Lock className="size-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold text-white sm:text-xl">
                {target ? c.secretWordReady : c.secretWordPrompt}
              </span>
              <span className="mt-1 block text-xs text-white/60 sm:text-sm">
                {target ? c.secretHidden : c.streamerOnly}
              </span>
            </span>
            {target ? (
              <span
                className="rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider"
                style={{ background: `${ACCENT}30`, color: GLOW }}
              >
                ✓ محفوظة
              </span>
            ) : null}
          </button>
        </div>
      }
      play={
          <div className="game-play-shell">
          <div
            className="game-toolbar glass flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-3 sm:p-4"
            style={{ borderColor: `${ACCENT}44` }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 place-items-center rounded-2xl sm:size-12"
                style={{ background: `${ACCENT}22`, color: ACCENT }}
              >
                <MessageSquareQuote className="size-5 sm:size-6" />
              </span>
              <div>
                <p className="text-base font-extrabold text-white sm:text-lg">
                  {session.running ? c.sessionRunning2 : c.sessionStopped}
                </p>
                <p className="text-sm text-white/55 sm:text-base">
                  {session.running
                    ? `${hits.length} · ${clockLabel}`
                    : c.pressResumeGuess}
                </p>
              </div>
            </div>

            {session.running ? (
              <Button
                variant="destructive"
                className="h-11 gap-1.5 rounded-2xl font-extrabold"
                onClick={() => {
                  session.stop();
                  setMoment(stoppedMoment(g.stoppedSession));
                }}
              >
                <Square className="size-4" /> {c.stop}
              </Button>
            ) : (
              <Button
                className="h-11 gap-1.5 rounded-2xl font-extrabold text-white hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                onClick={start}
                disabled={!target || !chatActive}
              >
                {c.resume}
              </Button>
            )}
          </div>

          <div className="game-play-grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {/* Timer + spotlight */}
          <div
            className="relative flex min-h-0 flex-col justify-center overflow-hidden rounded-[1.75rem] border p-5 text-center sm:p-8"
            style={{
              borderColor: `${ACCENT}55`,
              background: `
                radial-gradient(70% 60% at 50% 0%, ${ACCENT}30, transparent 65%),
                radial-gradient(60% 60% at 100% 100%, ${GLOW}22, transparent 70%),
                linear-gradient(180deg, oklch(0.14 0.05 300 / 0.85), oklch(0.09 0.03 285 / 0.95))
              `,
            }}
          >
            <div
              className="pointer-events-none absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
              style={{ background: ACCENT }}
            />

            <div className="relative">
              <p
                className="text-xs font-extrabold tracking-[0.28em] uppercase sm:text-sm"
                style={{ color: GLOW }}
              >
                خمّنوا في الشات
              </p>
              <p
                className="font-brand mt-2 text-5xl font-bold leading-none tabular-nums sm:text-6xl"
                style={session.running && !urgent ? { color: GLOW } : session.running && urgent ? { color: "var(--destructive)" } : { color: "rgba(255,255,255,0.55)" }}
              >
                {clockLabel}
              </p>
              <p className="mt-3 font-brand text-2xl font-bold leading-snug text-white/50 sm:text-4xl">
                ؟ ؟ ؟
              </p>
              <p className="mt-2 text-base text-white/55 sm:text-lg">
                الكلمة مخفية — اللي يعرفها يكتبها في الشات
              </p>

              <div className="mx-auto mt-6 min-h-[5rem]">
                {latest ? (
                  <div key={latest.id} className="animate-pop-in">
                    <p
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold"
                      style={{
                        borderColor: `${ACCENT}55`,
                        background: `${ACCENT}18`,
                        color: GLOW,
                      }}
                    >
                      <Sparkles className="size-3.5" />
                      خمّن الكلمة السرية
                    </p>
                    <p
                      className="font-brand mt-4 text-4xl font-bold tracking-tight sm:text-6xl"
                      style={{
                        color: latest.color,
                        textShadow: `0 0 40px color-mix(in oklab, ${latest.color} 55%, transparent)`,
                      }}
                    >
                      {latest.user}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-white/50">
                    <Users className="size-8 opacity-50" />
                    <p className="text-sm font-bold">
                      {session.running ? c.waitingFirstGuess : c.startToShowNames}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Name wall */}
          <div className="glass flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 p-4 sm:p-5">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="size-5" style={{ color: GLOW }} />
                <h5 className="text-base font-extrabold text-white sm:text-lg">
                  الأسماء اللي خمّنت صح ({hits.length})
                </h5>
              </div>
              {hits.length > 0 && !session.running ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-bold text-white/60 hover:text-white"
                  onClick={() => setHits([])}
                >
                  مسح
                </Button>
              ) : null}
            </div>

            {hits.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/12 bg-black/25 px-4 py-8 text-center text-base text-white/50">
                لما أحد يخمن الكلمة، اسمه يطلع هنا بهالة نيون.
              </p>
            ) : (
              <div className="min-h-0 flex-1 overflow-hidden">
              <div className="flex h-full flex-wrap content-start gap-2 overflow-hidden">
                {hits.map((h, i) => (
                  <span
                    key={h.id}
                    className="animate-pop-in font-brand inline-flex items-center gap-2 rounded-2xl border bg-black/30 px-3.5 py-2 text-sm font-bold backdrop-blur-sm sm:text-base"
                    style={{
                      animationDelay: `${Math.min(i, 8) * 40}ms`,
                      boxShadow: `0 0 24px -10px color-mix(in oklab, ${h.color} 70%, transparent)`,
                      borderColor: `color-mix(in oklab, ${h.color} 45%, transparent)`,
                      color: h.color,
                    }}
                  >
                    <span className="grid size-6 place-items-center rounded-lg bg-white/10 text-[11px] text-white/80">
                      {i + 1}
                    </span>
                    {h.user}
                  </span>
                ))}
              </div>
              </div>
            )}
          </div>
          </div>
        </div>
      }
    />

    <Dialog
      open={wordOpen}
      onOpenChange={(open) => {
        setWordOpen(open);
        if (!open) setShowWord(false);
      }}
    >
      <DialogContent className="max-w-md border-white/12 bg-[#0d0a1e] sm:rounded-3xl" dir={dir}>
        <DialogHeader className="text-right">
          <div
            className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl text-white"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
          >
            <Lock className="size-7" />
          </div>
          <DialogTitle className="text-center text-2xl font-extrabold">
            اكتب الكلمة هنا
          </DialogTitle>
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
            placeholder={c.wordPh}
            className="h-14 border-white/15 bg-black/40 pe-12 text-center text-xl font-extrabold"
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
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-lg p-1.5 text-white/60 hover:text-white"
            onClick={() => setShowWord((v) => !v)}
            aria-label={showWord ? c.hideWord : c.showWord}
          >
            {showWord ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button
            className="h-12 w-full rounded-2xl font-extrabold text-white hover:brightness-110"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
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
    </>
  );
}
