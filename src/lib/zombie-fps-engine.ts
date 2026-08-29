import * as THREE from "three";

export type MobKind = "zombie" | "boss";

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
  from: string;
};

const BOSS_TITLES = ["وحش كبير", "وحش ضخم", "كابوس", "وحش أسطوري"] as const;

/** Boss power scales with comment threshold — 150 comments = ×3 HP (3 هيلات). */
export function computeBossProfile(bossEvery: number): BossProfile {
  const threshold = Math.max(5, Math.min(150, bossEvery));
  const multiplier = threshold > 50 ? 1 + ((threshold - 50) / 100) * 2 : 1;
  const tier: 0 | 1 | 2 | 3 =
    multiplier >= 2.55 ? 3 : multiplier >= 1.7 ? 2 : multiplier > 1.05 ? 1 : 0;
  const segments = tier === 3 ? 3 : tier === 2 ? 2 : 1;
  return {
    multiplier,
    segments,
    tier,
    title: BOSS_TITLES[tier],
    hp: Math.round(BOSS_HP * multiplier),
    damage: Math.round(BOSS_DAMAGE * (1 + (multiplier - 1) * 0.6)),
    speed: Math.max(0.82, BOSS_SPEED - (multiplier - 1) * 0.1),
    scale: 2.85 + (multiplier - 1) * 0.52,
    radius: 1.75 + (multiplier - 1) * 0.35,
    auraIntensity: 2.4 + (multiplier - 1) * 2.2,
    auraRadius: 12 + (multiplier - 1) * 8,
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
/** Small sustain reward for picking off zombies. */
const ZOMBIE_KILL_HEAL = 10;
const MAX_ALIVE = 42;
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
const ZOMBIE_HP = 170;
/** Threshold boss — huge sponge, many shots to drop. */
const BOSS_HP = 1400;
const ZOMBIE_SPEED = 2.45;
const BOSS_SPEED = 1.28;
const ZOMBIE_DAMAGE = 14;
const BOSS_DAMAGE = 32;
const ARENA = 44;
const WALL = ARENA / 2 - 0.75;
/** Three zombie gates spread across the far wall. */
const SPAWN_EDGE = WALL - 1.15;
const SPAWN_SPREAD = 1.05;
const SPAWN_GATES = [
  { x: -13, z: -SPAWN_EDGE },
  { x: 0, z: -SPAWN_EDGE },
  { x: 13, z: -SPAWN_EDGE },
] as const;

const PLAYER_RADIUS = 0.45;
/** Arena crates used for simple blocking collision. */
const OBSTACLES = [
  [-10, -8, 1.5],
  [11, 7, 1.9],
  [-5.5, 12, 1.25],
  [8, -11, 1.6],
  [0, -13.5, 1.1],
  [-13.5, 3, 1.35],
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
  }
  return clampInsideWalls(px, pz, radius);
}

function applyMobCollision(mob: Mob, x: number, z: number, others: Mob[]) {
  let px = x;
  let pz = z;
  for (const other of others) {
    if (other.id === mob.id) continue;
    let dx = px - other.root.position.x;
    let dz = pz - other.root.position.z;
    let dist = Math.hypot(dx, dz);
    const minDist = mob.radius + other.radius + 0.08;
    if (dist >= minDist) continue;
    if (dist < 0.001) {
      dx = Math.random() - 0.5;
      dz = Math.random() - 0.5;
      dist = Math.hypot(dx, dz) || 1;
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
  spawnLight: THREE.PointLight;
};

function createSpawnGate(x: number, z: number): SpawnGateVisual {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const portalRing = new THREE.Mesh(
    new THREE.RingGeometry(1.35, 2.15, 36),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  portalRing.rotation.x = -Math.PI / 2;
  portalRing.position.y = 0.03;
  const portalBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 4.8, 28, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  portalBeam.position.y = 2.4;
  const spawnLight = new THREE.PointLight(0x4ade80, 2.4, 16, 2);
  spawnLight.position.y = 2.6;
  group.add(portalRing, portalBeam, spawnLight);
  return { group, portalRing, spawnLight };
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

function makeNameTag(name: string, boss: boolean) {
  const label = (name || "مشاهد").trim().slice(0, 18);
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
  ctx.fillStyle = boss ? "rgba(88, 28, 135, 0.88)" : "rgba(6, 24, 16, 0.88)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = boss ? "rgba(232, 121, 249, 0.95)" : "rgba(52, 211, 153, 0.95)";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
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
  sprite.scale.set(boss ? 3.4 : 1.75, boss ? 0.92 : 0.48, 1);
  sprite.position.y = boss ? 6.35 : 2.25;
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
) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const fillCanvas = (fill.material as THREE.SpriteMaterial).map!.image as HTMLCanvasElement;
  const fillTex = (fill.material as THREE.SpriteMaterial).map!;
  const ctx = fillCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, fillCanvas.width, fillCanvas.height);
  const w = Math.max(4, Math.floor(232 * ratio));
  const grad = ctx.createLinearGradient(12, 0, 12 + w, 0);
  if (boss) {
    if (segments >= 3) {
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
    lctx.fillText(`${hpText} · هيل ${currentSeg}/${segments}`, labelCanvas.width / 2, 32);
  } else {
    lctx.fillText(hpText, labelCanvas.width / 2, 32);
  }
  labelTex.needsUpdate = true;
}

function makeZombieMesh(kind: MobKind, fromName: string, bossProfile?: BossProfile) {
  const g = new THREE.Group();
  const boss = kind === "boss";
  const scale = boss ? (bossProfile?.scale ?? 2.85) : 1.08;
  const tier = bossProfile?.tier ?? 0;

  const skin = new THREE.MeshStandardMaterial({
    color: boss ? (tier >= 3 ? 0x4c0519 : tier >= 2 ? 0x581c87 : 0x6b21a8) : 0x4a6b45,
    roughness: 0.88,
    metalness: boss && tier >= 2 ? 0.12 : 0.02,
    emissive: boss ? (tier >= 3 ? 0x7f1d1d : 0x3b0764) : 0x1a2e1a,
    emissiveIntensity: boss ? 0.28 + tier * 0.12 : 0.08,
  });
  const cloth = new THREE.MeshStandardMaterial({
    color: boss ? 0x2e1065 : 0x2a3328,
    roughness: 0.92,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: boss ? 0xff1f4b : 0xc8ff4a,
    emissive: boss ? 0xff1f4b : 0x84cc16,
    emissiveIntensity: 1.4,
  });

  const hips = new THREE.Group();
  hips.name = "hips";
  g.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * scale, 0.55 * scale, 6, 12), cloth);
  torso.position.y = 1.15 * scale;
  torso.castShadow = true;
  hips.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 16, 16), skin);
  head.position.y = 1.72 * scale;
  head.castShadow = true;
  hips.add(head);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.08 * scale, 0.12 * scale), skin);
  jaw.position.set(0, 1.58 * scale, 0.12 * scale);
  hips.add(jaw);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045 * scale, 8, 8), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.08 * scale, 1.76 * scale, 0.18 * scale);
  eyeR.position.set(0.08 * scale, 1.76 * scale, 0.18 * scale);
  hips.add(eyeL, eyeR);

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08 * scale, 0.45 * scale, 4, 8), skin);
  armL.name = "armL";
  armL.position.set(-0.42 * scale, 1.25 * scale, 0.05 * scale);
  armL.rotation.z = 0.35;
  armL.castShadow = true;
  hips.add(armL);

  const armR = armL.clone();
  armR.name = "armR";
  armR.position.x = 0.42 * scale;
  armR.rotation.z = -0.35;
  hips.add(armR);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1 * scale, 0.5 * scale, 4, 8), cloth);
  legL.name = "legL";
  legL.position.set(-0.14 * scale, 0.45 * scale, 0);
  legL.castShadow = true;
  hips.add(legL);

  const legR = legL.clone();
  legR.name = "legR";
  legR.position.x = 0.14 * scale;
  hips.add(legR);

  if (boss) {
    const hornMat = new THREE.MeshStandardMaterial({
      color: tier >= 3 ? 0xfca5a5 : 0xfbbf24,
      emissive: tier >= 3 ? 0xdc2626 : 0xb45309,
      emissiveIntensity: 0.55 + tier * 0.15,
      metalness: 0.4,
      roughness: 0.35,
    });
    const horns = new THREE.Mesh(new THREE.ConeGeometry(0.12 + tier * 0.03, 0.35 + tier * 0.08, 6), hornMat);
    horns.position.set(-0.16 * scale, 2.0 * scale, 0);
    const horns2 = horns.clone();
    horns2.position.x = 0.16 * scale;
    hips.add(horns, horns2);

    if (tier >= 2) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 5), hornMat);
      spike.position.set(0, 2.25 * scale, 0);
      hips.add(spike);
    }

    const aura = new THREE.PointLight(
      tier >= 3 ? 0xf43f5e : 0xc026ff,
      bossProfile?.auraIntensity ?? 2.4,
      bossProfile?.auraRadius ?? 12,
    );
    aura.position.y = 1.4 * scale;
    g.add(aura);

    if (tier >= 3) {
      const rage = new THREE.PointLight(0xfb7185, 1.8, 18, 2);
      rage.position.y = 2.8 * scale;
      g.add(rage);
    }
  }

  const hpBarScale = boss ? 3.2 + tier * 0.35 : 1.6;
  const hp = makeHpBarSprites(boss, hpBarScale);
  g.add(makeNameTag(fromName, boss));
  g.add(hp.bg, hp.fill, hp.hpLabel);
  return { root: g, hpFill: hp.fill, hpLabel: hp.hpLabel };
}

