import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

export type VerifiedStreamer = {
  slug: string;
  name: string;
  note: string;
};

type Props = {
  streamer: VerifiedStreamer;
  /** When true, this card is the one currently hovered/playing. */
  active: boolean;
  onHoverChange: (slug: string | null) => void;
};

export default function StreamerCard({ streamer, active, onHoverChange }: Props) {
  const { slug, name, note } = streamer;
  const playerSrc = `https://player.kick.com/${encodeURIComponent(slug)}?autoplay=true&muted=true`;

  return (
    <article
      className="glass panel-shine group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl"
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
      <div className="relative aspect-video w-full overflow-hidden bg-secondary/50">
        {active ? (
          <iframe
            key={slug}
            title={`بث ${name}`}
            src={playerSrc}
            className="pointer-events-none absolute inset-0 h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="eager"
            tabIndex={-1}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 via-background/40 to-secondary/60">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Radio className="size-7" />
            </span>
            <p className="text-xs font-bold text-muted-foreground">مرّر أو اضغط لتشغيل البث</p>
          </div>
        )}

        <div
          className={`pointer-events-none absolute top-3 right-3 rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
            active ? "bg-destructive text-white" : "bg-black/55 text-white/90"
          }`}
        >
          {active ? "● LIVE" : "Kick"}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-extrabold">{name}</h3>
          <BadgeCheck className="size-5 text-primary" aria-label="موثّق" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
          kick.com/{slug}
        </p>
        <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{note}</p>

        <div className="mt-5 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button asChild variant="outline" className="flex-1 font-bold">
            <a href={`https://kick.com/${slug}`} target="_blank" rel="noreferrer">
              زيارة القناة
            </a>
          </Button>
          <Button asChild className="flex-1 font-extrabold">
            <Link to="/connect" search={{ channel: slug }}>
              ربط سريع
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
