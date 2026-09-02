import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, CircleHelp, PlugZap } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { useGuide } from "@/contexts/GuideContext";
import { GAMES } from "@/lib/games";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/" as const, label: "الرئيسية" },
  { to: "/chat" as const, label: "شات" },
  { to: "/about" as const, label: "من نحن" },
  { to: "/contact" as const, label: "تواصل معنا" },
  { to: "/streamers" as const, label: "الستريمر الموثقين" },
];

function linkClass(active: boolean, compact = false) {
  return cn(
    compact
      ? "shrink-0 rounded-lg px-2 py-1 text-xs"
      : "rounded-xl px-3.5 py-1.5",
    "font-bold transition duration-300",
    active
      ? "bg-gradient-to-l from-[color:var(--neon)] to-[color:var(--neon-3)] text-primary-foreground shadow-[0_8px_20px_-8px_var(--neon)]"
      : "text-white/70 hover:bg-white/10 hover:text-white",
  );
}

export default function AppHeader() {
  const { status } = useKickChatContext();
  const { openGuide } = useGuide();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const chatActive = status === "live";
  const gamesActive = GAMES.some((s) => pathname === s.to);

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div
        className={cn(
          "mx-auto mt-3 flex max-w-[92rem] items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 sm:px-5",
          "border-white/12 bg-[oklch(0.15_0.04_290/0.85)] backdrop-blur-xl",
          "shadow-[0_18px_60px_-30px_oklch(0_0_0/0.9)]",
        )}
      >
        <BrandLogo size="sm" />

        <nav className="hidden items-center gap-0.5 text-sm lg:flex">
          {LINKS.map((item) => (
            <Link key={item.to} to={item.to} className={linkClass(pathname === item.to)}>
              {item.label}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-sm font-bold outline-none transition duration-300",
                gamesActive
                  ? "bg-gradient-to-l from-[color:var(--neon)] to-[color:var(--neon-3)] text-primary-foreground shadow-[0_8px_20px_-8px_var(--neon)]"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              الألعاب
              <ChevronDown className="size-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-48 border-white/12 bg-[oklch(0.14_0.04_290/0.95)] backdrop-blur-xl"
            >
              {GAMES.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="cursor-pointer font-bold">
                  <Link to={item.to} className="flex items-center justify-between gap-3">
                    <span>{item.label}</span>
                    <span
                      className="size-2 rounded-full"
                      style={{ background: item.accent, boxShadow: `0 0 8px ${item.glow}` }}
                    />
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex max-w-[48vw] items-center gap-1 overflow-x-auto lg:hidden">
            {LINKS.map((item) => (
              <Link key={item.to} to={item.to} className={linkClass(pathname === item.to, true)}>
                {item.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-bold outline-none",
                  gamesActive
                    ? "bg-gradient-to-l from-[color:var(--neon)] to-[color:var(--neon-3)] text-primary-foreground"
                    : "text-white/70",
                )}
              >
                الألعاب
                <ChevronDown className="size-3 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-40 border-white/12 bg-[oklch(0.14_0.04_290/0.95)] backdrop-blur-xl"
              >
                {GAMES.map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="cursor-pointer font-bold">
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            asChild
            size="sm"
            className="h-9 shrink-0 gap-1.5 rounded-xl bg-gradient-to-l from-[color:var(--neon)] to-[color:var(--neon-3)] px-3 font-extrabold shadow-[0_10px_30px_-12px_var(--neon)] hover:brightness-110"
          >
            <Link to="/connect">
              <PlugZap className="size-3.5" />
              <span className="hidden sm:inline">الربط</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
            onClick={openGuide}
            aria-label="إرشادات الموقع"
            title="إرشادات الموقع"
          >
            <CircleHelp className="size-5" />
          </Button>

          <span
            className={cn(
              "hidden shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider sm:inline-flex",
              chatActive
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-white/12 bg-white/5 text-white/55",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                chatActive ? "animate-live-dot bg-primary" : "bg-white/40",
              )}
            />
            {chatActive ? "مباشر" : "غير متصل"}
          </span>
        </div>
      </div>
    </header>
  );
}
