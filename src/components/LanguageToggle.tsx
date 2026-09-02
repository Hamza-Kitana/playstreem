import { Languages } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";

export default function LanguageToggle({ className }: { className?: string }) {
  const { locale, toggleLocale, messages } = useLocale();
  const isEn = locale === "en";

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={messages.lang.aria}
      title={isEn ? messages.lang.switchToAr : messages.lang.switchToEn}
      className={cn(
        "group relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-all duration-300",
        "border-white/12 bg-white/5 hover:border-white/25 hover:bg-white/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--neon)]/60",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          "bg-gradient-to-br from-[color:var(--neon)]/20 via-transparent to-[color:var(--neon-3)]/15",
        )}
      />
      <Languages className="relative size-[1.125rem] text-white/70 transition-colors group-hover:text-white" />
      <span
        className={cn(
          "absolute -bottom-px inset-x-1 rounded-full py-px text-center text-[8px] font-extrabold leading-none tracking-wide",
          "bg-gradient-to-r from-[color:var(--neon)] to-[color:var(--neon-3)] text-[color:var(--primary-foreground)]",
          "shadow-[0_2px_8px_-2px_var(--neon)]",
        )}
      >
        {isEn ? "AR" : "EN"}
      </span>
    </button>
  );
}
