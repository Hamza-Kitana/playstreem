import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BadgeCheck, Sparkles } from "lucide-react";
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
  {
    name: "rahma_gamin_g",
    slug: "rahma_gamin_g",
    tag: "ستريمر موثّق",
    hue: 148,
    note: "موثّقة لدى Al-Daboor — شوف البث على الكرت أو اربط القناة بكبسة.",
  },
  {
    name: "nyrex-x",
    slug: "nyrex-x",
    tag: "ستريمر موثّق",
    hue: 172,
    note: "موثّق لدى Al-Daboor — شوف البث على الكرت أو اربط القناة بكبسة.",
  },
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
    <div className="w-full space-y-10 pb-6 sm:space-y-12">
      {/* Compact intro under the fixed header */}
      <section className="relative w-full overflow-hidden border-b border-primary/15 py-5 sm:py-6">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 120% at 90% 0%, color-mix(in oklab, var(--neon) 18%, transparent), transparent 55%), linear-gradient(180deg, oklch(0.15 0.03 160 / 0.55), transparent)",
          }}
        />

        <div className={`relative mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-right ${GUTTER}`}>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.22em] text-primary uppercase">
              <BadgeCheck className="size-3.5" />
              Al-Daboor Verified
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
              <span className="shimmer-text">الستريمر الموثقين</span>
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground sm:mx-0 sm:ms-auto">
              بث مكتوم على الكرت · LIVE لمن أونلاين · مرّر عشان يكبّر
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap justify-center gap-2">
            <Button asChild size="sm" className="h-10 px-5 font-extrabold shadow-[0_0_28px_-10px_var(--neon)]">
              <Link to="/contact">اطلب التوثيق</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-10 px-5 font-bold">
              <Link to="/connect">الربط</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className={`w-full overflow-visible ${GUTTER}`}>
        <div className="mb-5 flex w-full flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-primary uppercase">المعرض</p>
            <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">وجوه المنصة</h2>
          </div>
          <p className="max-w-sm text-xs leading-6 text-muted-foreground sm:text-sm">
            LIVE = فاتح بث الآن · OFFLINE = مو أونلاين
          </p>
        </div>

        <div className="grid w-full gap-5 overflow-visible pt-2 pb-6 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 xl:gap-6">
          {VERIFIED.map((s, i) => (
            <Reveal key={s.slug} delay={i * 50} className="h-full overflow-visible">
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

      <section className="relative w-full overflow-hidden border-y border-primary/20 py-10 text-center sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_0%,color-mix(in_oklab,var(--neon)_14%,transparent),transparent_60%)]" />
        <div className={`relative ${GUTTER}`}>
          <Sparkles className="mx-auto size-6 text-primary" />
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">تبي تكون موثّق؟</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
            أرسل رابط قناتك من صفحة التواصل واختر «طلب توثيق ستريمر».
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-11 gap-2 px-6 font-extrabold">
              <Link to="/contact">
                قدّم الآن
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-11 px-5 font-bold text-muted-foreground">
              <Link to="/about">اعرف أكثر</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
