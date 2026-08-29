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
};

export type FpsEndOutcome = "survived" | "defeated";

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
};

type SpawnJob = { kind: MobKind; from: string };

type FxSpark = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
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
const MAX_ALIVE = 42;
const MOVE_SPEED = 6.8;
const FIRE_COOLDOWN = 0.13;
/** Shots feel impactful but zombies tank several hits. */
const HIT_DAMAGE = 22;
const ZOMBIE_HP = 170;
/** Threshold boss — huge sponge, many shots to drop. */
const BOSS_HP = 1400;
const ZOMBIE_SPEED = 2.05;
const BOSS_SPEED = 1.15;
const ZOMBIE_DAMAGE = 14;
const BOSS_DAMAGE = 32;
const ARENA = 32;
const WALL = ARENA / 2 - 0.75;

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

function makeHpBarSprites(boss: boolean) {
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
  bg.scale.set(boss ? 3.2 : 1.6, boss ? 0.55 : 0.28, 1);
  bg.position.y = boss ? 5.55 : 1.92;
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
  fill.scale.set(boss ? 3.0 : 1.5, boss ? 0.42 : 0.2, 1);
  fill.position.y = boss ? 5.55 : 1.92;
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
  hpLabel.scale.set(boss ? 2.4 : 1.2, boss ? 0.55 : 0.3, 1);
  hpLabel.position.y = boss ? 5.15 : 1.72;
  hpLabel.renderOrder = 13;

  return { bg, fill, hpLabel };
}

function paintHpBar(
  fill: THREE.Sprite,
  hpLabel: THREE.Sprite,
  hp: number,
  maxHp: number,
  boss: boolean,
) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const fillCanvas = (fill.material as THREE.SpriteMaterial).map!.image as HTMLCanvasElement;
  const fillTex = (fill.material as THREE.SpriteMaterial).map!;
  const ctx = fillCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, fillCanvas.width, fillCanvas.height);
  const w = Math.max(4, Math.floor(232 * ratio));
  const grad = ctx.createLinearGradient(12, 0, 12 + w, 0);
  if (boss) {
    grad.addColorStop(0, "#f0abfc");
    grad.addColorStop(1, ratio < 0.35 ? "#ef4444" : "#a855f7");
  } else {
    grad.addColorStop(0, "#86efac");
    grad.addColorStop(1, ratio < 0.35 ? "#ef4444" : "#22c55e");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(12, 14, w, 20, 8);
  ctx.fill();
  fillTex.needsUpdate = true;

  // Keep fill sprite centered visually by shifting with remaining health width.
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
  lctx.fillText(`${Math.max(0, Math.ceil(hp))} / ${maxHp}`, labelCanvas.width / 2, 32);
  labelTex.needsUpdate = true;
}

function makeZombieMesh(kind: MobKind, fromName: string) {
  const g = new THREE.Group();
  const boss = kind === "boss";
  const scale = boss ? 2.85 : 1.08;

  const skin = new THREE.MeshStandardMaterial({
    color: boss ? 0x6b21a8 : 0x4a6b45,
    roughness: 0.88,
    metalness: 0.02,
    emissive: boss ? 0x3b0764 : 0x1a2e1a,
    emissiveIntensity: boss ? 0.28 : 0.08,
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
    const horns = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.35, 6),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xb45309,
        emissiveIntensity: 0.55,
        metalness: 0.4,
        roughness: 0.35,
      }),
    );
    horns.position.set(-0.16 * scale, 2.0 * scale, 0);
    const horns2 = horns.clone();
    horns2.position.x = 0.16 * scale;
    hips.add(horns, horns2);

    const aura = new THREE.PointLight(0xc026ff, 2.4, 12);
    aura.position.y = 1.4 * scale;
    g.add(aura);
  }

  const hp = makeHpBarSprites(boss);
  g.add(makeNameTag(fromName, boss));
  g.add(hp.bg, hp.fill, hp.hpLabel);
  return { root: g, hpFill: hp.fill, hpLabel: hp.hpLabel };
}

