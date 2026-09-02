import { useEffect, useRef, useState } from "react";
import { Clapperboard, Clock, Eye, EyeOff, RotateCcw, Square, Trophy, VolumeX } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { formatClock, useGameSession } from "@/hooks/useGameSession";
import { useDurationOptions } from "@/hooks/useDurationOptions";
import { useGameMoments } from "@/hooks/useGameMoments";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import {
  MOVIE_BANK,
  MOVIE_ROUND_OPTIONS,
  movieGenre,
  movieHint,
  movieMatches,
  movieTitle,
  shuffleMovies,
  type MovieItem,
} from "@/lib/movies";
import type { GameMoment } from "@/lib/game-moments";
import { recordGameWin } from "@/lib/record-game-win";
import { cn } from "@/lib/utils";
import GameStage, { type Phase } from "@/components/games/GameStage";
import SelectField from "@/components/games/SelectField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ACCENT = "#eab308";
const GLOW = "#fde68a";
const HINT_EVERY = 14;

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-center">
      <p className="text-[10px] font-extrabold tracking-wider text-white/45 uppercase">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function FilmPerforations({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "absolute top-0 hidden h-full w-7 flex-col justify-around py-4 sm:flex",
        side === "left" ? "left-0" : "right-0",
      )}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="mx-auto block h-4 w-3.5 rounded-[3px] bg-black/70 ring-1 ring-amber-200/20" />
      ))}
    </div>
  );
}

