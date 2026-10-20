export type RouletteAudio = {
  unlock: () => void;
  setMuted: (muted: boolean) => void;
  /** Peg click as a segment passes the pointer; `speed` is 0 (stopped) to 1 (full spin). */
  playTick: (speed: number) => void;
  playSpinStart: () => void;
  playEliminated: () => void;
  playWinner: () => void;
  dispose: () => void;
};

export function createRouletteAudio(): RouletteAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;
  let lastTick = 0;

  const init = () => {
    if (ctx) return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  };

  const ready = () => {
    init();
    if (ctx!.state === "suspended") void ctx!.resume();
    return !muted;
  };

  const playNoise = (
    dur: number,
    vol: number,
    freq: number,
    type: BiquadFilterType,
    q = 0.8,
    sweepTo?: number,
  ) => {
    if (!ctx || !master) return;
    const size = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      const env = 1 - i / size;
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    const t = ctx.currentTime;
    filter.frequency.setValueAtTime(freq, t);
    if (sweepTo != null) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  };

  const playTone = (
    freq: number,
    dur: number,
    vol: number,
    type: OscillatorType = "sine",
    slideTo?: number,
    delay = 0,
  ) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const t = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };

  return {
    unlock: () => {
      ready();
    },

    setMuted: (next) => {
      muted = next;
      if (master && ctx) master.gain.setValueAtTime(next ? 0 : 0.6, ctx.currentTime);
    },

    playTick: (speed) => {
      if (!ready()) return;
      const now = performance.now();
      if (now - lastTick < 28) return;
      lastTick = now;
      const s = Math.min(1, Math.max(0, speed));
      playNoise(0.03, 0.22 + 0.18 * (1 - s), 2600 + s * 1400, "bandpass", 2.4);
      playTone(1100 + s * 500, 0.035, 0.08 + 0.06 * (1 - s), "triangle", 700);
    },

    playSpinStart: () => {
      if (!ready()) return;
      playNoise(0.55, 0.16, 400, "bandpass", 1.1, 2200);
      playTone(220, 0.3, 0.08, "sine", 440);
    },

    playEliminated: () => {
      if (!ready()) return;
      playTone(330, 0.18, 0.22, "square", 300);
      playTone(196, 0.5, 0.26, "sawtooth", 110, 0.16);
      playNoise(0.35, 0.12, 180, "lowpass", 0.8, 70);
    },

    playWinner: () => {
      if (!ready()) return;
      [523, 659, 784, 1047].forEach((f, i) => playTone(f, i === 3 ? 0.7 : 0.18, 0.22, "triangle", undefined, i * 0.12));
      playTone(1568, 0.6, 0.06, "sine", undefined, 0.36);
      playNoise(0.5, 0.06, 6000, "highpass", 0.7, undefined);
    },

    dispose: () => {
      void ctx?.close();
      ctx = null;
      master = null;
    },
  };
}
