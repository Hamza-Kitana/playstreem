import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Skull, Trophy, Zap } from "lucide-react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { DURATION_OPTIONS, formatClock, useGameSession } from "@/hooks/useGameSession";
import { normalizeAr, useNewMessages } from "@/hooks/useNewMessages";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/Reveal";

const BOSS_EVERY_OPTIONS = [5, 10, 15, 20, 25, 30] as const;
const MAX_ALIVE = 48;
const PLAYER_SPEED = 235;
const PLAYER_RADIUS = 16;
const PLAYER_MAX_HP = 100;
const FIRE_COOLDOWN = 0.11;
const BULLET_SPEED = 620;
const BULLET_DAMAGE = 22;
const ZOMBIE_HP = 34;
const BOSS_HP = 220;
const ZOMBIE_SPEED = 78;
const BOSS_SPEED = 52;
const ZOMBIE_DAMAGE = 9;
const BOSS_DAMAGE = 18;
const ARENA_PAD = 28;

type MobKind = "zombie" | "boss";

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

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
};

type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

type Mob = {
  id: number;
  kind: MobKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  hitCd: number;
  from: string;
};

type Player = {
  x: number;
  y: number;
  hp: number;
  aim: number;
  fireCd: number;
  invuln: number;
};

type EndState = {
  outcome: "survived" | "defeated";
  kills: number;
  spawned: number;
  bossesSpawned: number;
  livedSec: number;
  leaders: Contributor[];
};

type Engine = {
  w: number;
  h: number;
  player: Player;
  mobs: Mob[];
  bullets: Bullet[];
  particles: Particle[];
  keys: Set<string>;
  mouse: { x: number; y: number; down: boolean };
  shake: number;
  nextId: number;
  kills: number;
  spawned: number;
  bossesSpawned: number;
  zombieComments: number;
  queue: { kind: MobKind; from: string }[];
  ended: boolean;
  outcome: EndState["outcome"] | null;
  livedSec: number;
  flash: number;
};

function isZombieTrigger(text: string) {
  const t = normalizeAr(text);
  if (!t) return false;
  if (t === "زومبي" || t === "zombie" || t === "زومبى") return true;
  // Allow "zombie" / "زومبي" as first token in short spammy messages.
  const first = t.split(" ")[0] ?? "";
  return first === "زومبي" || first === "zombie" || first === "زومبى";
}

/** Kick gifts: every 50 kicks → 3 bosses (50→3, 100→6, …). */
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