function makeRifleWeapon(tier = 0) {
  const weapon = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: tier > 0 ? 0x1f2937 : 0x111827,
    metalness: 0.85,
    roughness: 0.28,
  });
  const polymer = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    metalness: 0.25,
    roughness: 0.55,
  });
  const accentColors = [0x2dd4bf, 0xfbbf24, 0xf472b6, 0xa78bfa] as const;
  const accent = new THREE.MeshStandardMaterial({
    color: accentColors[tier] ?? accentColors[0],
    metalness: 0.55,
    roughness: 0.25,
    emissive: tier > 0 ? 0x7c2d12 : 0x0f766e,
    emissiveIntensity: tier > 0 ? 0.55 : 0.35,
  });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.72), metal);
  receiver.position.set(0.28, -0.2, -0.62);
  weapon.add(receiver);

  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.42), polymer);
  handguard.position.set(0.28, -0.18, -1.05);
  weapon.add(handguard);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.62 + tier * 0.04, 12), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.28, -0.14, -1.42);
  weapon.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 10), metal);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0.28, -0.14, -1.74 - tier * 0.03);
  muzzle.name = "muzzle";
  weapon.add(muzzle);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.34), polymer);
  stock.position.set(0.28, -0.24, -0.18);
  weapon.add(stock);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.14), polymer);
  grip.position.set(0.28, -0.38, -0.42);
  grip.rotation.x = 0.35;
  weapon.add(grip);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.14), accent);
  mag.position.set(0.28, -0.42, -0.58);
  weapon.add(mag);

  const optic = new THREE.Mesh(new THREE.BoxGeometry(0.06 + tier * 0.01, 0.08, 0.22 + tier * 0.04), accent);
  optic.position.set(0.28, -0.06, -0.72);
  weapon.add(optic);

  if (tier > 0) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.5), accent);
    rail.position.set(0.28, -0.1, -0.95);
    weapon.add(rail);
  }

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.08 + tier * 0.02, 10, 10),
    new THREE.MeshBasicMaterial({ color: tier > 0 ? 0xffc857 : 0xffe566, transparent: true, opacity: 0 }),
  );
  flash.position.set(0.28, -0.14, -1.86 - tier * 0.03);
  flash.name = "flash";
  weapon.add(flash);

  return weapon;
}

