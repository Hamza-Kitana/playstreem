import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { participantKey, type ChatMessage } from "@/hooks/useKickChat";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { playWarningTone } from "@/lib/alert-sound";
import { detectProfanity } from "@/lib/profanity";
import { GAME_WIN_EVENT, type GameWinDetail } from "@/lib/record-game-win";

export type ChatterStat = {
  user: string;
  userKey: string;
  color: string;
  count: number;
};

export type WinStat = {
  id: string;
  user: string;
  userKey: string;
  color: string;
  game: string;
  at: number;
};

export type ProfanityAlert = {
  id: string;
  user: string;
  color: string;
  text: string;
  term: string;
  at: number;
};

type ChatAnalyticsValue = {
  topChatters: ChatterStat[];
  wins: WinStat[];
  profanityLog: ProfanityAlert[];
  activeProfanity: ProfanityAlert | null;
  dismissProfanity: () => void;
  totalMessages: number;
  uniqueChatters: number;
  flaggedMessageKeys: Set<number>;
};

const ChatAnalyticsContext = createContext<ChatAnalyticsValue | null>(null);

let winCounter = 0;
let alertCounter = 0;

export function ChatAnalyticsProvider({ children }: { children: ReactNode }) {
  const { messages } = useKickChatContext();
  const [chatters, setChatters] = useState<Record<string, ChatterStat>>({});
  const [wins, setWins] = useState<WinStat[]>([]);
  const [profanityLog, setProfanityLog] = useState<ProfanityAlert[]>([]);
  const [activeProfanity, setActiveProfanity] = useState<ProfanityAlert | null>(null);
  const [flaggedKeys, setFlaggedKeys] = useState<Set<number>>(() => new Set());
  const cursor = useRef(0);

  const ingestMessage = useCallback((m: ChatMessage) => {
    if (m.kind === "gift") return;

    const key = participantKey(m) || m.user.toLowerCase();
    if (key) {
      setChatters((prev) => {
        const existing = prev[key];
        return {
          ...prev,
          [key]: {
            user: m.user,
            userKey: key,
            color: m.color,
            count: (existing?.count ?? 0) + 1,
          },
        };
      });
    }

    const hit = detectProfanity(m.text);
    if (!hit) return;

    alertCounter += 1;
    const alert: ProfanityAlert = {
      id: `prof-${alertCounter}`,
      user: m.user,
      color: m.color,
      text: m.text,
      term: hit.term,
      at: m.at,
    };

    setProfanityLog((prev) => [...prev.slice(-40), alert]);
    setActiveProfanity(alert);
    setFlaggedKeys((prev) => new Set(prev).add(m.key));
    playWarningTone();
  }, []);

  useEffect(() => {
    const fresh = messages.filter((m) => m.key > cursor.current);
    if (fresh.length === 0) return;
    cursor.current = fresh.at(-1)!.key;
    for (const m of fresh) ingestMessage(m);
  }, [messages, ingestMessage]);

  useEffect(() => {
    const onWin = (ev: Event) => {
      const detail = (ev as CustomEvent<GameWinDetail>).detail;
      if (!detail?.user) return;
      winCounter += 1;
      const entry: WinStat = {
        id: `win-${winCounter}`,
        user: detail.user,
        userKey: detail.userKey?.toLowerCase() ?? detail.user.toLowerCase(),
        color: detail.color,
        game: detail.game,
        at: Date.now(),
      };
      setWins((prev) => [...prev.slice(-60), entry]);
    };
    window.addEventListener(GAME_WIN_EVENT, onWin);
    return () => window.removeEventListener(GAME_WIN_EVENT, onWin);
  }, []);

  const dismissProfanity = useCallback(() => setActiveProfanity(null), []);

  const topChatters = useMemo(
    () => Object.values(chatters).sort((a, b) => b.count - a.count),
    [chatters],
  );

  const value = useMemo<ChatAnalyticsValue>(
    () => ({
      topChatters,
      wins,
      profanityLog,
      activeProfanity,
      dismissProfanity,
      totalMessages: messages.filter((m) => m.kind !== "gift").length,
      uniqueChatters: topChatters.length,
      flaggedMessageKeys: flaggedKeys,
    }),
    [
      topChatters,
      wins,
      profanityLog,
      activeProfanity,
      dismissProfanity,
      messages,
      flaggedKeys,
    ],
  );

  return <ChatAnalyticsContext.Provider value={value}>{children}</ChatAnalyticsContext.Provider>;
}

export function useChatAnalytics() {
  const value = useContext(ChatAnalyticsContext);
  if (!value) {
    throw new Error("useChatAnalytics must be used within ChatAnalyticsProvider");
  }
  return value;
}
