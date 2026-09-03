import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Lock, RotateCcw, Sparkles, Square, Trophy, UserRound } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { formatClock, useGameSession } from "@/hooks/useGameSession";
import { useDurationOptions } from "@/hooks/useDurationOptions";
import { useGameMoments } from "@/hooks/useGameMoments";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import { recordGameWin } from "@/lib/record-game-win";
import {
  FOOTBALL_ROUND_OPTIONS,
  buildFootballSession,
  playerMatches,
  triviaMatches,
  type FootballRound,
} from "@/lib/football-pack";
import { getFootballPlayers, getFootballTrivia } from "@/lib/football-players";
import type { FootballPlayer } from "@/lib/football-players";
import type { GameMoment } from "@/lib/game-moments";
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

const ACCENT = "#22c55e";
const GLOW = "#4ade80";
const HINT_EVERY_SEC = 3;

type Winner = { user: string; answer: string; color: string };

type PlayerHintStep = { label: string; value: string };

function buildPlayerHintSteps(
  player: FootballPlayer,
  labels: {
    hintNationality: string;
    hintDebut: string;
    hintClub: string;
    hintPosition: string;
  },
): PlayerHintStep[] {
  const steps: PlayerHintStep[] = [{ label: labels.hintNationality, value: player.nationality }];
  if (player.clubs[0]) steps.push({ label: labels.hintDebut, value: player.clubs[0] });
  if (player.clubs[1]) steps.push({ label: labels.hintClub, value: player.clubs[1] });
  if (player.clubs[2]) steps.push({ label: labels.hintClub, value: player.clubs[2] });
  steps.push({ label: labels.hintPosition, value: player.position });
  return steps;
}

