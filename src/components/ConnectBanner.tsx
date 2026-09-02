import { Link } from "@tanstack/react-router";
import { PlugZap, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Banner shown on game pages when the Kick chat is not connected.
 * Uses the game's accent color for a coherent look.
 */
export default function ConnectBanner({ accent = "#8b5cf6" }: { accent?: string }) {
  return (
    <div
      className="glass mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3.5 sm:px-5"
      style={{
        borderColor: `${accent}55`,
        boxShadow: `0 15px 40px -20px ${accent}66`,
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl"
          style={{
            background: `${accent}22`,
            color: accent,
            boxShadow: `inset 0 0 0 1px ${accent}44`,
          }}
        >
          <WifiOff className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-white">الشات غير متصل</p>
          <p className="mt-0.5 text-xs text-white/55">اربط قناتك من كيك أول عشان تلعب</p>
        </div>
      </div>
      <Button
        asChild
        size="sm"
        className="h-10 shrink-0 gap-1.5 rounded-xl px-4 text-sm font-extrabold text-white hover:brightness-110"
        style={{
          background: `linear-gradient(135deg, ${accent}, color-mix(in oklab, ${accent} 60%, white 40%))`,
          boxShadow: `0 12px 30px -12px ${accent}`,
        }}
      >
        <Link to="/connect">
          <PlugZap className="size-4" />
          اربط الآن
        </Link>
      </Button>
    </div>
  );
}
