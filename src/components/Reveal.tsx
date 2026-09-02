import { type ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("reveal", shown && "revealed", className)}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  accent,
  align = "right",
  compact = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Optional accent hex color for the eyebrow/badge glow */
  accent?: string;
  align?: "right" | "center";
  compact?: boolean;
}) {
  const accentColor = accent ?? "var(--neon)";
  return (
    <div
      className={cn(
        compact ? "mb-4" : "mb-6",
        align === "center" ? "text-center" : "text-right",
      )}
    >
      <span
        className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[11px] font-extrabold tracking-[0.22em] uppercase"
        style={{
          borderColor: `color-mix(in oklab, ${accentColor} 45%, transparent)`,
          background: `color-mix(in oklab, ${accentColor} 12%, transparent)`,
          color: accentColor,
        }}
      >
        {eyebrow}
      </span>
      <h2
        className={cn(
          "font-brand mt-2 font-bold leading-tight",
          compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl lg:text-5xl",
        )}
      >
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage: `linear-gradient(120deg, ${accentColor} 0%, color-mix(in oklab, white 85%, ${accentColor} 15%) 55%, ${accentColor} 100%)`,
          }}
        >
          {title}
        </span>
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "mt-2 leading-7 text-white/65",
            align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl",
            compact ? "text-sm" : "text-sm sm:text-base",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function GameCard({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("glass rounded-3xl p-5 sm:p-8", className)}>
      {children}
    </section>
  );
}