function makeWeapon() {
  const weapon = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.85,
    roughness: 0.28,
  });
  const polymer = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    metalness: 0.25,
    roughness: 0.55,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    metalness: 0.55,
    roughness: 0.25,
    emissive: 0x0f766e,
    emissiveIntensity: 0.35,
  });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.72), metal);
  receiver.position.set(0.28, -0.2, -0.62);
  weapon.add(receiver);

  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.42), polymer);
  handguard.position.set(0.28, -0.18, -1.05);
  weapon.add(handguard);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.62, 12), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.28, -0.14, -1.42);
  weapon.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 10), metal);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0.28, -0.14, -1.74);
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

  const optic = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.22), accent);
  optic.position.set(0.28, -0.06, -0.72);
  weapon.add(optic);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe566, transparent: true, opacity: 0 }),
  );
  flash.position.set(0.28, -0.14, -1.86);
  flash.name = "flash";
  weapon.add(flash);

  return weapon;
}

export function createZombieFpsEngine(
  mount: HTMLElement,
  opts: {
    onHud?: (hud: FpsHud) => void;
    onDefeat?: () => void;
  } = {},
): ZombieFpsEngine {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040606);
  scene.fog = new THREE.FogExp2(0x08110c, 0.038);

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
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.bias = -0.00025;
  scene.add(sun);

  const neon = new THREE.PointLight(0x34d399, 1.1, 28, 2);
  neon.position.set(0, 5.5, 0);
  scene.add(neon);
  const danger = new THREE.PointLight(0xfb7185, 0.55, 22, 2);
  danger.position.set(-9, 2.4, -9);
  scene.add(danger);
  const danger2 = danger.clone();
  danger2.position.set(9, 2.4, 9);
  scene.add(danger2);

  // Arena materials
  const floorTex = makeNoiseTexture(256, [18, 28, 22], 22);
  floorTex.repeat.set(10, 10);
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
    [-7.5, -6, 1.5, 0.2],
    [8, 5, 1.9, -0.4],
    [-4, 9, 1.25, 0.7],
    [6, -8, 1.6, 0.1],
    [0, -10, 1.1, 0.3],
    [-10, 2, 1.35, -0.2],
  ] as const) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(x, s / 2, z);
    crate.rotation.y = rot;
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
  }

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

  // Weapon
  const weapon = makeWeapon();
  camera.add(weapon);
  scene.add(camera);
  const flashMesh = weapon.getObjectByName("flash") as THREE.Mesh;
  const muzzleLight = new THREE.PointLight(0xffd27a, 0, 7, 2);
  muzzleLight.position.set(0.28, -0.14, -1.7);
  camera.add(muzzleLight);

  const keys = new Set<string>();
  const mobs: Mob[] = [];
  const queue: SpawnJob[] = [];
  const sparks: FxSpark[] = [];
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
    const side = Math.floor(Math.random() * 4);
    const edge = WALL - 1.4;
    let x = 0;
    let z = 0;
    if (side === 0) {
      x = (Math.random() * 2 - 1) * edge;
      z = -edge;
    } else if (side === 1) {
      x = edge;
      z = (Math.random() * 2 - 1) * edge;
    } else if (side === 2) {
      x = (Math.random() * 2 - 1) * edge;
      z = edge;
    } else {
      x = -edge;
      z = (Math.random() * 2 - 1) * edge;
    }

    const { root, hpFill, hpLabel } = makeZombieMesh(kind, from);
    root.position.set(x, 0, z);
    scene.add(root);
    const maxHp = boss ? BOSS_HP : ZOMBIE_HP;
    paintHpBar(hpFill, hpLabel, maxHp, maxHp, boss);
    mobs.push({
      id: nextId++,
      kind,
      root,
      hp: maxHp,
      maxHp,
      speed: boss ? BOSS_SPEED : ZOMBIE_SPEED,
      radius: boss ? 1.75 : 0.58,
      damage: boss ? BOSS_DAMAGE : ZOMBIE_DAMAGE,
      hitCd: 0,
      from,
      phase: Math.random() * Math.PI * 2,
      limp: 0.7 + Math.random() * 0.5,
      hpFill,
      hpLabel,
    });
    spawned += 1;
    if (boss) bossesSpawned += 1;
  };

  const enqueue = (kind: MobKind, from: string, count = 1) => {
    if (ended) return;
    for (let i = 0; i < count; i++) {
      // Spawn immediately when possible so chat feels instant.
      if (mobs.length < MAX_ALIVE) spawnOne(kind, from);
      else queue.push({ kind, from });
    }
  };

  const fire = () => {
    if (ended || fireCd > 0) return;
    fireCd = FIRE_COOLDOWN;
    recoil = 1;
    shake = Math.max(shake, 0.22);
    muzzleLight.intensity = 4.5;
    if (flashMesh.material instanceof THREE.MeshBasicMaterial) {
      flashMesh.material.opacity = 1;
      flashMesh.scale.setScalar(1.4 + Math.random());
    }

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
      if (mob) {
        mob.hp -= HIT_DAMAGE;
        paintHpBar(mob.hpFill, mob.hpLabel, mob.hp, mob.maxHp, mob.kind === "boss");
        spawnSpark(hit.point, mob.kind === "boss" ? 0xe879f9 : 0x4ade80, 12);
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
        if (mob.hp <= 0) {
          kills += 1;
          spawnSpark(
            mob.root.position.clone().setY(mob.kind === "boss" ? 2.4 : 1.2),
            0xf87171,
            mob.kind === "boss" ? 28 : 18,
          );
          scene.remove(mob.root);
          disposeObject(mob.root);
          const idx = mobs.indexOf(mob);
          if (idx >= 0) mobs.splice(idx, 1);
        }
      }
    } else {
      // wall spark fallback ahead
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      spawnSpark(camera.position.clone().add(dir.multiplyScalar(4)), 0xfbbf24, 4);
    }
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

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  renderer.domElement.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onLockChange);

  const emitHud = () => {
    opts.onHud?.({
      hp: Math.max(0, Math.round(hp)),
      kills,
      alive: mobs.length,
      queued: queue.length,
      comments: zombieComments,
      bosses: bossesSpawned,
      locked: pointerLocked,
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
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -WALL, WALL);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -WALL, WALL);
      const bobY = moving ? Math.sin(bob) * 0.045 : 0;
      const bobX = moving ? Math.cos(bob * 0.5) * 0.02 : 0;
      camera.position.y = 1.67 + bobY;
      if (shake > 0) {
        camera.position.x += (Math.random() - 0.5) * shake * 0.08;
        camera.position.y += (Math.random() - 0.5) * shake * 0.06;
      }

      weapon.position.set(
        0.3 + bobX - recoil * 0.02,
        -0.3 + Math.abs(Math.sin(bob)) * 0.025 - recoil * 0.055,
        -0.42 - recoil * 0.1,
      );
      weapon.rotation.set(0.04 + recoil * 0.22, 0.1, 0.035 + bobX * 0.4);

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
          m.root.position.x += to.x * m.speed * dt;
          m.root.position.z += to.z * m.speed * dt;
          m.root.lookAt(playerPos.x, m.root.position.y + 1.1, playerPos.z);
        }
        m.root.position.x = THREE.MathUtils.clamp(m.root.position.x, -WALL, WALL);
        m.root.position.z = THREE.MathUtils.clamp(m.root.position.z, -WALL, WALL);
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

      dust.rotation.y += dt * 0.02;
    }

    // subtle damage vignette via exposure
    renderer.toneMappingExposure = 1.15 - damagePulse * 0.35;

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