export default function MovieGame({
  messages: chatMessages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const { messages, locale, dir } = useT();
  const { options: durationOptions } = useDurationOptions();
  const { loseMoment, stoppedMoment, winMoment } = useGameMoments();
  const g = messages.games.movie;
  const c = messages.common;

  const [phase, setPhase] = useState<Phase>("setup");
  const [roundCount, setRoundCount] = useState("8");
  const [deck, setDeck] = useState<MovieItem[]>([]);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreColors, setScoreColors] = useState<Record<string, string>>({});
  const [moment, setMoment] = useState<GameMoment | null>(null);
  const [finished, setFinished] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [hintLevel, setHintLevel] = useState(0);

  const session = useGameSession(90);
  const settled = useRef(false);
  const hasNextRef = useRef(false);

  const current = finished ? undefined : deck[index];
  const hasNext = index < deck.length - 1;
  hasNextRef.current = hasNext;
  const urgent = session.left != null && session.left <= 10;
  const title = current ? movieTitle(current, locale) : "";
  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  useEffect(() => {
    session.setOnExpire(() => {
      if (settled.current) return;
      settled.current = true;
      setMoment({
        ...loseMoment(g.timeoutSub),
        highlight: title,
        actionLabel: hasNextRef.current ? c.nextRound : c.finalResult,
        onAction: () => goNext(),
      });
    });
    return () => session.setOnExpire(null);
  }, [session.setOnExpire, loseMoment, g.timeoutSub, c.nextRound, c.finalResult, title]);

  useEffect(() => {
    if (session.running) {
      settled.current = false;
      setHintLevel(0);
    }
  }, [session.running, index]);

  useEffect(() => {
    if (!session.running) return;
    const id = window.setInterval(() => {
      if (settled.current) return;
      setHintLevel((h) => Math.min(h + 1, 3));
    }, HINT_EVERY * 1000);
    return () => window.clearInterval(id);
  }, [session.running, index]);

  useNewMessages(chatMessages, session.running && Boolean(current) && !finished, (m) => {
    const who = participantKey(m);
    if (!current || settled.current || !who) return;
    if (session.hasParticipated(who)) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    if (!session.tryClaim(who)) return;
    if (!movieMatches(text, current, normalizeAr)) return;
    settled.current = true;
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    recordGameWin({ user: m.user, userKey: who, color: m.color, game: messages.gameMeta.movie.label });
    setScoreColors((col) => ({ ...col, [m.user]: m.color }));
    session.stop();
    setMoment({
      ...winMoment(m.user, m.color, title),
      actionLabel: hasNextRef.current ? c.nextRound : c.finalResult,
      onAction: () => goNext(),
    });
  });

  const goNext = () => {
    setMoment(null);
    if (!hasNextRef.current) {
      session.stop();
      setFinished(true);
      setFinalOpen(true);
      return;
    }
    setIndex((i) => i + 1);
    setHintLevel(0);
    session.clearParticipants();
    session.start();
  };

  const startGame = () => {
    setDeck(shuffleMovies(Number(roundCount)));
    setIndex(0);
    setScores({});
    setScoreColors({});
    setFinished(false);
    setMoment(null);
    setHintLevel(0);
    setPhase("playing");
    session.start();
  };

  const publicHints =
    current && session.running
      ? [
          hintLevel >= 1 ? `${g.genre}: ${movieGenre(current, locale)}` : null,
          hintLevel >= 2 ? `${g.year}: ${current.year}` : null,
          hintLevel >= 3 ? movieHint(current, locale) : null,
        ].filter(Boolean)
      : [];

  return (
    <>
      <GameStage
        phase={phase}
        accent={ACCENT}
        glow={GLOW}
        icon={<Clapperboard className="size-10" />}
        title={g.title}
        description={g.desc}
        chatActive={chatActive}
        setupCtaLabel={g.setupCta}
        startLabel={g.start}
        onGoReady={() => setPhase("ready")}
        onStart={startGame}
        onBackToSetup={() => {
          session.stop();
          setPhase("setup");
          setFinished(false);
          setMoment(null);
        }}
        moment={moment}
        onDismissMoment={() => setMoment(null)}
        settings={
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={g.roundCount}
                icon={<Clapperboard className="size-3.5" />}
                accent={ACCENT}
                value={roundCount}
                onChange={setRoundCount}
                options={MOVIE_ROUND_OPTIONS}
              />
              <SelectField
                label={g.roundDuration}
                icon={<Clock className="size-3.5" />}
                accent={ACCENT}
                value={String(session.durationSec)}
                onChange={(v) => session.setDurationSec(Number(v))}
                options={durationOptions.map((o) => ({ value: String(o.value), label: o.label }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <MiniStat label={g.library} value={String(MOVIE_BANK.length)} />
              <MiniStat label={g.rounds} value={roundCount} />
              <MiniStat label={g.rule} value={g.ruleShort} />
            </div>
            <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-white/70">
              {g.setupHint}
            </p>
          </div>
        }
        play={
          <div className="game-play-shell min-h-0 flex-1">
            <div className="game-play-grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
              <div
                className="relative flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border"
                style={{
                  borderColor: `${ACCENT}50`,
                  background:
                    "linear-gradient(180deg, oklch(0.12 0.03 85 / 0.95), oklch(0.08 0.02 70 / 0.98))",
                }}
              >
                <FilmPerforations side="left" />
                <FilmPerforations side="right" />

                <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-10 py-6 text-center sm:px-16">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                      background: `radial-gradient(50% 45% at 50% 40%, ${ACCENT}28, transparent 70%)`,
                    }}
                  />

                  <span className="relative inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-1.5 text-xs font-extrabold tracking-[0.22em] text-amber-200 uppercase">
                    <VolumeX className="size-3.5" />
                    {g.silent}
                  </span>

                  <h2 className="font-display relative mt-5 text-4xl font-black text-white sm:text-5xl lg:text-6xl">
                    {g.actNow}
                  </h2>
                  <p className="relative mt-3 max-w-lg text-base leading-7 text-white/65 sm:text-lg">
                    {g.audienceGuess}
                  </p>

                  <div className="relative mt-8 w-full max-w-md space-y-2">
                    {publicHints.length === 0 && session.running ? (
                      <p className="text-sm font-bold text-white/40">{g.hintsSoon}</p>
                    ) : null}
                    {publicHints.map((h) => (
                      <p
                        key={String(h)}
                        className="animate-pop-in rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-100"
                      >
                        {h}
                      </p>
                    ))}
                  </div>

                  <p
                    className={cn(
                      "font-brand relative mt-8 text-5xl font-black tabular-nums sm:text-6xl",
                      urgent && session.running ? "text-red-400" : "text-amber-200",
                    )}
                  >
                    {session.left != null ? formatClock(session.left) : c.unlimited}
                  </p>
                  <p className="relative mt-1 text-xs font-extrabold tracking-wider text-white/40 uppercase">
                    {g.round} {index + 1} / {deck.length}
                  </p>
                </div>
              </div>

              <aside className="flex min-h-0 flex-col gap-3">
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${ACCENT}55`,
                    background: `linear-gradient(180deg, ${ACCENT}20, oklch(0.12 0.04 85 / 0.92))`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-extrabold tracking-[0.2em] text-amber-200/80 uppercase">
                      {g.streamerOnly}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowTitle((v) => !v)}
                      className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10"
                      aria-label={showTitle ? g.hideTitle : g.showTitle}
                    >
                      {showTitle ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="font-display mt-2 text-center text-2xl font-black leading-snug text-white">
                    {showTitle ? title || "—" : "••••"}
                  </p>
                  {current && showTitle ? (
                    <p className="mt-2 text-center text-xs text-amber-100/70">
                      {movieGenre(current, locale)} · {current.year}
                    </p>
                  ) : null}
                  <p className="mt-2 text-center text-[11px] text-white/50">{g.actThis}</p>
                </div>

                <div className="flex gap-2">
                  {session.running ? (
                    <Button
                      variant="destructive"
                      className="h-10 flex-1 rounded-xl font-extrabold"
                      onClick={() => {
                        session.stop();
                        settled.current = true;
                        setMoment({
                          ...stoppedMoment(g.stoppedSub),
                          highlight: title,
                          actionLabel: hasNext ? c.nextRound : c.finalResult,
                          onAction: () => goNext(),
                        });
                      }}
                    >
                      <Square className="size-3.5" /> {c.stop}
                    </Button>
                  ) : (
                    <Button
                      className="h-10 flex-1 rounded-xl font-extrabold text-black"
                      disabled={!chatActive || finished}
                      style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                      onClick={() => session.start()}
                    >
                      <RotateCcw className="size-3.5" /> {c.resume}
                    </Button>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wider text-white/50 uppercase">
                    <Trophy className="size-3.5 text-amber-300" />
                    {g.scoreboard}
                  </p>
                  <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                    {leaderboard.length === 0 ? (
                      <li className="text-center text-sm text-white/35">{g.waitingGuess}</li>
                    ) : (
                      leaderboard.map(([name, pts], i) => (
                        <li key={name} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-sm font-bold">
                          <span className="truncate" style={{ color: scoreColors[name] }}>
                            {i + 1}. {name}
                          </span>
                          <span className="tabular-nums text-amber-200">{pts}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        }
      />

      <Dialog open={finalOpen} onOpenChange={setFinalOpen}>
        <DialogContent className="border-amber-400/30 sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 font-display text-2xl">
              <Trophy className="size-7 text-amber-300" />
              {c.finalResult}
            </DialogTitle>
            <DialogDescription asChild>
              <ul className="mt-4 space-y-2">
                {leaderboard.slice(0, 10).map(([name, pts], i) => (
                  <li key={name} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 font-bold">
                    <span>
                      {i + 1}. <span style={{ color: scoreColors[name] }}>{name}</span>
                    </span>
                    <span className="text-amber-200">{pts}</span>
                  </li>
                ))}
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="font-extrabold"
              onClick={() => {
                setFinalOpen(false);
                setPhase("setup");
              }}
            >
              {c.back}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
