import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Gift, Heart, Maximize2, MessageCircle, Minimize2, Rocket, Skull, Swords, Trophy, Zap } from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { ZOMBIE_DURATION_OPTIONS, formatClock, useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import type {
  BossSpawnInfo,
  FpsHud,
  HealInfo,
  WeaponUnlockInfo,
  ZombieFpsEngine,
} from "@/lib/zombie-fps-engine";
import { computeBossProfile, computeTitanProfile, computeZombieScaling, TITAN_COMMENT_INTERVAL } from "@/lib/zombie-fps-engine";
import { createZombieAudio } from "@/lib/zombie-audio";
import { Button } from "@/components/ui/button";
import GameStage, { type Phase as StagePhase } from "@/components/games/GameStage";
import SelectField from "@/components/games/SelectField";
import { cn } from "@/lib/utils";

const ACCENT = "#ef4444";
const GLOW = "#fb7185";

const BOSS_EVERY_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150] as const;
const PLAYER_MAX_HP = 100;

type Contributor = {
  user: string;
  userKey: string;
  color: string;
  zombies: number;
  bosses: number;
  kicks: number;
};

type LiveLeaders = {
  commenters: Contributor[];
  kickers: Contributor[];
};

type FeedItem = {
  id: number;
  text: string;
  tone: "zombie" | "boss" | "gift" | "heal" | "weapon";
};

type HealToast = {
  id: number;
  text: string;
  kind: HealInfo["kind"];
};

type EndState = {
  outcome: "survived" | "defeated";
  kills: number;
  spawned: number;
  bossesSpawned: number;
  livedSec: number;
  leaders: Contributor[];
};

type RoundVerdict = {
  id: number;
  outcome: EndState["outcome"];
};

function isZombieTrigger(text: string) {
  const raw = text.trim().toLowerCase();
  if (!raw) return false;
  if (raw.includes("zombie") || raw.includes("زومبي") || raw.includes("زومبى")) return true;
  const t = normalizeAr(text);
  if (!t) return false;
  if (/(zombie|زومبي)/i.test(t)) return true;
  const compact = t.replace(/\s+/g, "");
  return compact.includes("زومبي") || compact.includes("zombie");
}

type PendingSpawn = { kind: "zombie" | "boss" | "titan"; from: string; count: number };

function spawnsFromKicks(amount: number): { bosses: number; titans: number } | null {
  if (!Number.isFinite(amount) || amount < 5) return null;
  if (amount > 100) return { bosses: 0, titans: 3 };
  if (amount >= 100) return { bosses: 1, titans: 1 };
  if (amount >= 50) return { bosses: 0, titans: 1 };
  if (amount >= 10) return { bosses: 2, titans: 0 };
  return { bosses: 1, titans: 0 };
}

function describeKickSpawns(plan: { bosses: number; titans: number }) {
  const parts: string[] = [];
  if (plan.titans > 0) parts.push(`${plan.titans} ذيل أسطوري`);
  if (plan.bosses > 0) parts.push(`${plan.bosses} وحش كبير`);
  return parts.join(" + ");
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
    kicks: 0,
  };
  prev[field] += count;
  prev.user = m.user;
  prev.color = m.color;
  map.set(key, prev);
}

function bumpKickContributor(map: Map<string, Contributor>, m: ChatMessage, amount: number) {
  const key = participantKey(m) || m.user.toLowerCase();
  if (!key || amount <= 0) return;
  const prev = map.get(key) ?? {
    user: m.user,
    userKey: key,
    color: m.color,
    zombies: 0,
    bosses: 0,
    kicks: 0,
  };
  prev.kicks += amount;
  prev.user = m.user;
  prev.color = m.color;
  map.set(key, prev);
}

function rankTopCommenters(map: Map<string, Contributor>, limit = 3) {
  return Array.from(map.values())
    .filter((c) => c.zombies > 0 || c.bosses > 0)
    .sort((a, b) => b.zombies + b.bosses * 2 - (a.zombies + a.bosses * 2))
    .slice(0, limit);
}

function rankTopKickers(map: Map<string, Contributor>, limit = 3) {
  return Array.from(map.values())
    .filter((c) => c.kicks > 0)
    .sort((a, b) => b.kicks - a.kicks)
    .slice(0, limit);
}

function liveLeadersFrom(map: Map<string, Contributor>): LiveLeaders {
  return {
    commenters: rankTopCommenters(map, 3),
    kickers: rankTopKickers(map, 3),
  };
}

