import * as THREE from "three";

export type MobKind = "zombie" | "boss" | "titan";

export type FpsHud = {
  hp: number;
  kills: number;
  alive: number;
  queued: number;
  comments: number;
  bosses: number;
  locked: boolean;
  weapon: WeaponId;
  weaponLabel: string;
  rifleTier: number;
  hasRpg: boolean;
  hasRiflePlus: boolean;
  bossThreat: string;
  bossSegments: number;
  bossHpPreview: number;
  ammo: number;
  magSize: number;
  reloading: boolean;
  reloadPct: number;
  /** 0–1 screen damage flash intensity. */
  hurtFlash: number;
};

export type WeaponId = "rifle" | "rifle_plus" | "rpg";

export type WeaponUnlockInfo = {
  rifleTier: number;
  hasRpg: boolean;
  hasRiflePlus: boolean;
  weapon: WeaponId;
  message: string;
};

export type FpsEndOutcome = "survived" | "defeated";

export type HealInfo = {
  kind: MobKind;
  amount: number;
  hp: number;
  maxHp: number;
};

export type BossProfile = {
  multiplier: number;
  segments: number;
  tier: 0 | 1 | 2 | 3;
  isMega: boolean;
  isTitan: boolean;
  title: string;
  hp: number;
  damage: number;
  speed: number;
  scale: number;
  radius: number;
  auraIntensity: number;
  auraRadius: number;
};

export type BossSpawnInfo = {
  title: string;
  hp: number;
  segments: number;
  multiplier: number;
  isMega: boolean;
  isTitan: boolean;
  from: string;
};

export type ZombieScaling = {
  hpMult: number;
  speedMult: number;
  damageMult: number;
  label: string;
};

export const TITAN_COMMENT_INTERVAL = 50;

export type ZombieEngineLabels = {
  bossTitles: readonly [string, string, string, string];
  megaBossTitle: string;
  titanBossTitle: string;
  viewer: string;
  segment: string;
  rifle: string;
  riflePlus: string;
  rpg: string;
  unlockWeapons: string;
  rifleUpgrade: string;
  maxRifleUpgrade: string;
  dir: "rtl" | "ltr";
};

const DEFAULT_LABELS: ZombieEngineLabels = {
  bossTitles: ["Big Boss", "Huge Boss", "Nightmare", "Legendary Boss"],
  megaBossTitle: "Massacre Boss",
  titanBossTitle: "Legendary Titan",
  viewer: "Viewer",
  segment: "Bar",
  rifle: "Rifle",
  riflePlus: "Rifle+",
  rpg: "RPG",
  unlockWeapons: "Power rifle + RPG unlocked — scroll to switch weapons",
  rifleUpgrade: "Rifle upgraded to level",
  maxRifleUpgrade: "Maximum rifle upgrade — use the RPG!",
  dir: "ltr",
};

/** Shorter rounds and higher boss thresholds make regular zombies tougher. */
export function computeZombieScaling(roundDurationSec: number, bossEvery: number): ZombieScaling {
  const duration = roundDurationSec > 0 ? roundDurationSec : 3600;
  const durationFactor = Math.max(0.8, Math.min(2.75, Math.sqrt(1800 / duration)));
  const threshold = Math.max(5, Math.min(150, bossEvery));
  const bossFactor = 1 + ((threshold - 5) / 145) * 1.15;
  const combined = durationFactor * bossFactor;
  return {
    hpMult: combined,
    speedMult: 1 + (combined - 1) * 0.38,
    damageMult: 1 + (combined - 1) * 0.55,
    label: `×${combined.toFixed(2)}`,
  };
}

/** Boss power scales with comment threshold — 100+ = mega boss, 150 = ×4.8 HP (3 هيلات). */
export function computeBossProfile(
  bossEvery: number,
  titles: Pick<ZombieEngineLabels, "bossTitles" | "megaBossTitle"> = DEFAULT_LABELS,
): BossProfile {
  const threshold = Math.max(5, Math.min(150, bossEvery));

  if (threshold >= 100) {
    const t = (threshold - 100) / 50;
    const multiplier = 3.4 + t * 1.4;
    return {
      multiplier,
      segments: 3,
      tier: 3,
      isMega: true,
      isTitan: false,
      title: titles.megaBossTitle,
      hp: Math.round(BOSS_HP * multiplier),
      damage: Math.round(BOSS_DAMAGE * (1 + (multiplier - 1) * 0.8)),
      speed: Math.max(0.78, BOSS_SPEED - 0.12),
      scale: 3.65 + t * 0.55,
      radius: 2.15 + t * 0.3,
      auraIntensity: 4.8 + t * 2.5,
      auraRadius: 24 + t * 10,
    };
  }

  const multiplier = threshold > 50 ? 1 + ((threshold - 50) / 50) * 0.95 : 1;
  const tier: 0 | 1 | 2 | 3 =
    multiplier >= 1.75 ? 2 : multiplier > 1.05 ? 1 : 0;
  const segments = tier >= 2 ? 2 : 1;
  return {
    multiplier,
    segments,
    tier,
    isMega: false,
    isTitan: false,
    title: titles.bossTitles[tier],
    hp: Math.round(BOSS_HP * multiplier),
    damage: Math.round(BOSS_DAMAGE * (1 + (multiplier - 1) * 0.6)),
    speed: Math.max(0.82, BOSS_SPEED - (multiplier - 1) * 0.1),
    scale: 2.85 + (multiplier - 1) * 0.45,
    radius: 1.75 + (multiplier - 1) * 0.3,
    auraIntensity: 2.4 + (multiplier - 1) * 2,
    auraRadius: 12 + (multiplier - 1) * 6,
  };
}

/** Exceptional titan — always every 50 zombie comments. Tail smash + self-heal. */
export function computeTitanProfile(
  bossEvery: number,
  title = DEFAULT_LABELS.titanBossTitle,
): BossProfile {
  const threshold = Math.max(5, Math.min(150, bossEvery));
  const t = (threshold - 5) / 145;
  const multiplier = 4.4 + t * 2.1;
  return {
    multiplier,
    segments: 3,
    tier: 3,
    isMega: false,
    isTitan: true,
    title,
    hp: Math.round(BOSS_HP * multiplier * 1.4),
    damage: Math.round(PLAYER_MAX_HP * 0.58),
    speed: 1.42,
    scale: 4.95,
    radius: 2.75,
    auraIntensity: 6.2,
    auraRadius: 30,
  };
}

type Mob = {
  id: number;
  kind: MobKind;
  root: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  hitCd: number;
  from: string;
  phase: number;
  limp: number;
  hpFill: THREE.Sprite;
  hpLabel: THREE.Sprite;
  bossSegments: number;
  isTitan: boolean;
  lastDamagedAt: number;
  tailCd: number;
  tailWindup: number;
  lethalCd: number;
  lethalWindup: number;
  hpPaintRatio: number;
  hpPaintAcc: number;
  animHips: THREE.Object3D;
  animLegL: THREE.Object3D;
  animLegR: THREE.Object3D;
  animArmL: THREE.Object3D;
  animArmR: THREE.Object3D;
  animTail?: THREE.Object3D;
};

type SpawnJob = { kind: MobKind; from: string };

type FxSpark = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
};

type FxExplosion = {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
};

type SmokePuff = {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
};

type DyingMob = {
  root: THREE.Group;
  life: number;
  maxLife: number;
};

type HealOrbFx = {
  sprite: THREE.Sprite;
  amount: number;
  kind: MobKind;
  speed: number;
  trailTimer: number;
  bob: number;
};

function healOrbColors(kind: MobKind) {
  if (kind === "titan") return { core: "#67e8f9", ring: "#22d3ee", text: "#ecfeff" };
  if (kind === "boss") return { core: "#f0abfc", ring: "#e879f9", text: "#fdf4ff" };
  return { core: "#86efac", ring: "#4ade80", text: "#ecfdf5" };
}