function PlayerCard({
  player,
  revealed,
  hintLevel,
  nextHintIn,
  allHintsShown,
  labels,
}: {
  player: FootballPlayer;
  revealed: boolean;
  hintLevel: number;
  nextHintIn: number | null;
  allHintsShown: boolean;
  labels: {
    hidden: string;
    hintNationality: string;
    hintDebut: string;
    hintClub: string;
    hintPosition: string;
    hintLevel: string;
    hintNextIn: string;
    hintAllShown: string;
    hintLocked: string;
  };
}) {
  const steps = buildPlayerHintSteps(player, labels);
  const progress =
    nextHintIn != null ? ((HINT_EVERY_SEC - nextHintIn) / HINT_EVERY_SEC) * 100 : 100;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
      <div
        className={cn(
          "relative grid size-44 place-items-center overflow-hidden rounded-3xl border-4 shadow-2xl transition-all duration-700 sm:size-52",
          revealed ? "border-emerald-400/70" : "border-white/15",
        )}
        style={{
          background: `radial-gradient(circle at 50% 30%, ${player.color}55, oklch(0.12 0.04 145 / 0.95))`,
          boxShadow: revealed ? `0 0 60px -10px ${player.color}` : undefined,
        }}
      >
        <div
          className={cn(
            "flex flex-col items-center transition-all duration-700",
            revealed ? "scale-100 blur-0" : "scale-110 blur-xl",
          )}
        >
          <UserRound className="size-20 text-white/90 sm:size-24" strokeWidth={1.2} />
          {revealed ? (
            <p className="font-brand mt-2 px-3 text-center text-lg font-black text-white sm:text-xl">
              {player.name}
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold tracking-widest text-white/50 uppercase">
              {labels.hidden}
            </p>
          )}
        </div>
        {!revealed ? (
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_2px,transparent_2px,transparent_8px)]" />
        ) : null}
      </div>

      <div className="w-full max-w-lg">
        {!revealed ? (
          <div className="mb-3 flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i < hintLevel ? "w-7 bg-emerald-400 shadow-[0_0_12px_-2px_#4ade80]" : "w-1.5 bg-white/20",
                )}
              />
            ))}
          </div>
        ) : null}

        {!revealed && nextHintIn != null && !allHintsShown ? (
          <div className="mb-3 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-amber-600/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-lg font-black text-amber-200 tabular-nums">
                {nextHintIn}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-amber-200/90">
                  <Sparkles className="size-3.5 shrink-0" />
                  {labels.hintNextIn.replace("{s}", String(nextHintIn))}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-[width] duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!revealed && allHintsShown ? (
          <p className="mb-3 text-center text-xs font-bold text-emerald-300/80">{labels.hintAllShown}</p>
        ) : null}

        <div className="space-y-2">
          {steps.map((step, i) => {
            const unlocked = i < hintLevel;
            return (
              <div
                key={`${step.label}-${i}`}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-center text-sm font-bold transition-all duration-500",
                  unlocked
                    ? "animate-pop-in border-emerald-500/30 bg-emerald-500/12 text-emerald-50 shadow-[0_8px_24px_-12px_rgba(34,197,94,0.45)]"
                    : "border-white/8 bg-black/25 text-white/35",
                )}
              >
                {unlocked ? (
                  <>
                    <span className="text-emerald-400/90">
                      {labels.hintLevel} {i + 1} ·{" "}
                    </span>
                    <span className="text-white/70">{step.label}</span>{" "}
                    <span className="text-white">{step.value}</span>
                  </>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Lock className="size-3.5 opacity-60" />
                    {labels.hintLevel} {i + 1} · {labels.hintLocked}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FootballGame({
  messages: chatMessages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const { messages, locale, dir } = useT();
  const { options: durationOptions } = useDurationOptions();
  const { loseMoment, stoppedMoment, winMoment } = useGameMoments();
  const g = messages.games.football;
  const c = messages.common;

  const triviaBank = useMemo(() => getFootballTrivia(locale), [locale]);
  const playerBank = useMemo(() => getFootballPlayers(locale), [locale]);

  const [phase, setPhase] = useState<Phase>("setup");
  const [roundCount, setRoundCount] = useState("30");
  const [playerEvery, setPlayerEvery] = useState("4");
  const [durationSec, setDurationSec] = useState(60);
  const [deck, setDeck] = useState<FootballRound[]>([]);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreColors, setScoreColors] = useState<Record<string, string>>({});
  const [winner, setWinner] = useState<Winner | null>(null);
  const [moment, setMoment] = useState<GameMoment | null>(null);
  const [finished, setFinished] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [hintLevel, setHintLevel] = useState(1);
  const [nextHintIn, setNextHintIn] = useState<number | null>(HINT_EVERY_SEC);
  const [revealed, setRevealed] = useState(false);

  const session = useGameSession(durationSec);
  const settled = useRef(false);
  const hasNextRef = useRef(false);

  const current = finished ? undefined : deck[index];
  const hasNext = index < deck.length - 1;
  hasNextRef.current = hasNext;
  const urgent = session.left != null && session.left <= 10;
  const isPlayerRound = current?.kind === "player";
  const playerHintSteps =
    current?.kind === "player"
      ? buildPlayerHintSteps(current.player, {
          hintNationality: g.hintNationality,
          hintDebut: g.hintDebut,
          hintClub: g.hintClub,
          hintPosition: g.hintPosition,
        })
      : [];
  const maxHints = playerHintSteps.length;
  const allHintsShown = hintLevel >= maxHints;

  const playerRoundCount = useMemo(
    () => Math.floor(Number(roundCount) / Number(playerEvery)),
    [roundCount, playerEvery],
  );

  useEffect(() => {
    session.setOnExpire(() => {
      if (settled.current) return;
      settled.current = true;
      session.stop();
      if (current?.kind === "player") {
        setRevealed(true);
        setMoment({
          ...loseMoment(g.nobodyAnswered),
          highlight: current.player.name,
          highlightColor: current.player.color,
          actionLabel: hasNextRef.current ? c.nextRound : c.finalResult,
          onAction: () => goNext(true),
        });
      } else {
        setMoment({
          ...loseMoment(c.timeoutNoAnswer),
          subtitle: `${g.correctAnswer} ${current?.kind === "trivia" ? current.a : ""}`,
          actionLabel: hasNextRef.current ? c.nextRound : c.finalResult,
          onAction: () => goNext(true),
        });
      }
    });
    return () => session.setOnExpire(null);
  }, [session.setOnExpire, loseMoment, c, g, current]);

  useEffect(() => {
    if (!session.running || !isPlayerRound || maxHints === 0) return;
    setHintLevel(1);
    setNextHintIn(HINT_EVERY_SEC);
    setRevealed(false);

    const id = window.setInterval(() => {
      if (settled.current) return;
      setNextHintIn((t) => {
        if (t == null) return null;
        if (t > 1) return t - 1;
        setHintLevel((h) => {
          const next = Math.min(h + 1, maxHints);
          if (next >= maxHints) setNextHintIn(null);
          else setNextHintIn(HINT_EVERY_SEC);
          return next;
        });
        return t;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [session.running, isPlayerRound, index, maxHints]);

  useEffect(() => {
    if (session.running) settled.current = false;
  }, [session.running]);

  useNewMessages(chatMessages, session.running && !finished && Boolean(current), (m) => {
    const who = participantKey(m);
    if (!current || settled.current || !who) return;
    if (session.hasParticipated(who)) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    if (!session.tryClaim(who)) return;

    const matched =
      current.kind === "trivia"
        ? triviaMatches(text, current.a, normalizeAr)
        : playerMatches(text, current.player, normalizeAr);

    if (!matched) return;

    settled.current = true;
    setWinner({ user: m.user, answer: m.text, color: m.color });
    recordGameWin({ user: m.user, userKey: who, color: m.color, game: messages.gameMeta.football.label });
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    setScoreColors((col) => ({ ...col, [m.user]: m.color }));
    session.stop();

    if (current.kind === "player") setRevealed(true);

    const subtitle =
      current.kind === "trivia"
        ? `${g.correctAnswer} ${current.a}`
        : current.player.name;

    setMoment({
      ...winMoment(m.user, m.color, subtitle),
      actionLabel: hasNextRef.current ? c.nextRound : c.finalResult,
      onAction: () => goNext(true),
    });
  });

  const goNext = (fromMoment = false) => {
    if (fromMoment) setMoment(null);
    setWinner(null);
    setRevealed(false);
    setHintLevel(1);
    setNextHintIn(HINT_EVERY_SEC);
    if (!hasNext) {
      showFinal();
      return;
    }
    setIndex((i) => i + 1);
    session.clearParticipants();
    session.start(durationSec);
  };

  const showFinal = () => {
    session.stop();
    setFinished(true);
    setMoment(null);
    setFinalOpen(true);
  };

  const startGame = () => {
    const built = buildFootballSession(locale, Number(roundCount), Number(playerEvery));
    setDeck(built);
    setIndex(0);
    setScores({});
    setScoreColors({});
    setFinished(false);
    setPhase("playing");
    session.clearParticipants();
    session.start(durationSec);
  };

  const stopRound = () => {
    settled.current = true;
    session.stop();
    if (current?.kind === "player") {
      setRevealed(true);
      setMoment({
        ...stoppedMoment(c.stoppedManual),
        highlight: current.player.name,
        actionLabel: hasNext ? c.nextRound : c.finalResult,
        onAction: () => goNext(true),
      });
    } else {
      setMoment({
        ...stoppedMoment(c.stoppedManual),
        actionLabel: hasNext ? c.nextRound : c.finalResult,
        onAction: () => goNext(true),
      });
    }
  };

  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <GameStage
        phase={phase}
        accent={ACCENT}
        glow={GLOW}
        icon={<Trophy className="size-10" />}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label={g.roundCount}
              icon={<Trophy className="size-3.5" />}
              accent={ACCENT}
              value={roundCount}
              onChange={setRoundCount}
              options={FOOTBALL_ROUND_OPTIONS}
            />
            <SelectField
              label={g.roundDuration}
              icon={<Clock className="size-3.5" />}
              accent={ACCENT}
              value={String(durationSec)}
              onChange={(v) => setDurationSec(Number(v))}
              options={durationOptions.map((o) => ({
                value: String(o.value),
                label: o.label,
              }))}
            />
            <SelectField
              label={g.playerEvery}
              accent={ACCENT}
              value={playerEvery}
              onChange={setPlayerEvery}
              options={[
                { value: "3", label: `3 ${g.rounds}` },
                { value: "4", label: `4 ${g.rounds}` },
                { value: "5", label: `5 ${g.rounds}` },
              ]}
            />
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:col-span-2">
              <p className="text-sm font-extrabold text-emerald-200">{g.library}</p>
              <p className="mt-1 text-2xl font-black text-white">{triviaBank.length}</p>
              <p className="mt-2 text-xs text-white/55">
                {g.playerRounds}: ~{playerRoundCount}
              </p>
            </div>
          </div>
        }
        play={
          <div className="game-play-shell min-h-0 flex-1">
            <div className="game-play-grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
              <div className="flex min-h-0 flex-col gap-3">
                <div className="game-toolbar flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-500/20 bg-black/30 px-3 py-2.5 sm:px-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full border px-3 py-1.5 text-xs font-extrabold uppercase"
                      style={{
                        borderColor: `${ACCENT}55`,
                        color: GLOW,
                        background: `${ACCENT}15`,
                      }}
                    >
                      {index + 1} / {deck.length}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-extrabold",
                        isPlayerRound ? "bg-amber-500/20 text-amber-200" : "bg-white/10 text-white/70",
                      )}
                    >
                      {isPlayerRound ? g.playerBadge : g.triviaBadge}
                      {current?.kind === "trivia" && current.hard ? ` · ${g.hard}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-brand text-xl font-black tabular-nums",
                        urgent ? "text-red-400" : "text-white",
                      )}
                    >
                      {session.left != null ? formatClock(session.left) : c.unlimited}
                    </span>
                    {session.running ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-9 gap-1 font-extrabold"
                        onClick={stopRound}
                      >
                        <Square className="size-3.5" />
                        {c.stop}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 gap-1 font-extrabold"
                        disabled={!chatActive || Boolean(moment)}
                        onClick={() => session.start(durationSec)}
                      >
                        <RotateCcw className="size-3.5" />
                        {c.resume}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="relative flex min-h-[min(52vh,28rem)] flex-1 flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-black/30 p-4 sm:p-6">
                  {current?.kind === "trivia" ? (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                      <p className="font-display max-w-3xl text-2xl leading-relaxed font-bold text-white sm:text-3xl lg:text-4xl">
                        {current.q}
                      </p>
                      <p className="mt-6 text-sm font-bold text-white/45">{c.firstCorrect}</p>
                    </div>
                  ) : null}
                  {current?.kind === "player" ? (
                    <>
                      <p className="mb-3 shrink-0 text-center text-sm font-extrabold text-amber-200/90">
                        {g.guessPrompt}
                      </p>
                      <PlayerCard
                        player={current.player}
                        revealed={revealed || Boolean(winner)}
                        hintLevel={hintLevel}
                        nextHintIn={session.running ? nextHintIn : null}
                        allHintsShown={allHintsShown}
                        labels={{
                          hidden: g.hiddenPlayer,
                          hintNationality: g.hintNationality,
                          hintDebut: g.hintDebut,
                          hintClub: g.hintClub,
                          hintPosition: g.hintPosition,
                          hintLevel: g.hintLevel,
                          hintNextIn: g.hintNextIn,
                          hintAllShown: g.hintAllShown,
                          hintLocked: g.hintLocked,
                        }}
                      />
                    </>
                  ) : null}
                </div>
              </div>

              <aside className="flex min-h-0 w-full shrink-0 flex-col gap-3 lg:w-auto">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h4 className="text-xs font-extrabold tracking-wider text-white/50 uppercase">
                  {g.scoreboard}
                </h4>
                <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                  {leaderboard.length === 0 ? (
                    <li className="text-sm text-white/40">—</li>
                  ) : (
                    leaderboard.map(([name, pts], i) => (
                      <li
                        key={name}
                        className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm font-bold"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="text-white/40">{i + 1}.</span>
                          <span style={{ color: scoreColors[name] ?? "#fff" }}>{name}</span>
                        </span>
                        <span className="tabular-nums text-emerald-300">{pts}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              {winner ? (
                <div className="animate-pop-in rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-center">
                  <p className="text-xs font-extrabold text-emerald-300 uppercase">{g.whoAnswered}</p>
                  <p className="font-brand mt-1 text-xl font-black" style={{ color: winner.color }}>
                    {winner.user}
                  </p>
                </div>
              ) : null}
              </aside>
            </div>
          </div>
        }
      />

      <Dialog open={finalOpen} onOpenChange={setFinalOpen}>
        <DialogContent className="border-emerald-500/30 sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 font-display text-2xl">
              <Trophy className="size-7 text-emerald-400" />
              {c.finalResult}
            </DialogTitle>
            <DialogDescription asChild>
              <ul className="mt-4 space-y-2">
                {leaderboard.slice(0, 10).map(([name, pts], i) => (
                  <li
                    key={name}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 font-bold"
                  >
                    <span>
                      {i + 1}. <span style={{ color: scoreColors[name] }}>{name}</span>
                    </span>
                    <span className="text-emerald-300">{pts}</span>
                  </li>
                ))}
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setFinalOpen(false);
                setPhase("setup");
              }}
              className="font-extrabold"
            >
              {c.back}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
