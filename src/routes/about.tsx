import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Armchair,
  Brain,
  Eye,
  Flag,
  Flame,
  Gamepad2,
  Heart,
  MessageSquareQuote,
  PlugZap,
  Puzzle,
  Skull,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useT } from "@/contexts/LocaleContext";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Al-Daboor" },
      {
        name: "description",
        content: "Al-Daboor",
      },
    ],
  }),
  component: AboutPage,
});

const VALUE_ICONS = [Zap, Users, Eye, Heart];

const SERVICES = [
  { icon: Brain, id: "quiz", to: "/quiz" as const },
  { icon: Armchair, id: "seat", to: "/seat" as const },
  { icon: Flame, id: "vote", to: "/vote" as const },
  { icon: Star, id: "rate", to: "/rate" as const },
  { icon: MessageSquareQuote, id: "phrase", to: "/phrase" as const },
  { icon: Flag, id: "flag", to: "/flag" as const },
  { icon: Puzzle, id: "riddle", to: "/riddle" as const },
  { icon: Skull, id: "zombie", to: "/zombie" as const },
] as const;

const GUTTER = "px-4 sm:px-8 lg:px-12 xl:px-16";

function AboutPage() {
  const { messages } = useT();
  const copy = messages.pages.about;

  useEffect(() => {
    document.title = copy.metaTitle;
  }, [copy.metaTitle]);

  return (
    <div className="w-full space-y-20 sm:space-y-24">
      <section className={`w-full ${GUTTER}`}>
        <SectionHeading
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={copy.heroSubtitle}
        />

        <Reveal>
          <div className="glass neon-ring panel-shine relative w-full overflow-hidden rounded-3xl p-8 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
              <div>
                <p className="font-brand text-sm font-bold tracking-wide text-primary">
                  {copy.brandLine}
                </p>
                <h3 className="mt-3 text-2xl font-extrabold sm:text-3xl">{copy.storyTitle}</h3>
                <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">
                  {copy.storyBody1}
                </p>
                <p className="mt-3 max-w-3xl leading-8 text-muted-foreground">
                  {copy.storyBody2}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {copy.stats.map((stat) => (
                  <div
                    key={stat.v}
                    className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3"
                  >
                    <p className="font-brand text-2xl font-bold text-primary">{stat.k}</p>
                    <p className="text-sm font-bold text-muted-foreground">{stat.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className={`w-full ${GUTTER}`}>
        <SectionHeading
          eyebrow={copy.valuesEyebrow}
          title={copy.valuesTitle}
          subtitle={copy.valuesSubtitle}
        />
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {copy.values.map((item, i) => {
            const Icon = VALUE_ICONS[i]!;
            return (
            <Reveal key={item.title} delay={i * 60}>
              <div className="glass panel-shine h-full rounded-3xl p-6">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-xl font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.desc}</p>
              </div>
            </Reveal>
            );
          })}
        </div>
      </section>

      <section className={`w-full ${GUTTER}`}>
        <SectionHeading
          eyebrow={copy.servicesEyebrow}
          title={copy.servicesTitle}
          subtitle={copy.servicesSubtitle}
        />
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((item, i) => {
            const game = messages.gameMeta[item.id];
            return (
            <Reveal key={item.id} delay={i * 60}>
              <Link
                to={item.to}
                className="glass group block h-full rounded-3xl p-6 transition hover:border-primary/50"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary transition group-hover:bg-primary/20">
                  <item.icon className="size-6" />
                </span>
                <h3 className="mt-4 text-xl font-extrabold">{game.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{game.desc}</p>
              </Link>
            </Reveal>
            );
          })}
        </div>
      </section>

      <section className={`w-full ${GUTTER}`}>
        <SectionHeading
          eyebrow={copy.howEyebrow}
          title={copy.howTitle}
          subtitle={copy.howSubtitle}
        />
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {copy.steps.map((step, i) => (
            <Reveal key={step} delay={i * 50}>
              <div className="glass flex h-full items-start gap-4 rounded-2xl p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-extrabold text-primary">
                  {i + 1}
                </span>
                <p className="pt-2 leading-7 text-muted-foreground">{step}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`w-full ${GUTTER}`}>
        <Reveal>
          <div className="glass neon-ring panel-shine relative w-full overflow-hidden rounded-3xl p-8 text-center sm:p-12">
            <div className="pointer-events-none absolute -top-20 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
            <Target className="relative mx-auto size-10 text-primary" />
            <h3 className="relative mt-4 text-2xl font-extrabold sm:text-3xl">
              {copy.ctaTitle}
            </h3>
            <p className="relative mx-auto mt-3 max-w-lg text-muted-foreground">
              {copy.ctaSubtitle}
            </p>
            <div className="relative mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild className="h-12 px-7 font-extrabold">
                <Link to="/connect">
                  <PlugZap className="size-4" />
                  {copy.connectCta}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 px-7 font-bold">
                <Link to="/streamers">
                  <Sparkles className="size-4" />
                  {copy.streamersCta}
                </Link>
              </Button>
              <Button asChild variant="ghost" className="h-12 px-7 font-bold">
                <Link to="/contact">
                  <Gamepad2 className="size-4" />
                  {copy.contactCta}
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
