import { Link } from "@tanstack/react-router";

type Props = {
  size?: "sm" | "lg" | "hero";
  asLink?: boolean;
  className?: string;
};

/** Text-only site name — no graphic logo. */
export default function BrandLogo({ size = "sm", asLink = true, className = "" }: Props) {
  const title =
    size === "hero"
      ? "text-5xl sm:text-7xl lg:text-8xl"
      : size === "lg"
        ? "text-3xl"
        : "text-lg sm:text-xl";
  const sub =
    size === "hero" ? "mt-2 text-sm sm:text-base tracking-[0.35em]" : "mt-0.5 text-[10px] tracking-[0.28em]";

  const content = (
    <span className={`inline-flex flex-col items-start leading-none ${size === "hero" ? "items-center text-center" : ""} ${className}`}>
      <span className={`font-brand font-bold ${title} shimmer-text`}>Al-Daboor</span>
      <span className={`font-display font-extrabold text-muted-foreground ${sub}`}>الدبور</span>
    </span>
  );

  if (!asLink) return content;
  return (
    <Link to="/" className="group shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
      {content}
    </Link>
  );
}
