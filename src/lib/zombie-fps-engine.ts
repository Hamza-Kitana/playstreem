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
};

type SpawnJob = { kind: MobKind; from: string };

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
};

const PLAYER_MAX_HP = 100;
const MAX_ALIVE = 42;
const MOVE_SPEED = 7.2;
const FIRE_COOLDOWN = 0.14;
const HIT_DAMAGE = 28;
const ZOMBIE_HP = 40;
const BOSS_HP = 260;
const ZOMBIE_SPEED = 2.35;
const BOSS_SPEED = 1.55;
const ZOMBIE_DAMAGE = 12;
const BOSS_DAMAGE = 22;
const ARENA = 28;
const WALL = ARENA / 2 - 0.6;

function makeZombieMesh(kind: MobKind) {
  const g = new THREE.Group();
  const boss = kind === "boss";
  const bodyMat = new THREE.MeshStandardMaterial({
    color: boss ? 0x7e22ce : 0x3f7a4a,
    roughness: 0.75,
    metalness: 0.05,
    emissive: boss ? 0x4c1d95 : 0x14532d,
    emissiveIntensity: boss ? 0.35 : 0.12,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: boss ? 0xc084fc : 0x86efac,
    roughness: 0.55,
  });

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(boss ? 0.55 : 0.35, boss ? 1.1 : 0.75, 6, 10),
    bodyMat,
  );
  torso.position.y = boss ? 1.35 : 1.05;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(boss ? 0.42 : 0.28, 12, 12), headMat);
  head.position.y = boss ? 2.25 : 1.75;
  head.castShadow = true;
  g.add(head);

  const eyeMat = new THREE.MeshBasicMaterial({ color: boss ? 0xff4d6d : 0xfef08a });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(boss ? 0.08 : 0.05, 8, 8), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.12, boss ? 2.3 : 1.78, boss ? 0.34 : 0.24);
  eyeR.position.set(0.12, boss ? 2.3 : 1.78, boss ? 0.34 : 0.24);
  g.add(eyeL, eyeR);

  if (boss) {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.45, 5),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xb45309,
        emissiveIntensity: 0.4,
      }),
    );
    crown.position.y = 2.75;
    g.add(crown);
  }

  return g;
}

