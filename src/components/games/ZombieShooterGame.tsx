import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Skull, Trophy, Zap } from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { DURATION_OPTIONS, formatClock, useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import type { FpsHud, ZombieFpsEngine } from "@/lib/zombie-fps-engine";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/Reveal";

const BOSS_EVERY_OPTIONS = [5, 10, 15, 20, 25, 30] as const;
const PLAYER_MAX_HP = 100;

type Contributor = {
  user: string;
  userKey: string;
  color: string;
  zombies: number;
  bosses: number;
};

type FeedItem = {
  id: number;
  text: string;
  tone: "zombie" | "boss" | "gift";
};

type EndState = {
  outcome: "survived" | "defeated";
  kills: number;
  spawned: number;
  bossesSpawned: number;
  livedSec: number;
  leaders: Contributor[];
};

function isZombieTrigger(text: string) {
  const t = normalizeAr(text);
  if (!t) return false;
  if (t === "زومبي" || t === "zombie" || t === "زومبى") return true;
  const first = t.split(" ")[0] ?? "";
  return first === "زومبي" || first === "zombie" || first === "زومبى";
}

function bossesFromKicks(amount: number) {
  if (!Number.isFinite(amount) || amount < 50) return 0;
  return Math.floor(amount / 50) * 3;
}

function emptyContributors() {
  return new Map<string, Contributor>();
}

function bumpContributor(
  map: Map<string, Contributor>,
  m: ChatMessage,
  field: "zombies" | "bosses",
  count = 1,
) {
  const key = participantKey(m) || m.user.toLowerCase();
  if (!key) return;
  const prev = map.get(key) ?? {
    user: m.user,
    userKey: key,
    color: m.color,
    zombies: 0,
    bosses: 0,
  };
  prev[field] += count;
  prev.user = m.user;
  prev.color = m.color;
  map.set(key, prev);
}

function rankContributors(map: Map<string, Contributor>) {
  return Array.from(map.values())
    .map((c) => ({
      ...c,
      score: c.zombies + c.bosses * 5,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

export default function ZombieShooterGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const [bossEvery, setBossEvery] = useState(20);
  const [phase, setPhase] = useState<"lobby" | "playing" | "ended">("lobby");
  const [hud, setHud] = useState<FpsHud>({
    hp: PLAYER_MAX_HP,
    kills: 0,
    alive: 0,
    queued: 0,
    comments: 0,
    bosses: 0,
    locked: false,
  });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [endState, setEndState] = useState<EndState | null>(null);
  const [endReveal, setEndReveal] = useState(false);

  const session = useGameSession(180);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ZombieFpsEngine | null>(null);
  const contributorsRef = useRef(emptyContributors());
  const bossEveryRef = useRef(bossEvery);
  const feedId = useRef(1);
  const playingRef = useRef(false);
  const endHandled = useRef(false);
  const stopSessionRef = useRef(session.stop);
  stopSessionRef.current = session.stop;
  bossEveryRef.current = bossEvery;

  const pushFeed = (text: string, tone: FeedItem["tone"]) => {
    const id = feedId.current++;
    setFeed((prev) => [{ id, text, tone }, ...prev].slice(0, 8));
  };

  const finishGameRef = useRef<(outcome: EndState["outcome"]) => void>(() => undefined);
  finishGameRef.current = (outcome) => {
    if (endHandled.current) return;
    endHandled.current = true;
    playingRef.current = false;
    stopSessionRef.current();
    const eng = engineRef.current;
    eng?.markEnded(outcome);
    const stats = eng?.getStats();
    setEndState({
      outcome,
      kills: stats?.kills ?? 0,
      spawned: stats?.spawned ?? 0,
      bossesSpawned: stats?.bossesSpawned ?? 0,
      livedSec: stats?.livedSec ?? 0,
      leaders: rankContributors(contributorsRef.current),
    });
    setPhase("ended");
    setEndReveal(false);
    window.setTimeout(() => setEndReveal(true), 1400);
  };

  useEffect(() => {
    session.setOnExpire(() => {
      if (!playingRef.current) return;
      finishGameRef.current("survived");
    });
  }, [session]);

  useNewMessages(messages, phase === "playing", (m) => {
    const eng = engineRef.current;
    if (!eng || eng.isEnded()) return;

    if (m.kind === "gift" && m.giftAmount) {
      const bosses = bossesFromKicks(m.giftAmount);
      if (bosses <= 0) return;
      eng.enqueue("boss", m.user, bosses);
      bumpContributor(contributorsRef.current, m, "bosses", bosses);
      pushFeed(`${m.user} أرسل ${m.giftAmount} كيك → ${bosses} وحوش`, "gift");
      return;
    }

    if (!isZombieTrigger(m.text)) return;
    const comments = eng.bumpZombieComment();
    eng.enqueue("zombie", m.user, 1);
    bumpContributor(contributorsRef.current, m, "zombies", 1);
    pushFeed(`${m.user} أنزل زومبي`, "zombie");

    if (comments > 0 && comments % bossEveryRef.current === 0) {
      eng.enqueue("boss", m.user, 1);
      bumpContributor(contributorsRef.current, m, "bosses", 1);
      pushFeed(`وحش كبير! بعد ${bossEveryRef.current} تعليق زومبي`, "boss");
    }
  });

  useEffect(() => {
    if (phase !== "playing") return;
    if (!mountRef.current) return;

    let cancelled = false;
    let engine: ZombieFpsEngine | null = null;

    void (async () => {
      const { createZombieFpsEngine } = await import("@/lib/zombie-fps-engine");
      if (cancelled || !mountRef.current) return;
      engine = createZombieFpsEngine(mountRef.current, {
        onHud: setHud,
        onDefeat: () => finishGameRef.current("defeated"),
      });
      if (cancelled) {
        engine.dispose();
        return;
      }
      engineRef.current = engine;
    })();

    return () => {
      cancelled = true;
      engine?.dispose();
      if (engine && engineRef.current === engine) engineRef.current = null;
    };
  }, [phase]);

  const startMatch = () => {
    if (!chatActive) return;
    contributorsRef.current = emptyContributors();
    endHandled.current = false;
    setFeed([]);
    setEndState(null);
    setEndReveal(false);
    setHud({
      hp: PLAYER_MAX_HP,
      kills: 0,
      alive: 0,
      queued: 0,
      comments: 0,
      bosses: 0,
      locked: false,
    });
    playingRef.current = true;
    setPhase("playing");
    session.start();
  };

  const stopMatch = () => {
    if (phase !== "playing") return;
    finishGameRef.current("survived");
  };

  const resetLobby = () => {
    playingRef.current = false;
    session.stop();
    engineRef.current?.dispose();
    engineRef.current = null;
    setPhase("lobby");
    setEndState(null);
    setEndReveal(false);
    setFeed([]);
  };

  const nextBossIn = useMemo(() => {
    if (hud.comments === 0) return bossEvery;
    const rem = bossEvery - (hud.comments % bossEvery);
    return rem === 0 ? bossEvery : rem;
  }, [bossEvery, hud.comments]);

  return (
    <GameCard id="zombie" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skull className="size-5 text-rose-400" />
          <h4 className="text-lg font-extrabold">شوتر الزومبي — First Person</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          اكتبوا <span className="font-bold text-foreground">زومبي</span> في الشات — وأنت تدافع
          بمنظور أول شخص.
        </p>
      </div>

      {phase === "lobby" ? (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/60 via-background to-rose-950/40 p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 top-0 size-56 rounded-full bg-emerald-400/10 blur-3xl" />
            <p className="text-sm font-extrabold text-emerald-200">تجربة FPS كاملة</p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              منظور أول شخص، سلاح بيدك، تمشي داخل ماب مغلقة، وتصوّب بالماوس. الشاشة كبيرة ومخصصة
              للبث على شاشة ثانية.
            </p>
            <div className="mt-4 grid gap-2 text-xs font-bold text-muted-foreground sm:grid-cols-3">
              <div className="rounded-xl bg-background/50 px-3 py-2">حركة: WASD</div>
              <div className="rounded-xl bg-background/50 px-3 py-2">
                نظر: الماوس (Pointer Lock)
              </div>
              <div className="rounded-xl bg-background/50 px-3 py-2">إطلاق: كبسة يسار</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 rounded-2xl border border-border/70 bg-secondary/30 p-4 text-xs font-bold text-muted-foreground">
              مدة الجولة
              <select
                value={session.durationSec}
                onChange={(e) => session.setDurationSec(Number(e.target.value))}
                className="border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2"
              >
                {DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 rounded-2xl border border-border/70 bg-secondary/30 p-4 text-xs font-bold text-muted-foreground">
              وحش كبير كل كم تعليق زومبي؟
              <select
                value={bossEvery}
                onChange={(e) => setBossEvery(Number(e.target.value))}
                className="border-input bg-background focus-visible:ring-ring mt-1 h-11 w-full rounded-md border px-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2"
              >
                {BOSS_EVERY_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    كل {n} تعليقات
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 rounded-2xl border border-border/70 bg-gradient-to-br from-rose-500/10 to-emerald-500/10 p-4 sm:grid-cols-3">
            <div className="rounded-xl bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">تعليق زومبي</p>
              <p className="mt-1 text-sm font-extrabold">ينزل زومبي واحد</p>
            </div>
            <div className="rounded-xl bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">كل {bossEvery} تعليق</p>
              <p className="mt-1 text-sm font-extrabold">وحش كبير صعب</p>
            </div>
            <div className="rounded-xl bg-background/50 p-3">
              <p className="text-xs text-muted-foreground">هدايا كيك</p>
              <p className="mt-1 text-sm font-extrabold">٥٠→٣ وحوش · ١٠٠→٦</p>
            </div>
          </div>

          <Button
            type="button"
            className="h-12 w-full text-base font-extrabold"
            disabled={!chatActive}
            onClick={startMatch}
          >
            <Crosshair className="size-4" />
            دخول الماب (First Person)
          </Button>
          {!chatActive ? (
            <p className="text-center text-xs font-bold text-destructive">اربط كيك قبل البدء.</p>
          ) : null}
        </div>
      ) : null}

      {phase === "playing" ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <Stat label="الدم" value={`${hud.hp}%`} danger={hud.hp <= 30} />
            <Stat label="قتلى" value={String(hud.kills)} />
            <Stat label="أحياء" value={String(hud.alive)} />
            <Stat label="طابور" value={String(hud.queued)} />
            <Stat label="تعليقات زومبي" value={String(hud.comments)} />
            <Stat label="الوقت" value={session.left == null ? "∞" : formatClock(session.left)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
            <span>
              الوحش الكبير القادم بعد <span className="text-fuchsia-300">{nextBossIn}</span> تعليق ·
              وحوش نزلت: <span className="text-fuchsia-300">{hud.bosses}</span>
            </span>
            <Button type="button" variant="destructive" size="sm" onClick={stopMatch}>
              إنهاء الجولة
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/35 bg-black shadow-[0_0_0_1px_rgba(61,255,154,0.12),0_20px_60px_rgba(0,0,0,0.45)]">
            <div
              ref={mountRef}
              className="relative h-[min(78vh,820px)] min-h-[520px] w-full cursor-crosshair"
            />

            {/* Crosshair */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative size-8">
                <span className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 bg-emerald-300/90" />
                <span className="absolute top-0 left-1/2 h-full w-[2px] -translate-x-1/2 bg-emerald-300/90" />
                <span className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              </div>
            </div>

            {/* HP bar overlay */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
              <div className="mx-auto h-2.5 max-w-md overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${hud.hp <= 30 ? "bg-rose-500" : "bg-emerald-400"}`}
                  style={{ width: `${hud.hp}%` }}
                />
              </div>
            </div>

            {!hud.locked ? (
              <button
                type="button"
                className="absolute inset-0 z-10 grid place-items-center bg-black/55 backdrop-blur-[2px]"
                onClick={() => engineRef.current?.requestPointerLock()}
              >
                <div className="rounded-2xl border border-emerald-400/40 bg-black/70 px-6 py-5 text-center">
                  <Crosshair className="mx-auto size-8 text-emerald-300" />
                  <p className="mt-3 text-lg font-extrabold text-emerald-100">اضغط للعب</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    يقفل الماوس للنظر · WASD للمشي · يسار للإطلاق
                  </p>
                </div>
              </button>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {feed.map((f) => (
              <div
                key={f.id}
                className={`animate-pop-in rounded-xl px-3 py-2 text-xs font-bold ${
                  f.tone === "boss"
                    ? "bg-fuchsia-500/15 text-fuchsia-200"
                    : f.tone === "gift"
                      ? "bg-amber-500/15 text-amber-200"
                      : "bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {f.tone === "boss" ? <Zap className="mr-1 inline size-3.5" /> : null}
                {f.text}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {phase === "ended" && endState ? (
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-secondary/50 to-background p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          {!endReveal ? (
            <div className="relative space-y-3 py-10 text-center">
              <div className="mx-auto size-14 animate-spin rounded-full border-4 border-primary/25 border-t-primary" />
              <p className="text-lg font-extrabold">جاري إعلان النتيجة...</p>
              <p className="text-sm text-muted-foreground">تشويق قبل كشف الفائزين</p>
            </div>
          ) : (
            <div className="relative space-y-6">
              <div className="text-center">
                {endState.outcome === "defeated" ? (
                  <>
                    <Trophy className="mx-auto size-10 text-amber-300" />
                    <h3 className="mt-3 font-display text-3xl font-black text-amber-200">
                      المشاهدون فازوا!
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      الشات أسقط الستريمر بعد {formatClock(Math.floor(endState.livedSec))}
                    </p>
                  </>
                ) : (
                  <>
                    <Crosshair className="mx-auto size-10 text-emerald-300" />
                    <h3 className="mt-3 font-display text-3xl font-black text-emerald-200">
                      الستريمر صمد!
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      نجا من الماب · قتلى: {endState.kills}
                    </p>
                  </>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="قتلى" value={String(endState.kills)} />
                <MiniStat label="نزلوا" value={String(endState.spawned)} />
                <MiniStat label="وحوش كبار" value={String(endState.bossesSpawned)} />
              </div>

              <div>
                <p className="mb-3 text-sm font-extrabold">أبطال الشات</p>
                {endState.leaders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">ما في مشاركات هذه الجولة.</p>
                ) : (
                  <div className="space-y-2">
                    {endState.leaders.map((c, i) => (
                      <div
                        key={c.userKey}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                          i < 3
                            ? "bg-gradient-to-l from-amber-500/20 to-primary/15"
                            : "bg-background/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="grid size-7 place-items-center rounded-full bg-background text-xs font-black">
                            {i + 1}
                          </span>
                          <span className="font-bold" style={{ color: c.color }}>
                            {c.user}
                          </span>
                          {i < 3 ? <Trophy className="size-3.5 text-amber-300" /> : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          زومبي {c.zombies} · وحوش {c.bosses}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="button" className="w-full font-extrabold" onClick={resetLobby}>
                رجوع للإعداد
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </GameCard>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-2">
      <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
      <p className={`text-lg font-black tabular-nums ${danger ? "text-rose-400" : ""}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/50 px-3 py-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums">{value}</p>
    </div>
  );
}