function rankContributors(map: Map<string, Contributor>) {
  return Array.from(map.values())
    .map((c) => ({
      ...c,
      score: c.zombies + c.bosses * 5 + Math.floor(c.kicks / 10),
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
  const [stagePhase, setStagePhase] = useState<StagePhase>("setup");
  const [phase, setPhase] = useState<"lobby" | "playing" | "ended">("lobby");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hud, setHud] = useState<FpsHud>({
    hp: PLAYER_MAX_HP,
    kills: 0,
    alive: 0,
    queued: 0,
    comments: 0,
    bosses: 0,
    locked: false,
    weapon: "rifle",
    weaponLabel: "بندقية",
    rifleTier: 0,
    hasRpg: false,
    hasRiflePlus: false,
    bossThreat: "وحش كبير",
    bossSegments: 1,
    bossHpPreview: 1400,
    ammo: 50,
    magSize: 50,
    reloading: false,
    reloadPct: 1,
    hurtFlash: 0,
  });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [liveLeaders, setLiveLeaders] = useState<LiveLeaders>({ commenters: [], kickers: [] });
  const [healToast, setHealToast] = useState<HealToast | null>(null);
  const [hpBarFlash, setHpBarFlash] = useState<"heal" | null>(null);
  const [endState, setEndState] = useState<EndState | null>(null);
  const [roundVerdict, setRoundVerdict] = useState<RoundVerdict | null>(null);
  const [titanFxId, setTitanFxId] = useState(0);

  const session = useGameSession(180);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ZombieFpsEngine | null>(null);
  const audioRef = useRef<ReturnType<typeof createZombieAudio> | null>(null);
  if (!audioRef.current) audioRef.current = createZombieAudio();
  const pendingSpawnsRef = useRef<PendingSpawn[]>([]);
  const zombieCommentCountRef = useRef(0);
  const contributorsRef = useRef(emptyContributors());
  const bossEveryRef = useRef(bossEvery);
  const roundDurationRef = useRef(180);
  const feedId = useRef(1);
  const healToastTimer = useRef<number | null>(null);
  const hpFlashTimer = useRef<number | null>(null);
  const playingRef = useRef(false);
  const endHandled = useRef(false);
  const stopSessionRef = useRef(session.stop);
  stopSessionRef.current = session.stop;
  bossEveryRef.current = bossEvery;

  const handleHudUpdate = useCallback((next: FpsHud) => {
    setHud((prev) => {
      if (
        prev.hp === next.hp &&
        prev.kills === next.kills &&
        prev.alive === next.alive &&
        prev.queued === next.queued &&
        prev.comments === next.comments &&
        prev.bosses === next.bosses &&
        prev.locked === next.locked &&
        prev.weapon === next.weapon &&
        prev.weaponLabel === next.weaponLabel &&
        prev.rifleTier === next.rifleTier &&
        prev.hasRpg === next.hasRpg &&
        prev.hasRiflePlus === next.hasRiflePlus &&
        prev.ammo === next.ammo &&
        prev.reloading === next.reloading &&
        Math.abs(prev.reloadPct - next.reloadPct) < 0.05 &&
        Math.abs(prev.hurtFlash - next.hurtFlash) < 0.04
      ) {
        return prev;
      }
      return next;
    });
  }, []);
  const handleHudRef = useRef(handleHudUpdate);
  handleHudRef.current = handleHudUpdate;

  const pushFeed = (text: string, tone: FeedItem["tone"]) => {
    const id = feedId.current++;
    setFeed((prev) => [{ id, text, tone }, ...prev].slice(0, 8));
  };

  const refreshLiveLeaders = useCallback(() => {
    setLiveLeaders(liveLeadersFrom(contributorsRef.current));
  }, []);

  const showHealFeedback = (info: HealInfo) => {
    const text =
      info.kind === "titan"
        ? `+${info.amount} دم — طاقة الذيل`
        : info.kind === "boss"
          ? `+${info.amount} دم — هيل الوحش`
          : `+${info.amount} دم`;
    const id = Date.now();
    setHealToast({ id, text, kind: info.kind });
    setHpBarFlash("heal");
    pushFeed(
      info.kind === "titan"
        ? `امتصيت طاقة الذيل → +${info.amount} دم`
        : info.kind === "boss"
          ? `هيل من الوحش → +${info.amount} دم`
          : `هيل من الزومبي → +${info.amount} دم`,
      "heal",
    );
    if (healToastTimer.current) window.clearTimeout(healToastTimer.current);
    if (hpFlashTimer.current) window.clearTimeout(hpFlashTimer.current);
    healToastTimer.current = window.setTimeout(() => setHealToast(null), 1500);
    hpFlashTimer.current = window.setTimeout(() => setHpBarFlash(null), 900);
  };

  const showWeaponUnlock = (info: WeaponUnlockInfo) => {
    pushFeed(info.message, "weapon");
  };

  const showBossSpawn = (info: BossSpawnInfo) => {
    const seg = info.segments > 1 ? ` · ${info.segments} هيلات` : "";
    const prefix = info.isTitan
      ? "وحش استثنائي — "
      : info.isMega
        ? "تحذير — "
        : "";
    pushFeed(
      `${prefix}${info.title} نزل! (${info.hp} دم${seg}) — ${info.from}`,
      "boss",
    );
    audioRef.current?.playBossRoar(info.isTitan);
    if (info.isTitan) setTitanFxId(Date.now());
  };

  const enqueueSpawn = (kind: PendingSpawn["kind"], from: string, count = 1) => {
    const eng = engineRef.current;
    if (eng && !eng.isEnded()) {
      eng.enqueue(kind, from, count);
      return;
    }
    // Engine may still be loading — keep jobs until it is ready.
    pendingSpawnsRef.current.push({ kind, from, count });
  };

  const flushPendingSpawns = (eng: ZombieFpsEngine) => {
    const jobs = pendingSpawnsRef.current;
    pendingSpawnsRef.current = [];
    for (const job of jobs) eng.enqueue(job.kind, job.from, job.count);
  };

  const finishGameRef = useRef<(outcome: EndState["outcome"]) => void>(() => undefined);
  finishGameRef.current = (outcome) => {
    if (endHandled.current) return;
    endHandled.current = true;
    playingRef.current = false;
    stopSessionRef.current();
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    audioRef.current?.playVerdict(outcome);
    setRoundVerdict({ id: Date.now(), outcome });
    window.setTimeout(() => {
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
      setRoundVerdict(null);
      setPhase("ended");
    }, 2800);
  };

  useEffect(() => {
    session.setOnExpire(() => {
      if (!playingRef.current) return;
      finishGameRef.current("survived");
    });
  }, [session]);

  useNewMessages(messages, phase === "playing", (m) => {
    if (endHandled.current) return;

    if (m.kind === "gift" && m.giftAmount) {
      const plan = spawnsFromKicks(m.giftAmount);
      if (!plan) return;
      bumpKickContributor(contributorsRef.current, m, m.giftAmount);
      if (plan.bosses > 0) {
        enqueueSpawn("boss", m.user, plan.bosses);
        bumpContributor(contributorsRef.current, m, "bosses", plan.bosses);
      }
      if (plan.titans > 0) {
        enqueueSpawn("titan", m.user, plan.titans);
        bumpContributor(contributorsRef.current, m, "bosses", plan.titans);
      }
      pushFeed(`${m.user} أرسل ${m.giftAmount} كيك → ${describeKickSpawns(plan)}`, "gift");
      setHud((h) => ({
        ...h,
        queued: h.queued + plan.bosses + plan.titans,
      }));
      refreshLiveLeaders();
      return;
    }

    if (m.kind === "gift") return;
    if (!isZombieTrigger(m.text)) return;

    zombieCommentCountRef.current += 1;
    const comments = zombieCommentCountRef.current;
    enqueueSpawn("zombie", m.user, 1);
    bumpContributor(contributorsRef.current, m, "zombies", 1);
    pushFeed(`${m.user} أنزل زومبي`, "zombie");
    setHud((h) => ({ ...h, comments, queued: h.queued + 1 }));

    // Keep engine counter in sync when available.
    engineRef.current?.bumpZombieComment();

    if (comments > 0 && comments % TITAN_COMMENT_INTERVAL === 0) {
      enqueueSpawn("titan", m.user, 1);
      bumpContributor(contributorsRef.current, m, "bosses", 1);
    } else if (comments > 0 && comments % bossEveryRef.current === 0) {
      enqueueSpawn("boss", m.user, 1);
      bumpContributor(contributorsRef.current, m, "bosses", 1);
    }
    refreshLiveLeaders();
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
        onHud: (next) => handleHudRef.current(next),
        onDefeat: () => finishGameRef.current("defeated"),
        onHeal: showHealFeedback,
        onWeaponUnlock: showWeaponUnlock,
        onBossSpawn: showBossSpawn,
        onFootstep: () => audioRef.current?.playFootstep(),
        onShoot: (weapon) => audioRef.current?.playShoot(weapon),
        onMobGroan: (kind) => audioRef.current?.playZombieGroan(kind),
        bossEveryThreshold: bossEvery,
        roundDurationSec: roundDurationRef.current,
      });
      if (cancelled) {
        engine.dispose();
        return;
      }
      engineRef.current = engine;
      flushPendingSpawns(engine);
      // Sync comment counter for HUD after catch-up spawns.
      const missing = Math.max(0, zombieCommentCountRef.current - engine.getStats().zombieComments);
      for (let i = 0; i < missing; i++) engine.bumpZombieComment();
    })();

    return () => {
      cancelled = true;
      engine?.dispose();
      if (engine && engineRef.current === engine) engineRef.current = null;
    };
  }, [phase]);

  useEffect(() => {
    const onFs = () => {
      const active = document.fullscreenElement === stageRef.current;
      setIsFullscreen(active);
      window.setTimeout(() => engineRef.current?.resize(), 50);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      // Pointer lock blocks UI clicks — release it first.
      if (document.pointerLockElement) {
        document.exitPointerLock();
        await new Promise((r) => window.setTimeout(r, 40));
      }
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
      window.setTimeout(() => engineRef.current?.resize(), 80);
    } catch {
      // ignore browser fullscreen denials
    }
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyK" || e.repeat) return;
      // Don't steal typing from inputs if any.
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      void toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  useEffect(() => {
    if (phase === "playing") audioRef.current?.unlock();
  }, [phase]);

  useEffect(() => {
    if (!titanFxId) return;
    const t = window.setTimeout(() => setTitanFxId(0), 6800);
    return () => window.clearTimeout(t);
  }, [titanFxId]);

  useEffect(() => {
    return () => audioRef.current?.dispose();
  }, []);

  const startMatch = () => {
    if (!chatActive) return;
    contributorsRef.current = emptyContributors();
    setLiveLeaders({ commenters: [], kickers: [] });
    pendingSpawnsRef.current = [];
    zombieCommentCountRef.current = 0;
    endHandled.current = false;
    setFeed([]);
    setEndState(null);
    setRoundVerdict(null);
    setTitanFxId(0);
    setHud({
      hp: PLAYER_MAX_HP,
      kills: 0,
      alive: 0,
      queued: 0,
      comments: 0,
      bosses: 0,
      locked: false,
      weapon: "rifle",
      weaponLabel: "بندقية",
      rifleTier: 0,
      hasRpg: false,
      hasRiflePlus: false,
      bossThreat: "وحش كبير",
      bossSegments: 1,
      bossHpPreview: 1400,
      ammo: 50,
      magSize: 50,
      reloading: false,
      reloadPct: 1,
      hurtFlash: 0,
    });
    roundDurationRef.current = session.durationSec;
    playingRef.current = true;
    setPhase("playing");
    setStagePhase("playing");
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
    setStagePhase("setup");
    setRoundVerdict(null);
    setTitanFxId(0);
    setEndState(null);
    setEndReveal(false);
    setFeed([]);
  };

  const nextBossIn = useMemo(() => {
    if (hud.comments === 0) return bossEvery;
    const rem = bossEvery - (hud.comments % bossEvery);
    return rem === 0 ? bossEvery : rem;
  }, [bossEvery, hud.comments]);

  const nextTitanIn = useMemo(() => {
    if (hud.comments === 0) return TITAN_COMMENT_INTERVAL;
    const rem = TITAN_COMMENT_INTERVAL - (hud.comments % TITAN_COMMENT_INTERVAL);
    return rem === 0 ? TITAN_COMMENT_INTERVAL : rem;
  }, [hud.comments]);

  const bossPreview = useMemo(() => computeBossProfile(bossEvery), [bossEvery]);
  const titanPreview = useMemo(() => computeTitanProfile(bossEvery), [bossEvery]);
  const zombieScaling = useMemo(
    () => computeZombieScaling(session.durationSec, bossEvery),
    [session.durationSec, bossEvery],
  );

  return (
    <GameStage
      phase={stagePhase}
      accent={ACCENT}
      glow={GLOW}
      icon={<Skull />}
      title="شوتر الزومبي — First Person"
      description="منظور أول شخص واقعي. المشاهدون يكتبون «زومبي» في الشات وينزلون على الماب. أنت تصوّب وتصمد."
      chatActive={chatActive}
      canStart={true}
      setupCtaLabel="التالي · جهّز الماب"
      startLabel="دخول الماب (First Person)"
      onGoReady={() => setStagePhase("ready")}
      onStart={startMatch}
      onBackToSetup={resetLobby}
      settings={
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="مدة الجولة"
              accent={ACCENT}
              value={String(session.durationSec)}
              onChange={(v) => session.setDurationSec(Number(v))}
              options={ZOMBIE_DURATION_OPTIONS.map((o) => ({
                value: String(o.value),
                label: o.label,
              }))}
            />
            <SelectField
              label="وحش كبير كل كم تعليق؟"
              accent={ACCENT}
              value={String(bossEvery)}
              onChange={(v) => setBossEvery(Number(v))}
              options={BOSS_EVERY_OPTIONS.map((n) => ({
                value: String(n),
                label: `كل ${n} تعليقات`,
              }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className="rounded-2xl border p-3"
              style={{
                borderColor: `${ACCENT}44`,
                background: `linear-gradient(135deg, ${ACCENT}18, transparent 70%)`,
              }}
            >
              <p className="text-[10px] font-extrabold tracking-wider text-white/60 uppercase">
                قوة الزومبي
              </p>
              <p className="mt-1 text-sm font-black" style={{ color: GLOW }}>
                {zombieScaling.label}
              </p>
              <p className="mt-1 text-[10px] font-bold text-white/60">
                دم ×{zombieScaling.hpMult.toFixed(2)} · سرعة ×{zombieScaling.speedMult.toFixed(2)}
              </p>
            </div>

            <div
              className={cn(
                "rounded-2xl border p-3",
                bossPreview.isMega ? "border-orange-500/50" : "",
              )}
              style={{
                borderColor: bossPreview.isMega ? "#f97316aa" : `${ACCENT}44`,
                background: bossPreview.isMega
                  ? "linear-gradient(135deg, #f9731622, transparent 70%)"
                  : `linear-gradient(135deg, ${ACCENT}18, transparent 70%)`,
              }}
            >
              <p className="text-[10px] font-extrabold tracking-wider text-white/60 uppercase">
                الوحش المتوقع
              </p>
              <p
                className="mt-1 text-sm font-black"
                style={{ color: bossPreview.isMega ? "#fb923c" : GLOW }}
              >
                {bossPreview.title}
              </p>
              <p className="mt-1 text-[10px] font-bold text-white/60">
                {bossPreview.hp} دم
                {bossPreview.segments > 1 ? ` · ${bossPreview.segments} هيلات` : ""}
              </p>
            </div>

            <div
              className="rounded-2xl border p-3"
              style={{
                borderColor: "#22d3ee66",
                background: "linear-gradient(135deg, #22d3ee18, transparent 70%)",
              }}
            >
              <p className="text-[10px] font-extrabold tracking-wider text-white/60 uppercase">
                كل {TITAN_COMMENT_INTERVAL} تعليق
              </p>
              <p className="mt-1 text-sm font-black text-cyan-300">{titanPreview.title}</p>
              <p className="mt-1 text-[10px] font-bold text-white/60">
                3 هيلات · ذيل مدمر · يهيل نفسه
              </p>
            </div>
          </div>

          <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <ControlHint label="حركة" value="WASD" />
            <ControlHint label="نظر" value="الماوس (Pointer Lock)" />
            <ControlHint label="إطلاق" value="كبسة يسار" />
            <ControlHint label="زوم" value="كليك يمين" />
            <ControlHint label="قفز" value="Space" />
            <ControlHint label="ملء الشاشة" value="K" />
          </div>

          <div
            className="rounded-2xl border p-3 text-xs"
            style={{
              borderColor: `${ACCENT}33`,
              background: `${ACCENT}0d`,
            }}
          >
            <p className="font-extrabold text-white/80">هدايا كيك:</p>
            <p className="mt-1 text-white/60">
              ٥→وحش · ١٠→٢ · ٥٠→ذيل أسطوري · ١٠٠→كبير+ذيل · +١٠٠→٣ أذيال
            </p>
          </div>
        </div>
      }
      play={
        <div className="mx-auto max-w-7xl space-y-4">


      {phase === "playing" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-secondary/30 p-3">
            <span className="text-xs font-bold text-muted-foreground">
              الوحش القادم بعد <span className="text-fuchsia-300">{nextBossIn}</span> ·{" "}
              <span className="text-fuchsia-300">{hud.bossThreat}</span>
              {hud.bossSegments > 1 ? (
                <span className="text-rose-300"> · {hud.bossSegments} هيلات</span>
              ) : null}
              <span className="mr-2 text-[10px] text-muted-foreground">· اختصار: K</span>
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                className="h-11 px-4 font-extrabold"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void toggleFullscreen();
                }}
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
                {isFullscreen ? "تصغير الشاشة" : "تكبير ملء الشاشة"}
              </Button>
              <Button type="button" variant="destructive" className="h-11 px-4" onClick={stopMatch}>
                إنهاء الجولة
              </Button>
            </div>
          </div>

          <div
            ref={stageRef}
            className={cn(
              "relative overflow-hidden border border-emerald-400/35 bg-black shadow-[0_0_0_1px_rgba(61,255,154,0.12),0_20px_60px_rgba(0,0,0,0.45)]",
              isFullscreen ? "rounded-none" : "rounded-2xl",
            )}
          >
            <div
              ref={mountRef}
              className={cn(
                "relative w-full cursor-crosshair bg-black",
                isFullscreen ? "h-screen min-h-screen" : "h-[min(82vh,900px)] min-h-[560px]",
              )}
            />

            {/* Cinematic atmosphere */}
            <div className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.62)_100%)]" />
            <div
              className="pointer-events-none absolute inset-0 z-[6] transition-opacity duration-75"
              style={{
                opacity: Math.min(0.75, hud.hurtFlash * 0.6),
                background: `radial-gradient(ellipse at center, transparent 32%, rgba(120,18,18,${hud.hurtFlash * 0.55}) 100%)`,
                boxShadow: `inset 0 0 ${36 + hud.hurtFlash * 90}px rgba(160,24,24,${hud.hurtFlash * 0.38})`,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[7] opacity-[0.035] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              }}
            />
            {hud.hp <= 25 ? (
              <div
                className="pointer-events-none absolute inset-0 z-[8] animate-pulse"
                style={{
                  opacity: 0.18 + (1 - hud.hp / 25) * 0.22,
                  boxShadow: "inset 0 0 120px rgba(180,20,20,0.45)",
                }}
              />
            ) : null}

            {titanFxId ? (
              <>
                <div
                  key={`curtain-${titanFxId}`}
                  className="pointer-events-none absolute inset-0 z-[42] animate-titan-curtain bg-[radial-gradient(ellipse_at_center,transparent_12%,rgba(0,0,0,0.85)_100%)]"
                />
                <div
                  key={`beam-${titanFxId}`}
                  className="pointer-events-none absolute inset-x-0 top-0 z-[41] h-[70%] origin-top animate-titan-beam bg-[radial-gradient(ellipse_at_50%_0%,rgba(165,243,255,0.62)_0%,rgba(34,211,238,0.2)_30%,transparent_70%)]"
                />
                <div
                  key={`titan-msg-${titanFxId}`}
                  className="pointer-events-none absolute inset-x-0 top-[20%] z-[43] px-4 text-center"
                >
                  <p className="animate-verdict-burst font-display text-2xl font-black text-cyan-50 drop-shadow-[0_0_28px_rgba(34,211,238,0.9)] sm:text-4xl">
                    وحش الذيل الأسطوري نزل!
                  </p>
                  <p className="mt-2 animate-verdict-burst text-sm font-bold text-cyan-200/80 sm:text-base">
                    الأرض تهتز... استعد!
                  </p>
                </div>
              </>
            ) : null}

            {roundVerdict ? (
              <div className="pointer-events-none absolute inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-[3px]">
                <div
                  key={roundVerdict.id}
                  className={cn(
                    "animate-verdict-burst max-w-lg px-6 text-center sm:px-10",
                    roundVerdict.outcome === "survived"
                      ? "text-emerald-50"
                      : "text-rose-50",
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto mb-5 flex size-20 items-center justify-center rounded-full border-2 sm:size-24",
                      roundVerdict.outcome === "survived"
                        ? "border-emerald-300/60 bg-emerald-500/20 shadow-[0_0_60px_rgba(74,222,128,0.45)]"
                        : "border-rose-300/60 bg-rose-500/20 shadow-[0_0_60px_rgba(248,113,113,0.45)]",
                    )}
                  >
                    {roundVerdict.outcome === "survived" ? (
                      <Trophy className="size-10 text-emerald-200 sm:size-12" />
                    ) : (
                      <Skull className="size-10 text-rose-200 sm:size-12" />
                    )}
                  </div>
                  <h2
                    className={cn(
                      "font-display text-5xl font-black tracking-tight sm:text-7xl",
                      roundVerdict.outcome === "survived"
                        ? "shimmer-text"
                        : "text-rose-100",
                    )}
                  >
                    {roundVerdict.outcome === "survived" ? "ربحت!" : "خسرت!"}
                  </h2>
                  <p className="mt-4 text-base font-extrabold text-white/90 sm:text-xl">
                    {roundVerdict.outcome === "survived"
                      ? "صمدت حتى نهاية الوقت — الستريمر انتصر!"
                      : "الشات أسقطك — المشاهدون فازوا!"}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Always-clickable top controls (above lock overlay) */}
            <div className="absolute inset-x-0 top-0 z-50 flex flex-wrap items-start justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent p-3 sm:p-4">
              <div className="pointer-events-none grid grid-cols-3 gap-2 sm:grid-cols-6">
                <Stat label="الدم" value={`${hud.hp}%`} danger={hud.hp <= 30} compact />
                <Stat label="قتلى" value={String(hud.kills)} compact />
                <Stat label="أحياء" value={String(hud.alive)} compact />
                <Stat label="طابور" value={String(hud.queued)} compact />
                <Stat label="زومبي" value={String(hud.comments)} compact />
                <Stat
                  label="وقت"
                  value={session.left == null ? "∞" : formatClock(session.left)}
                  compact
                />
              </div>
              <div className="relative z-50 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-10 bg-emerald-500 font-extrabold text-black hover:bg-emerald-400"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void toggleFullscreen();
                  }}
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                  {isFullscreen ? "تصغير" : "تكبير"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-10 font-extrabold"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (document.pointerLockElement) document.exitPointerLock();
                    stopMatch();
                  }}
                >
                  إنهاء
                </Button>
              </div>
            </div>

            <LiveLeaderboardPanel leaders={liveLeaders} />

            {/* Crosshair */}
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
              <div className="relative size-8 opacity-80">
                <span className="absolute top-1/2 left-[3px] right-[3px] h-px -translate-y-1/2 bg-white/75 shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
                <span className="absolute top-[3px] bottom-[3px] left-1/2 w-px -translate-x-1/2 bg-white/75 shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
                <span className="absolute top-1/2 left-1/2 size-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
              </div>
            </div>

            {healToast ? (
              <div
                key={healToast.id}
                className={cn(
                  "pointer-events-none absolute bottom-[4.75rem] left-1/2 z-40 animate-heal-absorb",
                  healToast.kind === "titan"
                    ? "text-cyan-100"
                    : healToast.kind === "boss"
                      ? "text-fuchsia-100"
                      : "text-emerald-100",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold shadow-xl backdrop-blur-md sm:text-base",
                    healToast.kind === "titan"
                      ? "border-cyan-300/55 bg-cyan-500/25 shadow-cyan-500/30"
                      : healToast.kind === "boss"
                        ? "border-fuchsia-400/50 bg-fuchsia-500/25 shadow-fuchsia-500/25"
                        : "border-emerald-400/55 bg-emerald-500/25 shadow-emerald-500/25",
                  )}
                >
                  <Heart
                    className={cn(
                      "size-5 animate-pulse",
                      healToast.kind === "titan"
                        ? "fill-cyan-200 text-cyan-100"
                        : healToast.kind === "boss"
                          ? "fill-fuchsia-300 text-fuchsia-100"
                          : "fill-emerald-300 text-emerald-100",
                    )}
                  />
                  {healToast.text}
                </div>
              </div>
            ) : null}

            {/* Weapon HUD */}
            <div className="pointer-events-none absolute bottom-24 left-4 z-30 space-y-2">
              <div className="rounded-2xl border border-white/15 bg-black/65 px-3 py-2 backdrop-blur-md">
                <p className="text-[10px] font-bold text-muted-foreground">السلاح الحالي</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-extrabold text-emerald-100">
                  {hud.weapon === "rpg" ? (
                    <Rocket className="size-4 text-orange-400" />
                  ) : hud.weapon === "rifle_plus" ? (
                    <Swords className="size-4 text-amber-300" />
                  ) : (
                    <Crosshair className="size-4 text-emerald-300" />
                  )}
                  {hud.weaponLabel}
                </p>
                {hud.weapon !== "rpg" ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs font-extrabold tabular-nums",
                          hud.reloading ? "text-amber-300" : "text-white/90",
                        )}
                      >
                        {hud.reloading ? "يلحم..." : `${hud.ammo}/${hud.magSize}`}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground">R للتحميل</p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-100",
                          hud.reloading ? "bg-amber-400" : "bg-emerald-400",
                        )}
                        style={{
                          width: `${hud.reloading ? hud.reloadPct * 100 : (hud.ammo / hud.magSize) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] font-bold text-muted-foreground">سكرول للتبديل</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <WeaponChip active={hud.weapon === "rifle"} label="بندقية" />
                {hud.hasRiflePlus ? (
                  <WeaponChip
                    active={hud.weapon === "rifle_plus"}
                    label={hud.rifleTier > 0 ? `بندقية+ ${hud.rifleTier}` : "بندقية+"}
                    accent="amber"
                  />
                ) : null}
                {hud.hasRpg ? (
                  <WeaponChip active={hud.weapon === "rpg"} label="آر بي جي" accent="orange" />
                ) : (
                  <WeaponChip locked label="آر بي جي" />
                )}
              </div>
            </div>

            {/* Bottom HP */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-4 pt-14">
              <div className="relative mx-auto max-w-lg">
                {healToast ? (
                  <div
                    key={`hp-flash-${healToast.id}`}
                    className={cn(
                      "pointer-events-none absolute -top-1 left-0 right-0 h-3 rounded-full blur-md animate-heal-bar-glow",
                      healToast.kind === "titan"
                        ? "bg-cyan-400/70"
                        : healToast.kind === "boss"
                          ? "bg-fuchsia-400/70"
                          : "bg-emerald-400/70",
                    )}
                  />
                ) : null}
                <div className="mb-2 text-center text-[11px] font-bold text-emerald-100/80">
                وحش الذيل بعد {nextTitanIn} تعليق · وحش عادي بعد {nextBossIn} · {hud.bossThreat}
                {hud.bossSegments > 1 ? ` · ${hud.bossSegments} هيلات (${hud.bossHpPreview} دم)` : ""}
                · وحوش نزلت: {hud.bosses}
                </div>
                <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      hpBarFlash === "heal"
                        ? healToast?.kind === "titan"
                          ? "bg-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.85)]"
                          : healToast?.kind === "boss"
                            ? "bg-fuchsia-300 shadow-[0_0_22px_rgba(232,121,249,0.85)]"
                            : "bg-emerald-300 shadow-[0_0_22px_rgba(74,222,128,0.85)]"
                        : hud.hp <= 30
                          ? "bg-rose-500"
                          : "bg-emerald-400",
                    )}
                    style={{ width: `${hud.hp}%` }}
                  />
                </div>
              </div>
            </div>

            {!hud.locked ? (
              <button
                type="button"
                className="absolute inset-x-0 bottom-0 top-16 z-30 grid place-items-center bg-black/60 backdrop-blur-[2px]"
                onClick={() => engineRef.current?.requestPointerLock()}
              >
                <div className="rounded-2xl border border-emerald-400/40 bg-black/75 px-6 py-5 text-center">
                  <Crosshair className="mx-auto size-8 text-emerald-300" />
                  <p className="mt-3 text-lg font-extrabold text-emerald-100">اضغط للعب</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    سكرول يغيّر السلاح · كليك يمين للزوم · Space للقفز · R للتحميل · K للتكبير · ثم اضغط هنا للعب
                  </p>
                </div>
              </button>
            ) : null}
          </div>

          {!isFullscreen ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {feed.map((f) => (
                <div
                  key={f.id}
                  className={`animate-pop-in rounded-xl px-3 py-2 text-xs font-bold ${
                    f.tone === "boss"
                      ? "bg-fuchsia-500/15 text-fuchsia-200"
                      : f.tone === "gift"
                        ? "bg-amber-500/15 text-amber-200"
                        : f.tone === "heal"
                          ? "bg-emerald-500/20 text-emerald-100"
                          : f.tone === "weapon"
                            ? "bg-amber-500/20 text-amber-100"
                            : "bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  {f.tone === "boss" ? <Zap className="mr-1 inline size-3.5" /> : null}
                  {f.tone === "heal" ? <Heart className="mr-1 inline size-3.5 fill-emerald-300" /> : null}
                  {f.tone === "weapon" ? <Rocket className="mr-1 inline size-3.5 text-amber-300" /> : null}
                  {f.text}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "ended" && endState ? (
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-secondary/50 to-background p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
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
                          زومبي {c.zombies}
                          {c.bosses > 0 ? ` · وحوش ${c.bosses}` : ""}
                          {c.kicks > 0 ? ` · ${c.kicks} كيك` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="button"
                className="w-full rounded-2xl font-extrabold text-white hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})` }}
                onClick={resetLobby}
              >
                رجوع للإعداد
              </Button>
          </div>
        </div>
      ) : null}
        </div>
      }
    />
  );
}

