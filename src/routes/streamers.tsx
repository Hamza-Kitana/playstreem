import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, Shield, Sparkles, Zap } from "lucide-react";
import StreamerCard, { type VerifiedStreamer } from "@/components/StreamerCard";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/streamers")({
  head: () => ({
    meta: [
      { title: "الستريمر الموثقين — Al-Daboor" },
      {
        name: "description",
        content: "تعرّف على الستريمرز الموثقين لدى Al-Daboor، مرّر على الكرت وشاهد بثّهم مباشرة.",
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
    note: "وجه موثّق عند Al-Daboor — مرّر على الكرت وشوف البث لحظياً من كيك.",
  },
  {
    name: "xsybx",
    slug: "xsybx",
    tag: "طاقة لايف",
    hue: 168,
    note: "ستريمر موثّق بطاقة عالية — الهوفر يشغّل معاينة البث مباشرة.",
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
    note: "موثّق لدى Al-Daboor — مرّر على الكرت وشوف البث من كيك، أو اربطه بسرعة.",
  },
];

const HIGHLIGHTS = [
  { icon: BadgeCheck, label: "شارة موثّق ظاهرة للجمهور" },
  { icon: Zap, label: "معاينة بث حي من الكرت" },
  { icon: Shield, label: "أولوية دعم أثناء اللّايف" },
];

function StreamersPage() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  return (
    <div className="space-y-24 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary/20 px-5 py-14 sm:px-10 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 70% at 80% 10%, color-mix(in oklab, var(--neon) 22%, transparent), transparent 55%), radial-gradient(70% 60% at 10% 90%, color-mix(in oklab, var(--neon-2) 16%, transparent), transparent 50%), linear-gradient(160deg, oklch(0.16 0.03 160 / 0.9), oklch(0.1 0.02 200 / 0.95))",
          }}
        />
        <div className="pointer-events-none absolute -top-20 -left-10 size-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 size-72 rounded-full bg-[color-mix(in_oklab,var(--neon-2)_18%,transparent)] blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="font-brand text-sm font-semibold tracking-[0.35em] text-primary uppercase">
            Al-Daboor Verified
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-6xl">
            <span className="shimmer-text">الستريمر الموثقين</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
            نخبة تستخدم المنصة بشكل حقيقي. مرّر على أي كرت — البث يشتغل قدامك مباشرة من كيك.
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

      {/* Gallery */}
      <section>
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">المعرض</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">وجوه المنصة</h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-muted-foreground">
            كرت واحد يشتغل في كل مرة عشان الأداء يبقى نظيف. اضغط أو مرّر للمعاينة، وبعدين اربط بثّك أو زور القناة.
          </p>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-2">
          {VERIFIED.map((s, i) => (
            <Reveal key={s.slug} delay={i * 70}>
              <div
                className={
                  activeSlug && activeSlug !== s.slug
                    ? "h-full opacity-55 transition-opacity duration-500"
                    : "h-full opacity-100 transition-opacity duration-500"
                }
              >
                <StreamerCard
                  streamer={s}
                  active={activeSlug === s.slug}
                  onHoverChange={setActiveSlug}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Apply CTA — one job */}
      <Reveal>
        <section className="relative overflow-hidden rounded-[2rem] border border-primary/25 px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_0%,color-mix(in_oklab,var(--neon)_16%,transparent),transparent_60%)]" />
          <Sparkles className="relative mx-auto size-8 text-primary" />
          <h2 className="relative mt-4 text-3xl font-extrabold sm:text-4xl">تبي تكون موثّق؟</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
            أرسل رابط قناتك من صفحة التواصل واختر نوع الطلب «طلب توثيق ستريمر». ما نطلب آلاف المتابعين —
            نطلب استخدام حقيقي ومحتوى مناسب.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
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
        </section>
      </Reveal>
    </div>
  );
}