function makeHealOrbTexture(amount: number, kind: MobKind) {
  const { core, ring, text } = healOrbColors(kind);
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);
  const glow = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
  glow.addColorStop(0, `${core}ee`);
  glow.addColorStop(0.45, `${ring}88`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ring;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "bold 40px Segoe UI, Tahoma, Arial";
  ctx.fillStyle = text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 8;
  ctx.fillText(`+${amount}`, 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function disposeHealOrb(orb: HealOrbFx, scene: THREE.Scene) {
  scene.remove(orb.sprite);
  const mat = orb.sprite.material as THREE.SpriteMaterial;
  mat.map?.dispose();
  mat.dispose();
}

type WeaponSpec = {
  id: WeaponId;
  label: string;
  damage: number;
  cooldown: number;
  recoil: number;
  shake: number;
  flashColor: number;
  sparkColor: number;
};

export type ZombieFpsEngine = {
  dispose: () => void;
  enqueue: (kind: MobKind, from: string, count?: number) => void;
  getHud: () => FpsHud;
  getStats: () => {
    kills: number;
    spawned: number;
    bossesSpawned: number;
    livedSec: number;
    zombieComments: number;
  };
  bumpZombieComment: () => number;
  requestPointerLock: () => void;
  markEnded: (outcome: FpsEndOutcome) => void;
  isEnded: () => boolean;
  getOutcome: () => FpsEndOutcome | null;
  resize: () => void;
};

const PLAYER_MAX_HP = 100;
const TITAN_CINEMATIC_DECAY = 0.14;
const TITAN_LETHAL_INTERVAL = 10;
const TITAN_LETHAL_DAMAGE = Math.round(PLAYER_MAX_HP * 0.78);
/** Small sustain reward for picking off zombies. */
const ZOMBIE_KILL_HEAL = 4;
const BOSS_KILL_HEAL = ZOMBIE_KILL_HEAL * 2;
const MAX_ALIVE = 30;
const HUD_EMIT_INTERVAL = 0.22;
const MAX_SPAWN_PER_FRAME = 2;
const MAX_HEAVY_SPAWNS_PER_FRAME = 1;
const SPARK_POOL_CAP = 48;
const MAX_SPARKS_ACTIVE = 52;
const MAX_SMOKE_PUFFS = 10;
const MAX_EXPLOSIONS = 4;
const MAX_PIXEL_RATIO = 1.25;
const MOB_COLLISION_SKIP_DIST = 9;
const MOVE_SPEED = 6.8;
/** Base assault rifle. */
const RIFLE_DAMAGE = 22;
const RIFLE_COOLDOWN = 0.13;
/** Upgraded rifle tiers unlocked by boss kills. */
const RIFLE_PLUS_DAMAGE = [38, 48, 58] as const;
const RIFLE_PLUS_COOLDOWN = [0.15, 0.14, 0.13] as const;
const MAX_RIFLE_TIER = 3;
/** RPG — heavy splash damage, slow reload. */
const RPG_DIRECT_DAMAGE = 260;
const RPG_SPLASH_DAMAGE = 165;
const RPG_SPLASH_RADIUS = 6.8;
const RPG_COOLDOWN = 1.75;
const MAGAZINE_SIZE = 50;
const RELOAD_TIME = 1.85;
const BASE_FOV = 78;
const RIFLE_ADS_FOV = 42;
const ADS_LERP_SPEED = 9;
const ZOMBIE_HP = 170;
/** Threshold boss — huge sponge, many shots to drop. */
const BOSS_HP = 1400;
const ZOMBIE_SPEED = 2.45;
const BOSS_SPEED = 1.28;
const ZOMBIE_DAMAGE = 14;
const BOSS_DAMAGE = 32;
const ARENA = 70;
const WALL = ARENA / 2 - 0.75;
/** Four zombie gates — one per arena side. Bosses spawn at center. */
const SPAWN_EDGE = WALL - 1.15;
const SPAWN_SPREAD = 1.2;
const ZOMBIE_SPAWN_GATES = [
  { x: 0, z: -SPAWN_EDGE },
  { x: 0, z: SPAWN_EDGE },
  { x: -SPAWN_EDGE, z: 0 },
  { x: SPAWN_EDGE, z: 0 },
] as const;
const BOSS_SPAWN = { x: 0, z: 0 };
const BOSS_SPAWN_SPREAD = 2.2;

const PLAYER_RADIUS = 0.45;
const PLAYER_EYE_HEIGHT = 1.67;
const JUMP_VELOCITY = 6.2;
const GRAVITY = 18;
/** Ground rocks — x, z, radius (collision + mesh). */
const GROUND_ROCKS: readonly [number, number, number][] = [
  [-26, -22, 0.95],
  [-18, -24, 0.7],
  [24, -20, 1.05],
  [28, -8, 0.75],
  [-28, 6, 0.85],
  [-22, 18, 0.65],
  [20, 22, 0.9],
  [26, 14, 0.55],
  [-12, -26, 0.8],
  [14, -26, 0.7],
  [-30, -6, 0.6],
  [30, 4, 0.85],
  [-8, 24, 0.75],
  [10, 26, 0.6],
  [-24, -10, 0.5],
  [22, -4, 0.65],
  [-16, 8, 0.55],
  [18, 10, 0.7],
];

function terrainHeight(_x: number, _z: number) {
  return 0;
}

/** Arena crates used for simple blocking collision. */
const OBSTACLES = [
  [-16, -12, 1.5],
  [18, 11, 1.9],
  [-9, 18, 1.25],
  [12, -17, 1.6],
  [0, -20, 1.1],
  [-22, 5, 1.35],
  [20, 2, 1.4],
] as const;

function wallBound(radius: number) {
  return WALL - radius;
}

function clampInsideWalls(x: number, z: number, radius: number) {
  const bound = wallBound(radius);
  return {
    x: THREE.MathUtils.clamp(x, -bound, bound),
    z: THREE.MathUtils.clamp(z, -bound, bound),
  };
}

function resolveObstacles(x: number, z: number, radius: number) {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 2; pass++) {
    for (const [ox, oz, size] of OBSTACLES) {
      const half = size / 2 + radius + 0.05;
      const dx = px - ox;
      const dz = pz - oz;
      if (Math.abs(dx) >= half || Math.abs(dz) >= half) continue;
      const penX = half - Math.abs(dx);
      const penZ = half - Math.abs(dz);
      if (penX < penZ) px += Math.sign(dx || 1) * penX;
      else pz += Math.sign(dz || 1) * penZ;
    }
    for (const [rx, rz, rs] of GROUND_ROCKS) {
      const dx = px - rx;
      const dz = pz - rz;
      const dist = Math.hypot(dx, dz);
      const minDist = rs + radius + 0.1;
      if (dist >= minDist || dist < 0.001) continue;
      const push = minDist / dist;
      px = rx + dx * push;
      pz = rz + dz * push;
    }
  }
  return clampInsideWalls(px, pz, radius);
}

function applyMobCollision(mob: Mob, x: number, z: number, others: Mob[]) {
  let px = x;
  let pz = z;
  for (const other of others) {
    if (other.id === mob.id) continue;
    const dx = px - other.root.position.x;
    const dz = pz - other.root.position.z;
    const skipDist = mob.radius + other.radius + MOB_COLLISION_SKIP_DIST;
    if (dx * dx + dz * dz > skipDist * skipDist) continue;
    let dist = Math.hypot(dx, dz);
    const minDist = mob.radius + other.radius + 0.08;
    if (dist >= minDist) continue;
    if (dist < 0.001) {
      const jitter = (mob.id + other.id) * 0.17;
      px += Math.cos(jitter) * 0.05;
      pz += Math.sin(jitter) * 0.05;
      continue;
    }
    const push = (minDist - dist) / dist;
    px += dx * push;
    pz += dz * push;
  }
  const resolved = resolveObstacles(px, pz, mob.radius);
  mob.root.position.x = resolved.x;
  mob.root.position.z = resolved.z;
}

type SpawnGateVisual = {
  group: THREE.Group;
  portalRing: THREE.Mesh;
};

function createSpawnGate(x: number, z: number, variant: "zombie" | "boss" = "zombie"): SpawnGateVisual {
  const group = new THREE.Group();
  const ground = terrainHeight(x, z);
  group.position.set(x, ground, z);
  const isBoss = variant === "boss";
  const portalRing = new THREE.Mesh(
    new THREE.RingGeometry(isBoss ? 2.4 : 1.35, isBoss ? 3.5 : 2.15, 36),
    new THREE.MeshBasicMaterial({
      color: isBoss ? 0xe879f9 : 0x34d399,
      transparent: true,
      opacity: isBoss ? 0.72 : 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  portalRing.rotation.x = -Math.PI / 2;
  portalRing.position.y = 0.03;
  const portalBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(isBoss ? 2.8 : 1.55, isBoss ? 2.8 : 1.55, isBoss ? 6.2 : 4.8, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: isBoss ? 0xc026d3 : 0x22c55e,
      transparent: true,
      opacity: isBoss ? 0.22 : 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  portalBeam.position.y = isBoss ? 3.1 : 2.4;
  group.add(portalRing, portalBeam);
  return { group, portalRing };
}

function makeNoiseTexture(size = 256, tint: [number, number, number], contrast = 28) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() * contrast) | 0;
    img.data[i] = Math.min(255, tint[0] + n);
    img.data[i + 1] = Math.min(255, tint[1] + n);
    img.data[i + 2] = Math.min(255, tint[2] + n);
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // cracks / stains
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = i % 2 ? "#000" : "#222";
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSkyDome() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#1a4f7a");
  sky.addColorStop(0.38, "#5ba3d9");
  sky.addColorStop(0.72, "#9fd4f7");
  sky.addColorStop(1, "#d4e8c8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sun = ctx.createRadialGradient(760, 110, 8, 760, 110, 140);
  sun.addColorStop(0, "rgba(255,248,220,0.95)");
  sun.addColorStop(0.35, "rgba(255,220,140,0.35)");
  sun.addColorStop(1, "transparent");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const haze = ctx.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height);
  haze.addColorStop(0, "transparent");
  haze.addColorStop(1, "rgba(200,220,180,0.55)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(130, 36, 20),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }),
  );
  return dome;
}

function scatterArenaRocks(scene: THREE.Scene, colliders: THREE.Object3D[]) {
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x5a5348,
    roughness: 0.96,
    metalness: 0.02,
  });
  for (const [x, z, s] of GROUND_ROCKS) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    const gy = terrainHeight(x, z);
    rock.position.set(x, gy + s * 0.38, z);
    rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.4);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    colliders.push(rock);
  }
}

function makeNameTag(
  name: string,
  boss: boolean,
  mega = false,
  titan = false,
  labels: ZombieEngineLabels = DEFAULT_LABELS,
) {
  const label = (name || labels.viewer).trim().slice(0, 18);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // pill background
  const padX = 28;
  ctx.font = "bold 54px Segoe UI, Tahoma, Arial";
  const textW = Math.min(canvas.width - padX * 2, ctx.measureText(label).width);
  const boxW = textW + padX * 2;
  const boxH = 78;
  const boxX = (canvas.width - boxW) / 2;
  const boxY = 28;
  const r = 24;
  ctx.beginPath();
  ctx.moveTo(boxX + r, boxY);
  ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
  ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r);
  ctx.arcTo(boxX, boxY + boxH, boxX, boxY, r);
  ctx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
  ctx.closePath();
  ctx.fillStyle = titan
    ? "rgba(8, 47, 73, 0.96)"
    : mega
      ? "rgba(69, 10, 10, 0.94)"
      : boss
        ? "rgba(88, 28, 135, 0.88)"
        : "rgba(6, 24, 16, 0.88)";
  ctx.fill();
  ctx.lineWidth = titan ? 5 : mega ? 5 : 4;
  ctx.strokeStyle = titan
    ? "rgba(34, 211, 238, 0.98)"
    : mega
      ? "rgba(251, 113, 133, 0.98)"
      : boss
        ? "rgba(232, 121, 249, 0.95)"
        : "rgba(52, 211, 153, 0.95)";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = labels.dir;
  ctx.fillText(label, canvas.width / 2, boxY + boxH / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(mega ? 4.3 : boss ? 3.4 : 1.75, mega ? 1.18 : boss ? 0.92 : 0.48, 1);
  sprite.position.y = mega ? 7.45 : boss ? 6.35 : 2.25;
  sprite.name = "nametag";
  sprite.renderOrder = 10;
  return sprite;
}

function makeHpBarSprites(boss: boolean, barScale = boss ? 3.2 : 1.6) {
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = 256;
  bgCanvas.height = 48;
  const bgCtx = bgCanvas.getContext("2d")!;
  bgCtx.fillStyle = "rgba(0,0,0,0.75)";
  bgCtx.strokeStyle = boss ? "rgba(232,121,249,0.9)" : "rgba(255,255,255,0.35)";
  bgCtx.lineWidth = 4;
  bgCtx.beginPath();
  bgCtx.roundRect(8, 12, 240, 24, 10);
  bgCtx.fill();
  bgCtx.stroke();
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  const bg = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: bgTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  bg.name = "hpBg";
  bg.scale.set(barScale, boss ? 0.55 : 0.28, 1);
  bg.position.y = boss ? 5.55 + (barScale - 3.2) * 0.35 : 1.92;
  bg.renderOrder = 11;

  const fillCanvas = document.createElement("canvas");
  fillCanvas.width = 256;
  fillCanvas.height = 48;
  const fillTex = new THREE.CanvasTexture(fillCanvas);
  fillTex.colorSpace = THREE.SRGBColorSpace;
  const fill = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: fillTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  fill.name = "hpFill";
  fill.scale.set(barScale - 0.2, boss ? 0.42 : 0.2, 1);
  fill.position.y = boss ? 5.55 + (barScale - 3.2) * 0.35 : 1.92;
  fill.renderOrder = 12;

  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const hpLabel = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  hpLabel.name = "hpLabel";
  hpLabel.scale.set(boss ? 2.4 + (barScale - 3.2) * 0.2 : 1.2, boss ? 0.55 : 0.3, 1);
  hpLabel.position.y = boss ? 5.15 + (barScale - 3.2) * 0.35 : 1.72;
  hpLabel.renderOrder = 13;

  return { bg, fill, hpLabel };
}

function paintHpBar(
  fill: THREE.Sprite,
  hpLabel: THREE.Sprite,
  hp: number,
  maxHp: number,
  boss: boolean,
  segments = 1,
  isTitan = false,
  segmentLabel = DEFAULT_LABELS.segment,
) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const fillCanvas = (fill.material as THREE.SpriteMaterial).map!.image as HTMLCanvasElement;
  const fillTex = (fill.material as THREE.SpriteMaterial).map!;
  const ctx = fillCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, fillCanvas.width, fillCanvas.height);
  const w = Math.max(4, Math.floor(232 * ratio));
  const grad = ctx.createLinearGradient(12, 0, 12 + w, 0);
  if (boss) {
    if (isTitan) {
      grad.addColorStop(0, "#67e8f9");
      grad.addColorStop(0.45, "#22d3ee");
      grad.addColorStop(1, ratio < 0.35 ? "#0891b2" : "#0e7490");
    } else if (segments >= 3) {
      grad.addColorStop(0, "#fda4af");
      grad.addColorStop(0.5, "#e879f9");
      grad.addColorStop(1, ratio < 0.35 ? "#ef4444" : "#7c3aed");
    } else if (segments >= 2) {
      grad.addColorStop(0, "#f0abfc");
      grad.addColorStop(1, ratio < 0.35 ? "#ef4444" : "#a855f7");
    } else {
      grad.addColorStop(0, "#f0abfc");
      grad.addColorStop(1, ratio < 0.35 ? "#ef4444" : "#a855f7");
    }
  } else {
    grad.addColorStop(0, "#86efac");
    grad.addColorStop(1, ratio < 0.35 ? "#ef4444" : "#22c55e");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(12, 14, w, 20, 8);
  ctx.fill();

  if (boss && segments > 1) {
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 2;
    for (let i = 1; i < segments; i++) {
      const x = 12 + Math.floor((232 / segments) * i);
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, 34);
      ctx.stroke();
    }
  }
  fillTex.needsUpdate = true;

  const fullScaleX = boss ? 3.0 : 1.5;
  fill.scale.x = fullScaleX * Math.max(0.08, ratio);

  const labelCanvas = (hpLabel.material as THREE.SpriteMaterial).map!.image as HTMLCanvasElement;
  const labelTex = (hpLabel.material as THREE.SpriteMaterial).map!;
  const lctx = labelCanvas.getContext("2d")!;
  lctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  lctx.font = boss ? "bold 36px Segoe UI, Tahoma, Arial" : "bold 28px Segoe UI, Tahoma, Arial";
  lctx.fillStyle = "#ffffff";
  lctx.textAlign = "center";
  lctx.textBaseline = "middle";
  lctx.shadowColor = "rgba(0,0,0,0.8)";
  lctx.shadowBlur = 6;
  const hpText = `${Math.max(0, Math.ceil(hp))} / ${maxHp}`;
  if (boss && segments > 1) {
    const perSeg = maxHp / segments;
    const currentSeg = Math.max(1, Math.ceil(Math.max(hp, 1) / perSeg));
    lctx.fillText(`${hpText} · ${segmentLabel} ${currentSeg}/${segments}`, labelCanvas.width / 2, 32);
  } else {
    lctx.fillText(hpText, labelCanvas.width / 2, 32);
  }
  labelTex.needsUpdate = true;
}

