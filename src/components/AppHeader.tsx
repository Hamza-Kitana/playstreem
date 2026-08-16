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

const LINKS = [
  { to: "/" as const, label: "الرئيسية" },
  { to: "/chat" as const, label: "شات" },
  { to: "/about" as const, label: "من نحن" },
  { to: "/contact" as const, label: "تواصل معنا" },
  { to: "/streamers" as const, label: "الستريمر الموثقين" },
];

function linkClass(active: boolean, compact = false) {
  return `${compact ? "shrink-0 rounded-lg px-2 py-1 text-xs" : "rounded-xl px-3 py-1.5"} font-bold transition ${
    active ? "bg-primary text-primary-foreground" : "text-white/70 hover:bg-white/8 hover:text-white"
  }`;
}

export default function AppHeader() {
  const { status } = useKickChatContext();
  const { openGuide } = useGuide();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const chatActive = status === "live";
  const gamesActive = GAMES.some((s) => pathname === s.to);

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto mt-3 flex max-w-[90rem] items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0e1614] px-3 py-2.5 sm:px-5">
        <BrandLogo size="sm" />

        <nav className="hidden items-center gap-0.5 text-sm lg:flex">
          {LINKS.map((item) => (
            <Link key={item.to} to={item.to} className={linkClass(pathname === item.to)}>
              {item.label}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-bold outline-none transition ${
                gamesActive ? "bg-primary text-primary-foreground" : "text-white/70 hover:bg-white/8 hover:text-white"
              }`}
            >
              الألعاب
              <ChevronDown className="size-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 border-white/10 bg-[#121c1a]">
              {GAMES.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="cursor-pointer font-bold">
                  <Link to={item.to}>{item.label}</Link>
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
                className={`inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-bold outline-none ${
                  gamesActive ? "bg-primary text-primary-foreground" : "text-white/70"
                }`}
              >
                الألعاب
                <ChevronDown className="size-3 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40 border-white/10 bg-[#121c1a]">
                {GAMES.map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="cursor-pointer font-bold">
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button asChild size="sm" className="h-9 shrink-0 gap-1.5 px-3 font-extrabold">
            <Link to="/connect">
              <PlugZap className="size-3.5" />
              <span className="hidden sm:inline">الربط</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-xl text-white/60 hover:bg-white/8 hover:text-primary"
            onClick={openGuide}
            aria-label="إرشادات الموقع"
            title="إرشادات الموقع"
          >
            <CircleHelp className="size-5" />
          </Button>

          <span
            className={`hidden shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold sm:inline ${
              chatActive ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/60"
            }`}
          >
            {chatActive ? "مباشر" : "غير متصل"}
          </span>
        </div>
      </div>
    </header>
  );
}
