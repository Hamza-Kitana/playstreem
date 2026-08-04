import { useEffect, useRef } from "react";
import type { ChatMessage } from "./useKickChat";

/**
 * Calls `handler` for every chat message received after the hook became active.
 * Existing history is skipped so games never react to old messages.
 */
export function useNewMessages(
  messages: ChatMessage[],
  active: boolean,
  handler: (m: ChatMessage) => void,
) {
  const cursor = useRef<number>(0);
  const cb = useRef(handler);
  cb.current = handler;

  useEffect(() => {
    if (active) cursor.current = messages.at(-1)?.key ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const fresh = messages.filter((m) => m.key > cursor.current);
    if (fresh.length === 0) return;
    cursor.current = fresh.at(-1)!.key;
    for (const m of fresh) cb.current(m);
  }, [messages, active]);
}

/** Converts Arabic-Indic digits to latin and strips tatweel/diacritics. */
export function normalizeAr(input: string) {
  return input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0640\u064b-\u0652]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