function createEngine(w: number, h: number): Engine {
  return {
    w,
    h,
    player: {
      x: w / 2,
      y: h / 2,
      hp: PLAYER_MAX_HP,
      aim: -Math.PI / 2,
      fireCd: 0,
      invuln: 0,
    },
    mobs: [],
    bullets: [],
    particles: [],
    keys: new Set(),
    mouse: { x: w / 2, y: h / 2, down: false },
    shake: 0,
    nextId: 1,
    kills: 0,
    spawned: 0,
    bossesSpawned: 0,
    zombieComments: 0,
    queue: [],
    ended: false,
    outcome: null,
    livedSec: 0,
    flash: 0,
  };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function spawnEdge(engine: Engine, kind: MobKind, from: string) {
  const { w, h } = engine;
  const side = Math.floor(Math.random() * 4);
  let x = ARENA_PAD;
  let y = ARENA_PAD;
  if (side === 0) {
    x = Math.random() * w;
    y = ARENA_PAD + 8;
  } else if (side === 1) {
    x = w - ARENA_PAD - 8;
    y = Math.random() * h;
  } else if (side === 2) {
    x = Math.random() * w;
    y = h - ARENA_PAD - 8;
  } else {
    x = ARENA_PAD + 8;
    y = Math.random() * h;
  }

  const boss = kind === "boss";
  engine.mobs.push({
    id: engine.nextId++,
    kind,
    x,
    y,
    hp: boss ? BOSS_HP : ZOMBIE_HP,
    maxHp: boss ? BOSS_HP : ZOMBIE_HP,
    speed: boss ? BOSS_SPEED : ZOMBIE_SPEED,
    radius: boss ? 28 : 14,
    damage: boss ? BOSS_DAMAGE : ZOMBIE_DAMAGE,
    hitCd: 0,
    from,
  });
  engine.spawned += 1;
  if (boss) engine.bossesSpawned += 1;
}

function enqueue(engine: Engine, kind: MobKind, from: string, count = 1) {
  for (let i = 0; i < count; i++) engine.queue.push({ kind, from });
}

function burst(engine: Engine, x: number, y: number, color: string, n: number, power = 120) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = power * (0.35 + Math.random());
    engine.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.25 + Math.random() * 0.45,
      max: 0.7,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function updateEngine(engine: Engine, dt: number) {
  if (engine.ended) return;

  engine.livedSec += dt;
  engine.shake = Math.max(0, engine.shake - dt * 4);
  engine.flash = Math.max(0, engine.flash - dt * 3);
  engine.player.fireCd = Math.max(0, engine.player.fireCd - dt);
  engine.player.invuln = Math.max(0, engine.player.invuln - dt);

  // Drain spawn queue gradually so chat spam never freezes the frame.
  let released = 0;
  while (engine.queue.length > 0 && engine.mobs.length < MAX_ALIVE && released < 3) {
    const job = engine.queue.shift()!;
    spawnEdge(engine, job.kind, job.from);
    released += 1;
  }

  const p = engine.player;
  let mx = 0;
  let my = 0;
  if (engine.keys.has("KeyW") || engine.keys.has("ArrowUp")) my -= 1;
  if (engine.keys.has("KeyS") || engine.keys.has("ArrowDown")) my += 1;
  if (engine.keys.has("KeyA") || engine.keys.has("ArrowLeft")) mx -= 1;
  if (engine.keys.has("KeyD") || engine.keys.has("ArrowRight")) mx += 1;
  if (mx || my) {
    const len = Math.hypot(mx, my) || 1;
    p.x += (mx / len) * PLAYER_SPEED * dt;
    p.y += (my / len) * PLAYER_SPEED * dt;
  }
  p.x = clamp(p.x, ARENA_PAD + PLAYER_RADIUS, engine.w - ARENA_PAD - PLAYER_RADIUS);
  p.y = clamp(p.y, ARENA_PAD + PLAYER_RADIUS, engine.h - ARENA_PAD - PLAYER_RADIUS);
  p.aim = Math.atan2(engine.mouse.y - p.y, engine.mouse.x - p.x);

  if (engine.mouse.down && p.fireCd <= 0) {
    p.fireCd = FIRE_COOLDOWN;
    const spread = (Math.random() - 0.5) * 0.06;
    const ang = p.aim + spread;
    const muzzle = PLAYER_RADIUS + 10;
    engine.bullets.push({
      x: p.x + Math.cos(ang) * muzzle,
      y: p.y + Math.sin(ang) * muzzle,
      vx: Math.cos(ang) * BULLET_SPEED,
      vy: Math.sin(ang) * BULLET_SPEED,
      life: 1.1,
    });
    burst(engine, p.x + Math.cos(ang) * muzzle, p.y + Math.sin(ang) * muzzle, "#ffe08a", 4, 80);
  }

  for (const b of engine.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  engine.bullets = engine.bullets.filter(
    (b) => b.life > 0 && b.x > 0 && b.y > 0 && b.x < engine.w && b.y < engine.h,
  );

  for (const m of engine.mobs) {
    const dx = p.x - m.x;
    const dy = p.y - m.y;
    const dist = Math.hypot(dx, dy) || 1;
    m.x += (dx / dist) * m.speed * dt;
    m.y += (dy / dist) * m.speed * dt;
    m.hitCd = Math.max(0, m.hitCd - dt);

    if (dist < m.radius + PLAYER_RADIUS && m.hitCd <= 0 && p.invuln <= 0) {
      m.hitCd = 0.55;
      p.hp -= m.damage;
      p.invuln = 0.35;
      engine.shake = 0.55;
      engine.flash = 0.35;
      burst(engine, p.x, p.y, "#ff5a6a", 10, 160);
      if (p.hp <= 0) {
        p.hp = 0;
        engine.ended = true;
        engine.outcome = "defeated";
      }
    }
  }

  for (const b of engine.bullets) {
    for (const m of engine.mobs) {
      if (m.hp <= 0) continue;
      if (Math.hypot(b.x - m.x, b.y - m.y) < m.radius + 4) {
        m.hp -= BULLET_DAMAGE;
        b.life = 0;
        burst(engine, b.x, b.y, m.kind === "boss" ? "#c084fc" : "#7CFC9A", 8, 140);
        if (m.hp <= 0) {
          engine.kills += 1;
          engine.shake = Math.max(engine.shake, m.kind === "boss" ? 0.8 : 0.25);
          burst(engine, m.x, m.y, m.kind === "boss" ? "#e879f9" : "#4ade80", 18, 200);
        }
        break;
      }
    }
  }
  engine.mobs = engine.mobs.filter((m) => m.hp > 0);

  for (const pt of engine.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    pt.life -= dt;
  }
  engine.particles = engine.particles.filter((pt) => pt.life > 0);
}

function drawEngine(ctx: CanvasRenderingContext2D, engine: Engine) {
  const { w, h } = engine;
  ctx.save();
  if (engine.shake > 0) {
    const mag = engine.shake * 10;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  // Arena floor
  const g = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, "#13241c");
  g.addColorStop(1, "#070b09");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(61,255,154,0.06)";
  ctx.lineWidth = 1;
  for (let x = ARENA_PAD; x < w - ARENA_PAD; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, ARENA_PAD);
    ctx.lineTo(x, h - ARENA_PAD);
    ctx.stroke();
  }
  for (let y = ARENA_PAD; y < h - ARENA_PAD; y += 40) {
    ctx.beginPath();
    ctx.moveTo(ARENA_PAD, y);
    ctx.lineTo(w - ARENA_PAD, y);
    ctx.stroke();
  }

  // Walls
  ctx.strokeStyle = "rgba(61,255,154,0.45)";
  ctx.lineWidth = 4;
  ctx.strokeRect(ARENA_PAD, ARENA_PAD, w - ARENA_PAD * 2, h - ARENA_PAD * 2);
  ctx.strokeStyle = "rgba(251,113,133,0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(ARENA_PAD + 8, ARENA_PAD + 8, w - ARENA_PAD * 2 - 16, h - ARENA_PAD * 2 - 16);

  // Particles
  for (const pt of engine.particles) {
    ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Mobs
  for (const m of engine.mobs) {
    const boss = m.kind === "boss";
    ctx.save();
    ctx.translate(m.x, m.y);
    if (boss) {
      ctx.shadowColor = "#e879f9";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#4c1d95";
      ctx.beginPath();
      ctx.arc(0, 0, m.radius + 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = boss ? "#a855f7" : "#3f7a4a";
    ctx.beginPath();
    ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = boss ? "#f0abfc" : "#86efac";
    ctx.beginPath();
    ctx.arc(-m.radius * 0.28, -m.radius * 0.2, boss ? 4 : 2.5, 0, Math.PI * 2);
    ctx.arc(m.radius * 0.28, -m.radius * 0.2, boss ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    // HP bar
    const bw = m.radius * 2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-bw / 2, -m.radius - 10, bw, 4);
    ctx.fillStyle = boss ? "#e879f9" : "#4ade80";
    ctx.fillRect(-bw / 2, -m.radius - 10, bw * (m.hp / m.maxHp), 4);
    ctx.restore();
  }

  // Bullets
  for (const b of engine.bullets) {
    ctx.fillStyle = "#ffe08a";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Player
  const p = engine.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.aim);
  if (p.invuln > 0) ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 40) * 0.25;
  ctx.fillStyle = "#0f766e";
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5eead4";
  ctx.fillRect(8, -4, 22, 8);
  ctx.fillStyle = "#ecfdf5";
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (engine.flash > 0) {
    ctx.fillStyle = `rgba(255,60,80,${engine.flash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
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
  const [hud, setHud] = useState({
    hp: PLAYER_MAX_HP,
    kills: 0,
    alive: 0,
    queued: 0,
    comments: 0,
    bosses: 0,
  });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [endState, setEndState] = useState<EndState | null>(null);
  const [endReveal, setEndReveal] = useState(false);

  const session = useGameSession(180);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
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
    const leaders = rankContributors(contributorsRef.current);
    setEndState({
      outcome,
      kills: eng?.kills ?? 0,
      spawned: eng?.spawned ?? 0,
      bossesSpawned: eng?.bossesSpawned ?? 0,
      livedSec: eng?.livedSec ?? 0,
      leaders,
    });
    setPhase("ended");
    setEndReveal(false);
    window.setTimeout(() => setEndReveal(true), 1400);
  };

  useEffect(() => {
    session.setOnExpire(() => {
      if (!playingRef.current) return;
      const eng = engineRef.current;
      if (eng && !eng.ended) {
        eng.ended = true;
        eng.outcome = "survived";
      }
      finishGameRef.current("survived");
    });
  }, [session]);

  useNewMessages(messages, phase === "playing", (m) => {
    const eng = engineRef.current;
    if (!eng || eng.ended) return;

    if (m.kind === "gift" && m.giftAmount) {
      const bosses = bossesFromKicks(m.giftAmount);
      if (bosses <= 0) return;
      enqueue(eng, "boss", m.user, bosses);
      bumpContributor(contributorsRef.current, m, "bosses", bosses);
      pushFeed(`${m.user} أرسل ${m.giftAmount} كيك → ${bosses} وحوش`, "gift");
      return;
    }

    if (!isZombieTrigger(m.text)) return;
    eng.zombieComments += 1;
    enqueue(eng, "zombie", m.user, 1);
    bumpContributor(contributorsRef.current, m, "zombies", 1);
    pushFeed(`${m.user} أنزل زومبي`, "zombie");

    if (eng.zombieComments > 0 && eng.zombieComments % bossEveryRef.current === 0) {
      enqueue(eng, "boss", m.user, 1);
      bumpContributor(contributorsRef.current, m, "bosses", 1);
      pushFeed(`وحش كبير! بعد ${bossEveryRef.current} تعليق زومبي`, "boss");
    }
  });

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(640, Math.floor(rect.width));
      const h = Math.max(420, Math.floor(Math.min(560, rect.width * 0.62)));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!engineRef.current) {
        engineRef.current = createEngine(w, h);
      } else {
        engineRef.current.w = w;
        engineRef.current.h = h;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const eng = engineRef.current!;
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (down) eng.keys.add(e.code);
      else eng.keys.delete(e.code);
    };
    const keydown = (e: KeyboardEvent) => onKey(e, true);
    const keyup = (e: KeyboardEvent) => onKey(e, false);
    const move = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      eng.mouse.x = ((e.clientX - r.left) / r.width) * eng.w;
      eng.mouse.y = ((e.clientY - r.top) / r.height) * eng.h;
    };
    const down = () => {
      eng.mouse.down = true;
      canvas.focus();
    };
    const up = () => {
      eng.mouse.down = false;
    };

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    canvas.addEventListener("mouseleave", up);

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      updateEngine(eng, dt);
      const ctx = canvas.getContext("2d");
      if (ctx) drawEngine(ctx, eng);

      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        setHud({
          hp: Math.max(0, Math.round(eng.player.hp)),
          kills: eng.kills,
          alive: eng.mobs.length,
          queued: eng.queue.length,
          comments: eng.zombieComments,
          bosses: eng.bossesSpawned,
        });
      }

      if (eng.ended && eng.outcome === "defeated") {
        finishGameRef.current("defeated");
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      canvas.removeEventListener("mouseleave", up);
    };
  }, [phase]);

  const startMatch = () => {
    if (!chatActive) return;
    contributorsRef.current = emptyContributors();
    endHandled.current = false;
    engineRef.current = null;
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
    });
    playingRef.current = true;
    setPhase("playing");
    session.start();
  };

  const stopMatch = () => {
    if (phase !== "playing") return;
    const eng = engineRef.current;
    if (eng && !eng.ended) {
      eng.ended = true;
      eng.outcome = "survived";
    }
    finishGameRef.current("survived");
  };

  const resetLobby = () => {
    playingRef.current = false;
    session.stop();
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
          <h4 className="text-lg font-extrabold">شوتر الزومبي</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          اكتبوا <span className="font-bold text-foreground">زومبي</span> في الشات — والستريمر
          يدافع.
        </p>
      </div>

      {phase === "lobby" ? (
        <div className="space-y-4">
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

          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm leading-7 text-muted-foreground">
            <p className="font-bold text-foreground">التحكم</p>
            <p>
              تحريك: <span className="font-bold text-foreground">WASD</span> أو الأسهم · تصويب:
              الماوس · إطلاق: <span className="font-bold text-foreground">ضغط الماوس</span> على
              الساحة.
            </p>
          </div>

          <Button
            type="button"
            className="h-12 w-full text-base font-extrabold"
            disabled={!chatActive}
            onClick={startMatch}
          >
            <Crosshair className="size-4" />
            بدء الماب
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

          <div
            ref={wrapRef}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-black"
          >
            <canvas
              ref={canvasRef}
              tabIndex={0}
              className="block w-full cursor-crosshair outline-none"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-2 p-3">
              <div className="rounded-lg bg-black/55 px-2 py-1 text-[11px] font-bold text-emerald-200 backdrop-blur">
                اضغط على الساحة للتركيز · WASD + ماوس
              </div>
            </div>
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
