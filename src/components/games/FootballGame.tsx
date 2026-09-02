import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, RotateCcw, Square, Trophy, UserRound } from "lucide-react";
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
import GameMomentOverlay from "@/components/games/GameMomentOverlay";
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
const HINT_INTERVAL_SEC = 12;

type Winner = { user: string; answer: string; color: string };

function PlayerCard({
  player,
  revealed,
  hintLevel,
  labels,
}: {
  player: FootballPlayer;
  revealed: boolean;
  hintLevel: number;
  labels: {
    hidden: string;
    hintNationality: string;
    hintDebut: string;
    hintClub: string;
    hintPosition: string;
    hintLevel: string;
  };
}) {
  const hints: string[] = [];
  if (hintLevel >= 1) hints.push(`${labels.hintNationality} ${player.nationality}`);
  if (hintLevel >= 2 && player.clubs[0]) hints.push(`${labels.hintDebut} ${player.clubs[0]}`);
  if (hintLevel >= 3 && player.clubs[1]) hints.push(`${labels.hintClub} ${player.clubs[1]}`);
  if (hintLevel >= 4 && player.clubs[2]) hints.push(`${labels.hintClub} ${player.clubs[2]}`);
  if (hintLevel >= 5) hints.push(`${labels.hintPosition} ${player.position}`);

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

      <div className="w-full max-w-md space-y-2">
        {hints.map((h, i) => (
          <p
            key={i}
            className="animate-pop-in rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-bold text-emerald-100"
          >
            <span className="text-emerald-400/80">{labels.hintLevel} {i + 1} · </span>
            {h}
          </p>
        ))}
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
  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const session = useGameSession(durationSec);
  const settled = useRef(false);
  const hasNextRef = useRef(false);

  const current = finished ? undefined : deck[index];
  const hasNext = index < deck.length - 1;
  hasNextRef.current = hasNext;
  const urgent = session.left != null && session.left <= 10;
  const isPlayerRound = current?.kind === "player";

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
    if (!session.running || !isPlayerRound) return;
    setHintLevel(0);
    setRevealed(false);
    const id = window.setInterval(() => {
      if (settled.current) return;
      setHintLevel((h) => Math.min(h + 1, 5));
    }, HINT_INTERVAL_SEC * 1000);
    return () => window.clearInterval(id);
  }, [session.running, isPlayerRound, index]);

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
    setHintLevel(0);
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
        ...stoppedMoment(),
        highlight: current.player.name,
        actionLabel: hasNext ? c.nextRound : c.finalResult,
        onAction: () => goNext(true),
      });
    } else {
      setMoment({
        ...stoppedMoment(),
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
          <div className="game-play-grid min-h-0 flex-1">
            <div className="game-play-shell flex min-h-0 flex-col gap-3">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
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
                      disabled={!chatActive}
                      onClick={() => session.start(durationSec)}
                    >
                      <RotateCcw className="size-3.5" />
                      {c.resume}
                    </Button>
                  )}
                </div>
              </div>

              <div className="game-play-arena relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-black/30 p-4 sm:p-6">
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
                    <p className="mb-3 text-center text-sm font-extrabold text-amber-200/90">
                      {g.guessPrompt}
                    </p>
                    <PlayerCard
                      player={current.player}
                      revealed={revealed || Boolean(winner)}
                      hintLevel={hintLevel}
                      labels={{
                        hidden: g.hiddenPlayer,
                        hintNationality: g.hintNationality,
                        hintDebut: g.hintDebut,
                        hintClub: g.hintClub,
                        hintPosition: g.hintPosition,
                        hintLevel: g.hintLevel,
                      }}
                    />
                  </>
                ) : null}

                {moment ? (
                  <GameMomentOverlay
                    moment={moment}
                    accent={ACCENT}
                    glow={GLOW}
                    onDismiss={() => goNext(true)}
                  />
                ) : null}
              </div>
            </div>

            <aside className="flex min-h-0 w-full shrink-0 flex-col gap-3 lg:w-64">
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