function buildTitanTail(
  hips: THREE.Group,
  scale: number,
  shellMat: THREE.MeshStandardMaterial,
  veinMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const tailPivot = new THREE.Group();
  tailPivot.name = "tail";
  tailPivot.position.set(0, 1.08 * scale, -0.52 * scale);

  const segCount = 7;
  let parent: THREE.Object3D = tailPivot;
  let segLen = 0.36 * scale;

  for (let i = 0; i < segCount; i++) {
    const joint = new THREE.Group();
    const t = i / Math.max(1, segCount - 1);
    const radius = THREE.MathUtils.lerp(0.22 * scale, 0.045 * scale, t);

    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.78, radius, segLen, 10),
      i % 3 === 0 ? veinMat : shellMat,
    );
    seg.rotation.x = Math.PI / 2;
    seg.position.z = -segLen * 0.5;
    joint.add(seg);

    if (i > 1 && i % 2 === 0) {
      for (const side of [-1, 1] as const) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.55, radius * 2.1, 6), veinMat);
        spike.position.set(side * radius * 1.15, 0, -segLen * 0.52);
        spike.rotation.z = side * (Math.PI / 2 + 0.25);
        joint.add(spike);
      }
    }

    if (i > 0) joint.position.z = -segLen * 0.9;
    joint.rotation.x = i === 0 ? -0.18 : -0.11 - t * 0.1;
    parent.add(joint);
    parent = joint;
    segLen *= 0.87;
  }

  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.14 * scale, 0.72 * scale, 8), veinMat);
  blade.rotation.x = Math.PI / 2;
  blade.position.z = -segLen * 0.55;
  parent.add(blade);

  hips.add(tailPivot);
  return tailPivot;
}

function makeTitanMesh(
  fromName: string,
  bossProfile?: BossProfile,
  labels: ZombieEngineLabels = DEFAULT_LABELS,
) {
  const g = new THREE.Group();
  const scale = bossProfile?.scale ?? 3.35;

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x0a1628,
    roughness: 0.68,
    metalness: 0.62,
    emissive: 0x083344,
    emissiveIntensity: 0.18,
  });
  const veinMat = new THREE.MeshStandardMaterial({
    color: 0x155e75,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.05,
    metalness: 0.48,
    roughness: 0.28,
  });
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a4a,
    roughness: 0.55,
    metalness: 0.35,
    emissive: 0x0e7490,
    emissiveIntensity: 0.35,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfacc15,
    emissiveIntensity: 2.6,
  });

  const hips = new THREE.Group();
  hips.name = "hips";
  g.add(hips);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(1.15 * scale, 0.5 * scale, 0.95 * scale), shellMat);
  pelvis.position.y = 0.92 * scale;
  pelvis.castShadow = true;
  hips.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4 * scale, 0.9 * scale, 1.2 * scale), shellMat);
  torso.position.set(0, 1.52 * scale, 0.1 * scale);
  torso.rotation.x = 0.38;
  torso.castShadow = true;
  hips.add(torso);

  const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.24 * scale, 0), veinMat);
  chestCore.position.set(0, 1.42 * scale, 0.58 * scale);
  hips.add(chestCore);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.78 * scale, 0.45 * scale, 1.05 * scale), boneMat);
  skull.position.set(0, 1.28 * scale, 0.78 * scale);
  skull.rotation.x = 0.22;
  skull.castShadow = true;
  hips.add(skull);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.92 * scale, 0.14 * scale, 0.28 * scale), shellMat);
  brow.position.set(0, 1.52 * scale, 1.12 * scale);
  brow.rotation.x = -0.2;
  hips.add(brow);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.64 * scale, 0.2 * scale, 0.62 * scale), boneMat);
  jaw.position.set(0, 1.05 * scale, 1.02 * scale);
  hips.add(jaw);

  for (const [x, y] of [
    [-0.24, 1.44],
    [0.24, 1.44],
    [-0.17, 1.34],
    [0.17, 1.34],
  ] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075 * scale, 8, 8), eyeMat);
    eye.position.set(x * scale, y * scale, 1.2 * scale);
    hips.add(eye);
  }

  for (let i = 0; i < 6; i++) {
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.1 * scale, 0.32 * scale, 5), veinMat);
    ridge.position.set(0, (1.62 + i * 0.16) * scale, (-0.12 - i * 0.14) * scale);
    ridge.rotation.x = -0.55;
    hips.add(ridge);
  }

  const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.38 * scale, 0.62 * scale), shellMat);
  shoulderL.position.set(-0.82 * scale, 1.62 * scale, 0.05 * scale);
  shoulderL.rotation.z = 0.25;
  const shoulderR = shoulderL.clone();
  shoulderR.position.x = 0.82 * scale;
  shoulderR.rotation.z = -0.25;
  hips.add(shoulderL, shoulderR);

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.17 * scale, 0.95 * scale, 4, 8), boneMat);
  armL.name = "armL";
  armL.position.set(-0.95 * scale, 0.72 * scale, 0.42 * scale);
  armL.rotation.set(1.05, 0.15, 0.55);
  hips.add(armL);

  const armR = armL.clone();
  armR.name = "armR";
  armR.position.set(0.95 * scale, 0.72 * scale, 0.42 * scale);
  armR.rotation.set(1.05, -0.15, -0.55);
  hips.add(armR);

  for (const [arm, side] of [
    [armL, -1],
    [armR, 1],
  ] as const) {
    for (let c = 0; c < 3; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.28 * scale, 5), veinMat);
      claw.position.set(side * (0.08 + c * 0.07) * scale, -0.52 * scale, 0.12 * scale);
      claw.rotation.set(0.4, side * 0.2, side * (0.35 + c * 0.12));
      arm.add(claw);
    }
  }

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.22 * scale, 0.52 * scale, 4, 8), shellMat);
  legL.name = "legL";
  legL.position.set(-0.4 * scale, 0.38 * scale, 0.02 * scale);
  hips.add(legL);

  const legR = legL.clone();
  legR.name = "legR";
  legR.position.x = 0.4 * scale;
  hips.add(legR);

  const tailPivot = buildTitanTail(hips, scale, shellMat, veinMat);

  const titanRing = new THREE.Mesh(
    new THREE.RingGeometry(1.15 * scale, 1.55 * scale, 36),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  titanRing.rotation.x = -Math.PI / 2;
  titanRing.position.y = 0.05;
  g.add(titanRing);

  const hpBarScale = 3.2 + 1.1 + 3 * 0.35;
  const hp = makeHpBarSprites(true, hpBarScale);
  g.add(makeNameTag(fromName, true, false, true, labels));
  g.add(hp.bg, hp.fill, hp.hpLabel);

  return {
    root: g,
    hpFill: hp.fill,
    hpLabel: hp.hpLabel,
    anim: { hips, legL, legR, armL, armR, tail: tailPivot },
  };
}

function makeZombieMesh(
  kind: MobKind,
  fromName: string,
  bossProfile?: BossProfile,
  labels: ZombieEngineLabels = DEFAULT_LABELS,
) {
  const isTitan = kind === "titan" || (bossProfile?.isTitan ?? false);
  if (isTitan) return makeTitanMesh(fromName, bossProfile, labels);

  const g = new THREE.Group();
  const boss = kind === "boss";
  const scale = boss ? (bossProfile?.scale ?? 2.85) : 1.08;
  const tier = bossProfile?.tier ?? 0;
  const isMega = bossProfile?.isMega ?? false;

  const skin = new THREE.MeshStandardMaterial({
    color: boss
      ? isMega
        ? 0x1a0505
        : tier >= 3
          ? 0x4c0519
          : tier >= 2
            ? 0x581c87
            : 0x6b21a8
      : 0x4a6b45,
    roughness: 0.88,
    metalness: boss && (isMega || tier >= 2) ? 0.28 : 0.02,
    emissive: boss
      ? isMega
        ? 0x991b1b
        : tier >= 3
          ? 0x7f1d1d
          : 0x3b0764
      : 0x1a2e1a,
    emissiveIntensity: boss ? (isMega ? 0.55 : 0.28 + tier * 0.12) : 0.08,
  });
  const cloth = new THREE.MeshStandardMaterial({
    color: boss ? (isMega ? 0x0f0a0a : 0x2e1065) : 0x2a3328,
    roughness: 0.92,
    emissive: isMega ? 0x450a0a : 0x000000,
    emissiveIntensity: isMega ? 0.25 : 0,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: boss ? (isMega ? 0xffea00 : 0xff1f4b) : 0xc8ff4a,
    emissive: boss ? (isMega ? 0xff6600 : 0xff1f4b) : 0x84cc16,
    emissiveIntensity: isMega ? 2.2 : boss ? 1.4 : 1.4,
  });

  const hips = new THREE.Group();
  hips.name = "hips";
  g.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * scale, 0.55 * scale, 4, 8), cloth);
  torso.position.y = 1.15 * scale;
  torso.castShadow = boss;
  hips.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 10, 10), skin);
  head.position.y = 1.72 * scale;
  head.castShadow = boss;
  hips.add(head);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.08 * scale, 0.12 * scale), skin);
  jaw.position.set(0, 1.58 * scale, 0.12 * scale);
  hips.add(jaw);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045 * scale, 6, 6), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.08 * scale, 1.76 * scale, 0.18 * scale);
  eyeR.position.set(0.08 * scale, 1.76 * scale, 0.18 * scale);
  hips.add(eyeL, eyeR);

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08 * scale, 0.45 * scale, 3, 6), skin);
  armL.name = "armL";
  armL.position.set(-0.42 * scale, 1.25 * scale, 0.05 * scale);
  armL.rotation.z = 0.35;
  armL.castShadow = false;
  hips.add(armL);

  const armR = armL.clone();
  armR.name = "armR";
  armR.position.x = 0.42 * scale;
  armR.rotation.z = -0.35;
  hips.add(armR);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1 * scale, 0.5 * scale, 3, 6), cloth);
  legL.name = "legL";
  legL.position.set(-0.14 * scale, 0.45 * scale, 0);
  legL.castShadow = false;
  hips.add(legL);

  const legR = legL.clone();
  legR.name = "legR";
  legR.position.x = 0.14 * scale;
  hips.add(legR);

  if (boss) {
    const hornMat = new THREE.MeshStandardMaterial({
      color: isMega ? 0xffedd5 : tier >= 3 ? 0xfca5a5 : 0xfbbf24,
      emissive: isMega ? 0xea580c : tier >= 3 ? 0xdc2626 : 0xb45309,
      emissiveIntensity: isMega ? 0.9 : 0.55 + tier * 0.15,
      metalness: 0.5,
      roughness: 0.28,
    });
    const horns = new THREE.Mesh(
      new THREE.ConeGeometry(0.12 + tier * 0.03 + (isMega ? 0.06 : 0), 0.35 + tier * 0.08 + (isMega ? 0.2 : 0), 6),
      hornMat,
    );
    horns.position.set(-0.16 * scale, 2.0 * scale, 0);
    const horns2 = horns.clone();
    horns2.position.x = 0.16 * scale;
    hips.add(horns, horns2);

    if (tier >= 2 || isMega) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08 + (isMega ? 0.04 : 0), 0.28 + (isMega ? 0.15 : 0), 5), hornMat);
      spike.position.set(0, 2.25 * scale, 0);
      hips.add(spike);
    }

    if (isMega) {
      const armorMat = new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        metalness: 0.75,
        roughness: 0.25,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.45,
      });
      const padL = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.28 * scale, 0.32 * scale), armorMat);
      padL.position.set(-0.58 * scale, 1.32 * scale, 0);
      const padR = padL.clone();
      padR.position.x = 0.58 * scale;
      hips.add(padL, padR);

      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.22 * scale, 0.045 * scale, 8, 20), hornMat);
      crown.position.set(0, 2.18 * scale, 0);
      crown.rotation.x = Math.PI / 2;
      hips.add(crown);

      const horn3 = horns.clone();
      horn3.position.set(-0.3 * scale, 1.92 * scale, 0.1 * scale);
      horn3.rotation.z = 0.35;
      const horn4 = horns.clone();
      horn4.position.set(0.3 * scale, 1.92 * scale, 0.1 * scale);
      horn4.rotation.z = -0.35;
      hips.add(horn3, horn4);

      const hellRing = new THREE.Mesh(
        new THREE.RingGeometry(0.85 * scale, 1.2 * scale, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff4500,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      hellRing.rotation.x = -Math.PI / 2;
      hellRing.position.y = 0.04;
      g.add(hellRing);
    }
  }

  const hpBarScale = boss ? 3.2 + tier * 0.35 + (isMega ? 0.9 : 0) : 1.6;
  const hp = makeHpBarSprites(boss, hpBarScale);
  g.add(makeNameTag(fromName, boss, isMega, false, labels));
  g.add(hp.bg, hp.fill, hp.hpLabel);

  return {
    root: g,
    hpFill: hp.fill,
    hpLabel: hp.hpLabel,
    anim: { hips, legL, legR, armL, armR, tail: undefined },
  };
}

