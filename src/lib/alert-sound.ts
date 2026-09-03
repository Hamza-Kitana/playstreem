const MUTE_KEY = "al-daboor-alert-mute";
const CHAT_TONE_MUTE_KEY = "al-daboor-chat-tone-mute";

let audioCtx: AudioContext | null = null;
let lastChatToneAt = 0;

export function isAlertMuted() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAlertMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Chat pop sound — separate from moderation alert mute. Default: on. */
export function isChatToneMuted() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CHAT_TONE_MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setChatToneMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_TONE_MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

/** Short warning tone for moderation alerts. */
export function playWarningTone() {
  if (isAlertMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  void ctx.resume().then(() => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  });
}

/**
 * Soft glassy “message arrived” chime — airy + pleasant, unlike the harsh alert.
 * Rate-limited so busy chat stays listenable.
 */
export function playChatTone(opts?: { gift?: boolean }) {
  if (isChatToneMuted()) return;
  const nowMs = Date.now();
  if (nowMs - lastChatToneAt < 90) return;
  lastChatToneAt = nowMs;

  const ctx = getCtx();
  if (!ctx) return;

  void ctx.resume().then(() => {
    const now = ctx.currentTime;
    const gift = Boolean(opts?.gift);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(gift ? 0.16 : 0.11, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + (gift ? 0.42 : 0.28));
    master.connect(ctx.destination);

    // Soft high glassy ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = "sine";
    ping.frequency.setValueAtTime(gift ? 988 : 740, now);
    ping.frequency.exponentialRampToValueAtTime(gift ? 1318 : 990, now + 0.08);
    pingGain.gain.setValueAtTime(0.0001, now);
    pingGain.gain.exponentialRampToValueAtTime(0.9, now + 0.01);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    ping.connect(pingGain);
    pingGain.connect(master);
    ping.start(now);
    ping.stop(now + 0.24);

    // Warm body note under it
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = "triangle";
    body.frequency.setValueAtTime(gift ? 392 : 330, now);
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.55, now + 0.02);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + (gift ? 0.38 : 0.26));
    body.connect(bodyGain);
    bodyGain.connect(master);
    body.start(now);
    body.stop(now + (gift ? 0.4 : 0.28));

    // Tiny sparkle harmonic
    const sparkle = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime(gift ? 1568 : 1175, now + 0.04);
    sparkleGain.gain.setValueAtTime(0.0001, now + 0.04);
    sparkleGain.gain.exponentialRampToValueAtTime(0.35, now + 0.055);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    sparkle.connect(sparkleGain);
    sparkleGain.connect(master);
    sparkle.start(now + 0.04);
    sparkle.stop(now + 0.2);
  });
}
