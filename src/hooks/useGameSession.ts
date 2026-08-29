import { useCallback, useEffect, useRef, useState } from "react";

export const DURATION_OPTIONS = [
  { value: 30, label: "٣٠ ثانية" },
  { value: 60, label: "دقيقة" },
  { value: 90, label: "دقيقة ونص" },
  { value: 120, label: "دقيقتان" },
  { value: 180, label: "٣ دقائق" },
  { value: 300, label: "٥ دقائق" },
  { value: 0, label: "بدون حد" },
] as const;

/** Zombie FPS — longer rounds up to one hour. */
export const ZOMBIE_DURATION_OPTIONS = [
  { value: 180, label: "٣ دقائق" },
  { value: 300, label: "٥ دقائق" },
  { value: 600, label: "١٠ دقائق" },
  { value: 900, label: "١٥ دقيقة" },
  { value: 1200, label: "٢٠ دقيقة" },
  { value: 1500, label: "٢٥ دقيقة" },
  { value: 1800, label: "٣٠ دقيقة" },
  { value: 2400, label: "٤٠ دقيقة" },
  { value: 2700, label: "٤٥ دقيقة" },
  { value: 3000, label: "٥٠ دقيقة" },
  { value: 3300, label: "٥٥ دقيقة" },
  { value: 3600, label: "ساعة" },
  { value: 0, label: "بدون حد" },
] as const;

function normalizeUser(user: string) {
  return user.trim().toLowerCase();
}

/**
 * Shared start / stop / countdown session with one-action-per-user tracking.
 */
export function useGameSession(defaultDuration = 60) {
  const [running, setRunning] = useState(false);
  const [durationSec, setDurationSec] = useState(defaultDuration);
  const [left, setLeft] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const participants = useRef(new Set<string>());
  const onExpireRef = useRef<(() => void) | null>(null);

  const clearParticipants = useCallback(() => {
    participants.current = new Set();
    setParticipantCount(0);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setLeft(null);
  }, []);

  const start = useCallback(
    (overrideDuration?: number) => {
      clearParticipants();
      const d = overrideDuration ?? durationSec;
      if (overrideDuration != null) setDurationSec(overrideDuration);
      setRunning(true);
      setLeft(d > 0 ? d : null);
    },
    [clearParticipants, durationSec],
  );

  /** Returns true only the first time this user acts in the current session. */
  const tryClaim = useCallback((user: string) => {
    const key = normalizeUser(user);
    if (!key || participants.current.has(key)) return false;
    participants.current.add(key);
    setParticipantCount(participants.current.size);
    return true;
  }, []);

  const hasParticipated = useCallback((user: string) => {
    return participants.current.has(normalizeUser(user));
  }, []);

  useEffect(() => {
    if (!running || left === null) return;
    if (left <= 0) {
      setRunning(false);
      setLeft(null);
      onExpireRef.current?.();
      return;
    }
    const id = window.setTimeout(() => setLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [running, left]);

  const setOnExpire = useCallback((fn: (() => void) | null) => {
    onExpireRef.current = fn;
  }, []);

  return {
    running,
    durationSec,
    setDurationSec,
    left,
    participantCount,
    start,
    stop,
    tryClaim,
    hasParticipated,
    clearParticipants,
    setOnExpire,
  };
}

export function formatClock(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