function addWeaponPart(
  weapon: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  name?: string,
) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  if (name) mesh.name = name;
  weapon.add(mesh);
  return mesh;
}

function makeRifleWeapon(tier = 0) {
  const weapon = new THREE.Group();
  const ox = 0.28;

  const steel = new THREE.MeshStandardMaterial({ color: 0x2c3136, metalness: 0.9, roughness: 0.36 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x181b1e, metalness: 0.88, roughness: 0.4 });
  const steelWorn = new THREE.MeshStandardMaterial({ color: 0x3a3f44, metalness: 0.82, roughness: 0.48 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x3a3630, metalness: 0.12, roughness: 0.72 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.05, roughness: 0.86 });
  const magMat = new THREE.MeshStandardMaterial({
    color: tier > 1 ? 0x5a4c38 : 0x454038,
    metalness: 0.42,
    roughness: 0.52,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x1a3048,
    metalness: 0.95,
    roughness: 0.08,
    transparent: true,
    opacity: 0.88,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: [0x7a6a52, 0x9a8458, 0x8a7860, 0xa89068][tier] ?? 0x7a6a52,
    metalness: 0.55,
    roughness: 0.38,
  });

  const part = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    name?: string,
  ) => addWeaponPart(weapon, geo, mat, ox + x, y, z, rx, ry, rz, name);

  // Lower / upper receiver block
  part(new THREE.BoxGeometry(0.1, 0.095, 0.36), steel, 0, -0.21, -0.46);
  part(new THREE.BoxGeometry(0.095, 0.085, 0.4), steelDark, 0, -0.155, -0.54);
  part(new THREE.BoxGeometry(0.018, 0.038, 0.09), steelWorn, 0.052, -0.165, -0.5);

  // Barrel + gas system
  const barrelLen = 0.48 + tier * 0.035;
  part(new THREE.CylinderGeometry(0.016, 0.02, barrelLen, 12), steel, 0, -0.138, -0.98, Math.PI / 2);
  part(new THREE.BoxGeometry(0.038, 0.032, 0.048), steelDark, 0, -0.138, -0.86);
  part(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 8), steelWorn, 0, -0.155, -0.86, Math.PI / 2);

  // Handguard (rifle-length rail)
  part(new THREE.BoxGeometry(0.09, 0.08, 0.34), polymer, 0, -0.162, -0.9);
  part(new THREE.BoxGeometry(0.055, 0.014, 0.33), steelWorn, 0, -0.118, -0.9);
  part(new THREE.BoxGeometry(0.055, 0.014, 0.33), steelWorn, 0, -0.205, -0.9);
  for (let i = 0; i < 5; i++) {
    part(new THREE.BoxGeometry(0.076, 0.01, 0.028), steelDark, 0, -0.162, -0.76 - i * 0.065);
  }

  // Muzzle brake
  const muzzleZ = -1.22 - tier * 0.03;
  part(new THREE.CylinderGeometry(0.026, 0.03, 0.09, 12), steelDark, 0, -0.138, muzzleZ, Math.PI / 2, 0, 0, "muzzle");
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    part(
      new THREE.BoxGeometry(0.012, 0.032, 0.018),
      steel,
      Math.cos(a) * 0.028,
      -0.138 + Math.sin(a) * 0.028,
      muzzleZ - 0.02,
      0,
      0,
      a,
    );
  }

  // Stock assembly
  part(new THREE.CylinderGeometry(0.026, 0.026, 0.18, 10), steel, 0, -0.175, -0.1, Math.PI / 2);
  part(new THREE.BoxGeometry(0.075, 0.1, 0.26), polymer, 0, -0.195, 0.1);
  part(new THREE.BoxGeometry(0.082, 0.11, 0.018), rubber, 0, -0.195, 0.23);
  part(new THREE.BoxGeometry(0.04, 0.05, 0.08), accent, 0, -0.17, 0.04);

  // Pistol grip + trigger guard
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.19, 0.105), rubber);
  grip.position.set(ox, -0.355, -0.36);
  grip.rotation.set(0.4, 0, -0.06);
  weapon.add(grip);
  part(new THREE.BoxGeometry(0.028, 0.055, 0.018), steelDark, 0, -0.285, -0.42);
  part(new THREE.TorusGeometry(0.034, 0.007, 6, 14, Math.PI), steelDark, 0, -0.275, -0.44, 0, Math.PI / 2);

  // Curved magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.21, 0.115), magMat);
  mag.position.set(ox + 0.008, -0.395, -0.5);
  mag.rotation.set(0.2, 0, 0.02);
  weapon.add(mag);
  part(new THREE.BoxGeometry(0.068, 0.018, 0.1), steelWorn, 0.008, -0.5, -0.46);
  part(new THREE.BoxGeometry(0.064, 0.012, 0.095), accent, 0.008, -0.31, -0.54);

  // Iron sights
  part(new THREE.BoxGeometry(0.006, 0.038, 0.006), steel, 0, -0.102, -1.14);
  part(new THREE.BoxGeometry(0.042, 0.022, 0.012), steelDark, 0, -0.118, -0.36);
  part(new THREE.BoxGeometry(0.018, 0.008, 0.012), steel, 0, -0.112, -0.36);

  if (tier > 0) {
    part(new THREE.BoxGeometry(0.052, 0.05, 0.12 + tier * 0.015), rubber, 0, -0.078, -0.66);
    part(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 12), lensMat, 0, -0.078, -0.6, Math.PI / 2);
    part(new THREE.BoxGeometry(0.038, 0.016, 0.05), steel, 0, -0.102, -0.66);
    part(new THREE.BoxGeometry(0.008, 0.028, 0.008), steelWorn, 0.028, -0.078, -0.66);
  }
  if (tier >= 2) {
    part(new THREE.CylinderGeometry(0.013, 0.013, 0.055, 8), polymer, 0.048, -0.158, -0.82, 0, 0, Math.PI / 2);
    part(
      new THREE.SphereGeometry(0.008, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0x440000, emissiveIntensity: 0.25 }),
      0.078,
      -0.158,
      -0.82,
    );
  }
  if (tier >= 3) {
    part(new THREE.CylinderGeometry(0.034, 0.038, 0.16, 14), steelWorn, 0, -0.138, muzzleZ - 0.1, Math.PI / 2);
    part(new THREE.BoxGeometry(0.058, 0.042, 0.14), rubber, 0, -0.075, -0.7);
    part(new THREE.CylinderGeometry(0.022, 0.022, 0.005, 12), lensMat, 0, -0.075, -0.64, Math.PI / 2);
  }

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.07 + tier * 0.012, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0 }),
  );
  flash.position.set(ox, -0.138, muzzleZ - 0.05);
  flash.name = "flash";
  weapon.add(flash);

  return weapon;
}

function makeRpgWeapon() {
  const weapon = new THREE.Group();
  const ox = 0.3;

  const tubeSteel = new THREE.MeshStandardMaterial({ color: 0x4a5248, metalness: 0.78, roughness: 0.44 });
  const tubeDark = new THREE.MeshStandardMaterial({ color: 0x2f3530, metalness: 0.82, roughness: 0.4 });
  const warheadOlive = new THREE.MeshStandardMaterial({ color: 0x4d5c3a, metalness: 0.35, roughness: 0.58 });
  const warheadNose = new THREE.MeshStandardMaterial({ color: 0x6b7a52, metalness: 0.42, roughness: 0.5 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5c4632, metalness: 0.08, roughness: 0.82 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.05, roughness: 0.88 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x8a7a50, metalness: 0.65, roughness: 0.45 });

  const part = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    name?: string,
  ) => addWeaponPart(weapon, geo, mat, ox + x, y, z, rx, ry, rz, name);

  // Main launch tube (RPG-7 style)
  part(new THREE.CylinderGeometry(0.09, 0.095, 1.05, 16), tubeSteel, 0, -0.2, -0.95, Math.PI / 2);
  part(new THREE.CylinderGeometry(0.105, 0.09, 0.22, 16), tubeDark, 0, -0.2, -0.28, Math.PI / 2);
  part(new THREE.CylinderGeometry(0.115, 0.1, 0.18, 16), tubeDark, 0, -0.2, -0.12, Math.PI / 2);

  // Heat / reinforcement bands
  for (const z of [-0.55, -0.78, -1.02]) {
    part(new THREE.TorusGeometry(0.092, 0.008, 8, 20), bandMat, 0, -0.2, z, Math.PI / 2);
  }

  // Warhead assembly
  part(new THREE.CylinderGeometry(0.07, 0.078, 0.58, 14), warheadOlive, 0, -0.198, -1.42, Math.PI / 2);
  part(new THREE.ConeGeometry(0.078, 0.2, 14), warheadNose, 0, -0.198, -1.78, -Math.PI / 2);
  part(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 12), tubeDark, 0, -0.198, -1.22, Math.PI / 2);
  part(new THREE.BoxGeometry(0.016, 0.08, 0.04), warheadOlive, 0, -0.155, -1.5);

  const muzzleZ = -1.88;
  part(new THREE.CylinderGeometry(0.08, 0.085, 0.08, 14), tubeDark, 0, -0.198, muzzleZ, Math.PI / 2, 0, 0, "muzzle");

  // Pistol grip + forward support
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.2, 0.11), rubber);
  grip.position.set(ox, -0.41, -0.48);
  grip.rotation.set(0.35, 0, 0);
  weapon.add(grip);
  const foreGrip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.09), wood);
  foreGrip.position.set(ox, -0.32, -0.92);
  foreGrip.rotation.set(0.55, 0, 0);
  weapon.add(foreGrip);

  // Shoulder rest
  part(new THREE.BoxGeometry(0.12, 0.08, 0.14), wood, 0, -0.24, 0.02);
  part(new THREE.BoxGeometry(0.13, 0.09, 0.02), rubber, 0, -0.24, 0.09);

  // Leaf sight + optic rail stub
  part(new THREE.BoxGeometry(0.008, 0.055, 0.04), tubeDark, 0, -0.1, -0.72);
  part(new THREE.BoxGeometry(0.035, 0.006, 0.08), tubeDark, 0, -0.125, -0.72);
  part(new THREE.BoxGeometry(0.006, 0.028, 0.006), bandMat, 0, -0.1, -1.05);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0 }),
  );
  flash.position.set(ox, -0.198, muzzleZ - 0.04);
  flash.name = "flash";
  weapon.add(flash);

  return weapon;
}

