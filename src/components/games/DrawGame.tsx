import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock,
  Eraser,
  Eye,
  EyeOff,
  Paintbrush,
  RotateCcw,
  Square,
  Trash2,
  Trophy,
  Undo2,
} from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { formatClock, useGameSession } from "@/hooks/useGameSession";
import { useDurationOptions } from "@/hooks/useDurationOptions";
import { useGameMoments } from "@/hooks/useGameMoments";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import {
  DRAW_ROUND_OPTIONS,
  DRAW_WORDS,
  drawWordLabel,
  drawWordMatches,
  shuffleDrawWords,
  type DrawWord,
} from "@/lib/draw-words";
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

const ACCENT = "#fb7185";
const GLOW = "#fda4af";
const PAPER = "#fff7ed";

const PALETTE = ["#1c1917", "#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0284c7", "#7c3aed", "#9a3412", "#ffffff"];
const SIZES = [4, 8, 14, 22];

type Stroke = { color: string; size: number; points: { x: number; y: number }[] };

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-center">
      <p className="text-[10px] font-extrabold tracking-wider text-white/45 uppercase">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function DrawCanvas({
  disabled,
  color,
  size,
  eraser,
}: {
  disabled: boolean;
  color: string;
  size: number;
  eraser: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const eraserRef = useRef(eraser);
  colorRef.current = color;
  sizeRef.current = size;
  eraserRef.current = eraser;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokesRef.current) {
      if (s.points.length < 1) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size * (w / 720);
      ctx.beginPath();
      ctx.moveTo(s.points[0]!.x * w, s.points[0]!.y * h);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i]!.x * w, s.points[i]!.y * h);
      }
      ctx.stroke();
    }
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    paint();
  }, [paint]);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [resize]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = pos(e);
    strokesRef.current = [
      ...strokesRef.current,
      {
        color: eraserRef.current ? PAPER : colorRef.current,
        size: eraserRef.current ? sizeRef.current * 2.2 : sizeRef.current,
        points: [p],
      },
    ];
    paint();
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const last = strokesRef.current[strokesRef.current.length - 1];
    if (!last) return;
    last.points.push(pos(e));
    paint();
  };

  const onUp = () => {
    drawingRef.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    (canvas as HTMLCanvasElement & { __undo?: () => void; __clear?: () => void }).__undo = () => {
      strokesRef.current = strokesRef.current.slice(0, -1);
      paint();
    };
    (canvas as HTMLCanvasElement & { __undo?: () => void; __clear?: () => void }).__clear = () => {
      strokesRef.current = [];
      paint();
    };
  }, [paint]);

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1">
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full touch-none rounded-[1.25rem]",
          disabled ? "cursor-not-allowed opacity-80" : eraser ? "cursor-cell" : "cursor-crosshair",
        )}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}

