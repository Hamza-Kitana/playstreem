import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, PlugZap, Sparkles } from "lucide-react";
import HomeVerifiedSidebar from "@/components/HomeVerifiedSidebar";
import { GAMES } from "@/lib/games";
import { useKickChatContext } from "@/contexts/KickChatContext";

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
    <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-5">
      {/* Games column first in DOM → rightmost in RTL, from "far right to far left" */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:gap-4">
        {/* Hero strip — compact but striking */}
        <div className="glass-strong relative overflow-hidden rounded-3xl px-5 py-3.5 sm:px-7 sm:py-4">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 100% at 100% 0%, color-mix(in oklab, var(--neon) 22%, transparent), transparent 55%), radial-gradient(60% 100% at 0% 100%, color-mix(in oklab, var(--neon-2) 20%, transparent), transparent 55%)",
            }}
          />

          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="chip">
                <Sparkles className="size-3" />
                Al-Daboor
              </span>
              <h1 className="font-brand mt-1.5 text-xl leading-none font-bold sm:text-2xl">
                <span className="shimmer-text">ألعاب تفاعلية</span>{" "}
                <span className="text-white/85">للبث على كيك</span>
              </h1>
              <p className="mt-1 text-[11px] font-medium text-white/60 sm:text-xs">
                ٨ ألعاب يقودها شات كيك — اختر لعبة وابدأ بثانية.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase sm:text-xs ${
                  live
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-white/12 bg-white/5 text-white/60"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    live ? "animate-live-dot bg-primary" : "bg-white/45"
                  }`}
                />
                {live ? "متصل" : "غير متصل"}
              </span>

              <Link
                to="/connect"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-[color:var(--neon)] to-[color:var(--neon-3)] px-3.5 py-1.5 text-xs font-extrabold text-[color:var(--primary-foreground)] shadow-[0_0_28px_-6px_var(--neon)] transition hover:scale-[1.03]"
              >
                <PlugZap className="size-3.5" />
                {live ? "إعادة الربط" : "اربط الآن"}
              </Link>
            </div>
          </div>
        </div>

        {/* Games grid — 4 cols x 2 rows on desktop, fills remaining height */}
        <section
          className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-4"
          aria-label="الألعاب"
        >
          {GAMES.map((game, i) => {
            const Icon = game.icon;
            return (
              <Link
                key={game.to}
                to={game.to}
                className="game-card group relative flex min-h-[9rem] flex-col overflow-hidden rounded-3xl border border-white/10 transition duration-500 hover:-translate-y-1 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:min-h-0"
                style={
                  {
                    ["--accent" as string]: game.accent,
                    ["--glow" as string]: game.glow,
                    animation: `route-in 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms both`,
                  } as React.CSSProperties
                }
              >
                {/* Base image */}
                <img
                  src={game.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-110 group-hover:opacity-90"
                />

                {/* Coloured overlay per game */}
                <div
                  className="absolute inset-0 opacity-90 transition duration-500 group-hover:opacity-95"
                  style={{
                    background: `linear-gradient(160deg, color-mix(in oklab, ${game.accent} 55%, transparent) 0%, transparent 45%), linear-gradient(0deg, oklch(0.09 0.03 285) 25%, transparent 70%)`,
                  }}
                />

                {/* Vignette bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                {/* Corner glow */}
                <div
                  className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-40 blur-3xl transition duration-500 group-hover:opacity-70"
                  style={{ background: game.glow }}
                />

                {/* Inner ring accent */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition duration-500 group-hover:opacity-100"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${game.accent}, 0 20px 60px -20px ${game.glow}`,
                  }}
                />

                {/* Content */}
                <div className="relative flex h-full min-h-0 flex-col justify-between p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="grid size-9 place-items-center rounded-xl border border-white/20 bg-black/40 shadow-[0_8px_28px_-10px_rgba(0,0,0,0.9)] backdrop-blur-sm transition duration-500 group-hover:scale-110 sm:size-10"
                      style={{ color: game.accent }}
                    >
                      <Icon className="size-4 sm:size-5" />
                    </span>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-md"
                      style={{
                        borderColor: `${game.accent}55`,
                        color: game.glow,
                        background: `${game.accent}18`,
                      }}
                    >
                      {game.tag}
                    </span>
                  </div>

                  <div>
                    <h2
                      className="font-brand text-base leading-tight font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-lg lg:text-xl"
                    >
                      {game.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/80 sm:text-xs sm:leading-5">
                      {game.desc}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: game.glow }}>
                      <span>ابدأ اللعب</span>
                      <ArrowLeft className="size-3 transition group-hover:-translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </div>

      <HomeVerifiedSidebar />
    </div>
  );
}
