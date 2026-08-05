import { useEffect, useMemo, useRef, useState } from "react";
import { Armchair, Crown, Play, RotateCcw, Users } from "lucide-react";
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

type Player = { name: string; color: string };

type Chair = {
  id: number;
  /** null while spinning / before numbers reveal */
  number: number | null;
  seated: Player | null;
};

type Phase = "lobby" | "spinning" | "claiming" | "round_end" | "winner";

function isJoinCommand(text: string) {
  const t = normalizeAr(text);
  return t === "دخول" || t.startsWith("دخول ") || t === "ادخل" || t === "انا دخول";
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
  // Inclusive 2–12s, different each round — players can't predict the cutoff.
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
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [spinAngle, setSpinAngle] = useState(0);
  const [eliminatedFlash, setEliminatedFlash] = useState<string[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [round, setRound] = useState(1);

  const session = useGameSession(30);
  const phaseRef = useRef(phase);
  const chairsRef = useRef(chairs);
  const playersRef = useRef(players);
  const finishingRef = useRef(false);
  phaseRef.current = phase;
  chairsRef.current = chairs;
  playersRef.current = players;

  const seatedNames = useMemo(
    () => new Set(chairs.filter((c) => c.seated).map((c) => c.seated!.name.toLowerCase())),
    [chairs],
  );

  const chairsTaken = chairs.filter((c) => c.seated).length;
  const chairsTotal = chairs.length;

  const finishClaimRound = () => {
    if (finishingRef.current) return;
    if (phaseRef.current !== "claiming") return;
    finishingRef.current = true;
    session.stop();

    const currentPlayers = playersRef.current;
    if (currentPlayers.length < 2) {
      const champ = currentPlayers[0] ?? null;
      setPlayers(champ ? [champ] : []);
      setChairs([]);
      setPhase("winner");
      setWinner(champ);
      setWinnerOpen(Boolean(champ));
      return;
    }

    // Snapshot chairs, then fill any empty seats randomly from people who didn't claim.
    // Always exactly ONE player is left without a chair (players = chairs + 1).
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
    // Safety: if somehow 0 leftover (bug), knock one random seated player... shouldn't happen
    // If somehow >1 leftover, knock only ONE — others survive (user rule: one out per round)
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
      setPhase("winner");
      setWinner(champ);
      setWinnerOpen(Boolean(champ));
      return;
    }

    setPlayers(survivors);
    setChairs([]);
    setPhase("round_end");
  };

  const finishClaimRoundRef = useRef(finishClaimRound);
  finishClaimRoundRef.current = finishClaimRound;

  // Lobby joins
  useNewMessages(messages, phase === "lobby" && chatActive, (m) => {
    if (!isJoinCommand(m.text)) return;
    const name = m.user.trim();
    if (!name) return;
    setPlayers((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { name, color: m.color }];
    });
  });

  // Claim numbers while claiming
  useNewMessages(messages, phase === "claiming" && chatActive, (m) => {
    const num = extractNumber(m.text);
    if (num == null) return;
    const name = m.user.trim();
    if (!name) return;
    const key = name.toLowerCase();

    if (!playersRef.current.some((p) => p.name.toLowerCase() === key)) return;

    setChairs((prev) => {
      if (prev.some((c) => c.seated?.name.toLowerCase() === key)) return prev;
      const target = prev.find((c) => c.number === num && !c.seated);
      if (!target) return prev;
      const player = playersRef.current.find((p) => p.name.toLowerCase() === key);
      if (!player) return prev;
      return prev.map((c) => (c.id === target.id ? { ...c, seated: player } : c));
    });
  });

  // End claim early when all chairs filled
  useEffect(() => {
    if (phase !== "claiming") return;
    if (chairs.length === 0) return;
    if (chairs.every((c) => c.seated)) {
      finishClaimRoundRef.current();
    }
  }, [chairs, phase]);

  // Claim timer expire
  useEffect(() => {
    session.setOnExpire(() => {
      finishClaimRoundRef.current();
    });
    return () => session.setOnExpire(null);
  }, [session.setOnExpire]);

  // Auto next round after brief pause
  useEffect(() => {
    if (phase !== "round_end") return;
    const t = window.setTimeout(() => {
      beginRound(playersRef.current, round + 1);
    }, 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const beginRound = (roster: Player[], nextRound: number) => {
    if (roster.length < 2) {
      const champ = roster[0] ?? null;
      setPhase("winner");
      setWinner(champ);
      setWinnerOpen(Boolean(champ));
      return;
    }
    finishingRef.current = false;
    setEliminatedFlash([]);
    setRound(nextRound);
    setPlayers(roster);
    const count = roster.length - 1;
    setChairs(Array.from({ length: count }, (_, i) => ({ id: i, number: null, seated: null })));
    setSpinAngle(0);
    setPhase("spinning");
  };

  // Spin animation then reveal numbers
  useEffect(() => {
    if (phase !== "spinning") return;
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
        setPhase("claiming");
        session.start(pickClaimSeconds());
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startGame = () => {
    if (players.length < 2) return;
    beginRound(players, 1);
  };

  const resetAll = () => {
    session.stop();
    finishingRef.current = false;
    setPhase("lobby");
    setPlayers([]);
    setChairs([]);
    setSpinAngle(0);
    setEliminatedFlash([]);
    setWinner(null);
    setWinnerOpen(false);
    setRound(1);
  };

  const statusLine =
    phase === "lobby"
      ? "اكتبوا «دخول» في الشات للانضمام"
      : phase === "spinning"
        ? "يلفّون حول الدائرة…"
        : phase === "claiming"
          ? "طلعَت الأرقام! اكتب رقم الكرسي في الشات"
          : phase === "round_end"
            ? "انتهت الجولة — الجولة التالية…"
            : "انتهت اللعبة";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="glass rounded-3xl border border-primary/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-muted-foreground">
            المطالبة عشوائية بين ٢ و ١٢ ثانية — العداد مخفي عشان التوتر.
          </p>
          {phase === "lobby" ? (
            <Button
              className="h-11 px-6 font-extrabold"
              disabled={!chatActive || players.length < 2}
              onClick={startGame}
            >
              <Play className="size-4" /> بدء اللعبة
            </Button>
          ) : (
            <Button variant="secondary" className="h-11 font-bold" onClick={resetAll}>
              <RotateCcw className="size-4" /> إعادة من الصفر
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <span className="text-muted-foreground">
            <Users className="me-1 inline size-3.5" />
            داخلين: <span className="text-foreground tabular-nums">{players.length}</span>
            {phase !== "lobby" ? (
              <>
                {" "}
                · جولة <span className="text-foreground">{round}</span>
                {" "}
                · كراسي{" "}
                <span className="text-foreground">{chairsTotal || Math.max(players.length - 1, 0)}</span>
              </>
            ) : null}
          </span>
          {phase === "claiming" ? (
            <span className="text-primary">
              سارعوا! محجوز {chairsTaken}/{chairsTotal}
            </span>
          ) : (
            <span className="text-muted-foreground">{statusLine}</span>
          )}
        </div>
        {!chatActive ? (
          <p className="mt-2 text-[11px] font-bold text-destructive">اربط كيك قبل اللعب.</p>
        ) : null}
      </div>

      <div className="glass relative overflow-hidden rounded-3xl border border-white/10 p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_50%_at_50%_45%,color-mix(in_oklab,var(--neon)_12%,transparent),transparent_70%)]" />

        <div className="relative mx-auto aspect-square w-full max-w-xl">
          {/* Outer ring */}
          <div className="absolute inset-[6%] rounded-full border border-dashed border-primary/25" />
          <div className="absolute inset-[22%] rounded-full border border-white/10 bg-black/20" />

          {/* Center label */}
          <div className="absolute inset-0 grid place-items-center">
            <div className="z-0 max-w-[40%] text-center">
              <p className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">الكراسي</p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {phase === "lobby"
                  ? `${players.length} لاعب`
                  : phase === "spinning"
                    ? "يلفّون…"
                    : phase === "claiming"
                      ? "اختاروا رقم!"
                      : phase === "round_end"
                        ? "ت出局…"
                        : "الفائز"}
              </p>
            </div>
          </div>

          {/* Chairs inside */}
          {chairs.map((chair, i) => {
            const n = chairs.length;
            const angle = n === 1 ? 0 : (i / n) * 360;
            const pos = polar(18, angle);
            return (
              <div
                key={chair.id}
                className="absolute z-10 flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center sm:w-20"
                style={{ left: pos.left, top: pos.top }}
              >
                <div
                  className={cn(
                    "grid size-12 place-items-center rounded-2xl border sm:size-14",
                    chair.seated
                      ? "border-primary/60 bg-primary/20 shadow-[0_0_24px_-8px_var(--neon)]"
                      : "border-white/15 bg-black/45",
                  )}
                >
                  <Armchair
                    className={cn("size-6 sm:size-7", chair.seated ? "text-primary" : "text-muted-foreground")}
                  />
                </div>
                {chair.number != null ? (
                  <span
                    className={cn(
                      "mt-1 rounded-full px-2 py-0.5 font-brand text-sm font-bold tabular-nums sm:text-base",
                      chair.seated ? "bg-primary text-primary-foreground" : "bg-white/10 text-foreground",
                    )}
                  >
                    {chair.number}
                  </span>
                ) : (
                  <span className="mt-1 text-[10px] text-muted-foreground">؟</span>
                )}
                {chair.seated ? (
                  <span
                    className="mt-0.5 max-w-full truncate text-[10px] font-extrabold"
                    style={{ color: chair.seated.color }}
                  >
                    {chair.seated.name}
                  </span>
                ) : null}
              </div>
            );
          })}

          {/* Players around the circle */}
          {players.map((p, i) => {
            const n = Math.max(players.length, 1);
            const base = (i / n) * 360;
            const angle = base + (phase === "spinning" || phase === "claiming" || phase === "round_end" ? spinAngle : 0);
            const seated = seatedNames.has(p.name.toLowerCase());
            // Seated players stay on chairs visually — hide from outer ring
            if (seated && (phase === "claiming" || phase === "round_end")) return null;
            const pos = polar(42, angle);
            return (
              <div
                key={p.name}
                className={cn(
                  "absolute z-20 flex max-w-[5.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-opacity",
                  phase === "spinning" && "opacity-95",
                )}
                style={{ left: pos.left, top: pos.top }}
              >
                <span
                  className="grid size-9 place-items-center rounded-full border-2 border-white/20 bg-black/55 text-xs font-extrabold shadow-lg sm:size-10"
                  style={{ color: p.color, boxShadow: `0 0 18px -6px ${p.color}` }}
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

          {players.length === 0 && phase === "lobby" ? (
            <div className="absolute inset-0 grid place-items-center">
              <p className="rounded-2xl bg-black/40 px-4 py-3 text-sm text-muted-foreground backdrop-blur-sm">
                بانتظار دخول اللاعبين من الشات…
              </p>
            </div>
          ) : null}
        </div>

        {eliminatedFlash.length > 0 && phase === "round_end" ? (
          <p className="relative mt-4 text-center text-sm font-bold text-destructive">
            طلعوا: {eliminatedFlash.join(" · ")}
          </p>
        ) : null}

        {phase === "lobby" && players.length > 0 ? (
          <div className="relative mt-4 flex flex-wrap justify-center gap-2">
            {players.map((p) => (
              <span
                key={p.name}
                className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold"
                style={{ color: p.color }}
              >
                {p.name}
              </span>
            ))}
          </div>
        ) : null}

        <p className="relative mt-4 text-center text-[11px] leading-6 text-muted-foreground sm:text-xs">
          {players.length} لاعب ← {Math.max(players.length - 1, 0)} كرسي. كل جولة يطلع شخص واحد فقط.
          لو خلص الوقت والكراسي لسة فاضية، بتنحجز عشوائي على الباقيين، واللي يضل بدون كرسي يطلع.
        </p>
      </div>

      <Dialog
        open={winnerOpen && Boolean(winner)}
        onOpenChange={(open) => {
          setWinnerOpen(open);
          if (!open) setWinner(null);
        }}
      >
        <DialogContent className="max-w-sm border-primary/40 bg-[#0c1513] sm:rounded-2xl" dir="rtl">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Crown className="size-7" />
            </div>
            <DialogTitle className="text-xl font-extrabold">فاز بالكراسي!</DialogTitle>
            <DialogDescription>آخر واحد على كرسي</DialogDescription>
          </DialogHeader>
          {winner ? (
            <p
              className="animate-pop-in py-2 text-center font-brand text-4xl font-bold"
              style={{ color: winner.color }}
            >
              {winner.name}
            </p>
          ) : null}
          <DialogFooter className="sm:justify-center">
            <Button
              className="w-full font-extrabold"
              onClick={() => {
                setWinnerOpen(false);
                resetAll();
              }}
            >
              لعبة جديدة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
