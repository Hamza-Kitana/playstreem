import { useState } from "react";
import { parseKickChatContent } from "@/lib/kick-emotes";
import { cn } from "@/lib/utils";

function EmoteImg({
  id,
  name,
  url,
  className,
  size = "md",
}: {
  id: string;
  name: string;
  url: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="mx-1 inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 text-[0.75em] font-bold text-white/65">
        :{name}:
      </span>
    );
  }

  const sizeCls =
    size === "lg"
      ? "h-10 w-10 sm:h-12 sm:w-12"
      : size === "sm"
        ? "h-5 w-5"
        : "h-7 w-7 sm:h-8 sm:w-8";

  return (
    <img
      src={url}
      alt={name}
      title={name}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      data-emote-id={id}
      className={cn(
        "mx-0.5 inline-block align-middle object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-110",
        sizeCls,
        className,
      )}
      onError={() => setFailed(true)}
    />
  );
}

export default function ChatEmoteText({
  text,
  className,
  emoteClassName,
  size = "md",
}: {
  text: string;
  className?: string;
  emoteClassName?: string;
  size?: "sm" | "md" | "lg";
}) {
  const parts = parseKickChatContent(text);

  return (
    <span className={cn("inline break-words whitespace-pre-wrap leading-relaxed", className)}>
      {parts.map((part, i) =>
        part.type === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <EmoteImg
            key={`${part.id}-${i}`}
            id={part.id}
            name={part.name}
            url={part.url}
            size={size}
            className={emoteClassName}
          />
        ),
      )}
    </span>
  );
}
