import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleDot, Crown, RotateCw, Users, Volume2, VolumeX } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import type { ChatMessage } from "@/hooks/useKickChat";
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
import { createRouletteAudio, type RouletteAudio } from "@/lib/roulette-audio";
import GameStage, { type Phase as StagePhase } from "@/components/games/GameStage";

const ACCENT = "#f59e0b";
const GLOW = "#fbbf24";
const SPIN_MS = 5600;
const WINNER_DIALOG_DELAY_MS = 1400;
const SOUND_STORAGE_KEY = "al-daboor-roulette-sound";

type Contestant = { name: string; color: string };
type InnerPhase = "lobby" | "spinning" | "reveal" | "winner";

function isRouletteJoin(text: string) {
  const t = normalizeAr(text);
  return (
    t === "روليت" ||
    t === "roulette" ||
    t.startsWith("روليت ") ||
    t.startsWith("roulette ") ||
    t === "روليته" ||
    t === "roulete"
  );
}

function mod360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

/** Segment under the top pointer. Segments run clockwise from 12 o'clock; the wheel turns clockwise. */
function segmentAtPointer(rotationDeg: number, count: number) {
  const seg = 360 / count;
  return Math.min(count - 1, Math.floor(mod360(-rotationDeg) / seg));
}

/** Labels run along the radius, from just inside the rim toward the hub (SVG units, wheel r = 98). */
const LABEL_OUTER_R = 91;
const LABEL_INNER_R = 24;
/** Rough average glyph width as a fraction of font size for the bold label font. */
const GLYPH_WIDTH = 0.6;

/** Fits a name inside its slice: as large as the slice width allows, shrinking (then truncating) long names. */
function radialLabel(name: string, count: number) {
  const length = LABEL_OUTER_R - LABEL_INNER_R;
  const sliceWidth = (2 * Math.PI * 58) / Math.max(count, 1);
  const byWidth = Math.min(11, sliceWidth * 0.62);
  const byLength = length / (GLYPH_WIDTH * Math.max(name.length, 1));
  const fontSize = Math.max(Math.min(byWidth, byLength, 11), Math.min(byWidth, 5.5));
  const maxChars = Math.floor(length / (GLYPH_WIDTH * fontSize));
  const label = name.length > maxChars ? `${name.slice(0, Math.max(1, maxChars - 1))}…` : name;
  return { label, fontSize };
}

/** Quartic ease-out: fast start, long suspenseful slowdown. */
function easeOutQuart(t: number) {
  return 1 - (1 - t) ** 4;
}

function segmentColors(i: number, total: number) {
  const hue = (i * (360 / Math.max(total, 1)) + 18) % 360;
  return {
    fill: `oklch(0.58 0.16 ${hue})`,
    edge: `oklch(0.72 0.14 ${hue})`,
  };
}

