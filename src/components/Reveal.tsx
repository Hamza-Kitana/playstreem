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
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 text-right">
      <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-extrabold text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-2 text-2xl font-extrabold sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{subtitle}</p> : null}
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
