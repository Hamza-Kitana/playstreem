import { Link } from "@tanstack/react-router";
import { BadgeCheck, ExternalLink, PlugZap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VerifiedStreamer = {
  slug: string;
  name: string;
  note: string;
  /** Short tag under the name */
  tag?: string;
  /** Accent hue in brand-safe green/teal range */
  hue?: number;
};

type Props = {
  streamer: VerifiedStreamer;
  active: boolean;
  onHoverChange: (slug: string | null) => void;
  /** Larger featured treatment */
  featured?: boolean;
};

function initials(name: string) {
  const parts = name.replace(/[-_]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function StreamerCard({ streamer, active, onHoverChange, featured }: Props) {
  const { slug, name, note, tag = "موثّق Al-Daboor", hue = 155 } = streamer;
  const playerSrc = `https://player.kick.com/${encodeURIComponent(slug)}?autoplay=true&muted=true`;

  return (
    <article
      data-active={active ? "true" : "false"}
      tabIndex={0}
      className={cn(
        "streamer-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "z-10 border-primary/70 shadow-[0_0_0_1px_color-mix(in_oklab,var(--neon)_45%,transparent),0_28px_80px_-24px_color-mix(in_oklab,var(--neon)_55%,transparent)]"
          : "border-white/10 bg-secondary/20 hover:-translate-y-2 hover:border-primary/45 hover:shadow-[0_24px_70px_-28px_color-mix(in_oklab,var(--neon)_45%,transparent)]",
        featured && "lg:min-h-[34rem]",
      )}
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, oklch(0.35 0.08 ${hue} / 0.35), transparent 55%),
          linear-gradient(165deg, oklch(0.2 0.03 ${hue} / 0.9), oklch(0.14 0.02 160 / 0.96) 55%, oklch(0.11 0.02 200 / 1))`,
      }}
      onMouseEnter={() => onHoverChange(slug)}
      onMouseLeave={() => onHoverChange(null)}
      onClick={() => onHoverChange(active ? null : slug)}
      onFocus={() => onHoverChange(slug)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onHoverChange(null);
        }
      }}
    >
      <span className="streamer-shine" aria-hidden />

      {/* Orbits / atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-500"
          style={{
            background: `oklch(0.75 0.18 ${hue} / ${active ? 0.35 : 0.18})`,
          }}
        />
        <div
          className={cn(
            "absolute top-1/2 left-1/2 size-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed opacity-20",
            active && "animate-orbit border-primary/40 opacity-40",
          )}
          style={{ borderColor: `oklch(0.8 0.15 ${hue} / 0.35)` }}
        />
      </div>

      {/* Media plane */}
      <div
        className={cn(
          "relative overflow-hidden",
          featured ? "aspect-[16/11] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[22rem] lg:flex-1" : "aspect-[16/11]",
        )}
      >
        {active ? (
          <iframe
            key={slug}
            title={`بث ${name}`}
            src={playerSrc}
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.02] border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="eager"
            tabIndex={-1}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="relative grid size-28 place-items-center rounded-[2rem] sm:size-32"
              style={{
                background: `linear-gradient(145deg, oklch(0.55 0.16 ${hue} / 0.45), oklch(0.25 0.06 ${hue} / 0.3))`,
                boxShadow: `0 0 60px -10px oklch(0.7 0.18 ${hue} / 0.55)`,
              }}
            >
              <span className="font-brand text-4xl font-bold tracking-tight text-white/95 sm:text-5xl">
                {initials(name)}
              </span>
              <span className="absolute -inset-3 rounded-[2.35rem] border border-primary/25" />
              <span className="absolute -inset-6 rounded-[2.7rem] border border-dashed border-primary/15" />
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs font-bold tracking-wide text-white/70">
              <Sparkles className="size-3.5 text-primary" />
              مرّر للمشاهدة الحية
            </p>
          </div>
        )}

        {/* Scrim */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

        {/* Badges */}
        <div className="pointer-events-none absolute top-4 right-4 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide backdrop-blur-md",
              active ? "bg-destructive text-white" : "bg-black/50 text-white/90 ring-1 ring-white/15",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full bg-current",
                active && "animate-live-dot bg-white",
              )}
            />
            {active ? "LIVE" : "KICK"}
          </span>
        </div>

        <div className="pointer-events-none absolute top-4 left-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/95 px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground shadow-[0_0_24px_-4px_var(--neon)]">
            <BadgeCheck className="size-3.5" />
            موثّق
          </span>
        </div>
      </div>

      {/* Identity + actions */}
      <div className="relative z-10 flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">{tag}</p>
            <h3 className="mt-1 truncate font-brand text-2xl font-bold tracking-tight sm:text-[1.7rem]">
              {name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
              kick.com/{slug}
            </p>
          </div>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-7 text-muted-foreground">{note}</p>

        <div
          className="mt-auto flex gap-2 pt-6"
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