function ControlHint({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
      <span className="font-bold text-white/55">{label}</span>
      <span className="font-extrabold text-white">{value}</span>
    </div>
  );
}

function LiveLeaderboardPanel({ leaders }: { leaders: LiveLeaders }) {
  const hasAny = leaders.commenters.length > 0 || leaders.kickers.length > 0;

  return (
    <div className="pointer-events-none absolute top-[4.25rem] right-3 z-40 w-[min(calc(100%-1.5rem),12.5rem)] sm:top-[4.5rem] sm:right-4 sm:w-56">
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/72 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="border-b border-white/10 bg-gradient-to-l from-amber-500/15 via-transparent to-emerald-500/10 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide text-amber-100/90 uppercase">
            <Trophy className="size-3.5 text-amber-300" />
            لوحة الأبطال
          </p>
        </div>

        <div className="space-y-2 p-2">
          <LeaderboardSection
            title="أكثر تعليق"
            icon={MessageCircle}
            accent="emerald"
            emptyLabel="لا تعليقات بعد"
            items={leaders.commenters}
            value={(c) =>
              c.bosses > 0 ? `${c.zombies} زومبي · ${c.bosses} وحش` : `${c.zombies} تعليق`
            }
          />
          <LeaderboardSection
            title="أكثر كيكس"
            icon={Gift}
            accent="amber"
            emptyLabel="لا هدايا بعد"
            items={leaders.kickers}
            value={(c) => `${c.kicks} كيك`}
          />
        </div>

        {!hasAny ? (
          <p className="border-t border-white/8 px-3 py-2 text-center text-[10px] font-bold text-white/45">
            الشات يبني الترتيب مباشرة
          </p>
        ) : null}
      </div>
    </div>
  );
}

