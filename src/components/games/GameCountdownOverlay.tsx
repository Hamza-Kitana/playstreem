import { cn } from "@/lib/utils";

type Props = {
  value: number;
  accent: string;
  glow: string;
};

export default function GameCountdownOverlay({ value, accent, glow }: Props) {
  const label = value > 0 ? String(value) : "انطلق!";

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/72 backdrop-blur-md"
      aria-live="assertive"
      aria-label={`العد التنازلي ${label}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(55% 50% at 50% 50%, ${accent}35, transparent 72%)`,
        }}
      />

      <div className="relative flex flex-col items-center text-center">
        <p
          className="text-sm font-extrabold tracking-[0.35em] uppercase sm:text-base"
          style={{ color: glow }}
        >
          استعدوا
        </p>

        <div
          key={label}
          className={cn(
            "font-brand mt-4 grid size-36 place-items-center rounded-full border-4 sm:size-44",
            "animate-[countdown-pop_0.85s_cubic-bezier(0.22,1,0.36,1)_both]",
          )}
          style={{
            borderColor: `${accent}88`,
            background: `radial-gradient(circle at 50% 35%, ${accent}40, oklch(0.12 0.04 285 / 0.95) 68%)`,
            boxShadow: `0 0 80px -12px ${accent}, inset 0 0 40px -20px ${glow}`,
          }}
        >
          <span
            className="text-7xl font-black tabular-nums leading-none sm:text-8xl"
            style={{
              color: value > 0 ? "white" : glow,
              textShadow: `0 0 40px ${accent}`,
            }}
          >
            {label}
          </span>
        </div>

        <p className="mt-6 max-w-xs text-base font-bold text-white/65 sm:text-lg">
          {value > 0 ? "الجولة بتبدأ بعد لحظات…" : "يلا نبدأ!"}
        </p>
      </div>
    </div>
  );
}
