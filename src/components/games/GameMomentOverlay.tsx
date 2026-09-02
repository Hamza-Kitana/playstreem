import { Clock, Crown, PartyPopper, Skull, Square, Trophy } from "lucide-react";
import { useT } from "@/contexts/LocaleContext";
import type { GameMoment, GameMomentKind } from "@/lib/game-moments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  moment: GameMoment;
  accent: string;
  glow: string;
  onDismiss: () => void;
};

const ICONS: Record<GameMomentKind, typeof Trophy> = {
  timeout: Clock,
  win: Crown,
  lose: Skull,
  stopped: Square,
  success: PartyPopper,
};

const RING: Record<GameMomentKind, string> = {
  timeout: "from-amber-400/30 to-amber-600/10",
  win: "from-emerald-400/35 to-emerald-600/10",
  lose: "from-rose-400/30 to-rose-600/10",
  stopped: "from-white/20 to-white/5",
  success: "from-violet-400/35 to-violet-600/10",
};

export default function GameMomentOverlay({ moment, accent, glow, onDismiss }: Props) {
  const { messages } = useT();
  const Icon = ICONS[moment.kind];

  const handlePrimary = () => {
    moment.onAction?.();
    onDismiss();
  };

  const handleSecondary = () => {
    moment.onSecondary?.();
    onDismiss();
  };

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-moment-title"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(60% 55% at 50% 45%, ${accent}28, transparent 70%)`,
        }}
      />

      <div
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border p-6 text-center sm:p-8",
          "animate-[stage-in_0.55s_cubic-bezier(0.16,1,0.3,1)_both]",
        )}
        style={{
          borderColor: `${accent}55`,
          background: `
            radial-gradient(120% 90% at 50% 0%, ${accent}22, transparent 58%),
            linear-gradient(180deg, oklch(0.16 0.05 290 / 0.96), oklch(0.10 0.04 285 / 0.98))
          `,
          boxShadow: `0 40px 100px -30px ${accent}66`,
        }}
      >
        <div
          className={cn(
            "mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-b sm:size-24",
            RING[moment.kind],
          )}
          style={{
            boxShadow: `0 0 50px -10px ${accent}`,
            color: moment.kind === "win" ? glow : moment.kind === "timeout" ? "#fbbf24" : "white",
          }}
        >
          <Icon className="size-10 sm:size-11" strokeWidth={2.2} />
        </div>

        <p
          id="game-moment-title"
          className="font-brand mt-5 text-3xl font-bold text-white sm:text-4xl"
        >
          {moment.title}
        </p>

        {moment.subtitle ? (
          <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-white/65 sm:text-lg">
            {moment.subtitle}
          </p>
        ) : null}

        {moment.highlight ? (
          <p
            className="font-brand mt-5 animate-pop-in text-4xl font-extrabold sm:text-5xl"
            style={{
              color: moment.highlightColor ?? glow,
              textShadow: `0 0 36px color-mix(in oklab, ${moment.highlightColor ?? glow} 55%, transparent)`,
            }}
          >
            {moment.highlight}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={handlePrimary}
            className="h-12 min-w-[10rem] rounded-2xl text-base font-extrabold text-white hover:brightness-110"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${glow})`,
              boxShadow: `0 20px 50px -16px ${accent}`,
            }}
          >
            {moment.actionLabel ?? messages.common.continue}
          </Button>
          {moment.secondaryLabel ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleSecondary}
              className="h-12 min-w-[10rem] rounded-2xl border-white/15 bg-white/[0.04] text-base font-bold"
            >
              {moment.secondaryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
