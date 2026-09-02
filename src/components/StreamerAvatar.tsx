import { useState } from "react";
import { cn } from "@/lib/utils";

export default function StreamerAvatar({
  name,
  avatar,
  hue = 305,
  className,
}: {
  name: string;
  avatar?: string | null;
  hue?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(avatar) && !failed;

  if (showImage) {
    return (
      <img
        src={avatar!}
        alt={name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(
          "size-9 shrink-0 rounded-xl object-cover ring-1 ring-white/15 shadow-inner",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold uppercase text-white shadow-inner",
        className,
      )}
      style={{
        background: `linear-gradient(145deg, oklch(0.5 0.15 ${hue}), oklch(0.28 0.09 ${hue}))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px -6px oklch(0.5 0.2 ${hue} / 0.6)`,
      }}
    >
      {name.slice(0, 2)}
    </span>
  );
}