function makeWeapon() {
  const weapon = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7, roughness: 0.35 });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    metalness: 0.4,
    roughness: 0.3,
    emissive: 0x115e59,
    emissiveIntensity: 0.25,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.85), dark);
  body.position.set(0.22, -0.18, -0.55);
  weapon.add(body);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 10), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.22, -0.12, -1.05);
  weapon.add(barrel);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.28), dark);
  stock.position.set(0.22, -0.22, -0.12);
  weapon.add(stock);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.16), accent);
  mag.position.set(0.22, -0.34, -0.45);
  weapon.add(mag);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), accent);
  sight.position.set(0.22, -0.02, -0.7);
  weapon.add(sight);

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
  scene.background = new THREE.Color(0x050807);
  scene.fog = new THREE.FogExp2(0x07110c, 0.045);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.08, 120);
  camera.position.set(0, 1.65, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.outline = "none";
  renderer.domElement.tabIndex = 0;

  // Lighting
  scene.add(new THREE.AmbientLight(0x8fd9b8, 0.35));
  const hemi = new THREE.HemisphereLight(0xb6ffd8, 0x1a0a0a, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(8, 16, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 50;
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  scene.add(key);
  const fill = new THREE.PointLight(0x3dff9a, 0.55, 40);
  fill.position.set(0, 6, 0);
  scene.add(fill);
  const redFill = new THREE.PointLight(0xfb7185, 0.25, 30);
  redFill.position.set(-8, 3, -8);
  scene.add(redFill);

  // Arena
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x121a16,
    roughness: 0.95,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA, ARENA, 1, 1), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(ARENA, 28, 0x1f6b4a, 0x123528);
  grid.position.y = 0.01;
  scene.add(grid);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0d1612,
    roughness: 0.85,
    metalness: 0.1,
    emissive: 0x06241a,
    emissiveIntensity: 0.15,
  });
  const wallH = 4.2;
  const mkWall = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    m.position.set(x, wallH / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  };
  mkWall(ARENA, 0.7, 0, -ARENA / 2);
  mkWall(ARENA, 0.7, 0, ARENA / 2);
  mkWall(0.7, ARENA, -ARENA / 2, 0);
  mkWall(0.7, ARENA, ARENA / 2, 0);

  // Inner cover props
  for (const [x, z, s] of [
    [-6, -5, 1.4],
    [7, 4, 1.8],
    [-3, 8, 1.2],
    [5, -7, 1.5],
  ] as const) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(s, s, s),
      new THREE.MeshStandardMaterial({ color: 0x24352c, roughness: 0.8 }),
    );
    crate.position.set(x, s / 2, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
  }

  // Weapon viewmodel
  const weapon = makeWeapon();
  camera.add(weapon);
  scene.add(camera);

  // Crosshair flash / muzzle
  const muzzleLight = new THREE.PointLight(0xffe08a, 0, 8);
  muzzleLight.position.set(0.22, -0.1, -1.25);
  camera.add(muzzleLight);

  const keys = new Set<string>();
  const mobs: Mob[] = [];
  const queue: SpawnJob[] = [];
  const raycaster = new THREE.Raycaster();
  const clock = new THREE.Clock();

  let yaw = 0;
  let pitch = 0;
  let hp = PLAYER_MAX_HP;
  let fireCd = 0;
  let invuln = 0;
  let recoil = 0;
  let bob = 0;
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

  const spawnOne = (kind: MobKind, from: string) => {
    const boss = kind === "boss";
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let z = 0;
    const edge = WALL - 1.2;
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

    const root = makeZombieMesh(kind);
    root.position.set(x, 0, z);
    scene.add(root);
    mobs.push({
      id: nextId++,
      kind,
      root,
      hp: boss ? BOSS_HP : ZOMBIE_HP,
      maxHp: boss ? BOSS_HP : ZOMBIE_HP,
      speed: boss ? BOSS_SPEED : ZOMBIE_SPEED,
      radius: boss ? 0.85 : 0.5,
      damage: boss ? BOSS_DAMAGE : ZOMBIE_DAMAGE,
      hitCd: 0,
      from,
    });
    spawned += 1;
    if (boss) bossesSpawned += 1;
  };

  const enqueue = (kind: MobKind, from: string, count = 1) => {
    if (ended) return;
    for (let i = 0; i < count; i++) queue.push({ kind, from });
  };

  const fire = () => {
    if (ended || fireCd > 0) return;
    fireCd = FIRE_COOLDOWN;
    recoil = 1;
    muzzleLight.intensity = 2.8;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(
      mobs.map((m) => m.root),
      true,
    );
    if (hits.length > 0) {
      const obj = hits[0]!.object;
      let root: THREE.Object3D | null = obj;
      while (root && !mobs.some((m) => m.root === root)) root = root.parent;
      const mob = mobs.find((m) => m.root === root);
      if (mob) {
        mob.hp -= HIT_DAMAGE;
        mob.root.position.y = 0.08;
        if (mob.hp <= 0) {
          kills += 1;
          scene.remove(mob.root);
          disposeObject(mob.root);
          const idx = mobs.indexOf(mob);
          if (idx >= 0) mobs.splice(idx, 1);
        }
      }
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
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
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
      recoil = Math.max(0, recoil - dt * 6);
      muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 18);

      let released = 0;
      while (queue.length > 0 && mobs.length < MAX_ALIVE && released < 2) {
        const job = queue.shift()!;
        spawnOne(job.kind, job.from);
        released += 1;
      }

      // Look
      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;

      // Move
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
      if (wish.lengthSq() > 0) {
        wish.normalize().multiplyScalar(MOVE_SPEED * dt);
        camera.position.add(wish);
        bob += dt * 10;
      } else {
        bob *= 0.9;
      }
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -WALL, WALL);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -WALL, WALL);
      camera.position.y = 1.65 + Math.sin(bob) * 0.035;

      // Weapon sway / recoil
      weapon.position.set(
        0.28 + Math.sin(bob * 0.5) * 0.01,
        -0.28 + Math.abs(Math.sin(bob)) * 0.02 - recoil * 0.04,
        -0.45 - recoil * 0.08,
      );
      weapon.rotation.set(recoil * 0.18, 0.08, 0.04);

      if (shooting && pointerLocked) fire();

      // Mobs chase
      const playerPos = camera.position;
      for (const m of mobs) {
        m.root.position.y = THREE.MathUtils.lerp(m.root.position.y, 0, 0.2);
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
          m.root.lookAt(playerPos.x, m.root.position.y + 1.2, playerPos.z);
        }
        m.root.position.x = THREE.MathUtils.clamp(m.root.position.x, -WALL, WALL);
        m.root.position.z = THREE.MathUtils.clamp(m.root.position.z, -WALL, WALL);
        m.hitCd = Math.max(0, m.hitCd - dt);

        const flatDist = Math.hypot(
          playerPos.x - m.root.position.x,
          playerPos.z - m.root.position.z,
        );
        if (flatDist < m.radius + 0.55 && m.hitCd <= 0 && invuln <= 0) {
          m.hitCd = 0.65;
          hp -= m.damage;
          invuln = 0.4;
          recoil = 1;
          if (hp <= 0) {
            hp = 0;
            ended = true;
            outcome = "defeated";
            if (document.pointerLockElement) document.exitPointerLock();
            opts.onDefeat?.();
          }
        }
      }
    }

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
  };
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}
