import { useEffect, useRef } from "react";
import type { ChatMessage } from "./useKickChat";
import { stripKickEmotes } from "@/lib/kick-emotes";

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

/** Converts Arabic-Indic digits to latin and strips tatweel/all diacritics (harakat). */
export function normalizeAr(input: string) {
  return stripKickEmotes(input)
    .normalize("NFKC")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    // Tatweel + every Arabic haraka / tashkeel (fatha, damma, kasra, shadda, sukun, tanween…)
    // plus any other Unicode combining marks that chat may insert.
    .replace(/[\u0640\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g, "")
    .replace(/\p{M}/gu, "")
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
