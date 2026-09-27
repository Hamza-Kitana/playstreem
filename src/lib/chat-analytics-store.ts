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

export type SupporterStat = {
  user: string;
  userKey: string;
  color: string;
  /** Total Kick amount gifted. */
  kicks: number;
  /** How many gift events. */
  gifts: number;
  lastAt: number;
  lastAmount: number;
  /** YouTube Super Chat / Sticker totals keyed by currency symbol or code. */
  superChats?: Record<string, number>;
  /** YouTube memberships joined / renewed. */
  memberships?: number;
  /** YouTube memberships gifted to others. */
  giftedMembers?: number;
  /** TikTok gifts received, counting repeats (Rose ×5 = 5). */
  tiktokGifts?: number;
  /** Total TikTok diamond value received. */
  tiktokDiamonds?: number;
  /** Display label for the last non-Kick support, e.g. "$5.00". */
  lastLabel?: string;
};

/** Splits a YouTube amount like "$5.00", "SAR 20.00" or "2,50 €" into currency + value. */
export function parseSupportAmount(label: string): { currency: string; value: number } | null {
  const numMatch = label.match(/\d[\d.,\s\u00a0]*/);
  if (!numMatch) return null;
  let digits = numMatch[0].replace(/[\s\u00a0]/g, "");
  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  if (lastComma > lastDot && /,\d{1,2}$/.test(digits)) {
    digits = digits.replace(/\./g, "").replace(",", ".");
  } else {
    digits = digits.replace(/,/g, "");
  }
  const value = Number.parseFloat(digits);
  const currency = label.replace(numMatch[0], "").trim() || "$";
  if (!Number.isFinite(value) || value <= 0) return null;
  return { currency, value };
}

export function formatSupportAmount(currency: string, value: number, locale: string) {
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  return /^[A-Z]{2,4}$/.test(currency) ? `${currency} ${n}` : `${currency}${n}`;
}

const STORAGE_PREFIX = "al-daboor-chat-analytics-v1:";

export type StoredChatAnalytics = {
  chatters: Record<string, ChatterStat>;
  supporters: Record<string, SupporterStat>;
  wins: WinStat[];
  profanityLog: ProfanityAlert[];
  totalMessages: number;
  totalKicks: number;
  /** YouTube Super Chat totals keyed by currency. */
  superChatTotals: Record<string, number>;
  winCounter: number;
  alertCounter: number;
};

export function emptyChatAnalytics(): StoredChatAnalytics {
  return {
    chatters: {},
    supporters: {},
    wins: [],
    profanityLog: [],
    totalMessages: 0,
    totalKicks: 0,
    superChatTotals: {},
    winCounter: 0,
    alertCounter: 0,
  };
}

/** Normalize Kick label (`kick.com/foo` or `foo`) to a storage slug. */
export function analyticsChannelKey(channel: string | null | undefined): string | null {
  if (!channel) return null;
  const yt = channel.match(
    /youtu(?:\.be|be\.com)\/(?:(?:channel|c|user)\/)?@?([\w.-]{2,80})/i,
  )?.[1];
  if (yt) return `yt-${yt.toLowerCase()}`;
  const tt = channel.match(/tiktok\.com\/@([\w.-]{2,60})/i)?.[1];
  if (tt) return `tt-${tt.toLowerCase()}`;
  const slug = channel
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^kick\.com\//i, "")
    .split(/[/?#]/)[0]
    ?.toLowerCase();
  if (!slug || !/^[a-z0-9_-]{2,60}$/i.test(slug)) return null;
  return slug;
}

function isChatterStat(v: unknown): v is ChatterStat {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.user === "string" &&
    typeof o.userKey === "string" &&
    typeof o.color === "string" &&
    typeof o.count === "number" &&
    Number.isFinite(o.count)
  );
}

function isSupporterStat(v: unknown): v is SupporterStat {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.user === "string" &&
    typeof o.userKey === "string" &&
    typeof o.color === "string" &&
    typeof o.kicks === "number" &&
    Number.isFinite(o.kicks) &&
    typeof o.gifts === "number" &&
    Number.isFinite(o.gifts) &&
    typeof o.lastAt === "number" &&
    typeof o.lastAmount === "number"
  );
}

function isWinStat(v: unknown): v is WinStat {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.user === "string" &&
    typeof o.userKey === "string" &&
    typeof o.color === "string" &&
    typeof o.game === "string" &&
    typeof o.at === "number"
  );
}

function isProfanityAlert(v: unknown): v is ProfanityAlert {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.user === "string" &&
    typeof o.color === "string" &&
    typeof o.text === "string" &&
    typeof o.term === "string" &&
    typeof o.at === "number"
  );
}

function readAmountMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value || typeof value !== "object") return out;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0 && k.length <= 8) out[k] = v;
  }
  return out;
}

export function loadChatAnalytics(channelSlug: string): StoredChatAnalytics {
  if (typeof window === "undefined") return emptyChatAnalytics();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + channelSlug);
    if (!raw) return emptyChatAnalytics();
    const parsed = JSON.parse(raw) as Partial<StoredChatAnalytics>;
    const chatters: Record<string, ChatterStat> = {};
    if (parsed.chatters && typeof parsed.chatters === "object") {
      for (const [k, v] of Object.entries(parsed.chatters)) {
        if (isChatterStat(v)) chatters[k] = v;
      }
    }
    const supporters: Record<string, SupporterStat> = {};
    if (parsed.supporters && typeof parsed.supporters === "object") {
      for (const [k, v] of Object.entries(parsed.supporters)) {
        if (isSupporterStat(v)) supporters[k] = v;
      }
    }
    return {
      chatters,
      supporters,
      wins: Array.isArray(parsed.wins) ? parsed.wins.filter(isWinStat).slice(-60) : [],
      profanityLog: Array.isArray(parsed.profanityLog)
        ? parsed.profanityLog.filter(isProfanityAlert).slice(-80)
        : [],
      totalMessages:
        typeof parsed.totalMessages === "number" && Number.isFinite(parsed.totalMessages)
          ? Math.max(0, Math.floor(parsed.totalMessages))
          : 0,
      totalKicks:
        typeof parsed.totalKicks === "number" && Number.isFinite(parsed.totalKicks)
          ? Math.max(0, Math.floor(parsed.totalKicks))
          : Object.values(supporters).reduce((s, x) => s + x.kicks, 0),
      superChatTotals: readAmountMap(parsed.superChatTotals),
      winCounter:
        typeof parsed.winCounter === "number" && Number.isFinite(parsed.winCounter)
          ? Math.max(0, Math.floor(parsed.winCounter))
          : 0,
      alertCounter:
        typeof parsed.alertCounter === "number" && Number.isFinite(parsed.alertCounter)
          ? Math.max(0, Math.floor(parsed.alertCounter))
          : 0,
    };
  } catch {
    return emptyChatAnalytics();
  }
}

export function saveChatAnalytics(channelSlug: string, data: StoredChatAnalytics) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_PREFIX + channelSlug,
      JSON.stringify({
        chatters: data.chatters,
        supporters: data.supporters,
        wins: data.wins.slice(-60),
        profanityLog: data.profanityLog.slice(-80),
        totalMessages: data.totalMessages,
        totalKicks: data.totalKicks,
        superChatTotals: data.superChatTotals,
        winCounter: data.winCounter,
        alertCounter: data.alertCounter,
      } satisfies StoredChatAnalytics),
    );
  } catch {
    /* ignore quota */
  }
}