function LeaderboardSection({
  title,
  icon: Icon,
  accent,
  emptyLabel,
  items,
  value,
}: {
  title: string;
  icon: typeof MessageCircle;
  accent: "emerald" | "amber";
  emptyLabel: string;
  items: Contributor[];
  value: (c: Contributor) => string;
}) {
  const accentBorder = accent === "amber" ? "border-amber-400/35" : "border-emerald-400/35";
  const accentBg = accent === "amber" ? "bg-amber-500/12" : "bg-emerald-500/12";
  const accentText = accent === "amber" ? "text-amber-200" : "text-emerald-200";
  const rankColors = ["text-amber-300", "text-slate-200", "text-orange-300/90"];

  return (
    <div className={cn("rounded-xl border p-2", accentBorder, accentBg)}>
      <p className={cn("mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold", accentText)}>
        <Icon className="size-3.5 shrink-0" />
        {title}
      </p>
      {items.length === 0 ? (
        <p className="px-1 py-1 text-[10px] font-bold text-white/40">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((c, i) => (
            <li
              key={c.userKey}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-1.5 py-1",
                i === 0 ? "bg-white/8" : "bg-black/20",
              )}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full bg-black/50 text-[10px] font-black",
                    rankColors[i] ?? "text-white/70",
                  )}
                >
                  {i + 1}
                </span>
                <span className="truncate text-[11px] font-extrabold" style={{ color: c.color }}>
                  {c.user}
                </span>
              </div>
              <span className="shrink-0 text-[10px] font-bold text-white/55">{value(c)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WeaponChip({
  label,
  active,
  locked,
  accent = "emerald",
}: {
  label: string;
  active?: boolean;
  locked?: boolean;
  accent?: "emerald" | "amber" | "orange";
}) {
  const accentClass =
    accent === "amber"
      ? "border-amber-400/60 bg-amber-500/20 text-amber-100"
      : accent === "orange"
        ? "border-orange-400/60 bg-orange-500/20 text-orange-100"
        : "border-emerald-400/60 bg-emerald-500/20 text-emerald-100";
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-sm",
        locked
          ? "border-white/10 bg-black/35 text-white/35"
          : active
            ? accentClass
            : "border-white/15 bg-black/45 text-white/70",
      )}
    >
      {label}
    </span>
  );
}

function Stat({
  label,
  value,
  danger,
  compact,
}: {
  label: string;
  value: string;
  danger?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-secondary/30",
        compact ? "border-white/10 bg-black/45 px-2.5 py-1.5 backdrop-blur" : "px-3 py-2",
      )}
    >
      <p className={cn("font-bold text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>
        {label}
      </p>
      <p
        className={cn(
          "font-black tabular-nums",
          compact ? "text-sm text-white" : "text-lg",
          danger ? "text-rose-400" : "",
        )}
      >
        {value}
      </p>
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