export function createZombieFpsEngine(
  mount: HTMLElement,
  opts: {
    onHud?: (hud: FpsHud) => void;
    onDefeat?: () => void;
    onHeal?: (info: HealInfo) => void;
    onWeaponUnlock?: (info: WeaponUnlockInfo) => void;
    onBossSpawn?: (info: BossSpawnInfo) => void;
    onFootstep?: () => void;
    onShoot?: (weapon: WeaponId) => void;
    onMobGroan?: (kind: MobKind) => void;
    bossEveryThreshold?: number;
    roundDurationSec?: number;
    labels?: ZombieEngineLabels;
  } = {},
): ZombieFpsEngine {
  const labels = opts.labels ?? DEFAULT_LABELS;
  const bossEveryThreshold = Math.max(5, Math.min(150, opts.bossEveryThreshold ?? 20));
  const roundDurationSec = Math.max(0, opts.roundDurationSec ?? 180);
  const zombieScaling = computeZombieScaling(roundDurationSec, bossEveryThreshold);
  const bossProfilePreview = computeBossProfile(bossEveryThreshold, labels);
  const scene = new THREE.Scene();
  scene.add(createSkyDome());
  scene.fog = new THREE.Fog(0xb8d9ef, 38, 118);

  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.05, 200);
  camera.position.set(0, PLAYER_EYE_HEIGHT, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, {
    width: "100%",
    height: "100%",
    display: "block",
    outline: "none",
  });
  renderer.domElement.tabIndex = 0;

  // Lights — outdoor day
  scene.add(new THREE.AmbientLight(0xb8c8d8, 0.38));
  const hemi = new THREE.HemisphereLight(0x9fd4ff, 0x3d5c32, 0.62);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe8c0, 1.85);
  sun.position.set(42, 52, -28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 110;
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.bias = -0.00025;
  scene.add(sun);
  sun.target.position.set(0, 0, 0);
  scene.add(sun.target);

  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(4.8, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.82 }),
  );
  sunGlow.position.copy(sun.position);
  scene.add(sunGlow);
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffeb99 }),
  );
  sunCore.position.copy(sun.position);
  scene.add(sunCore);

  // Arena materials
  const floorTex = makeNoiseTexture(512, [32, 52, 26], 18);
  floorTex.repeat.set(22, 22);
  const dirtTex = makeNoiseTexture(256, [48, 40, 28], 24);
  dirtTex.repeat.set(14, 14);
  const wallTex = makeNoiseTexture(256, [38, 36, 34], 22);
  wallTex.repeat.set(5, 2);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA, ARENA),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.96,
      metalness: 0.01,
      color: 0xc8e0b8,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const dirtPatch = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA * 0.92, ARENA * 0.92),
    new THREE.MeshStandardMaterial({
      map: dirtTex,
      transparent: true,
      opacity: 0.35,
      roughness: 1,
      metalness: 0,
      depthWrite: false,
    }),
  );
  dirtPatch.rotation.x = -Math.PI / 2;
  dirtPatch.position.y = 0.02;
  dirtPatch.receiveShadow = true;
  scene.add(dirtPatch);

  const solidColliderRoots: THREE.Object3D[] = [];

  const backdropMat = new THREE.MeshStandardMaterial({ color: 0x5a6678, roughness: 1, metalness: 0 });
  for (const [bx, bz, br, bh] of [
    [-48, 4, 9, 16],
    [48, 12, 11, 18],
    [6, -50, 13, 20],
    [18, 50, 10, 14],
    [-30, -46, 8, 12],
  ] as const) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(br, bh, 6), backdropMat);
    peak.position.set(bx, bh / 2 - 1.2, bz);
    peak.castShadow = true;
    scene.add(peak);
  }
  scatterArenaRocks(scene, solidColliderRoots);

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.94,
    metalness: 0.04,
    color: 0x8a8478,
  });
  const wallH = 4.8;
  const mkWall = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    m.position.set(x, wallH / 2, z);
    m.receiveShadow = true;
    m.castShadow = true;
    scene.add(m);
    solidColliderRoots.push(m);
    return m;
  };
  mkWall(ARENA + 1, 0.85, 0, -ARENA / 2);
  mkWall(ARENA + 1, 0.85, 0, ARENA / 2);
  mkWall(0.85, ARENA + 1, -ARENA / 2, 0);
  mkWall(0.85, ARENA + 1, ARENA / 2, 0);

  // Cover / debris
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x24352c,
    roughness: 0.82,
    metalness: 0.1,
  });
  for (const [x, z, s, rot] of [
    [-16, -12, 1.5, 0.2],
    [18, 11, 1.9, -0.4],
    [-9, 18, 1.25, 0.7],
    [12, -17, 1.6, 0.1],
    [0, -20, 1.1, 0.3],
    [-22, 5, 1.35, -0.2],
    [20, 2, 1.4, 0.5],
  ] as const) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    const ground = terrainHeight(x, z);
    crate.position.set(x, ground + s / 2, z);
    crate.rotation.y = rot;
    crate.receiveShadow = true;
    crate.castShadow = true;
    scene.add(crate);
    solidColliderRoots.push(crate);
  }

  // Four zombie gates (one per side) + central boss portal.
  const spawnGates = ZOMBIE_SPAWN_GATES.map((gate) => createSpawnGate(gate.x, gate.z, "zombie"));
  const bossSpawnGate = createSpawnGate(BOSS_SPAWN.x, BOSS_SPAWN.z, "boss");
  for (const gate of spawnGates) scene.add(gate.group);
  scene.add(bossSpawnGate.group);
  const allSpawnGates = [...spawnGates, bossSpawnGate];

  // Atmospheric dust
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 70;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * ARENA * 0.9;
    dustPos[i * 3 + 1] = 0.4 + Math.random() * 4.2;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * ARENA * 0.9;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xc4b89a,
      size: 0.028,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  scene.add(dust);

  // Weapons
  let activeWeapon: WeaponId = "rifle";
  let rifleTier = 0;
  let hasRiflePlus = false;
  let hasRpg = false;
  const weaponGroups: Partial<Record<WeaponId, THREE.Group>> = {
    rifle: makeRifleWeapon(0),
  };
  camera.add(weaponGroups.rifle!);
  scene.add(camera);
  let activeWeaponGroup = weaponGroups.rifle!;
  let flashMesh = activeWeaponGroup.getObjectByName("flash") as THREE.Mesh;
  const muzzleLight = new THREE.PointLight(0xffd27a, 0, 7, 2);
  muzzleLight.position.set(0.28, -0.14, -1.7);
  camera.add(muzzleLight);

  const keys = new Set<string>();
  const mobs: Mob[] = [];
  const queue: SpawnJob[] = [];
  const sparks: FxSpark[] = [];
  const sparkPool: THREE.Mesh[] = [];
  const sparkGeo = new THREE.SphereGeometry(0.035, 5, 5);
  const explosionGeo = new THREE.SphereGeometry(0.35, 12, 12);
  const mobRoots: THREE.Object3D[] = [];
  const combatRayTargets: THREE.Object3D[] = [...solidColliderRoots];
  const mobByRoot = new Map<THREE.Object3D, Mob>();
  const explosions: FxExplosion[] = [];
  const smokePuffs: SmokePuff[] = [];
  const dyingMobs: DyingMob[] = [];
  const smokeGeo = new THREE.SphereGeometry(0.14, 6, 6);
  const healOrbs: HealOrbFx[] = [];
  const healTarget = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const tmpV3 = new THREE.Vector3();
  const moveForward = new THREE.Vector3();
  const moveRight = new THREE.Vector3();
  const moveWish = new THREE.Vector3();
  const mobToPlayer = new THREE.Vector3();
  const aimDir = new THREE.Vector3();
  const aimCenter = new THREE.Vector2(0, 0);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  let yaw = 0;
  let pitch = 0;
  let hp = PLAYER_MAX_HP;
  let fireCd = 0;
  let ammoInMag = MAGAZINE_SIZE;
  let reloadTimer = 0;
  let invuln = 0;
  let recoil = 0;
  let bob = 0;
  let shake = 0;
  let damagePulse = 0;
  let hurtFlash = 0;
  let healPulse = 0;
  let bossSpawnPulse = 0;
  let titanCinematic = 0;
  let titanSpot: THREE.SpotLight | null = null;
  let titanSpotMob: Mob | null = null;
  let groanCd = 2.5;
  let kills = 0;
  let spawned = 0;
  let bossesSpawned = 0;
  let zombieComments = 0;
  let livedSec = 0;
  let nextId = 1;
  let ended = false;
  let outcome: FpsEndOutcome | null = null;
  let hudAcc = 0;
  let pointerLocked = false;
  let shooting = false;
  let aiming = false;
  let adsBlend = 0;
  let verticalVel = 0;
  let playerAltitude = 0;
  let jumpQueued = false;
  let weaponSwayX = 0;
  let weaponSwayY = 0;
  let footDustCd = 0;
  let raf = 0;

  const resize = () => {
    const w = Math.max(1, mount.clientWidth);
    const h = Math.max(1, mount.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(mount);

  const spawnSpark = (pos: THREE.Vector3, color: number, n = 10) => {
    if (sparks.length >= MAX_SPARKS_ACTIVE) return;
    const count = Math.min(n, 14, MAX_SPARKS_ACTIVE - sparks.length);
    for (let i = 0; i < count; i++) {
      let mesh = sparkPool.pop();
      if (!mesh) {
        mesh = new THREE.Mesh(
          sparkGeo,
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
        );
      } else {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(color);
        mat.opacity = 1;
      }
      mesh.position.copy(pos);
      scene.add(mesh);
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 4;
      sparks.push({
        mesh,
        vx: Math.cos(a) * s,
        vy: 1.5 + Math.random() * 3,
        vz: Math.sin(a) * s,
        life: 0.25 + Math.random() * 0.35,
      });
    }
  };

  const releaseSpark = (mesh: THREE.Mesh) => {
    scene.remove(mesh);
    if (sparkPool.length < SPARK_POOL_CAP) sparkPool.push(mesh);
    else (mesh.material as THREE.Material).dispose();
  };

  const registerMob = (mob: Mob) => {
    mobRoots.push(mob.root);
    combatRayTargets.push(mob.root);
    mobByRoot.set(mob.root, mob);
  };

  const unregisterMob = (mob: Mob) => {
    const idx = mobRoots.indexOf(mob.root);
    if (idx >= 0) mobRoots.splice(idx, 1);
    const rayIdx = combatRayTargets.indexOf(mob.root);
    if (rayIdx >= 0) combatRayTargets.splice(rayIdx, 1);
    mobByRoot.delete(mob.root);
  };

  const updateMobHpBar = (mob: Mob, force = false) => {
    const ratio = Math.max(0, Math.min(1, mob.hp / mob.maxHp));
    if (!force && Math.abs(mob.hpPaintRatio - ratio) < 0.025) return;
    mob.hpPaintRatio = ratio;
    paintHpBar(
      mob.hpFill,
      mob.hpLabel,
      mob.hp,
      mob.maxHp,
      mob.kind === "boss" || mob.isTitan,
      mob.bossSegments,
      mob.isTitan,
      labels.segment,
    );
  };

  const findMobFromHit = (obj: THREE.Object3D | null) => {
    let node: THREE.Object3D | null = obj;
    while (node) {
      const mob = mobByRoot.get(node);
      if (mob) return mob;
      node = node.parent;
    }
    return null;
  };

  const spawnOne = (kind: MobKind, from: string) => {
    const isTitan = kind === "titan";
    const boss = kind === "boss" || isTitan;
    const profile = isTitan
      ? computeTitanProfile(bossEveryThreshold, labels.titanBossTitle)
      : boss
        ? computeBossProfile(bossEveryThreshold, labels)
        : null;
    let x: number;
    let z: number;
    if (boss) {
      const bossAngle = Math.random() * Math.PI * 2;
      const bossDist = Math.random() * BOSS_SPAWN_SPREAD;
      x = BOSS_SPAWN.x + Math.cos(bossAngle) * bossDist;
      z = BOSS_SPAWN.z + Math.sin(bossAngle) * bossDist;
    } else {
      const gate = ZOMBIE_SPAWN_GATES[Math.floor(Math.random() * ZOMBIE_SPAWN_GATES.length)]!;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * SPAWN_SPREAD;
      x = gate.x + Math.cos(angle) * dist;
      z = gate.z + Math.sin(angle) * dist;
    }

    const { root, hpFill, hpLabel, anim } = makeZombieMesh(kind, from, profile ?? undefined, labels);
    const mobRadius = boss ? profile!.radius : 0.58;
    const spawnPos = resolveObstacles(x, z, mobRadius);
    const spawnGround = terrainHeight(spawnPos.x, spawnPos.z);
    root.position.set(spawnPos.x, spawnGround, spawnPos.z);
    scene.add(root);
    const maxHp = boss ? profile!.hp : Math.round(ZOMBIE_HP * zombieScaling.hpMult);
    const segments = boss ? profile!.segments : 1;
    paintHpBar(hpFill, hpLabel, maxHp, maxHp, boss, segments, isTitan, labels.segment);
    const mob: Mob = {
      id: nextId++,
      kind,
      root,
      hp: maxHp,
      maxHp,
      speed: boss ? profile!.speed : ZOMBIE_SPEED * zombieScaling.speedMult,
      radius: boss ? profile!.radius : 0.58,
      damage: boss ? profile!.damage : Math.round(ZOMBIE_DAMAGE * zombieScaling.damageMult),
      hitCd: 0,
      from,
      phase: Math.random() * Math.PI * 2,
      limp: 0.7 + Math.random() * 0.5,
      hpFill,
      hpLabel,
      bossSegments: segments,
      isTitan,
      lastDamagedAt: livedSec,
      tailCd: 1.2,
      tailWindup: 0,
      lethalCd: TITAN_LETHAL_INTERVAL,
      lethalWindup: 0,
      hpPaintRatio: 1,
      hpPaintAcc: 0,
      animHips: anim.hips,
      animLegL: anim.legL,
      animLegR: anim.legR,
      animArmL: anim.armL,
      animArmR: anim.armR,
      animTail: anim.tail,
    };
    mobs.push(mob);
    registerMob(mob);
    spawned += 1;
    if (boss) {
      bossesSpawned += 1;
      bossSpawnPulse = isTitan ? 1.35 : 1;
      shake = Math.max(
        shake,
        0.35 + profile!.tier * 0.2 + (profile!.isMega ? 0.55 : 0) + (isTitan ? 3.2 : 0),
      );
      if (isTitan) {
        titanCinematic = 1;
        titanSpotMob = mob;
        if (titanSpot) {
          scene.remove(titanSpot);
          titanSpot.dispose();
        }
        titanSpot = new THREE.SpotLight(0xb8f4ff, 0, 62, Math.PI / 5.5, 0.38, 1.4);
        titanSpot.position.set(spawnPos.x, spawnGround + 24, spawnPos.z);
        titanSpot.target = root;
        scene.add(titanSpot);
      }
      spawnSpark(
        tmpV2.set(
          spawnPos.x,
          2.5 + profile!.tier * 0.4 + (profile!.isMega ? 1.2 : 0) + (isTitan ? 1.5 : 0),
          spawnPos.z,
        ),
        isTitan ? 0x22d3ee : profile!.isMega ? 0xff4500 : 0xe879f9,
        12 + profile!.tier * 4 + (profile!.isMega ? 10 : 0) + (isTitan ? 10 : 0),
      );
      opts.onBossSpawn?.({
        title: profile!.title,
        hp: profile!.hp,
        segments: profile!.segments,
        multiplier: profile!.multiplier,
        isMega: profile!.isMega,
        isTitan,
        from,
      });
    }
  };

  const enqueue = (kind: MobKind, from: string, count = 1) => {
    if (ended) return;
    for (let i = 0; i < count; i++) {
      // Spawn immediately when possible so chat feels instant.
      if (mobs.length < MAX_ALIVE) spawnOne(kind, from);
      else queue.push({ kind, from });
    }
  };

  const scheduleKillHeal = (mob: Mob) => {
    const amount = mob.kind === "boss" || mob.isTitan ? BOSS_KILL_HEAL : ZOMBIE_KILL_HEAL;
    const room = PLAYER_MAX_HP - hp;
    if (room <= 0) return;
    const actual = Math.min(amount, room);
    const boss = mob.kind === "boss" || mob.isTitan;
    const tex = makeHealOrbTexture(actual, mob.kind);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    );
    const lift = mob.isTitan ? 2.6 : mob.kind === "boss" ? 2.1 : 1.35;
    sprite.position.set(mob.root.position.x, mob.root.position.y + lift, mob.root.position.z);
    sprite.scale.set(boss ? 1.15 : 0.82, boss ? 1.15 : 0.82, 1);
    sprite.renderOrder = 20;
    scene.add(sprite);
    healOrbs.push({
      sprite,
      amount: actual,
      kind: mob.kind,
      speed: boss ? 10.5 : 12,
      trailTimer: 0,
      bob: Math.random() * Math.PI * 2,
    });
    spawnSpark(
      tmpV2.set(mob.root.position.x, mob.root.position.y + lift * 0.6, mob.root.position.z),
      mob.isTitan ? 0x67e8f9 : mob.kind === "boss" ? 0xf0abfc : 0x86efac,
      boss ? 10 : 6,
    );
  };

  const absorbHealOrb = (orb: HealOrbFx) => {
    hp = Math.min(PLAYER_MAX_HP, hp + orb.amount);
    healPulse = 1;
    healTarget.set(camera.position.x, camera.position.y + 0.25, camera.position.z);
    spawnSpark(
      healTarget,
      orb.kind === "titan" ? 0x67e8f9 : orb.kind === "boss" ? 0xf0abfc : 0x4ade80,
      orb.kind === "titan" ? 14 : orb.kind === "boss" ? 12 : 8,
    );
    opts.onHeal?.({
      kind: orb.kind,
      amount: orb.amount,
      hp: Math.round(hp),
      maxHp: PLAYER_MAX_HP,
    });
    emitHud();
  };

  const getWeaponSpec = (): WeaponSpec => {
    if (activeWeapon === "rpg") {
      return {
        id: "rpg",
        label: labels.rpg,
        damage: RPG_DIRECT_DAMAGE,
        cooldown: RPG_COOLDOWN,
        recoil: 2,
        shake: 1.15,
        flashColor: 0xff7b00,
        sparkColor: 0xf97316,
      };
    }
    if (activeWeapon === "rifle_plus" && rifleTier > 0) {
      const tierIdx = rifleTier - 1;
      return {
        id: "rifle_plus",
        label: `${labels.riflePlus} ${rifleTier}`,
        damage: RIFLE_PLUS_DAMAGE[tierIdx] ?? RIFLE_PLUS_DAMAGE[0],
        cooldown: RIFLE_PLUS_COOLDOWN[tierIdx] ?? RIFLE_PLUS_COOLDOWN[0],
        recoil: 1.1,
        shake: 0.28,
        flashColor: 0xffc857,
        sparkColor: 0xfbbf24,
      };
    }
    return {
      id: "rifle",
      label: labels.rifle,
      damage: RIFLE_DAMAGE,
      cooldown: RIFLE_COOLDOWN,
      recoil: 1,
      shake: 0.22,
      flashColor: 0xffe566,
      sparkColor: 0x4ade80,
    };
  };

  const ownedWeapons = (): WeaponId[] => {
    const list: WeaponId[] = ["rifle"];
    if (hasRiflePlus) list.push("rifle_plus");
    if (hasRpg) list.push("rpg");
    return list;
  };

  const bindActiveWeaponVisuals = () => {
    for (const id of ["rifle", "rifle_plus", "rpg"] as const) {
      const group = weaponGroups[id];
      if (group) group.visible = id === activeWeapon;
    }
    activeWeaponGroup = weaponGroups[activeWeapon] ?? weaponGroups.rifle!;
    flashMesh = activeWeaponGroup.getObjectByName("flash") as THREE.Mesh;
  };

  const setActiveWeapon = (id: WeaponId) => {
    if (!ownedWeapons().includes(id)) return;
    activeWeapon = id;
    if (!usesMagazine(id)) aiming = false;
    bindActiveWeaponVisuals();
    emitHud();
  };

  const cycleWeapon = (dir: 1 | -1) => {
    const owned = ownedWeapons();
    const idx = owned.indexOf(activeWeapon);
    const next = owned[(idx + dir + owned.length) % owned.length]!;
    setActiveWeapon(next);
  };

  const upgradeWeaponsFromBoss = () => {
    let message = "";
    if (!hasRiflePlus) {
      hasRiflePlus = true;
      hasRpg = true;
      rifleTier = 1;
      weaponGroups.rifle_plus = makeRifleWeapon(rifleTier);
      weaponGroups.rpg = makeRpgWeapon();
      camera.add(weaponGroups.rifle_plus);
      camera.add(weaponGroups.rpg!);
      setActiveWeapon("rifle_plus");
      message = labels.unlockWeapons;
    } else if (rifleTier < MAX_RIFLE_TIER) {
      rifleTier += 1;
      if (weaponGroups.rifle_plus) {
        camera.remove(weaponGroups.rifle_plus);
        disposeObject(weaponGroups.rifle_plus);
      }
      weaponGroups.rifle_plus = makeRifleWeapon(rifleTier);
      camera.add(weaponGroups.rifle_plus);
      bindActiveWeaponVisuals();
      message = `${labels.rifleUpgrade} ${rifleTier}`;
    } else {
      message = labels.maxRifleUpgrade;
    }
    opts.onWeaponUnlock?.({
      rifleTier,
      hasRpg,
      hasRiflePlus,
      weapon: activeWeapon,
      message,
    });
    emitHud();
  };

  const killMob = (mob: Mob) => {
    kills += 1;
    const deathY = mob.isTitan ? 2.8 : mob.kind === "boss" ? 2.1 : 1.0;
    spawnSpark(
      tmpV2.set(mob.root.position.x, deathY, mob.root.position.z),
      mob.isTitan ? 0x0e7490 : 0x8b2020,
      mob.isTitan ? 12 : mob.kind === "boss" ? 9 : 7,
    );
    spawnSpark(
      tmpV2.set(mob.root.position.x, 0.35, mob.root.position.z),
      mob.isTitan ? 0x164e63 : 0x4a1515,
      5,
    );
    if (mob.kind === "boss" || mob.isTitan) upgradeWeaponsFromBoss();
    scheduleKillHeal(mob);
    mob.hpFill.visible = false;
    mob.hpLabel.visible = false;
    unregisterMob(mob);
    const idx = mobs.indexOf(mob);
    if (idx >= 0) mobs.splice(idx, 1);
    dyingMobs.push({ root: mob.root, life: 0.65, maxLife: 0.65 });
  };

  const damageMob = (mob: Mob, amount: number, hitPoint?: THREE.Vector3) => {
    mob.hp -= amount;
    if (mob.isTitan) mob.lastDamagedAt = livedSec;
    updateMobHpBar(mob);
    if (hitPoint) {
      spawnSpark(
        hitPoint,
        mob.isTitan ? 0x22d3ee : mob.kind === "boss" ? 0x7f1d4a : 0x8b1a1a,
        activeWeapon === "rpg" ? 10 : 5,
      );
      spawnSpark(hitPoint, 0x3d1212, 3);
    }
    mob.root.position.add(
      tmpV
        .set(
          camera.position.x - mob.root.position.x,
          0,
          camera.position.z - mob.root.position.z,
        )
        .normalize()
        .multiplyScalar(mob.kind === "boss" ? -0.08 : -0.16),
    );
    applyMobCollision(mob, mob.root.position.x, mob.root.position.z, mobs);
    if (mob.hp <= 0) killMob(mob);
  };

  const spawnExplosion = (pos: THREE.Vector3) => {
    if (explosions.length >= MAX_EXPLOSIONS) return;
    const mesh = new THREE.Mesh(
      explosionGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff6b00,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    mesh.position.copy(pos);
    mesh.position.y = Math.max(0.5, pos.y);
    scene.add(mesh);
    explosions.push({ mesh, life: 0.55, maxLife: 0.55 });
    spawnSpark(pos, 0xffedd5, 12);
    spawnSpark(pos, 0xf97316, 8);
  };

  const usesMagazine = (weapon: WeaponId) => weapon !== "rpg";

  const startReload = () => {
    if (!usesMagazine(activeWeapon) || reloadTimer > 0) return;
    reloadTimer = RELOAD_TIME;
  };

  const flashMuzzle = (spec: WeaponSpec) => {
    muzzleLight.color.setHex(spec.flashColor);
    muzzleLight.intensity = activeWeapon === "rpg" ? 8 : 4.5;
    if (flashMesh.material instanceof THREE.MeshBasicMaterial) {
      flashMesh.material.opacity = 1;
      flashMesh.scale.setScalar(activeWeapon === "rpg" ? 2.2 : 1.4 + Math.random());
    }
  };

  const spawnMuzzleSmoke = () => {
    if (smokePuffs.length >= MAX_SMOKE_PUFFS) return;
    const mesh = new THREE.Mesh(
      smokeGeo,
      new THREE.MeshBasicMaterial({
        color: 0xb8b8b8,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    tmpV2.set(0.28, -0.14, -1.7);
    activeWeaponGroup.localToWorld(mesh.position.copy(tmpV2));
    mesh.scale.setScalar(activeWeapon === "rpg" ? 1.6 : 0.9 + Math.random() * 0.3);
    scene.add(mesh);
    smokePuffs.push({ mesh, life: 0.48, maxLife: 0.48 });
  };

  const castCombatRay = () => {
    raycaster.setFromCamera(aimCenter, camera);
    return raycaster.intersectObjects(combatRayTargets, true);
  };

  const fireRifle = (spec: WeaponSpec) => {
    const hits = castCombatRay();
    if (hits.length > 0) {
      const hit = hits[0]!;
      const mob = findMobFromHit(hit.object);
      if (mob) damageMob(mob, spec.damage, hit.point);
      else spawnSpark(hit.point, 0xc8bfb0, 4);
    } else {
      camera.getWorldDirection(aimDir);
      tmpV2.copy(camera.position).add(aimDir.multiplyScalar(4));
      spawnSpark(tmpV2, 0xfbbf24, 3);
    }
  };

  const fireRpg = () => {
    camera.getWorldDirection(aimDir);
    let impact = tmpV2.copy(camera.position).add(aimDir.multiplyScalar(24));
    const hits = castCombatRay();
    if (hits.length > 0) {
      impact = hits[0]!.point;
    } else if (raycaster.ray.intersectPlane(groundPlane, tmpV3)) {
      impact = tmpV3;
    }
    spawnExplosion(impact);
    for (const mob of mobs) {
      const dist = Math.hypot(mob.root.position.x - impact.x, mob.root.position.z - impact.z);
      if (dist > RPG_SPLASH_RADIUS) continue;
      const falloff = 1 - dist / RPG_SPLASH_RADIUS;
      const dmg = dist < 1.2 ? RPG_DIRECT_DAMAGE : RPG_SPLASH_DAMAGE * falloff;
      damageMob(mob, dmg, impact);
    }
  };

  const fire = () => {
    if (ended || fireCd > 0 || reloadTimer > 0) return;
    if (usesMagazine(activeWeapon) && ammoInMag <= 0) {
      startReload();
      return;
    }
    const spec = getWeaponSpec();
    fireCd = spec.cooldown;
    recoil = spec.recoil;
    shake = Math.max(shake, spec.shake);
    flashMuzzle(spec);
    spawnMuzzleSmoke();
    opts.onShoot?.(activeWeapon);
    if (activeWeapon === "rpg") fireRpg();
    else fireRifle(spec);
    if (usesMagazine(activeWeapon)) {
      ammoInMag -= 1;
      if (ammoInMag <= 0) startReload();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (
      e.code === "KeyR" &&
      pointerLocked &&
      !ended &&
      usesMagazine(activeWeapon) &&
      ammoInMag < MAGAZINE_SIZE &&
      reloadTimer <= 0
    ) {
      startReload();
    }
    if (
      e.code === "Space" &&
      !e.repeat &&
      pointerLocked &&
      !ended &&
      playerAltitude <= 0.06 &&
      verticalVel <= 0
    ) {
      jumpQueued = true;
    }
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      if (pointerLocked && !ended && usesMagazine(activeWeapon)) aiming = true;
      return;
    }
    if (e.button !== 0) return;
    shooting = true;
    if (!pointerLocked) {
      renderer.domElement.requestPointerLock();
      return;
    }
    fire();
  };
  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) shooting = false;
    if (e.button === 2) aiming = false;
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!pointerLocked || ended) return;
    const lookSens = 0.00215 - adsBlend * 0.00055;
    yaw -= e.movementX * lookSens;
    pitch -= e.movementY * lookSens;
    pitch = Math.max(-1.25, Math.min(1.25, pitch));
    weaponSwayX = THREE.MathUtils.clamp(weaponSwayX - e.movementX * 0.00032, -0.05, 0.05);
    weaponSwayY = THREE.MathUtils.clamp(weaponSwayY - e.movementY * 0.00032, -0.04, 0.04);
  };
  const onLockChange = () => {
    pointerLocked = document.pointerLockElement === renderer.domElement;
    if (!pointerLocked) aiming = false;
  };

  const onWheel = (e: WheelEvent) => {
    if (!pointerLocked || ended) return;
    e.preventDefault();
    cycleWeapon(e.deltaY > 0 ? 1 : -1);
  };

  const onContextMenu = (e: MouseEvent) => e.preventDefault();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  renderer.domElement.addEventListener("mousedown", onMouseDown);
  renderer.domElement.addEventListener("contextmenu", onContextMenu);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onLockChange);

  const emitHud = () => {
    const spec = getWeaponSpec();
    const reloading = reloadTimer > 0;
    opts.onHud?.({
      hp: Math.max(0, Math.round(hp)),
      kills,
      alive: mobs.length,
      queued: queue.length,
      comments: zombieComments,
      bosses: bossesSpawned,
      locked: pointerLocked,
      weapon: activeWeapon,
      weaponLabel: spec.label,
      rifleTier,
      hasRpg,
      hasRiflePlus,
      bossThreat: bossProfilePreview.title,
      bossSegments: bossProfilePreview.segments,
      bossHpPreview: bossProfilePreview.hp,
      ammo: usesMagazine(activeWeapon) ? ammoInMag : 1,
      magSize: usesMagazine(activeWeapon) ? MAGAZINE_SIZE : 1,
      reloading,
      reloadPct: reloading ? 1 - reloadTimer / RELOAD_TIME : 1,
      hurtFlash,
    });
  };

  const tick = () => {
    const dt = Math.min(0.033, clock.getDelta());
    if (!ended) {
      livedSec += dt;
      fireCd = Math.max(0, fireCd - dt);
      if (reloadTimer > 0) {
        reloadTimer = Math.max(0, reloadTimer - dt);
        if (reloadTimer <= 0) ammoInMag = MAGAZINE_SIZE;
      }
      invuln = Math.max(0, invuln - dt);
      recoil = Math.max(0, recoil - dt * 7);
      shake = Math.max(0, shake - dt * 3.5);
      damagePulse = Math.max(0, damagePulse - dt * 1.8);
      hurtFlash = Math.max(0, hurtFlash - dt * 2.6);
      healPulse = Math.max(0, healPulse - dt * 2.4);
      bossSpawnPulse = Math.max(0, bossSpawnPulse - dt * (titanCinematic > 0.05 ? 0.55 : 1.6));
      if (titanCinematic > 0) {
        titanCinematic = Math.max(0, titanCinematic - dt * TITAN_CINEMATIC_DECAY);
      }
      if (titanSpot) {
        if (titanSpotMob && titanCinematic > 0.02) {
          const pos = titanSpotMob.root.position;
          titanSpot.position.set(pos.x, pos.y + 22, pos.z);
          titanSpot.intensity = 6 + titanCinematic * 32;
        } else {
          titanSpot.intensity = Math.max(0, titanSpot.intensity - dt * 14);
          if (titanSpot.intensity <= 0.05) {
            scene.remove(titanSpot);
            titanSpot.dispose();
            titanSpot = null;
            titanSpotMob = null;
          }
        }
      }
      muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 22);
      if (flashMesh.material instanceof THREE.MeshBasicMaterial) {
        flashMesh.material.opacity = Math.max(0, flashMesh.material.opacity - dt * 10);
      }

      let released = 0;
      let heavyReleased = 0;
      while (queue.length > 0 && mobs.length < MAX_ALIVE && released < MAX_SPAWN_PER_FRAME) {
        const job = queue[0]!;
        const heavy = job.kind === "boss" || job.kind === "titan";
        if (heavy && heavyReleased >= MAX_HEAVY_SPAWNS_PER_FRAME) break;
        queue.shift();
        spawnOne(job.kind, job.from);
        released += 1;
        if (heavy) heavyReleased += 1;
      }

      const adsTarget =
        aiming && pointerLocked && !ended && usesMagazine(activeWeapon) ? 1 : 0;
      adsBlend = THREE.MathUtils.lerp(adsBlend, adsTarget, Math.min(1, dt * ADS_LERP_SPEED));
      camera.fov = THREE.MathUtils.lerp(BASE_FOV, RIFLE_ADS_FOV, adsBlend);
      camera.updateProjectionMatrix();

      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;

      const forward = moveForward;
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = moveRight.crossVectors(forward, tmpV.set(0, 1, 0)).normalize();
      const wish = moveWish.set(0, 0, 0);
      if (keys.has("KeyW") || keys.has("ArrowUp")) wish.add(forward);
      if (keys.has("KeyS") || keys.has("ArrowDown")) wish.sub(forward);
      if (keys.has("KeyD") || keys.has("ArrowRight")) wish.add(right);
      if (keys.has("KeyA") || keys.has("ArrowLeft")) wish.sub(right);
      const moving = wish.lengthSq() > 0;
      if (moving) {
        wish.normalize().multiplyScalar(MOVE_SPEED * dt);
        camera.position.add(wish);
        bob += dt * 11;
      } else {
        bob = THREE.MathUtils.lerp(bob, 0, 0.08);
      }
      const playerBound = wallBound(PLAYER_RADIUS);
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -playerBound, playerBound);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -playerBound, playerBound);
      const playerResolved = resolveObstacles(camera.position.x, camera.position.z, PLAYER_RADIUS);
      camera.position.x = playerResolved.x;
      camera.position.z = playerResolved.z;

      const groundH = terrainHeight(camera.position.x, camera.position.z);
      const prevAltitude = playerAltitude;
      if (jumpQueued && playerAltitude <= 0.06 && verticalVel <= 0) {
        verticalVel = JUMP_VELOCITY;
        jumpQueued = false;
      } else {
        jumpQueued = false;
      }
      verticalVel -= GRAVITY * dt;
      playerAltitude += verticalVel * dt;
      if (playerAltitude < 0) {
        if (prevAltitude > 0.12 && verticalVel < -2.2) {
          shake = Math.max(shake, 0.28);
          spawnSpark(
            tmpV2.set(camera.position.x, groundH + 0.05, camera.position.z),
            0x9ca88f,
            4,
          );
        }
        playerAltitude = 0;
        verticalVel = 0;
      }

      if (moving && playerAltitude <= 0.06) {
        footDustCd -= dt;
        if (footDustCd <= 0) {
          footDustCd = 0.18;
          opts.onFootstep?.();
          spawnSpark(
            tmpV2.set(
              camera.position.x - forward.x * 0.35,
              groundH + 0.04,
              camera.position.z - forward.z * 0.35,
            ),
            0x9ca88f,
            2,
          );
        }
      }

      const bobY = moving && playerAltitude <= 0.06 ? Math.sin(bob) * 0.045 : 0;
      const bobX = moving && playerAltitude <= 0.06 ? Math.cos(bob * 0.5) * 0.02 : 0;
      camera.position.y = groundH + PLAYER_EYE_HEIGHT + playerAltitude + bobY;
      if (shake > 0) {
        const quake = titanCinematic > 0.15 ? titanCinematic * 0.14 : 0;
        camera.position.x += (Math.random() - 0.5) * shake * 0.08 + Math.sin(livedSec * 26) * quake;
        camera.position.y += (Math.random() - 0.5) * shake * 0.06;
        camera.position.z += Math.cos(livedSec * 22) * quake;
      }

      groanCd -= dt;
      if (groanCd <= 0 && mobs.length > 0) {
        groanCd = 2.2 + Math.random() * 3.5;
        let nearest: Mob | null = null;
        let nearestDist = Infinity;
        for (const m of mobs) {
          const d = Math.hypot(
            camera.position.x - m.root.position.x,
            camera.position.z - m.root.position.z,
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearest = m;
          }
        }
        if (nearest && nearestDist < 22) {
          opts.onMobGroan?.(nearest.kind);
        }
      }

      const reloadT = reloadTimer > 0 ? reloadTimer / RELOAD_TIME : 0;
      const adsT = usesMagazine(activeWeapon) ? adsBlend : 0;
      weaponSwayX *= 0.88;
      weaponSwayY *= 0.88;
      activeWeaponGroup.position.set(
        0.3 + bobX - recoil * 0.02 - adsT * 0.06 + weaponSwayX * 0.4,
        -0.3 + Math.abs(Math.sin(bob)) * 0.025 - recoil * 0.055 - reloadT * 0.12 + adsT * 0.04 + weaponSwayY * 0.25,
        -0.42 - recoil * 0.1 - reloadT * 0.28 + adsT * 0.18,
      );
      activeWeaponGroup.rotation.set(
        0.04 + recoil * 0.22 + reloadT * 0.35 - adsT * 0.03 + weaponSwayY,
        0.1 + weaponSwayX * 0.55,
        0.035 + bobX * 0.4 + weaponSwayX,
      );

      if (shooting && pointerLocked) fire();

      const playerPos = camera.position;
      for (const m of mobs) {
        m.phase += dt * m.limp * 6;
        mobToPlayer.set(playerPos.x - m.root.position.x, 0, playerPos.z - m.root.position.z);
        const dist = mobToPlayer.length();
        if (dist > 0.001) {
          mobToPlayer.multiplyScalar(1 / dist);
          const nx = m.root.position.x + mobToPlayer.x * m.speed * dt;
          const nz = m.root.position.z + mobToPlayer.z * m.speed * dt;
          applyMobCollision(m, nx, nz, mobs);
          if (dist < 38 || (m.id & 1) === (Math.floor(livedSec * 30) & 1)) {
            m.root.lookAt(playerPos.x, m.root.position.y + 1.1, playerPos.z);
          }
        }
        m.root.position.y =
          terrainHeight(m.root.position.x, m.root.position.z) + Math.abs(Math.sin(m.phase)) * 0.04;

        m.animLegL.rotation.x = Math.sin(m.phase) * 0.55;
        m.animLegR.rotation.x = Math.sin(m.phase + Math.PI) * 0.55;
        m.animArmL.rotation.x = Math.sin(m.phase + Math.PI) * 0.4 - 0.8;
        m.animArmR.rotation.x = Math.sin(m.phase) * 0.4 - 0.8;
        m.animHips.rotation.y = Math.sin(m.phase * 0.5) * 0.08;

        m.hitCd = Math.max(0, m.hitCd - dt);
        const flatDist = Math.hypot(
          playerPos.x - m.root.position.x,
          playerPos.z - m.root.position.z,
        );

        if (m.isTitan) {
          m.tailCd = Math.max(0, m.tailCd - dt);
          m.lethalCd = Math.max(0, m.lethalCd - dt);
          if (m.lethalCd <= 0 && m.lethalWindup <= 0 && m.tailWindup <= 0) {
            m.lethalCd = TITAN_LETHAL_INTERVAL;
            m.lethalWindup = 0.01;
          }

          const sinceHit = livedSec - m.lastDamagedAt;
          if (sinceHit > 2.4 && m.hp < m.maxHp) {
            const heal = m.maxHp * 0.022 * dt;
            m.hp = Math.min(m.maxHp, m.hp + heal);
            m.hpPaintAcc += dt;
            if (m.hpPaintAcc >= 0.2) {
              m.hpPaintAcc = 0;
              updateMobHpBar(m);
            }
          }

          const tail = m.animTail;
          const lethalActive = m.lethalWindup > 0;
          const tailRangeMax = lethalActive ? 14.5 : 10.5;
          const tailRangeMin = lethalActive ? 1.1 : 2.4;
          const canTailAttack =
            flatDist < tailRangeMax &&
            flatDist > tailRangeMin &&
            (lethalActive || m.tailCd <= 0) &&
            invuln <= 0;

          if (canTailAttack) {
            const windupRate = lethalActive ? 1.85 : 1;
            const windupNeed = lethalActive ? 0.58 : 0.95;
            if (lethalActive) m.lethalWindup += dt * windupRate;
            else m.tailWindup += dt * windupRate;

            const windup = lethalActive ? m.lethalWindup : m.tailWindup;
            if (tail) {
              const swing = lethalActive ? 2.15 : 1.75;
              tail.rotation.y = -Math.sin(windup * (lethalActive ? 14 : 12)) * swing;
              tail.rotation.x = -0.18 - Math.sin(windup * (lethalActive ? 10 : 8)) * (lethalActive ? 0.62 : 0.42);
            }

            if (windup >= windupNeed) {
              m.tailCd = lethalActive ? 1.4 : 2.7;
              if (lethalActive) {
                m.lethalWindup = 0;
              } else {
                m.tailWindup = 0;
              }

              const hitRange = lethalActive ? 13.5 : 9.5;
              if (flatDist < hitRange) {
                m.hitCd = lethalActive ? 1.1 : 0.85;
                const dmg = lethalActive ? TITAN_LETHAL_DAMAGE : m.damage;
                hp -= dmg;
                invuln = lethalActive ? 0.9 : 0.75;
                shake = lethalActive ? 2.1 : 1.4;
                damagePulse = 1;
                hurtFlash = 1;
                spawnSpark(
                  tmpV2.set(m.root.position.x, 1.8, m.root.position.z).add(
                    tmpV3
                      .set(playerPos.x - m.root.position.x, 0, playerPos.z - m.root.position.z)
                      .normalize()
                      .multiplyScalar(lethalActive ? 2.2 : 1.4),
                  ),
                  lethalActive ? 0x67e8f9 : 0x22d3ee,
                  lethalActive ? 14 : 10,
                );
                if (lethalActive) {
                  spawnSpark(tmpV2.set(playerPos.x, 1.2, playerPos.z), 0xa5f3fc, 6);
                }
                if (hp <= 0) {
                  hp = 0;
                  ended = true;
                  outcome = "defeated";
                  if (document.pointerLockElement) document.exitPointerLock();
                  opts.onDefeat?.();
                }
              }
            }
          } else if (m.tailWindup > 0 || m.lethalWindup > 0) {
            if (m.tailWindup > 0) m.tailWindup = Math.max(0, m.tailWindup - dt * 2.5);
            if (m.lethalWindup > 0) m.lethalWindup = Math.max(0, m.lethalWindup - dt * 3.2);
            if (tail) {
              tail.rotation.y = THREE.MathUtils.lerp(tail.rotation.y, 0, dt * 6);
              tail.rotation.x = THREE.MathUtils.lerp(tail.rotation.x, -0.18, dt * 5);
            }
          }
        }

        if (flatDist < m.radius + 0.5 && m.hitCd <= 0 && invuln <= 0) {
          m.hitCd = 0.7;
          hp -= m.isTitan ? Math.round(m.damage * 0.16) : m.damage;
          invuln = 0.45;
          shake = 0.7;
          damagePulse = 1;
          hurtFlash = Math.max(hurtFlash, 0.85);
          if (hp <= 0) {
            hp = 0;
            ended = true;
            outcome = "defeated";
            if (document.pointerLockElement) document.exitPointerLock();
            opts.onDefeat?.();
          }
        }
      }

      // sparks update
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.life -= dt;
        s.vy -= 9 * dt;
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        const mat = s.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, s.life * 2);
        if (s.life <= 0) {
          releaseSpark(s.mesh);
          sparks.splice(i, 1);
        }
      }

      for (let i = explosions.length - 1; i >= 0; i--) {
        const ex = explosions[i]!;
        ex.life -= dt;
        const t = 1 - ex.life / ex.maxLife;
        const scale = 1 + t * 5.5;
        ex.mesh.scale.setScalar(scale);
        const mat = ex.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.85 * (1 - t));
        if (ex.life <= 0) {
          scene.remove(ex.mesh);
          mat.dispose();
          explosions.splice(i, 1);
        }
      }

      for (let i = smokePuffs.length - 1; i >= 0; i--) {
        const puff = smokePuffs[i]!;
        puff.life -= dt;
        puff.mesh.position.y += dt * 0.9;
        puff.mesh.scale.multiplyScalar(1 + dt * 1.1);
        const mat = puff.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (puff.life / puff.maxLife) * 0.38);
        if (puff.life <= 0) {
          scene.remove(puff.mesh);
          mat.dispose();
          smokePuffs.splice(i, 1);
        }
      }

      for (let i = dyingMobs.length - 1; i >= 0; i--) {
        const dead = dyingMobs[i]!;
        dead.life -= dt;
        dead.root.rotation.x += dt * 4.2;
        dead.root.position.y -= dt * 0.85;
        if (dead.life <= 0) {
          scene.remove(dead.root);
          disposeObject(dead.root);
          dyingMobs.splice(i, 1);
        }
      }

      dust.rotation.y += dt * 0.02;

      for (let i = healOrbs.length - 1; i >= 0; i--) {
        const orb = healOrbs[i]!;
        healTarget.set(camera.position.x, camera.position.y + 0.35, camera.position.z);
        const dist = orb.sprite.position.distanceTo(healTarget);
        orb.bob += dt * 7;
        orb.sprite.position.y += Math.sin(orb.bob) * dt * 0.45;
        if (dist < 0.65) {
          absorbHealOrb(orb);
          disposeHealOrb(orb, scene);
          healOrbs.splice(i, 1);
          continue;
        }
        tmpV2.copy(healTarget).sub(orb.sprite.position);
        const step = Math.min(dist, orb.speed * dt);
        orb.sprite.position.add(tmpV2.normalize().multiplyScalar(step));
        orb.trailTimer += dt;
        if (orb.trailTimer >= 0.07) {
          orb.trailTimer = 0;
          spawnSpark(
            orb.sprite.position,
            orb.kind === "titan" ? 0x67e8f9 : orb.kind === "boss" ? 0xe879f9 : 0x4ade80,
            2,
          );
        }
        const pulse = 1 + Math.sin(orb.bob * 1.6) * 0.06;
        const base = orb.kind === "boss" || orb.kind === "titan" ? 1.15 : 0.82;
        orb.sprite.scale.set(base * pulse, base * pulse, 1);
      }

      const gatePulse = 0.55 + Math.sin(livedSec * 3.2) * 0.2;
      for (const gate of allSpawnGates) {
        const ringMat = gate.portalRing.material as THREE.MeshBasicMaterial;
        ringMat.opacity = 0.42 + gatePulse * 0.28;
        gate.portalRing.rotation.z += dt * 0.55;
      }
    }

    // Damage/heal feedback via exposure tint.
    renderer.toneMappingExposure =
      1.18 -
      damagePulse * 0.35 +
      healPulse * 0.28 -
      bossSpawnPulse * 0.22 -
      titanCinematic * 0.52;

    hudAcc += dt;
    if (hudAcc > HUD_EMIT_INTERVAL) {
      hudAcc = 0;
      emitHud();
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  emitHud();

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      for (const m of mobs) {
        scene.remove(m.root);
        disposeObject(m.root);
      }
      for (const s of sparks) releaseSpark(s.mesh);
      for (const ex of explosions) {
        scene.remove(ex.mesh);
        (ex.mesh.material as THREE.Material).dispose();
      }
      for (const orb of healOrbs) disposeHealOrb(orb, scene);
      healOrbs.length = 0;
      for (const dead of dyingMobs) {
        scene.remove(dead.root);
        disposeObject(dead.root);
      }
      for (const puff of smokePuffs) {
        scene.remove(puff.mesh);
        (puff.mesh.material as THREE.Material).dispose();
      }
      if (titanSpot) {
        scene.remove(titanSpot);
        titanSpot.dispose();
      }
      sparkGeo.dispose();
      smokeGeo.dispose();
      explosionGeo.dispose();
      floorTex.dispose();
      dirtTex.dispose();
      wallTex.dispose();
      disposeObject(scene);
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    },
    enqueue,
    getHud: () => ({
      hp: Math.max(0, Math.round(hp)),
      kills,
      alive: mobs.length,
      queued: queue.length,
      comments: zombieComments,
      bosses: bossesSpawned,
      locked: pointerLocked,
      weapon: activeWeapon,
      weaponLabel: getWeaponSpec().label,
      rifleTier,
      hasRpg,
      hasRiflePlus,
      bossThreat: bossProfilePreview.title,
      bossSegments: bossProfilePreview.segments,
      bossHpPreview: bossProfilePreview.hp,
      ammo: usesMagazine(activeWeapon) ? ammoInMag : 1,
      magSize: usesMagazine(activeWeapon) ? MAGAZINE_SIZE : 1,
      reloading: reloadTimer > 0,
      reloadPct: reloadTimer > 0 ? 1 - reloadTimer / RELOAD_TIME : 1,
      hurtFlash,
    }),
    getStats: () => ({
      kills,
      spawned,
      bossesSpawned,
      livedSec,
      zombieComments,
    }),
    bumpZombieComment: () => {
      zombieComments += 1;
      return zombieComments;
    },
    requestPointerLock: () => renderer.domElement.requestPointerLock(),
    markEnded: (o) => {
      ended = true;
      outcome = o;
      if (document.pointerLockElement) document.exitPointerLock();
    },
    isEnded: () => ended,
    getOutcome: () => outcome,
    resize,
  };
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if ((mesh as THREE.Mesh).isMesh) {
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
    const sprite = child as THREE.Sprite;
    if (sprite.isSprite) {
      const mat = sprite.material;
      mat.map?.dispose();
      mat.dispose();
    }
  });
}
