/**
 * Kick chat embeds emotes as `[emote:ID:Name]`. YouTube custom emojis / stickers and
 * TikTok emotes are encoded as `[ytemote:<encodeURIComponent(url)>:Name]`.
 */
const EMOTE_RE = /\[emote:(\d+):([^\]]+)\]|\[ytemote:([^:\]]+):([^\]]*)\]/gi;

/** Only render emote images served from Google's or TikTok's image CDNs. */
const YT_IMAGE_HOST =
  /^(?:[\w-]+\.)*(?:ggpht\.com|googleusercontent\.com|ytimg\.com|tiktokcdn(?:-eu|-us)?\.com)$/i;

export type KickChatPart =
  { type: "text"; value: string } | { type: "emote"; id: string; name: string; url: string };

export function kickEmoteUrl(id: string) {
  return `https://files.kick.com/emotes/${id}/fullsize`;
}

export function youTubeEmoteToken(url: string, name: string) {
  const safeName = name.replace(/[:[\]]/g, "").trim() || "emoji";
  return `[ytemote:${encodeURIComponent(url)}:${safeName}]`;
}

function safeYouTubeUrl(encoded: string): string | null {
  try {
    const url = new URL(decodeURIComponent(encoded));
    return url.protocol === "https:" && YT_IMAGE_HOST.test(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Split raw chat content into plain text + emote image parts. */
export function parseKickChatContent(content: string): KickChatPart[] {
  if (!content) return [];
  const parts: KickChatPart[] = [];
  let last = 0;
  const re = new RegExp(EMOTE_RE.source, EMOTE_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: content.slice(last, match.index) });
    }
    if (match[1]) {
      const id = match[1];
      parts.push({ type: "emote", id, name: match[2]!, url: kickEmoteUrl(id) });
    } else {
      const name = match[4] || "emoji";
      const url = safeYouTubeUrl(match[3]!);
      parts.push(
        url ? { type: "emote", id: `yt-${name}`, name, url } : { type: "text", value: `:${name}:` },
      );
    }
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    parts.push({ type: "text", value: content.slice(last) });
  }
  return parts.length > 0 ? parts : [{ type: "text", value: content }];
}

/** Remove emote tokens — useful before guessing / moderation text checks. */
export function stripKickEmotes(content: string) {
  return content.replace(EMOTE_RE, " ").replace(/\s+/g, " ").trim();
}

export function hasKickEmotes(content: string) {
  return /\[emote:\d+:[^\]]+\]|\[ytemote:[^:\]]+:[^\]]*\]/i.test(content);
}
