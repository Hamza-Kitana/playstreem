import { useEffect, useState } from "react";

type Props = {
  /** Full-viewport splash overlay (initial boot). */
  fullscreen?: boolean;
  /** Progress 0–100; when omitted, animates on its own. */
  progress?: number;
  label?: string;
  className?: string;
};

export default function LoadingScreen({
  fullscreen = true,
  progress,
  label = "جاري التحميل…",
  className = "",
}: Props) {
  const [auto, setAuto] = useState(12);

  useEffect(() => {
    if (progress != null) return;
    const id = window.setInterval(() => {
      setAuto((p) => {
        if (p >= 92) return p;
        const step = p < 40 ? 4.5 : p < 70 ? 2.2 : 0.8;
        return Math.min(p + step, 92);
      });
    }, 140);
    return () => window.clearInterval(id);
  }, [progress]);

  const value = Math.min(100, Math.max(0, progress ?? auto));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${
        fullscreen
          ? "fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-background"
          : "flex min-h-[50vh] flex-col items-center justify-center py-16"
      } ${className}`}
    >
      {fullscreen ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,color-mix(in_oklab,var(--neon)_14%,transparent),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(color-mix(in_oklab,var(--neon)_50%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--neon)_50%,transparent)_1px,transparent_1px)] [background-size:48px_48px]" />
        </>
      ) : null}

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-6 text-center">
        <p className="font-brand text-3xl font-bold tracking-tight shimmer-text sm:text-4xl">Al-Daboor</p>
        <p className="mt-2 font-display text-xs font-extrabold tracking-[0.35em] text-muted-foreground">
          الدبور
        </p>

        <div className="mt-10 w-full">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>{label}</span>
            <span className="tabular-nums text-primary">{Math.round(value)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="load-bar-fill h-full rounded-full bg-gradient-to-l from-primary via-accent to-primary transition-[width] duration-200 ease-out"
              style={{ width: `${value}%` }}
            />
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">ألعاب تفاعلية مع شات كيك</p>
      </div>
    </div>
  );
}
