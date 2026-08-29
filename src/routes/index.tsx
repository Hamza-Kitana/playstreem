import { createFileRoute, Link } from "@tanstack/react-router";
import HomeVerifiedSidebar from "@/components/HomeVerifiedSidebar";
import { GAMES } from "@/lib/games";

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
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
      <HomeVerifiedSidebar />

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
