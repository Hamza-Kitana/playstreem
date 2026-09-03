import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Armchair, Crown, RotateCcw } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import type { ChatMessage } from "@/hooks/useKickChat";
import { useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { recordGameWin } from "@/lib/record-game-win";
import GameStage, { type Phase as StagePhase } from "@/components/games/GameStage";

const ACCENT = "#22d3ee";
const GLOW = "#67e8f9";

type Player = { name: string; color: string };

type Chair = {
  id: number;
  number: number | null;
  seated: Player | null;
};

type InnerPhase = "spinning" | "claiming" | "round_end" | "winner";

type SeatMove = {
  chairId: number;
  player: Player;
  fromAngle: number;
  toAngle: number;
};

const SEAT_MOVE_MS = 780;

function lerpPct(a: string, b: string, t: number) {
  const pa = Number.parseFloat(a);
  const pb = Number.parseFloat(b);
  return `${pa + (pb - pa) * t}%`;
}

function MovingToSeat({ move, onDone }: { move: SeatMove; onDone: () => void }) {
  const [t, setT] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / SEAT_MOVE_MS);
      const ease = 1 - Math.pow(1 - p, 3);
      setT(ease);
      if (p < 1) raf = requestAnimationFrame(tick);
      else if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const from = polar(42, move.fromAngle);
  const to = polar(18, move.toAngle);
  const sit = t > 0.82 ? (t - 0.82) / 0.18 : 0;
  const scale = 1 - sit * 0.14;

  return (
    <div
      className="pointer-events-none absolute z-30 flex flex-col items-center"
      style={{
        left: lerpPct(from.left, to.left, t),
        top: lerpPct(from.top, to.top, t),
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
    >
      <span
        className="grid size-9 place-items-center rounded-full border-2 bg-black/60 text-xs font-extrabold shadow-lg sm:size-10"
        style={{
          color: move.player.color,
          borderColor: `${ACCENT}80`,
          boxShadow: `0 0 22px -4px ${move.player.color}`,
        }}
      >
        {move.player.name.slice(0, 1)}
      </span>
      <span
        className="mt-1 max-w-[5rem] truncate rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm"
        style={{ color: move.player.color }}
      >
        {move.player.name}
      </span>
    </div>
  );
}

function isJoinCommand(text: string) {
  const t = normalizeAr(text);
  return (
    t === "دخول" ||
    t.startsWith("دخول ") ||
    t === "ادخل" ||
    t === "انا دخول" ||
    t === "join" ||
    t.startsWith("join ") ||
    t === "enter" ||
    t.startsWith("enter ")
  );
}

function extractNumber(text: string): number | null {
  const t = normalizeAr(text);
  const m = t.match(/(?:^|\s)(\d{1,3})(?:\s|$)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 100) return null;
  return n;
}

function pickClaimSeconds() {
  return 2 + Math.floor(Math.random() * 11);
}

function pickUniqueChairNumbers(count: number): number[] {
  const pool = Array.from({ length: 100 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

function shufflePlayers(items: Player[]): Player[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function polar(percentRadius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    left: `${50 + percentRadius * Math.cos(rad)}%`,
    top: `${50 + percentRadius * Math.sin(rad)}%`,
  };
}

export default function HotSeatGame({
  messages: chatMessages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const { messages, dir } = useT();
  const g = messages.games.seat;
  const c = messages.common;

  const [stagePhase, setStagePhase] = useState<StagePhase>("setup");
  const [innerPhase, setInnerPhase] = useState<InnerPhase>("spinning");
  const [players, setPlayers] = useState<Player[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [spinAngle, setSpinAngle] = useState(0);
  const [eliminatedFlash, setEliminatedFlash] = useState<string[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [round, setRound] = useState(1);
  const [seatMoves, setSeatMoves] = useState<SeatMove[]>([]);

  const session = useGameSession(30);
  const innerPhaseRef = useRef(innerPhase);
  const chairsRef = useRef(chairs);
  const playersRef = useRef(players);
  const spinAngleRef = useRef(0);
  const finishingRef = useRef(false);
  const seatMovesRef = useRef(seatMoves);
  innerPhaseRef.current = innerPhase;
  chairsRef.current = chairs;

  const declareWinner = useCallback((champ: Player | null) => {
    setWinner(champ);
    setWinnerOpen(Boolean(champ));
    if (champ) {
      recordGameWin({
        user: champ.name,
        userKey: champ.name.toLowerCase(),
        color: champ.color,
        game: messages.gameMeta.seat.label,
      });
    }
  }, [messages.gameMeta.seat.label]);
  playersRef.current = players;
  spinAngleRef.current = spinAngle;
  seatMovesRef.current = seatMoves;

  const seatedNames = useMemo(() => {
    const names = new Set(chairs.filter((c) => c.seated).map((c) => c.seated!.name.toLowerCase()));
    for (const move of seatMoves) names.add(move.player.name.toLowerCase());
    return names;
  }, [chairs, seatMoves]);

  const reservedChairIds = useMemo(() => new Set(seatMoves.map((m) => m.chairId)), [seatMoves]);

  const chairsTaken = chairs.filter((c) => c.seated).length + seatMoves.length;
  const chairsTotal = chairs.length;

  const finishClaimRound = () => {
    if (finishingRef.current) return;
    if (innerPhaseRef.current !== "claiming") return;
    finishingRef.current = true;
    session.stop();

    if (seatMovesRef.current.length > 0) {
      const merged = chairsRef.current.map((c) => ({ ...c }));
      for (const move of seatMovesRef.current) {
        const chair = merged.find((ch) => ch.id === move.chairId && !ch.seated);
        if (chair) chair.seated = move.player;
      }
      setSeatMoves([]);
      setChairs(merged);
      chairsRef.current = merged;
    }

    const currentPlayers = playersRef.current;
    if (currentPlayers.length < 2) {
      const champ = currentPlayers[0] ?? null;
      setPlayers(champ ? [champ] : []);
      setChairs([]);
      setInnerPhase("winner");
      declareWinner(champ);
      return;
    }

    let nextChairs = chairsRef.current.map((c) => ({ ...c }));
    const seatedKeys = new Set(
      nextChairs.filter((c) => c.seated).map((c) => c.seated!.name.toLowerCase()),
    );
    const waiting = shufflePlayers(
      currentPlayers.filter((p) => !seatedKeys.has(p.name.toLowerCase())),
    );

    for (const chair of nextChairs) {
      if (chair.seated) continue;
      const next = waiting.shift();
      if (!next) break;
      chair.seated = next;
      seatedKeys.add(next.name.toLowerCase());
    }

    setChairs(nextChairs);
    chairsRef.current = nextChairs;

    const leftover = currentPlayers.filter((p) => !seatedKeys.has(p.name.toLowerCase()));
    let eliminated: Player;
    if (leftover.length === 1) {
      eliminated = leftover[0]!;
    } else if (leftover.length > 1) {
      eliminated = leftover[Math.floor(Math.random() * leftover.length)]!;
    } else {
      eliminated = currentPlayers[Math.floor(Math.random() * currentPlayers.length)]!;
    }

    const survivors = currentPlayers.filter(
      (p) => p.name.toLowerCase() !== eliminated.name.toLowerCase(),
    );
    setEliminatedFlash([eliminated.name]);

    if (survivors.length <= 1) {
      const champ = survivors[0] ?? null;
      setPlayers(champ ? [champ] : []);
      setChairs([]);
      setInnerPhase("winner");
      declareWinner(champ);
      return;
    }

    setPlayers(survivors);
    setChairs([]);
    setInnerPhase("round_end");
  };

  const finishClaimRoundRef = useRef(finishClaimRound);
  finishClaimRoundRef.current = finishClaimRound;

  // Lobby joins during setup
  useNewMessages(chatMessages, stagePhase === "setup" && chatActive, (m) => {
    if (!isJoinCommand(m.text)) return;
    const name = m.user.trim();
    if (!name) return;
    setPlayers((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { name, color: m.color }];
    });
  });

  // Claim numbers while claiming
  useNewMessages(chatMessages, stagePhase === "playing" && innerPhase === "claiming" && chatActive, (m) => {
    const num = extractNumber(m.text);
    if (num == null) return;
    const name = m.user.trim();
    if (!name) return;
    const key = name.toLowerCase();

    const roster = playersRef.current;
    if (!roster.some((p) => p.name.toLowerCase() === key)) return;

    const currentChairs = chairsRef.current;
    if (currentChairs.some((c) => c.seated?.name.toLowerCase() === key)) return;
    if (seatMovesRef.current.some((move) => move.player.name.toLowerCase() === key)) return;

    const target = currentChairs.find(
      (c) => c.number === num && !c.seated && !seatMovesRef.current.some((move) => move.chairId === c.id),
    );
    if (!target) return;

    const player = roster.find((p) => p.name.toLowerCase() === key);
    if (!player) return;

    const playerIdx = roster.findIndex((p) => p.name.toLowerCase() === key);
    const chairIdx = currentChairs.findIndex((c) => c.id === target.id);
    const nPlayers = roster.length;
    const nChairs = currentChairs.length;
    const fromAngle = (playerIdx / nPlayers) * 360 + spinAngleRef.current;
    const toAngle = nChairs === 1 ? 0 : (chairIdx / nChairs) * 360;

    setSeatMoves((prev) => [
      ...prev,
      { chairId: target.id, player, fromAngle, toAngle },
    ]);
  });

  const completeSeatMove = useCallback((chairId: number) => {
    setSeatMoves((prevMoves) => {
      const move = prevMoves.find((m) => m.chairId === chairId);
      if (!move) return prevMoves;
      setChairs((prev) => prev.map((c) => (c.id === chairId ? { ...c, seated: move.player } : c)));
      return prevMoves.filter((m) => m.chairId !== chairId);
    });
  }, []);

  useEffect(() => {
    if (innerPhase !== "claiming") return;
    if (chairs.length === 0) return;
    if (seatMoves.length > 0) return;
    if (chairs.every((c) => c.seated)) {
      finishClaimRoundRef.current();
    }
  }, [chairs, innerPhase, seatMoves.length]);

  useEffect(() => {
    session.setOnExpire(() => {
      finishClaimRoundRef.current();
    });
    return () => session.setOnExpire(null);
  }, [session.setOnExpire]);

  useEffect(() => {
    if (innerPhase !== "round_end") return;
    const t = window.setTimeout(() => {
      beginRound(playersRef.current, round + 1);
    }, 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerPhase]);

  const beginRound = (roster: Player[], nextRound: number) => {
    if (roster.length < 2) {
      const champ = roster[0] ?? null;
      setInnerPhase("winner");
      declareWinner(champ);
      return;
    }
    finishingRef.current = false;
    setEliminatedFlash([]);
    setSeatMoves([]);
    setRound(nextRound);
    setPlayers(roster);
    const count = roster.length - 1;
    setChairs(Array.from({ length: count }, (_, i) => ({ id: i, number: null, seated: null })));
    setSpinAngle(0);
    setInnerPhase("spinning");
  };

  useEffect(() => {
    if (innerPhase !== "spinning") return;
    if (stagePhase !== "playing") return;
    finishingRef.current = false;
    let raf = 0;
    const start = performance.now();
    const duration = 3200 + Math.random() * 1400;
    const totalTurn = 720 + Math.random() * 540;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setSpinAngle(ease * totalTurn);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        const nums = pickUniqueChairNumbers(chairsRef.current.length);
        setChairs((prev) => prev.map((c, i) => ({ ...c, number: nums[i] ?? null, seated: null })));
        setInnerPhase("claiming");
        session.start(pickClaimSeconds());
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerPhase, stagePhase]);

  const startGame = () => {
    if (players.length < 2) return;
    setStagePhase("playing");
    beginRound(players, 1);
  };

  const resetToLobby = () => {
    session.stop();
    finishingRef.current = false;
    setStagePhase("setup");
    setInnerPhase("spinning");
    setChairs([]);
    setSpinAngle(0);
    setSeatMoves([]);
    setEliminatedFlash([]);
    setWinner(null);
    setWinnerOpen(false);
    setRound(1);
  };

  const fullReset = () => {
    resetToLobby();
    setPlayers([]);
  };

  const statusLine =
    innerPhase === "spinning"
      ? g.spinningStatus
      : innerPhase === "claiming"
        ? g.claimingStatus
        : innerPhase === "round_end"
          ? g.nextRoundStatus
          : g.gameEndedStatus;

  return (
    <>
      <GameStage
        phase={stagePhase}
        accent={ACCENT}
        glow={GLOW}
        icon={<Armchair />}
        title={g.title}
        description={g.desc}
        chatActive={chatActive}
        canStart={players.length >= 2}
        setupCtaLabel={players.length >= 2 ? g.setupCta : `${c.minPlayers}`}
        startLabel={g.start}
        onGoReady={() => {
          if (players.length >= 2) setStagePhase("ready");
        }}
        onStart={startGame}
        onBackToSetup={resetToLobby}
        settings={
          <div className="space-y-4">
            <div
              className="rounded-2xl border p-4 text-center"
              style={{
                borderColor: `${ACCENT}44`,
                background: `linear-gradient(135deg, ${ACCENT}18, transparent 70%)`,
              }}
            >
              <p className="text-[10px] font-extrabold tracking-[0.28em] text-white/60 uppercase">
                {g.joinedPlayers}
              </p>
              <p
                className="font-brand mt-1 text-5xl font-black leading-none tabular-nums"
                style={{ color: GLOW }}
              >
                {players.length}
              </p>
              <p className="mt-2 text-xs text-white/60">
                {g.joinPrefix} <span className="font-extrabold text-white">{g.joinWord}</span> {g.joinSuffix}
              </p>
            </div>

            {players.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-extrabold tracking-wider text-white/60 uppercase">
                    {c.players}
                  </p>
                  <button
                    type="button"
                    onClick={fullReset}
                    className="text-[11px] font-bold text-white/50 hover:text-destructive"
                  >
                    {g.clearAll}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {players.map((p) => (
                    <span
                      key={p.name}
                      className="rounded-full border px-3 py-1 text-xs font-bold"
                      style={{
                        borderColor: `color-mix(in oklab, ${p.color} 45%, transparent)`,
                        background: "rgba(0,0,0,0.35)",
                        color: p.color,
                      }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-center text-xs text-white/45">
                {g.waitingPlayers}
              </p>
            )}
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
                  <Armchair className="size-5 sm:size-6" />
                </span>
                <div>
                  <p className="text-base font-extrabold text-white sm:text-lg">
                    {c.round} {round} · {players.length} {c.players} · {chairsTotal || Math.max(players.length - 1, 0)} {c.chairs}
                  </p>
                  <p className="text-sm text-white/55 sm:text-base">
                    {innerPhase === "claiming"
                      ? `${g.hurryReserved} ${chairsTaken}/${chairsTotal}`
                      : statusLine}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-10 gap-1.5 rounded-2xl border-white/12 bg-white/[0.03] font-bold"
                onClick={fullReset}
              >
                <RotateCcw className="size-4" /> {g.resetAll}
              </Button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border p-3 sm:p-5"
              style={{
                borderColor: `${ACCENT}44`,
                background: "linear-gradient(180deg, oklch(0.14 0.05 210 / 0.7), oklch(0.09 0.03 285 / 0.9))",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(55% 50% at 50% 45%, ${ACCENT}18, transparent 70%)`,
                }}
              />

              <div className="relative mx-auto aspect-square w-full max-h-full max-w-2xl flex-1">
                <div
                  className="absolute inset-[6%] rounded-full border border-dashed"
                  style={{ borderColor: `${ACCENT}40` }}
                />
                <div className="absolute inset-[22%] rounded-full border border-white/10 bg-black/20" />

                <div className="absolute inset-0 grid place-items-center">
                  <div className="z-0 max-w-[40%] text-center">
                    <p
                      className="text-xs font-bold tracking-[0.25em] uppercase sm:text-sm"
                      style={{ color: GLOW }}
                    >
                      {c.chairs}
                    </p>
                    <p className="mt-1 text-sm font-bold text-white/65 sm:text-base">
                      {innerPhase === "spinning"
                        ? c.spin
                        : innerPhase === "claiming"
                          ? c.seats
                          : innerPhase === "round_end"
                            ? c.eliminated
                            : c.winner}
                    </p>
                  </div>
                </div>

                {chairs.map((chair, i) => {
                  const n = chairs.length;
                  const angle = n === 1 ? 0 : (i / n) * 360;
                  const pos = polar(18, angle);
                  const reserved = reservedChairIds.has(chair.id);
                  const occupied = Boolean(chair.seated);
                  return (
                    <div
                      key={chair.id}
                      className="absolute z-10 flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center sm:w-20"
                      style={{ left: pos.left, top: pos.top }}
                    >
                      <div
                        className={cn(
                          "grid size-12 place-items-center rounded-2xl border transition-all duration-300 sm:size-14",
                          reserved && !occupied && "animate-pulse",
                        )}
                        style={{
                          borderColor: occupied
                            ? `${ACCENT}80`
                            : reserved
                              ? `${ACCENT}55`
                              : "rgba(255,255,255,0.15)",
                          background: occupied
                            ? `${ACCENT}22`
                            : reserved
                              ? `${ACCENT}12`
                              : "rgba(0,0,0,0.45)",
                          boxShadow: occupied
                            ? `0 0 24px -8px ${ACCENT}`
                            : reserved
                              ? `0 0 18px -10px ${ACCENT}`
                              : "none",
                        }}
                      >
                        <Armchair
                          className="size-6 sm:size-7"
                          style={{ color: occupied || reserved ? ACCENT : "rgba(255,255,255,0.55)" }}
                        />
                      </div>
                      {chair.number != null ? (
                        <span
                          className="font-brand mt-1 rounded-full px-2 py-0.5 text-sm font-bold tabular-nums sm:text-base"
                          style={{
                            background: occupied
                              ? `linear-gradient(135deg, ${ACCENT}, ${GLOW})`
                              : reserved
                                ? `${ACCENT}30`
                                : "rgba(255,255,255,0.1)",
                            color: occupied ? "black" : reserved ? GLOW : "white",
                          }}
                        >
                          {chair.number}
                        </span>
                      ) : (
                        <span className="mt-1 text-[10px] text-white/50">؟</span>
                      )}
                      {chair.seated ? (
                        <span
                          className="animate-pop-in mt-0.5 max-w-full truncate text-[10px] font-extrabold"
                          style={{ color: chair.seated.color }}
                        >
                          {chair.seated.name}
                        </span>
                      ) : reserved ? (
                        <span className="mt-0.5 text-[10px] font-bold" style={{ color: GLOW }}>
                          {g.arriving}
                        </span>
                      ) : null}
                    </div>
                  );
                })}

                {seatMoves.map((move) => (
                  <MovingToSeat
                    key={`move-${move.chairId}-${move.player.name}`}
                    move={move}
                    onDone={() => completeSeatMove(move.chairId)}
                  />
                ))}

                {players.map((p, i) => {
                  const n = Math.max(players.length, 1);
                  const base = (i / n) * 360;
                  const angle =
                    base +
                    (innerPhase === "spinning" || innerPhase === "claiming" || innerPhase === "round_end"
                      ? spinAngle
                      : 0);
                  const seated = seatedNames.has(p.name.toLowerCase());
                  if (seated && (innerPhase === "claiming" || innerPhase === "round_end")) return null;
                  const pos = polar(42, angle);
                  return (
                    <div
                      key={p.name}
                      className={cn(
                        "absolute z-20 flex max-w-[5.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-opacity",
                        innerPhase === "spinning" && "opacity-95",
                      )}
                      style={{ left: pos.left, top: pos.top }}
                    >
                      <span
                        className="grid size-9 place-items-center rounded-full border-2 bg-black/55 text-xs font-extrabold shadow-lg sm:size-10"
                        style={{
                          color: p.color,
                          borderColor: "rgba(255,255,255,0.2)",
                          boxShadow: `0 0 18px -6px ${p.color}`,
                        }}
                      >
                        {p.name.slice(0, 1)}
                      </span>
                      <span
                        className="mt-1 max-w-full truncate rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm"
                        style={{ color: p.color }}
                      >
                        {p.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {eliminatedFlash.length > 0 && innerPhase === "round_end" ? (
                <p className="relative mt-4 text-center text-sm font-bold text-destructive">
                  {g.outLabel} {eliminatedFlash.join(" · ")}
                </p>
              ) : null}

              <p className="relative mt-4 text-center text-[11px] leading-6 text-white/50 sm:text-xs">
                {players.length} {c.players} ← {Math.max(players.length - 1, 0)} {c.chairs}. {g.rules}
              </p>
            </div>
          </div>
        }
      />

      <Dialog
        open={winnerOpen && Boolean(winner)}
        onOpenChange={(open) => {
          setWinnerOpen(open);
          if (!open) setWinner(null);
        }}
      >
        <DialogContent className="max-w-sm border-white/12 bg-[#0d0a1e] sm:rounded-2xl" dir={dir}>
          <DialogHeader className="text-center sm:text-center">
            <div
              className="mx-auto grid size-14 place-items-center rounded-2xl"
              style={{ background: `${ACCENT}22`, color: GLOW }}
            >
              <Crown className="size-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold">{c.winner}!</DialogTitle>
            <DialogDescription>{g.winnerDescription}</DialogDescription>
          </DialogHeader>
          {winner ? (
            <p
              className="animate-pop-in font-brand py-2 text-center text-4xl font-bold"
              style={{ color: winner.color }}
            >
              {winner.name}
            </p>
          ) : null}
          <DialogFooter className="sm:justify-center">
            <Button
              className="w-full rounded-2xl font-extrabold text-white hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
              onClick={() => {
                setWinnerOpen(false);
                fullReset();
              }}
            >
              {g.newGame}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

