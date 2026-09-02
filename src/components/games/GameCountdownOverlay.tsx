import { useT } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  accent: string;
  glow: string;
};

export default function GameCountdownOverlay({ value, accent, glow }: Props) {
  const { messages } = useT();
  const isGo = value === 0;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/72 backdrop-blur-md"
      aria-live="assertive"
      aria-label={
        isGo ? messages.countdown.ariaGo : `${messages.countdown.ariaCount} ${value}`
      }
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(55% 50% at 50% 50%, ${accent}35, transparent 72%)`,
        }}
      />

      <div className="relative flex flex-col items-center text-center">
        <p
          className="font-display text-sm font-extrabold tracking-[0.22em] text-white/80 sm:text-base"
          style={{ color: glow }}
        >
          {messages.countdown.getReady}
        </p>

        <div
          key={isGo ? "go" : value}
          className={cn(
            "mt-4 animate-[countdown-pop_0.85s_cubic-bezier(0.22,1,0.36,1)_both]",
            isGo
              ? "rounded-[2rem] border-4 px-12 py-8 sm:px-16 sm:py-10"
              : "font-brand grid size-36 place-items-center rounded-full border-4 sm:size-44",
          )}
          style={{
            borderColor: `${accent}88`,
            background: isGo
              ? `linear-gradient(135deg, ${accent}35, oklch(0.12 0.04 285 / 0.96))`
              : `radial-gradient(circle at 50% 35%, ${accent}40, oklch(0.12 0.04 285 / 0.95) 68%)`,
            boxShadow: `0 0 80px -12px ${accent}, inset 0 0 40px -20px ${glow}`,
          }}
        >
          {isGo ? (
            <span
              className="font-display block text-5xl font-black leading-none sm:text-6xl"
              style={{
                color: glow,
                textShadow: `0 0 32px ${accent}`,
              }}
            >
              {messages.countdown.go}
            </span>
          ) : (
            <span
              className="text-7xl font-black tabular-nums leading-none text-white sm:text-8xl"
              style={{ textShadow: `0 0 40px ${accent}` }}
            >
              {value}
            </span>
          )}
        </div>

        <p className="font-display mt-6 max-w-xs text-base font-bold text-white/70 sm:text-lg">
          {isGo ? messages.countdown.letsGo : messages.countdown.startingSoon}
        </p>
      </div>
    </div>
  );
}