export default function RouletteGame({
  messages: chatMessages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const { messages, dir } = useT();
  const g = messages.games.roulette;
  const c = messages.common;

  const [stagePhase, setStagePhase] = useState<StagePhase>("setup");
  const [innerPhase, setInnerPhase] = useState<InnerPhase>("lobby");
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [eliminated, setEliminated] = useState<Contestant[]>([]);
  const [spinDeg, setSpinDeg] = useState(0);
  const [lastOut, setLastOut] = useState<Contestant | null>(null);
  const [landedIdx, setLandedIdx] = useState<number | null>(null);
  const [winner, setWinner] = useState<Contestant | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [round, setRound] = useState(1);
  const [soundOn, setSoundOn] = useState(true);
  const spinningRef = useRef(false);
  const rotationRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const winnerTimerRef = useRef<number | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<RouletteAudio | null>(null);
  const contestantsRef = useRef(contestants);
  contestantsRef.current = contestants;
  const winLabelRef = useRef(messages.gameMeta.roulette.label);
  winLabelRef.current = messages.gameMeta.roulette.label;

  const revealing = innerPhase === "reveal" || innerPhase === "winner";
  const canStart = contestants.length >= 2;
  const remaining = contestants.length - (revealing && lastOut ? 1 : 0);

  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_STORAGE_KEY) === "off") setSoundOn(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    audioRef.current ??= createRouletteAudio();
    audioRef.current.setMuted(!soundOn);
  }, [soundOn]);

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      if (winnerTimerRef.current != null) window.clearTimeout(winnerTimerRef.current);
      audioRef.current?.dispose();
      audioRef.current = null;
    },
    [],
  );

  const toggleSound = () => {
    setSoundOn((on) => {
      const next = !on;
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, next ? "on" : "off");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useNewMessages(chatMessages, (stagePhase === "setup" || innerPhase === "lobby") && chatActive, (m) => {
    if (!isRouletteJoin(m.text)) return;
    const name = m.user.trim();
    if (!name) return;
    setContestants((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === name.toLowerCase())) return prev;
      if (eliminated.some((p) => p.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { name, color: m.color }];
    });
  });

  const finishSpin = useCallback((pool: Contestant[], finalDeg: number) => {
    const audio = audioRef.current;
    const idx = segmentAtPointer(finalDeg, pool.length);
    const victim = pool[idx]!;
    const survivors = pool.filter((_, i) => i !== idx);
    spinningRef.current = false;
    setSpinDeg(finalDeg);
    setLandedIdx(idx);
    setLastOut(victim);
    setEliminated((e) => [...e, victim]);

    if (survivors.length <= 1) {
      const champ = survivors[0] ?? null;
      setWinner(champ);
      setInnerPhase("winner");
      audio?.playEliminated();
      if (champ) {
        recordGameWin({
          user: champ.name,
          userKey: champ.name.toLowerCase(),
          color: champ.color,
          game: winLabelRef.current,
        });
        winnerTimerRef.current = window.setTimeout(() => {
          winnerTimerRef.current = null;
          audioRef.current?.playWinner();
          setWinnerOpen(true);
        }, WINNER_DIALOG_DELAY_MS);
      }
      return;
    }

    audio?.playEliminated();
    setInnerPhase("reveal");
  }, []);

  const spin = useCallback(() => {
    const pool = contestantsRef.current;
    if (pool.length < 2 || spinningRef.current) return;
    spinningRef.current = true;
    setInnerPhase("spinning");
    setLastOut(null);
    setLandedIdx(null);

    const audio = audioRef.current;
    audio?.unlock();
    audio?.playSpinStart();

    const n = pool.length;
    const seg = 360 / n;
    const idx = Math.floor(Math.random() * n);
    const landAt = (idx + 0.5) * seg + (Math.random() - 0.5) * seg * 0.7;
    const start = rotationRef.current;
    const extraTurns = 6 + Math.floor(Math.random() * 3);
    const target = start + extraTurns * 360 + mod360(-landAt - start);
    const distance = target - start;

    let lastSeg = segmentAtPointer(start, n);
    let lastAngle = start;
    let lastTime = performance.now();
    const t0 = lastTime;
    let peakSpeed = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / SPIN_MS);
      const angle = start + distance * easeOutQuart(t);
      rotationRef.current = angle;
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${angle}deg)`;

      const dt = Math.max(1, now - lastTime);
      const speed = (angle - lastAngle) / dt;
      peakSpeed = Math.max(peakSpeed, speed);
      lastAngle = angle;
      lastTime = now;

      const current = segmentAtPointer(angle, n);
      if (current !== lastSeg) {
        lastSeg = current;
        audioRef.current?.playTick(peakSpeed > 0 ? speed / peakSpeed : 0);
        pointerRef.current?.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(-22deg)" }, { transform: "rotate(0deg)" }],
          { duration: Math.min(180, 60 + (1 - speed / (peakSpeed || 1)) * 140), easing: "ease-out" },
        );
      }

      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }
      frameRef.current = null;
      finishSpin(pool, target);
    };
    frameRef.current = requestAnimationFrame(step);
  }, [finishSpin]);

  /** Drops the eliminated player only now, so the wheel keeps showing who the pointer landed on. */
  const continueAfterReveal = () => {
    const out = lastOut;
    if (out) setContestants((prev) => prev.filter((p) => p.name.toLowerCase() !== out.name.toLowerCase()));
    rotationRef.current = mod360(rotationRef.current);
    setSpinDeg(rotationRef.current);
    setLastOut(null);
    setLandedIdx(null);
    setRound((r) => r + 1);
    setInnerPhase("lobby");
  };

  const resetAll = () => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (winnerTimerRef.current != null) window.clearTimeout(winnerTimerRef.current);
    winnerTimerRef.current = null;
    setStagePhase("setup");
    setInnerPhase("lobby");
    setContestants([]);
    setEliminated([]);
    rotationRef.current = 0;
    setSpinDeg(0);
    setLastOut(null);
    setLandedIdx(null);
    setWinner(null);
    setWinnerOpen(false);
    setRound(1);
    spinningRef.current = false;
  };

  const wheelSegments = useMemo(() => {
    if (contestants.length === 0) {
      return [{ label: "?", color: ACCENT, fill: ACCENT, edge: GLOW }];
    }
    return contestants.map((p, i) => {
      const { fill, edge } = segmentColors(i, contestants.length);
      return { label: p.name, color: p.color, fill, edge };
    });
  }, [contestants]);

  return (
    <>
      <GameStage
        phase={stagePhase}
        accent={ACCENT}
        glow={GLOW}
        icon={<CircleDot className="size-10" />}
        title={g.title}
        description={g.desc}
        chatActive={chatActive}
        canStart={canStart}
        setupCtaLabel={canStart ? g.setupCta : g.setupCtaNeed}
        startLabel={g.start}
        onGoReady={() => setStagePhase("ready")}
        onStart={() => {
          setStagePhase("playing");
          setInnerPhase("lobby");
        }}
        onBackToSetup={resetAll}
        settings={
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm font-extrabold text-white/80">{g.howToJoin}</p>
              <p className="mt-2 font-display text-2xl font-black tracking-wide text-amber-300">
                {g.joinWord}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/60">{g.joinHint}</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-bold text-white/70">
                <Users className="size-4 text-amber-300" />
                {g.registered}
              </span>
              <span className="font-brand text-3xl font-black text-amber-300">{contestants.length}</span>
            </div>
            {contestants.length > 0 ? (
              <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                {contestants.map((p) => (
                  <span
                    key={p.name}
                    className="rounded-full border px-3 py-1 text-xs font-extrabold"
                    style={{
                      borderColor: `${p.color}66`,
                      color: p.color,
                      background: `${p.color}18`,
                    }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-white/45">{g.waitingJoin}</p>
            )}
          </div>
        }
        play={
          <div className="game-play-shell flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border border-amber-500/25 bg-black/35 p-4 sm:p-6">
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                  background: `radial-gradient(60% 55% at 50% 45%, ${ACCENT}30, transparent 70%)`,
                }}
              />

              <div className="relative mb-3 flex flex-wrap items-center justify-center gap-3 text-center">
                <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-sm font-extrabold text-amber-200">
                  {g.round} {round}
                </span>
                <span className="text-sm font-bold text-white/60">
                  {g.remaining}: <span className="text-white">{remaining}</span>
                </span>
                <button
                  type="button"
                  onClick={toggleSound}
                  aria-label={soundOn ? g.soundOn : g.soundOff}
                  title={soundOn ? g.soundOn : g.soundOff}
                  aria-pressed={soundOn}
                  className="flex size-9 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-200 transition hover:bg-amber-500/20"
                >
                  {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </button>
              </div>

              <div className="relative mx-auto aspect-square w-full max-w-[min(100%,24rem)] sm:max-w-[min(30rem,60vh)] lg:max-w-[min(36rem,64vh)]">
                <div
                  className="absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1"
                  aria-hidden
                >
                  <div
                    ref={pointerRef}
                    className="size-0 border-x-[14px] border-x-transparent border-t-[26px]"
                    style={{
                      borderTopColor: GLOW,
                      filter: `drop-shadow(0 0 12px ${ACCENT})`,
                      transformOrigin: "50% 0",
                    }}
                  />
                </div>

                <div
                  ref={wheelRef}
                  className="absolute inset-[6%] rounded-full border-4 border-amber-400/50 shadow-[inset_0_0_40px_rgba(0,0,0,0.5),0_0_60px_-10px_rgba(245,158,11,0.8)]"
                  style={{ transform: `rotate(${spinDeg}deg)`, willChange: "transform" }}
                >
                  <svg viewBox="0 0 200 200" className="size-full">
                    {wheelSegments.map((seg, i) => {
                      const n = wheelSegments.length;
                      const a0 = (i / n) * 360 - 90;
                      const a1 = ((i + 1) / n) * 360 - 90;
                      const r = 98;
                      const cx = 100;
                      const cy = 100;
                      const x0 = cx + r * Math.cos((a0 * Math.PI) / 180);
                      const y0 = cy + r * Math.sin((a0 * Math.PI) / 180);
                      const x1 = cx + r * Math.cos((a1 * Math.PI) / 180);
                      const y1 = cy + r * Math.sin((a1 * Math.PI) / 180);
                      const large = a1 - a0 > 180 ? 1 : 0;
                      const midDeg = (a0 + a1) / 2;
                      const mid = midDeg * (Math.PI / 180);
                      const tx = cx + LABEL_OUTER_R * Math.cos(mid);
                      const ty = cy + LABEL_OUTER_R * Math.sin(mid);
                      const { label, fontSize } = radialLabel(seg.label, n);
                      const landed = revealing && landedIdx === i;
                      const dimmed = revealing && landedIdx != null && !landed;
                      const d =
                        n === 1
                          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
                          : `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
                      return (
                        <g
                          key={`${seg.label}-${i}`}
                          opacity={dimmed ? 0.35 : 1}
                          style={{ transition: "opacity 300ms" }}
                        >
                          <path
                            d={d}
                            fill={landed ? "oklch(0.55 0.22 25)" : seg.fill}
                            stroke={landed ? "#fff" : seg.edge}
                            strokeWidth={landed ? 3 : 1.5}
                          />
                          <text
                            x={tx}
                            y={ty}
                            fill="white"
                            fontSize={fontSize}
                            fontWeight="800"
                            textAnchor="end"
                            dominantBaseline="central"
                            direction="ltr"
                            stroke="rgba(0,0,0,0.45)"
                            strokeWidth={fontSize * 0.12}
                            paintOrder="stroke"
                            transform={`rotate(${midDeg}, ${tx}, ${ty})`}
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}
                    <circle cx="100" cy="100" r="18" fill="oklch(0.14 0.04 75)" stroke={GLOW} strokeWidth="3" />
                    <circle cx="100" cy="100" r="8" fill={ACCENT} />
                  </svg>
                </div>
              </div>

              {innerPhase === "reveal" && lastOut ? (
                <div className="mt-4 animate-pop-in rounded-2xl border border-red-500/40 bg-red-500/15 px-6 py-4 text-center">
                  <p className="text-sm font-extrabold tracking-wider text-red-300 uppercase">{g.eliminated}</p>
                  <p className="font-brand mt-1 text-3xl font-black" style={{ color: lastOut.color }}>
                    {lastOut.name}
                  </p>
                </div>
              ) : null}

              <div className="relative mt-4 flex flex-wrap justify-center gap-3">
                {innerPhase === "lobby" ? (
                  <Button
                    type="button"
                    disabled={remaining < 2 || !chatActive}
                    onClick={spin}
                    className="h-14 gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-300 px-8 text-lg font-extrabold text-black hover:brightness-110"
                  >
                    <RotateCw className="size-5" />
                    {g.spin}
                  </Button>
                ) : null}
                {innerPhase === "reveal" ? (
                  <Button
                    type="button"
                    onClick={continueAfterReveal}
                    className="h-12 rounded-2xl px-8 font-extrabold"
                  >
                    {remaining > 1 ? g.spinAgain : c.continue}
                  </Button>
                ) : null}
                {innerPhase === "spinning" ? (
                  <p className="font-display text-lg font-bold text-amber-200/90">{g.spinning}</p>
                ) : null}
              </div>
            </div>

            <aside className="flex min-h-0 w-full shrink-0 flex-col gap-3 lg:w-72">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h4 className="text-xs font-extrabold tracking-wider text-white/50 uppercase">{g.stillIn}</h4>
                <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                  {contestants
                    .filter((p) => !(revealing && lastOut && p.name === lastOut.name))
                    .map((p) => (
                    <li
                      key={p.name}
                      className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-bold"
                      style={{ color: p.color }}
                    >
                      <span className="size-2 rounded-full" style={{ background: p.color }} />
                      {p.name}
                    </li>
                  ))}
                </ul>
              </div>
              {eliminated.length > 0 ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4">
                  <h4 className="text-xs font-extrabold tracking-wider text-red-300/70 uppercase">{g.out}</h4>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-sm text-white/50">
                    {eliminated.map((p) => (
                      <li key={p.name} className="line-through opacity-80">
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>
        }
      />

      <Dialog open={winnerOpen} onOpenChange={setWinnerOpen}>
        <DialogContent className="border-amber-500/30 bg-[oklch(0.12_0.04_75)] sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 font-display text-2xl">
              <Crown className="size-7 text-amber-300" />
              {g.winnerTitle}
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              {winner ? (
                <span className="font-brand text-3xl font-black" style={{ color: winner.color }}>
                  {winner.name}
                </span>
              ) : (
                g.noWinner
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={resetAll} className="font-extrabold">
              {g.playAgain}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