function makeRpgWeapon() {
  const weapon = new THREE.Group();
  const tube = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.7,
    roughness: 0.35,
  });
  const warhead = new THREE.MeshStandardMaterial({
    color: 0x166534,
    metalness: 0.45,
    roughness: 0.4,
    emissive: 0x14532d,
    emissiveIntensity: 0.35,
  });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7, metalness: 0.2 });

  const launcher = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.05), tube);
  launcher.position.set(0.3, -0.22, -0.95);
  weapon.add(launcher);

  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.18, 12), tube);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.set(0.3, -0.2, -1.52);
  mouth.name = "muzzle";
  weapon.add(mouth);

  const rocket = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.55, 12), warhead);
  rocket.rotation.x = Math.PI / 2;
  rocket.position.set(0.3, -0.2, -1.18);
  weapon.add(rocket);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 12), warhead);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0.3, -0.2, -1.52);
  weapon.add(nose);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.14), gripMat);
  grip.position.set(0.3, -0.42, -0.55);
  grip.rotation.x = 0.3;
  weapon.add(grip);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.12), warhead);
  sight.position.set(0.3, -0.04, -0.82);
  weapon.add(sight);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff7b00, transparent: true, opacity: 0 }),
  );
  flash.position.set(0.3, -0.2, -1.62);
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
    bossEveryThreshold?: number;
  } = {},
): ZombieFpsEngine {
  const bossEveryThreshold = Math.max(5, Math.min(150, opts.bossEveryThreshold ?? 20));
  const bossProfilePreview = computeBossProfile(bossEveryThreshold);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040606);
  scene.fog = new THREE.FogExp2(0x08110c, 0.03);

  const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 140);
  camera.position.set(0, 1.67, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, {
    width: "100%",
    height: "100%",
    display: "block",
    outline: "none",
  });
  renderer.domElement.tabIndex = 0;

  // Lights
  scene.add(new THREE.AmbientLight(0x6f8f7c, 0.28));
  const hemi = new THREE.HemisphereLight(0xa7f3d0, 0x1c0a0a, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d6, 1.35);
  sun.position.set(10, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -28;
  sun.shadow.bias = -0.00025;
  scene.add(sun);

  const neon = new THREE.PointLight(0x34d399, 1.1, 34, 2);
  neon.position.set(0, 5.5, 0);
  scene.add(neon);
  const danger = new THREE.PointLight(0xfb7185, 0.55, 28, 2);
  danger.position.set(-12, 2.4, -12);
  scene.add(danger);
  const danger2 = danger.clone();
  danger2.position.set(12, 2.4, 12);
  scene.add(danger2);

  // Arena materials
  const floorTex = makeNoiseTexture(256, [18, 28, 22], 22);
  floorTex.repeat.set(14, 14);
  const wallTex = makeNoiseTexture(256, [14, 20, 18], 30);
  wallTex.repeat.set(4, 2);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA, ARENA),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.92,
      metalness: 0.04,
      color: 0xffffff,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA, ARENA),
    new THREE.MeshStandardMaterial({ color: 0x0a100e, roughness: 1, metalness: 0 }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 5.2;
  scene.add(ceil);

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.9,
    metalness: 0.08,
    emissive: 0x062018,
    emissiveIntensity: 0.12,
  });
  const wallH = 5.2;
  const mkWall = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    m.position.set(x, wallH / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
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
    [-10, -8, 1.5, 0.2],
    [11, 7, 1.9, -0.4],
    [-5.5, 12, 1.25, 0.7],
    [8, -11, 1.6, 0.1],
    [0, -13.5, 1.1, 0.3],
    [-13.5, 3, 1.35, -0.2],
  ] as const) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(x, s / 2, z);
    crate.rotation.y = rot;
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
  }

  // Three zombie spawn gates (visible portals on the far wall).
  const spawnGates = SPAWN_GATES.map((gate) => createSpawnGate(gate.x, gate.z));
  for (const gate of spawnGates) scene.add(gate.group);

  // Atmospheric dust
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 180;
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
      color: 0x9ae6b4,
      size: 0.035,
      transparent: true,
      opacity: 0.35,
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
  const explosions: FxExplosion[] = [];
  const raycaster = new THREE.Raycaster();
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3();

  let yaw = 0;
  let pitch = 0;
  let hp = PLAYER_MAX_HP;
  let fireCd = 0;
  let invuln = 0;
  let recoil = 0;
  let bob = 0;
  let shake = 0;
  let damagePulse = 0;
  let healPulse = 0;
  let bossSpawnPulse = 0;
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
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
      );
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

  const spawnOne = (kind: MobKind, from: string) => {
    const boss = kind === "boss";
    const profile = boss ? computeBossProfile(bossEveryThreshold) : null;
    const gate = SPAWN_GATES[Math.floor(Math.random() * SPAWN_GATES.length)]!;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * SPAWN_SPREAD;
    const x = gate.x + Math.cos(angle) * dist;
    const z = gate.z + Math.sin(angle) * dist;

    const { root, hpFill, hpLabel } = makeZombieMesh(kind, from, profile ?? undefined);
    const mobRadius = boss ? profile!.radius : 0.58;
    const spawnPos = resolveObstacles(x, z, mobRadius);
    root.position.set(spawnPos.x, 0, spawnPos.z);
    scene.add(root);
    const maxHp = boss ? profile!.hp : ZOMBIE_HP;
    const segments = boss ? profile!.segments : 1;
    paintHpBar(hpFill, hpLabel, maxHp, maxHp, boss, segments);
    mobs.push({
      id: nextId++,
      kind,
      root,
      hp: maxHp,
      maxHp,
      speed: boss ? profile!.speed : ZOMBIE_SPEED,
      radius: boss ? profile!.radius : 0.58,
      damage: boss ? profile!.damage : ZOMBIE_DAMAGE,
      hitCd: 0,
      from,
      phase: Math.random() * Math.PI * 2,
      limp: 0.7 + Math.random() * 0.5,
      hpFill,
      hpLabel,
      bossSegments: segments,
    });
    spawned += 1;
    if (boss) {
      bossesSpawned += 1;
      bossSpawnPulse = 1;
      shake = Math.max(shake, 0.35 + profile!.tier * 0.2);
      spawnSpark(root.position.clone().setY(2.5 + profile!.tier * 0.4), 0xe879f9, 20 + profile!.tier * 8);
      opts.onBossSpawn?.({
        title: profile!.title,
        hp: profile!.hp,
        segments: profile!.segments,
        multiplier: profile!.multiplier,
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

  const applyKillHeal = (mob: Mob) => {
    const before = hp;
    if (mob.kind === "boss") {
      hp = PLAYER_MAX_HP;
    } else {
      hp = Math.min(PLAYER_MAX_HP, hp + ZOMBIE_KILL_HEAL);
    }
    const amount = Math.round(hp - before);
    if (amount <= 0) return;

    healPulse = 1;
    spawnSpark(
      camera.position.clone().setY(1.35),
      mob.kind === "boss" ? 0xa7f3d0 : 0x4ade80,
      mob.kind === "boss" ? 26 : 14,
    );
    opts.onHeal?.({
      kind: mob.kind,
      amount,
      hp: Math.round(hp),
      maxHp: PLAYER_MAX_HP,
    });
    emitHud();
  };

  const getWeaponSpec = (): WeaponSpec => {
    if (activeWeapon === "rpg") {
      return {
        id: "rpg",
        label: "آر بي جي",
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
        label: `بندقية+ ${rifleTier}`,
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
      label: "بندقية",
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
      message = "فتحت بندقية قوية + آر بي جي — غيّر السلاح بالسكرول";
    } else if (rifleTier < MAX_RIFLE_TIER) {
      rifleTier += 1;
      if (weaponGroups.rifle_plus) {
        camera.remove(weaponGroups.rifle_plus);
        disposeObject(weaponGroups.rifle_plus);
      }
      weaponGroups.rifle_plus = makeRifleWeapon(rifleTier);
      camera.add(weaponGroups.rifle_plus);
      bindActiveWeaponVisuals();
      message = `ترقية البندقية للمستوى ${rifleTier}`;
    } else {
      message = "أقصى ترقية للبندقية — استخدم آر بي جي!";
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
    spawnSpark(
      mob.root.position.clone().setY(mob.kind === "boss" ? 2.4 : 1.2),
      0xf87171,
      mob.kind === "boss" ? 28 : 18,
    );
    if (mob.kind === "boss") upgradeWeaponsFromBoss();
    applyKillHeal(mob);
    scene.remove(mob.root);
    disposeObject(mob.root);
    const idx = mobs.indexOf(mob);
    if (idx >= 0) mobs.splice(idx, 1);
  };

  const damageMob = (mob: Mob, amount: number, hitPoint?: THREE.Vector3) => {
    mob.hp -= amount;
    paintHpBar(mob.hpFill, mob.hpLabel, mob.hp, mob.maxHp, mob.kind === "boss", mob.bossSegments);
    if (hitPoint) {
      spawnSpark(hitPoint, mob.kind === "boss" ? 0xe879f9 : 0x4ade80, activeWeapon === "rpg" ? 18 : 12);
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
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 20, 20),
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
    spawnSpark(pos, 0xffedd5, 32);
    spawnSpark(pos, 0xf97316, 22);
  };

  const flashMuzzle = (spec: WeaponSpec) => {
    muzzleLight.color.setHex(spec.flashColor);
    muzzleLight.intensity = activeWeapon === "rpg" ? 8 : 4.5;
    if (flashMesh.material instanceof THREE.MeshBasicMaterial) {
      flashMesh.material.opacity = 1;
      flashMesh.scale.setScalar(activeWeapon === "rpg" ? 2.2 : 1.4 + Math.random());
    }
  };

  const fireRifle = (spec: WeaponSpec) => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(
      mobs.map((m) => m.root),
      true,
    );
    if (hits.length > 0) {
      const hit = hits[0]!;
      let root: THREE.Object3D | null = hit.object;
      while (root && !mobs.some((m) => m.root === root)) root = root.parent;
      const mob = mobs.find((m) => m.root === root);
      if (mob) damageMob(mob, spec.damage, hit.point);
    } else {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      spawnSpark(camera.position.clone().add(dir.multiplyScalar(4)), 0xfbbf24, 4);
    }
  };

  const fireRpg = () => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    let impact = camera.position.clone().add(dir.clone().multiplyScalar(24));
    const hits = raycaster.intersectObjects(
      mobs.map((m) => m.root),
      true,
    );
    if (hits.length > 0) {
      impact = hits[0]!.point.clone();
    } else {
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(ground, hitPoint)) impact = hitPoint;
    }
    spawnExplosion(impact);
    for (const mob of [...mobs]) {
      const dist = Math.hypot(mob.root.position.x - impact.x, mob.root.position.z - impact.z);
      if (dist > RPG_SPLASH_RADIUS) continue;
      const falloff = 1 - dist / RPG_SPLASH_RADIUS;
      const dmg = dist < 1.2 ? RPG_DIRECT_DAMAGE : RPG_SPLASH_DAMAGE * falloff;
      damageMob(mob, dmg, impact);
    }
  };

  const fire = () => {
    if (ended || fireCd > 0) return;
    const spec = getWeaponSpec();
    fireCd = spec.cooldown;
    recoil = spec.recoil;
    shake = Math.max(shake, spec.shake);
    flashMuzzle(spec);
    if (activeWeapon === "rpg") fireRpg();
    else fireRifle(spec);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const onMouseDown = (e: MouseEvent) => {
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
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!pointerLocked || ended) return;
    yaw -= e.movementX * 0.00215;
    pitch -= e.movementY * 0.00215;
    pitch = Math.max(-1.25, Math.min(1.25, pitch));
  };
  const onLockChange = () => {
    pointerLocked = document.pointerLockElement === renderer.domElement;
  };

  const onWheel = (e: WheelEvent) => {
    if (!pointerLocked || ended) return;
    e.preventDefault();
    cycleWeapon(e.deltaY > 0 ? 1 : -1);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  renderer.domElement.addEventListener("mousedown", onMouseDown);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onLockChange);

  const emitHud = () => {
    const spec = getWeaponSpec();
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
    });
  };

  const tick = () => {
    const dt = Math.min(0.033, clock.getDelta());
    if (!ended) {
      livedSec += dt;
      fireCd = Math.max(0, fireCd - dt);
      invuln = Math.max(0, invuln - dt);
      recoil = Math.max(0, recoil - dt * 7);
      shake = Math.max(0, shake - dt * 3.5);
      damagePulse = Math.max(0, damagePulse - dt * 1.8);
      healPulse = Math.max(0, healPulse - dt * 2.4);
      bossSpawnPulse = Math.max(0, bossSpawnPulse - dt * 1.6);
      muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 22);
      if (flashMesh.material instanceof THREE.MeshBasicMaterial) {
        flashMesh.material.opacity = Math.max(0, flashMesh.material.opacity - dt * 10);
      }

      let released = 0;
      while (queue.length > 0 && mobs.length < MAX_ALIVE && released < 6) {
        const job = queue.shift()!;
        spawnOne(job.kind, job.from);
        released += 1;
      }

      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize();
      const wish = new THREE.Vector3();
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
      const bobY = moving ? Math.sin(bob) * 0.045 : 0;
      const bobX = moving ? Math.cos(bob * 0.5) * 0.02 : 0;
      camera.position.y = 1.67 + bobY;
      if (shake > 0) {
        camera.position.x += (Math.random() - 0.5) * shake * 0.08;
        camera.position.y += (Math.random() - 0.5) * shake * 0.06;
      }

      activeWeaponGroup.position.set(
        0.3 + bobX - recoil * 0.02,
        -0.3 + Math.abs(Math.sin(bob)) * 0.025 - recoil * 0.055,
        -0.42 - recoil * 0.1,
      );
      activeWeaponGroup.rotation.set(0.04 + recoil * 0.22, 0.1, 0.035 + bobX * 0.4);

      if (shooting && pointerLocked) fire();

      const playerPos = camera.position;
      for (const m of mobs) {
        m.phase += dt * m.limp * 6;
        const to = new THREE.Vector3(
          playerPos.x - m.root.position.x,
          0,
          playerPos.z - m.root.position.z,
        );
        const dist = to.length();
        if (dist > 0.001) {
          to.normalize();
          const nx = m.root.position.x + to.x * m.speed * dt;
          const nz = m.root.position.z + to.z * m.speed * dt;
          applyMobCollision(m, nx, nz, mobs);
          m.root.lookAt(playerPos.x, m.root.position.y + 1.1, playerPos.z);
        }
        m.root.position.y = Math.abs(Math.sin(m.phase)) * 0.04;

        const hips = m.root.getObjectByName("hips");
        const legL = m.root.getObjectByName("legL");
        const legR = m.root.getObjectByName("legR");
        const armL = m.root.getObjectByName("armL");
        const armR = m.root.getObjectByName("armR");
        if (legL) legL.rotation.x = Math.sin(m.phase) * 0.55;
        if (legR) legR.rotation.x = Math.sin(m.phase + Math.PI) * 0.55;
        if (armL) armL.rotation.x = Math.sin(m.phase + Math.PI) * 0.4 - 0.8;
        if (armR) armR.rotation.x = Math.sin(m.phase) * 0.4 - 0.8;
        if (hips) hips.rotation.y = Math.sin(m.phase * 0.5) * 0.08;

        m.hitCd = Math.max(0, m.hitCd - dt);
        const flatDist = Math.hypot(
          playerPos.x - m.root.position.x,
          playerPos.z - m.root.position.z,
        );
        if (flatDist < m.radius + 0.5 && m.hitCd <= 0 && invuln <= 0) {
          m.hitCd = 0.7;
          hp -= m.damage;
          invuln = 0.45;
          shake = 0.7;
          damagePulse = 1;
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
          scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          mat.dispose();
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
          ex.mesh.geometry.dispose();
          mat.dispose();
          explosions.splice(i, 1);
        }
      }

      dust.rotation.y += dt * 0.02;

      const gatePulse = 0.55 + Math.sin(livedSec * 3.2) * 0.2;
      for (const gate of spawnGates) {
        gate.spawnLight.intensity = 1.8 + gatePulse * 0.9;
        const ringMat = gate.portalRing.material as THREE.MeshBasicMaterial;
        ringMat.opacity = 0.42 + gatePulse * 0.28;
        gate.portalRing.rotation.z += dt * 0.55;
      }
    }

    // Damage/heal feedback via exposure tint.
    renderer.toneMappingExposure =
      1.15 - damagePulse * 0.35 + healPulse * 0.28 - bossSpawnPulse * 0.22;

    hudAcc += dt;
    if (hudAcc > 0.1) {
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
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      for (const m of mobs) {
        scene.remove(m.root);
        disposeObject(m.root);
      }
      for (const s of sparks) {
        scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
      }
      for (const ex of explosions) {
        scene.remove(ex.mesh);
        ex.mesh.geometry.dispose();
        (ex.mesh.material as THREE.Material).dispose();
      }
      floorTex.dispose();
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
