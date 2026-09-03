/** Kick chat embeds emotes as `[emote:ID:Name]` in message content. */
const EMOTE_RE = /\[emote:(\d+):([^\]]+)\]/gi;

export type KickChatPart =
  | { type: "text"; value: string }
  | { type: "emote"; id: string; name: string; url: string };

export function kickEmoteUrl(id: string) {
  return `https://files.kick.com/emotes/${id}/fullsize`;
}

/** Split raw Kick chat content into plain text + emote image parts. */
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
    const id = match[1]!;
    const name = match[2]!;
    parts.push({ type: "emote", id, name, url: kickEmoteUrl(id) });
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
  return /\[emote:\d+:[^\]]+\]/i.test(content);
}
