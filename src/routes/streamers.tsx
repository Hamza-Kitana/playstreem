import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BadgeCheck, Radio, Shield, Sparkles, Zap } from "lucide-react";
import StreamerCard from "@/components/StreamerCard";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { checkKickLiveStatuses } from "@/lib/kick.functions";
import { VERIFIED_STREAMERS } from "@/lib/verified-streamers";

export const Route = createFileRoute("/streamers")({
  head: () => ({
    meta: [
      { title: "الستريمر الموثقين — Al-Daboor" },
      {
        name: "description",
        content: "تعرّف على الستريمرز الموثقين لدى Al-Daboor، شاهد بثّهم مباشرة من الكرت.",
      },
    ],
  }),
  component: StreamersPage,
});

const VERIFIED = VERIFIED_STREAMERS;
const GUTTER = "px-4 sm:px-8 lg:px-12 xl:px-16";

function StreamersPage() {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [liveMap, setLiveMap] = useState<Record<string, boolean | null>>(() =>
    Object.fromEntries(VERIFIED.map((s) => [s.slug, null])),
  );
  const checkLive = useServerFn(checkKickLiveStatuses);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const statuses = await checkLive({ data: { slugs: VERIFIED.map((s) => s.slug) } });
        if (cancelled) return;
        setLiveMap((prev) => {
          const next = { ...prev };
          for (const s of VERIFIED) {
            next[s.slug] = statuses[s.slug] ?? false;
          }
          return next;
        });
      } catch {
        if (cancelled) return;
        setLiveMap((prev) => {
          const next = { ...prev };
          for (const s of VERIFIED) next[s.slug] = false;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkLive]);

  const liveCount = Object.values(liveMap).filter((v) => v === true).length;

  return (
    <div className="w-full space-y-10 pb-8">
      {/* HERO */}
      <section className="relative w-full overflow-hidden border-b border-white/8 py-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(65% 90% at 100% 0%, color-mix(in oklab, var(--neon) 22%, transparent), transparent 55%), radial-gradient(60% 90% at 0% 100%, color-mix(in oklab, var(--neon-2) 18%, transparent), transparent 60%)",
          }}
        />
        {/* animated grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(color-mix(in oklab, var(--neon) 60%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--neon) 60%, transparent) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%)",
          }}
        />

        <div className={`relative mx-auto flex max-w-6xl flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between ${GUTTER}`}>
          <div className="min-w-0 flex-1">
            <span className="chip">
              <BadgeCheck className="size-3.5" />
              Al-Daboor Verified
            </span>
            <h1 className="font-brand mt-3 text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
              <span className="shimmer-text">الستريمر الموثقين</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
              وجوه المنصة. شاهد البث على الكرت مباشرة، وشوف مين لايف هلأ، واربط بكبسة.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button
                asChild
                className="h-12 gap-2 rounded-2xl bg-gradient-to-l from-[color:var(--neon)] to-[color:var(--neon-3)] px-6 text-base font-extrabold shadow-[0_20px_50px_-16px_var(--neon)] hover:brightness-110"
              >
                <Link to="/contact">
                  <Sparkles className="size-4" />
                  اطلب التوثيق
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-2xl border-white/15 bg-white/[0.03] px-5 font-bold hover:bg-white/[0.08]">
                <Link to="/connect">
                  <Zap className="size-4" />
                  الربط
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats card */}
          <div className="glass-strong grid w-full max-w-sm shrink-0 grid-cols-3 gap-3 rounded-3xl p-5 sm:w-auto sm:min-w-[22rem]">
            <StatBlock icon={<Shield className="size-5" />} label="موثّقون" value={String(VERIFIED.length)} accent="var(--neon)" />
            <StatBlock icon={<Radio className="size-5" />} label="لايف الآن" value={String(liveCount)} accent="var(--destructive)" pulse />
            <StatBlock icon={<Sparkles className="size-5" />} label="ألعاب" value="8" accent="var(--neon-2)" />
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className={`w-full ${GUTTER}`}>
        <div className="mb-6 flex w-full flex-wrap items-end justify-between gap-3">
          <div>
            <span
              className="chip"
              style={{
                borderColor: "color-mix(in oklab, var(--neon-2) 45%, transparent)",
                background: "color-mix(in oklab, var(--neon-2) 14%, transparent)",
                color: "var(--neon-2)",
              }}
            >
              المعرض
            </span>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
              <span className="bg-gradient-to-l from-white to-white/70 bg-clip-text text-transparent">
                وجوه المنصة
              </span>
            </h2>
          </div>
          <p className="max-w-sm rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2 text-xs leading-6 text-white/60 sm:text-sm">
            <span className="mr-1 inline-flex items-center gap-1 font-extrabold text-destructive">
              <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
              LIVE
            </span>
            = فاتح بث الآن ·{" "}
            <span className="font-extrabold text-white/55">OFFLINE</span> = غير متصل
          </p>
        </div>

        <div className="grid w-full gap-5 pt-2 pb-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 xl:gap-6">
          {VERIFIED.map((s, i) => (
            <Reveal key={s.slug} delay={i * 60} className="h-full">
              <StreamerCard
                streamer={s}
                expanded={expandedSlug === s.slug}
                onHoverChange={setExpandedSlug}
                isLive={liveMap[s.slug] ?? null}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative w-full overflow-hidden border-y border-white/8 py-10 text-center sm:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_0%,color-mix(in_oklab,var(--neon)_16%,transparent),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_100%,color-mix(in_oklab,var(--neon-2)_10%,transparent),transparent_60%)]" />
        <div className={`relative ${GUTTER}`}>
          <span className="chip mx-auto">
            <Sparkles className="size-3.5" />
            التوثيق
          </span>
          <h2 className="font-brand mt-3 text-2xl font-bold sm:text-4xl">
            <span className="shimmer-text">تبي تكون موثّق؟</span>
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-white/65 sm:text-base">
            أرسل رابط قناتك من صفحة التواصل واختر «طلب توثيق ستريمر».
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              className="h-12 gap-2 rounded-2xl bg-gradient-to-l from-[color:var(--neon)] to-[color:var(--neon-3)] px-6 text-base font-extrabold shadow-[0_20px_50px_-16px_var(--neon)] hover:brightness-110"
            >
              <Link to="/contact">
                قدّم الآن
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="h-12 rounded-2xl px-5 font-bold text-white/70 hover:bg-white/8 hover:text-white"
            >
              <Link to="/about">اعرف أكثر</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
  accent,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-3.5 text-center backdrop-blur">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: `radial-gradient(80% 100% at 50% 0%, color-mix(in oklab, ${accent} 22%, transparent), transparent 70%)` }}
      />
      <div className="relative">
        <span
          className="mx-auto grid size-9 place-items-center rounded-xl"
          style={{
            color: accent,
            background: `color-mix(in oklab, ${accent} 15%, transparent)`,
            boxShadow: `0 0 20px -8px ${accent}`,
          }}
        >
          {icon}
        </span>
        <p
          className={`mt-1.5 text-2xl leading-none font-black tabular-nums ${pulse ? "animate-pulse-glow" : ""}`}
          style={{ color: accent }}
        >
          {value}
        </p>
        <p className="mt-1 text-[10px] font-extrabold tracking-wider text-white/55 uppercase">{label}</p>
      </div>
    </div>
  );
}
