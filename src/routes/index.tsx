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
          "Al-Daboor منصة ألعاب تفاعلية للبث على كيك: أسئلة، كراسي، تصويت، تقييم، جملة، أعلام، وألغاز — يقودها الشات لحظياً.",
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
              className="group relative min-h-[11rem] overflow-hidden rounded-3xl border border-white/10 sm:min-h-0"
            >
              <img
                src={game.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
              <div className="relative flex h-full min-h-0 flex-col justify-end p-4 sm:p-5">
                <span
                  className="mb-auto grid size-9 place-items-center rounded-xl border border-white/15 bg-black/40 sm:size-10"
                  style={{ color: game.accent }}
                >
                  <Icon className="size-4 sm:size-5" />
                </span>
                <h2 className="text-base font-extrabold drop-shadow sm:text-xl">{game.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/80 sm:text-sm sm:leading-6">
                  {game.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
