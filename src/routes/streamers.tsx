import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BadgeCheck, Shield, Sparkles, Zap } from "lucide-react";
import StreamerCard, { type VerifiedStreamer } from "@/components/StreamerCard";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { checkKickLiveStatuses } from "@/lib/kick.functions";

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

const VERIFIED: VerifiedStreamer[] = [
  {
    name: "salahat8",
    slug: "salahat8",
    tag: "رائد المنصة",
    hue: 152,
    note: "وجه موثّق عند Al-Daboor — البث يشتغل مكتوم على الكرت، والهوفر يكبّره.",
  },
  {
    name: "xsybx",
    slug: "xsybx",
    tag: "طاقة لايف",
    hue: 168,
    note: "ستريمر موثّق بطاقة عالية — مرّر عشان تشوف البث أكبر.",
  },
  {
    name: "sarfndi-m",
    slug: "sarfndi-m",
    tag: "مجتمع تفاعلي",
    hue: 142,
    note: "موثّق لدى Al-Daboor — ادخل قناته أو اربطها بكبسة من الكرت.",
  },
  {
    name: "aboel3abed",
    slug: "aboel3abed",
    tag: "ستريمر موثّق",
    hue: 160,
    note: "موثّق لدى Al-Daboor — شارة LIVE تظهر لما يكون البث شغّال.",
  },
];

const HIGHLIGHTS = [
  { icon: BadgeCheck, label: "شارة موثّق ظاهرة للجمهور" },
  { icon: Zap, label: "بث مكتوم على الكرت + تكبير بالهوفر" },
  { icon: Shield, label: "LIVE / OFFLINE حسب الحالة" },
];

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

  return (
    <div className="w-full space-y-20 pb-8 sm:space-y-24">
      <section className="relative w-full overflow-hidden border-y border-primary/20 py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 70% at 80% 10%, color-mix(in oklab, var(--neon) 22%, transparent), transparent 55%), radial-gradient(70% 60% at 10% 90%, color-mix(in oklab, var(--neon-2) 16%, transparent), transparent 50%), linear-gradient(160deg, oklch(0.16 0.03 160 / 0.9), oklch(0.1 0.02 200 / 0.95))",
          }}
        />
        <div className="pointer-events-none absolute -top-20 -left-10 size-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 size-72 rounded-full bg-[color-mix(in_oklab,var(--neon-2)_18%,transparent)] blur-3xl" />

        <div className={`relative mx-auto max-w-4xl text-center ${GUTTER}`}>
          <p className="font-brand text-sm font-semibold tracking-[0.35em] text-primary uppercase">
            Al-Daboor Verified
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-6xl">
            <span className="shimmer-text">الستريمر الموثقين</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
            البث يشتغل مكتوم على الكرت، وشارة LIVE تظهر لمن هو أونلاين. مرّر الماوس عشان يكبّر الكرت وتشوف أوضح.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-muted-foreground">
            {HIGHLIGHTS.map((h) => (
              <span
                key={h.label}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-2 backdrop-blur-sm"
              >
                <h.icon className="size-4 text-primary" />
                {h.label}
              </span>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-12 px-7 font-extrabold shadow-[0_0_36px_-10px_var(--neon)]">
              <Link to="/contact">اطلب التوثيق</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-7 font-bold">
              <Link to="/connect">جرّب الربط</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className={`w-full overflow-visible ${GUTTER}`}>
        <Reveal className="mb-8 flex w-full flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">المعرض</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">وجوه المنصة</h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            LIVE = فاتح بث الآن · OFFLINE = مو أونلاين. مرّر على أي كرت عشان يكبّر وتشوف البث أوضح.
          </p>
        </Reveal>

        <div className="grid w-full gap-6 overflow-visible pt-4 pb-10 sm:grid-cols-2 sm:gap-8 xl:grid-cols-4 xl:gap-8">
          {VERIFIED.map((s, i) => (
            <Reveal key={s.slug} delay={i * 70} className="h-full overflow-visible">
              <div
                className={
                  expandedSlug && expandedSlug !== s.slug
                    ? "h-full opacity-45 transition-opacity duration-500"
                    : "h-full opacity-100 transition-opacity duration-500"
                }
              >
                <StreamerCard
                  streamer={s}
                  expanded={expandedSlug === s.slug}
                  onHoverChange={setExpandedSlug}
                  isLive={liveMap[s.slug] ?? null}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative w-full overflow-hidden border-y border-primary/25 py-14 text-center sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_0%,color-mix(in_oklab,var(--neon)_16%,transparent),transparent_60%)]" />
        <div className={`relative ${GUTTER}`}>
          <Sparkles className="mx-auto size-8 text-primary" />
          <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">تبي تكون موثّق؟</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
            أرسل رابط قناتك من صفحة التواصل واختر نوع الطلب «طلب توثيق ستريمر». ما نطلب آلاف المتابعين —
            نطلب استخدام حقيقي ومحتوى مناسب.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-12 gap-2 px-7 font-extrabold">
              <Link to="/contact">
                قدّم الآن
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-12 px-6 font-bold text-muted-foreground">
              <Link to="/about">اعرف أكثر عن Al-Daboor</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
