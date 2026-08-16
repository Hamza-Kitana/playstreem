import { Link } from "@tanstack/react-router";
import { BadgeCheck, ExternalLink, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VerifiedStreamer = {
  slug: string;
  name: string;
  note: string;
  tag?: string;
  hue?: number;
};

type Props = {
  streamer: VerifiedStreamer;
  /** Hover / focus enlarges the card for a bigger watch. */
  expanded: boolean;
  onHoverChange: (slug: string | null) => void;
  /** Kick live status — null while loading. */
  isLive: boolean | null;
};

export default function StreamerCard({ streamer, expanded, onHoverChange, isLive }: Props) {
  const { slug, name, note, tag = "موثّق Al-Daboor", hue = 155 } = streamer;
  const playerSrc = `https://player.kick.com/${encodeURIComponent(slug)}?autoplay=true&muted=true`;

  return (
    <article
      data-active={expanded ? "true" : "false"}
      tabIndex={0}
      className={cn(
        "streamer-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border outline-none",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out",
        "focus-visible:ring-2 focus-visible:ring-primary/60",
        expanded
          ? "-translate-y-1.5 z-10 border-primary/55 shadow-[0_16px_40px_-24px_oklch(0_0_0_/_0.8)]"
          : "z-0 border-white/10 hover:border-primary/35",
      )}
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, oklch(0.35 0.08 ${hue} / 0.35), transparent 55%),
          linear-gradient(165deg, oklch(0.2 0.03 ${hue} / 0.9), oklch(0.14 0.02 160 / 0.96) 55%, oklch(0.11 0.02 200 / 1))`,
      }}
      onMouseEnter={() => onHoverChange(slug)}
      onMouseLeave={() => onHoverChange(null)}
      onFocus={() => onHoverChange(slug)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onHoverChange(null);
        }
      }}
    >
      <span className="streamer-shine" aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-500"
          style={{
            background: `oklch(0.75 0.18 ${hue} / ${expanded ? 0.4 : 0.18})`,
          }}
        />
      </div>

      {/* Always-on muted Kick player */}
      <div className="relative aspect-video overflow-hidden bg-black">
        <iframe
          title={`بث ${name}`}
          src={playerSrc}
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          tabIndex={-1}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/75 to-transparent" />

        {/* LIVE / OFFLINE */}
        <div className="pointer-events-none absolute top-4 right-4 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide backdrop-blur-md",
              isLive === true && "bg-destructive text-white shadow-[0_0_20px_-4px_oklch(0.65_0.22_25)]",
              isLive === false && "bg-black/60 text-white/75 ring-1 ring-white/15",
              isLive == null && "bg-black/50 text-white/60 ring-1 ring-white/10",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isLive === true && "animate-live-dot bg-white",
                isLive === false && "bg-white/45",
                isLive == null && "animate-pulse bg-white/50",
              )}
            />
            {isLive === true ? "LIVE" : isLive === false ? "OFFLINE" : "…"}
          </span>
        </div>

        <div className="pointer-events-none absolute top-4 left-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/95 px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground shadow-[0_0_24px_-4px_var(--neon)]">
            <BadgeCheck className="size-3.5" />
            موثّق
          </span>
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col p-5 transition-opacity duration-300 sm:p-6",
          expanded && "sm:opacity-95",
        )}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">{tag}</p>
          <h3 className="mt-1 truncate font-brand text-2xl font-bold tracking-tight sm:text-[1.7rem]">
            {name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
            kick.com/{slug}
          </p>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-7 text-muted-foreground">{note}</p>

        <div
          className="mt-auto flex gap-2 pt-5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Button
            asChild
            variant="outline"
            className="h-11 flex-1 rounded-2xl border-white/15 bg-black/25 font-bold backdrop-blur-sm hover:bg-black/40"
          >
            <a href={`https://kick.com/${slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              القناة
            </a>
          </Button>
          <Button asChild className="h-11 flex-1 rounded-2xl font-extrabold shadow-[0_0_28px_-8px_var(--neon)]">
            <Link to="/connect" search={{ channel: slug }}>
              <PlugZap className="size-3.5" />
              ربط سريع
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
