import { createFileRoute, Link } from "@tanstack/react-router";
import { PlugZap } from "lucide-react";
import { useKickChatContext } from "@/contexts/KickChatContext";
import { GAMES } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Al-Daboor — ألعاب تفاعلية مع شات كيك" },
      {
        name: "description",
        content:
          "Al-Daboor منصة ألعاب تفاعلية للبث على كيك: أسئلة، كراسي، تصويت، تقييم، جملة، وأعلام — يقودها الشات لحظياً.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const chat = useKickChatContext();
  const live = chat.status === "live";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
      <aside className="flex shrink-0 flex-col justify-between rounded-3xl border border-white/10 bg-[#101a18] p-5 sm:p-6 lg:w-[22rem] lg:p-7">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.28em] text-primary uppercase">Al-Daboor</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
            ألعاب البث
            <span className="mt-1 block text-primary">من الشات مباشرة</span>
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/70">
            اربط قناتك، اختار لعبة، والجمهور يلعب من كيك. كل كرت يوديك لصفحة اللعبة.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold",
              live ? "bg-primary text-[#0b1412]" : "bg-white/10 text-white/70",
            )}
          >
            <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-[#0b1412]" : "bg-white/40")} />
            {live ? `متصل · ${chat.channel}` : "غير متصل"}
          </div>
          <Button asChild className="h-12 w-full text-base font-extrabold">
            <Link to="/connect">
              <PlugZap className="size-4" />
              {live ? "إدارة الربط" : "اربط قناتك"}
            </Link>
          </Button>
        </div>
      </aside>

      <section className="grid min-h-0 flex-1 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <Link
              key={game.to}
              to={game.to}
              className="group flex min-h-0 flex-col justify-between rounded-3xl border border-white/10 bg-[#121c1a] p-4 transition hover:-translate-y-0.5 hover:border-primary/50 sm:p-5"
              style={{ boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${game.accent} 18%, transparent)` }}
            >
              <span
                className="grid size-11 place-items-center rounded-2xl sm:size-12"
                style={{ background: `color-mix(in oklab, ${game.accent} 22%, #0b1412)`, color: game.accent }}
              >
                <Icon className="size-5 sm:size-6" />
              </span>
              <div className="mt-auto pt-4">
                <h2 className="text-base font-extrabold sm:text-xl">{game.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/60 sm:text-sm sm:leading-6">
                  {game.desc}
                </p>
                <p className="mt-3 text-[11px] font-extrabold text-primary">افتح اللعبة ←</p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