export default function DrawGame({
  messages: chatMessages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const { messages, locale, dir } = useT();
  const { options: durationOptions } = useDurationOptions();
  const { loseMoment, stoppedMoment, winMoment } = useGameMoments();
  const g = messages.games.draw;
  const c = messages.common;

  const [phase, setPhase] = useState<Phase>("setup");
  const [roundCount, setRoundCount] = useState("8");
  const [deck, setDeck] = useState<DrawWord[]>([]);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreColors, setScoreColors] = useState<Record<string, string>>({});
  const [moment, setMoment] = useState<GameMoment | null>(null);
  const [finished, setFinished] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [showWord, setShowWord] = useState(true);
  const [brush, setBrush] = useState(PALETTE[0]!);
  const [size, setSize] = useState(8);
  const [eraser, setEraser] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  const session = useGameSession(90);
  const settled = useRef(false);
  const hasNextRef = useRef(false);
  const canvasHostRef = useRef<HTMLDivElement>(null);

  const current = finished ? undefined : deck[index];
  const hasNext = index < deck.length - 1;
  hasNextRef.current = hasNext;
  const urgent = session.left != null && session.left <= 10;
  const word = current ? drawWordLabel(current, locale) : "";
  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  useEffect(() => {
    session.setOnExpire(() => {
      if (settled.current) return;
      settled.current = true;
      setMoment({
        ...loseMoment(g.timeoutSub),
        highlight: word,
        actionLabel: hasNextRef.current ? c.nextRound : c.finalResult,
        onAction: () => goNext(),
      });
    });
    return () => session.setOnExpire(null);
  }, [session.setOnExpire, loseMoment, g.timeoutSub, c.nextRound, c.finalResult, word]);

  useEffect(() => {
    if (session.running) settled.current = false;
  }, [session.running, index]);

  useNewMessages(chatMessages, session.running && Boolean(current) && !finished, (m) => {
    const who = participantKey(m);
    if (!current || settled.current || !who) return;
    if (session.hasParticipated(who)) return;
    const text = normalizeAr(m.text);
    if (!text) return;
    if (!session.tryClaim(who)) return;
    if (!drawWordMatches(text, current, normalizeAr)) return;
    settled.current = true;
    setScores((s) => ({ ...s, [m.user]: (s[m.user] ?? 0) + 1 }));
    recordGameWin({ user: m.user, userKey: who, color: m.color, game: messages.gameMeta.draw.label });
    setScoreColors((col) => ({ ...col, [m.user]: m.color }));
    session.stop();
    setMoment({
      ...winMoment(m.user, m.color, `${g.theWord} ${word}`),
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
    setBoardKey((k) => k + 1);
    setEraser(false);
    session.clearParticipants();
    session.start();
  };

  const startGame = () => {
    setDeck(shuffleDrawWords(Number(roundCount)));
    setIndex(0);
    setScores({});
    setScoreColors({});
    setFinished(false);
    setMoment(null);
    setBoardKey((k) => k + 1);
    setPhase("playing");
    session.start();
  };

  const callCanvas = (fn: "__undo" | "__clear") => {
    const canvas = canvasHostRef.current?.querySelector("canvas") as
      | (HTMLCanvasElement & { __undo?: () => void; __clear?: () => void })
      | null;
    canvas?.[fn]?.();
  };

  return (
    <>
      <GameStage
        phase={phase}
        accent={ACCENT}
        glow={GLOW}
        icon={<Paintbrush className="size-10" />}
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
                icon={<Paintbrush className="size-3.5" />}
                accent={ACCENT}
                value={roundCount}
                onChange={setRoundCount}
                options={DRAW_ROUND_OPTIONS}
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
              <MiniStat label={g.library} value={String(DRAW_WORDS.length)} />
              <MiniStat label={g.rounds} value={roundCount} />
              <MiniStat label={g.rule} value={g.ruleShort} />
            </div>
            <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-white/70">
              {g.setupHint}
            </p>
          </div>
        }
        play={
          <div className="game-play-shell min-h-0 flex-1">
            <div className="game-play-grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
              <div
                className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border"
                style={{ borderColor: `${ACCENT}40` }}
              >
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-black/35 px-3 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {PALETTE.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={hex}
                        onClick={() => {
                          setBrush(hex);
                          setEraser(false);
                        }}
                        className={cn(
                          "size-7 rounded-full border-2 transition",
                          !eraser && brush === hex ? "scale-110 border-white" : "border-white/20",
                        )}
                        style={{ background: hex }}
                      />
                    ))}
                  </div>
                  <span className="mx-1 h-5 w-px bg-white/15" />
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={cn(
                        "grid size-8 place-items-center rounded-full border transition",
                        size === s ? "border-rose-300 bg-rose-400/20" : "border-white/15 bg-white/5",
                      )}
                    >
                      <span className="rounded-full bg-white" style={{ width: s * 0.7, height: s * 0.7 }} />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEraser((v) => !v)}
                    className={cn(
                      "ms-auto grid size-9 place-items-center rounded-xl border",
                      eraser ? "border-rose-300 bg-rose-400/25 text-white" : "border-white/15 text-white/70",
                    )}
                    title={g.eraser}
                  >
                    <Eraser className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => callCanvas("__undo")}
                    className="grid size-9 place-items-center rounded-xl border border-white/15 text-white/70 hover:bg-white/10"
                    title={g.undo}
                  >
                    <Undo2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => callCanvas("__clear")}
                    className="grid size-9 place-items-center rounded-xl border border-white/15 text-white/70 hover:bg-white/10"
                    title={g.clear}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div ref={canvasHostRef} className="relative min-h-0 flex-1 bg-[#1c1410] p-3">
                  <DrawCanvas key={boardKey} disabled={!session.running || finished} color={brush} size={size} eraser={eraser} />
                  {!session.running && !finished ? (
                    <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-[1.25rem] bg-black/35">
                      <p className="rounded-full bg-black/60 px-4 py-2 text-sm font-bold text-white/80">{c.pressResume}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="flex min-h-0 flex-col gap-3">
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${ACCENT}55`,
                    background: `linear-gradient(180deg, ${ACCENT}22, oklch(0.12 0.04 20 / 0.92))`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-extrabold tracking-[0.2em] text-rose-200/80 uppercase">{g.streamerOnly}</p>
                    <button
                      type="button"
                      onClick={() => setShowWord((v) => !v)}
                      className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10"
                      aria-label={showWord ? g.hideWord : g.showWord}
                    >
                      {showWord ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="font-display mt-2 text-center text-3xl font-black tracking-wide text-white">
                    {showWord ? word || "—" : "••••"}
                  </p>
                  <p className="mt-1 text-center text-[11px] text-white/50">{g.drawThis}</p>
                </div>

                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-center",
                    urgent && session.running ? "border-red-400/40 bg-red-500/15" : "border-white/10 bg-black/30",
                  )}
                >
                  <p className="text-[10px] font-extrabold tracking-wider text-white/45 uppercase">{c.timer}</p>
                  <p
                    className={cn(
                      "font-brand text-4xl font-black tabular-nums",
                      urgent && session.running ? "text-red-400" : "text-white",
                    )}
                  >
                    {session.left != null ? formatClock(session.left) : c.unlimited}
                  </p>
                  <p className="mt-1 text-xs font-bold text-white/50">
                    {index + 1} / {deck.length}
                  </p>
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
                          highlight: word,
                          actionLabel: hasNext ? c.nextRound : c.finalResult,
                          onAction: () => goNext(),
                        });
                      }}
                    >
                      <Square className="size-3.5" /> {c.stop}
                    </Button>
                  ) : (
                    <Button
                      className="h-10 flex-1 rounded-xl font-extrabold"
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
                    <Trophy className="size-3.5 text-rose-300" />
                    {g.scoreboard}
                  </p>
                  <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                    {leaderboard.length === 0 ? (
                      <li className="text-center text-sm text-white/35">{g.waitingGuess}</li>
                    ) : (
                      leaderboard.map(([name, pts], i) => (
                        <li key={name} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-sm font-bold">
                          <span className="truncate" style={{ color: scoreColors[name] }}>
                            {i + 1}. {name}
                          </span>
                          <span className="tabular-nums text-rose-200">{pts}</span>
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
        <DialogContent className="border-rose-400/30 sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 font-display text-2xl">
              <Trophy className="size-7 text-rose-300" />
              {c.finalResult}
            </DialogTitle>
            <DialogDescription asChild>
              <ul className="mt-4 space-y-2">
                {leaderboard.slice(0, 10).map(([name, pts], i) => (
                  <li key={name} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 font-bold">
                    <span>
                      {i + 1}. <span style={{ color: scoreColors[name] }}>{name}</span>
                    </span>
                    <span className="text-rose-200">{pts}</span>
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
