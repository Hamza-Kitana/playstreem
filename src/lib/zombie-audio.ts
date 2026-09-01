import type { MobKind, WeaponId } from "./zombie-fps-engine";

export type ZombieAudio = {
  unlock: () => void;
  playFootstep: () => void;
  playShoot: (weapon: WeaponId) => void;
  playZombieGroan: (kind?: MobKind) => void;
  playBossRoar: (isTitan: boolean) => void;
  playVerdict: (outcome: "survived" | "defeated") => void;
  dispose: () => void;
};

export function createZombieAudio(): ZombieAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let lastFoot = 0;

  const init = () => {
    if (ctx) return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.58;
    master.connect(ctx.destination);
  };

  const resume = () => {
    init();
    if (ctx!.state === "suspended") void ctx!.resume();
  };

  const playNoise = (
    dur: number,
    vol: number,
    freq = 800,
    type: BiquadFilterType = "lowpass",
    q = 0.8,
  ) => {
    if (!ctx || !master) return;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + dur + 0.06);
  };

  const playTone = (
    freq: number,
    dur: number,
    vol: number,
    type: OscillatorType = "sine",
    slideTo?: number,
  ) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.06);
  };

  return {
    unlock: resume,

    playFootstep: () => {
      resume();
      const now = performance.now();
      if (now - lastFoot < 260) return;
      lastFoot = now;
      playNoise(0.075, 0.11, 280 + Math.random() * 80, "bandpass", 1.2);
      playNoise(0.04, 0.05, 120, "lowpass");
    },

    playShoot: (weapon) => {
      resume();
      if (weapon === "rpg") {
        playNoise(0.42, 0.52, 90, "lowpass");
        playTone(48, 0.5, 0.38, "sawtooth", 28);
        window.setTimeout(() => playNoise(0.25, 0.22, 60, "lowpass"), 80);
      } else if (weapon === "rifle_plus") {
        playNoise(0.055, 0.3, 950, "highpass");
        playTone(200, 0.045, 0.16, "square");
        playTone(95, 0.08, 0.1, "triangle");
      } else {
        playNoise(0.048, 0.24, 1150, "highpass");
        playTone(240, 0.035, 0.12, "square");
      }
    },

    playZombieGroan: (kind = "zombie") => {
      resume();
      const base =
        kind === "titan" ? 42 + Math.random() * 12 : kind === "boss" ? 52 + Math.random() * 18 : 68 + Math.random() * 35;
      playTone(base, 0.45 + Math.random() * 0.35, kind === "zombie" ? 0.14 : 0.2, "sawtooth", base * 0.7);
      playTone(base * 0.55, 0.55, 0.1, "triangle");
      playNoise(0.2, 0.06, 200, "bandpass");
    },

    playBossRoar: (isTitan) => {
      resume();
      if (isTitan) {
        playNoise(1.1, 0.58, 55, "lowpass");
        playTone(34, 1.3, 0.5, "sawtooth", 22);
        playTone(22, 1.6, 0.42, "sine");
        window.setTimeout(() => playNoise(0.65, 0.35, 45, "lowpass"), 120);
        window.setTimeout(() => playTone(48, 0.4, 0.25, "square", 30), 400);
      } else {
        playNoise(0.65, 0.4, 85, "lowpass");
        playTone(58, 0.75, 0.32, "sawtooth", 38);
        playTone(44, 0.5, 0.18, "triangle");
      }
    },

    playVerdict: (outcome) => {
      resume();
      if (outcome === "survived") {
        playTone(392, 0.12, 0.22);
        window.setTimeout(() => playTone(523, 0.12, 0.24), 100);
        window.setTimeout(() => playTone(659, 0.12, 0.26), 200);
        window.setTimeout(() => playTone(784, 0.45, 0.32), 310);
      } else {
        playTone(196, 0.35, 0.34, "sawtooth", 98);
        window.setTimeout(() => playTone(130, 0.55, 0.38, "triangle", 65), 180);
        window.setTimeout(() => playNoise(0.4, 0.2, 80, "lowpass"), 320);
      }
    },

    dispose: () => {
      void ctx?.close();
      ctx = null;
      master = null;
    },
  };
}
