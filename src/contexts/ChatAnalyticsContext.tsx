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
import {
  analyticsChannelKey,
  emptyChatAnalytics,
  loadChatAnalytics,
  saveChatAnalytics,
  type ChatterStat,
  type ProfanityAlert,
  type SupporterStat,
  type WinStat,
} from "@/lib/chat-analytics-store";
import { stripKickEmotes } from "@/lib/kick-emotes";
import { detectProfanity } from "@/lib/profanity";
import { GAME_WIN_EVENT, type GameWinDetail } from "@/lib/record-game-win";

export type { ChatterStat, ProfanityAlert, SupporterStat, WinStat };

type ChatAnalyticsValue = {
  topChatters: ChatterStat[];
  topSupporters: SupporterStat[];
  wins: WinStat[];
  profanityLog: ProfanityAlert[];
  activeProfanity: ProfanityAlert | null;
  dismissProfanity: () => void;
  totalMessages: number;
  totalKicks: number;
  uniqueChatters: number;
  flaggedMessageKeys: Set<number>;
};

const ChatAnalyticsContext = createContext<ChatAnalyticsValue | null>(null);

let winCounter = 0;
let alertCounter = 0;

export function ChatAnalyticsProvider({ children }: { children: ReactNode }) {
  const { messages, channel } = useKickChatContext();
  const channelSlug = analyticsChannelKey(channel);
  const channelSlugRef = useRef<string | null>(channelSlug);

  const [chatters, setChatters] = useState<Record<string, ChatterStat>>({});
  const [supporters, setSupporters] = useState<Record<string, SupporterStat>>({});
  const [wins, setWins] = useState<WinStat[]>([]);
  const [profanityLog, setProfanityLog] = useState<ProfanityAlert[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalKicks, setTotalKicks] = useState(0);
  const [activeProfanity, setActiveProfanity] = useState<ProfanityAlert | null>(null);
  const [flaggedKeys, setFlaggedKeys] = useState<Set<number>>(() => new Set());
  const cursor = useRef(0);
  const hydrated = useRef(false);

  // Load / switch persisted analytics per Kick channel.
  useEffect(() => {
    const prev = channelSlugRef.current;
    if (prev && prev !== channelSlug && hydrated.current) {
      saveChatAnalytics(prev, {
        chatters,
        supporters,
        wins,
        profanityLog,
        totalMessages,
        totalKicks,
        winCounter,
        alertCounter,
      });
    }

    channelSlugRef.current = channelSlug;
    setActiveProfanity(null);
    setFlaggedKeys(new Set());
    // Skip replaying buffered messages from another channel / reconnect.
    cursor.current = messages.length ? messages[messages.length - 1]!.key : 0;

    if (!channelSlug) {
      const empty = emptyChatAnalytics();
      setChatters(empty.chatters);
      setSupporters(empty.supporters);
      setWins(empty.wins);
      setProfanityLog(empty.profanityLog);
      setTotalMessages(0);
      setTotalKicks(0);
      winCounter = 0;
      alertCounter = 0;
      hydrated.current = false;
      return;
    }

    const stored = loadChatAnalytics(channelSlug);
    setChatters(stored.chatters);
    setSupporters(stored.supporters);
    setWins(stored.wins);
    setProfanityLog(stored.profanityLog);
    setTotalMessages(stored.totalMessages);
    setTotalKicks(stored.totalKicks);
    winCounter = stored.winCounter;
    alertCounter = stored.alertCounter;
    hydrated.current = true;
    // Only react to channel changes — not every stats mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelSlug]);

  // Persist after updates for the active channel.
  useEffect(() => {
    if (!channelSlug || !hydrated.current) return;
    saveChatAnalytics(channelSlug, {
      chatters,
      supporters,
      wins,
      profanityLog,
      totalMessages,
      totalKicks,
      winCounter,
      alertCounter,
    });
  }, [channelSlug, chatters, supporters, wins, profanityLog, totalMessages, totalKicks]);

  const ingestMessage = useCallback((m: ChatMessage) => {
    if (m.kind === "gift") {
      const amount = Math.max(0, Math.round(m.giftAmount ?? 0));
      if (amount <= 0) return;
      const key = participantKey(m) || m.user.toLowerCase();
      if (!key) return;

      setTotalKicks((n) => n + amount);
      setSupporters((prev) => {
        const existing = prev[key];
        return {
          ...prev,
          [key]: {
            user: m.user,
            userKey: key,
            color: m.color,
            kicks: (existing?.kicks ?? 0) + amount,
            gifts: (existing?.gifts ?? 0) + 1,
            lastAt: m.at,
            lastAmount: amount,
          },
        };
      });
      return;
    }

    setTotalMessages((n) => n + 1);

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

    const hit = detectProfanity(stripKickEmotes(m.text));
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

    setProfanityLog((prev) => [...prev.slice(-79), alert]);
    setActiveProfanity(alert);
    setFlaggedKeys((prev) => new Set(prev).add(m.key));
    playWarningTone();
  }, []);

  useEffect(() => {
    if (!channelSlug || !hydrated.current) return;
    const fresh = messages.filter((m) => m.key > cursor.current);
    if (fresh.length === 0) return;
    cursor.current = fresh.at(-1)!.key;
    for (const m of fresh) ingestMessage(m);
  }, [messages, ingestMessage, channelSlug]);

  useEffect(() => {
    const onWin = (ev: Event) => {
      const detail = (ev as CustomEvent<GameWinDetail>).detail;
      if (!detail?.user) return;
      if (!channelSlugRef.current) return;
      winCounter += 1;
      const entry: WinStat = {
        id: `win-${winCounter}`,
        user: detail.user,
        userKey: detail.userKey?.toLowerCase() ?? detail.user.toLowerCase(),
        color: detail.color,
        game: detail.game,
        at: Date.now(),
      };
      setWins((prev) => [...prev.slice(-59), entry]);
    };
    window.addEventListener(GAME_WIN_EVENT, onWin);
    return () => window.removeEventListener(GAME_WIN_EVENT, onWin);
  }, []);

  const dismissProfanity = useCallback(() => setActiveProfanity(null), []);

  const topChatters = useMemo(
    () => Object.values(chatters).sort((a, b) => b.count - a.count),
    [chatters],
  );

  const topSupporters = useMemo(
    () => Object.values(supporters).sort((a, b) => b.kicks - a.kicks || b.lastAt - a.lastAt),
    [supporters],
  );

  const value = useMemo<ChatAnalyticsValue>(
    () => ({
      topChatters,
      topSupporters,
      wins,
      profanityLog,
      activeProfanity,
      dismissProfanity,
      totalMessages,
      totalKicks,
      uniqueChatters: topChatters.length,
      flaggedMessageKeys: flaggedKeys,
    }),
    [
      topChatters,
      topSupporters,
      wins,
      profanityLog,
      activeProfanity,
      dismissProfanity,
      totalMessages,
      totalKicks,
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
