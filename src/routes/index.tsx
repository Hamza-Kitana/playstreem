import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Armchair, BarChart3, Brain, Flame, Plug, Sparkles, Star } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { useScrollY } from "@/hooks/useReveal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Al-Daboor — ألعاب تفاعلية مع شات كيك" },
      {
        name: "description",
        content:
          "Al-Daboor منصة ألعاب تفاعلية للبث على كيك: أسئلة وأجوبة، كرسي الاعتراف، التصويت، وتقييم الأشخاص — يقودها الشات لحظياً.",
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: Brain,
    title: "أسئلة وأجوبة",
    desc: "أول من يكتب الجواب الصحيح بالشات يأخذ النقطة.",
    to: "/quiz" as const,
  },
  {
    icon: Armchair,
    title: "كرسي الاعتراف",
    desc: "اختيار عشوائي للجالس وأسئلة الجمهور مباشرة.",
    to: "/seat" as const,
  },
  {
    icon: BarChart3,
    title: "التصويت",
    desc: "نتائج تتحرك لحظياً مع كل تصويت من الشات.",
    to: "/vote" as const,
  },
  {
    icon: Star,
    title: "تقييم شخص",
    desc: "متوسط وتوزيع التقييمات من 0 إلى 10.",
    to: "/rate" as const,
  },
  {
    icon: Flame,
    title: "تفاعل لايف",
    desc: "الشات يحرّك النتائج قدام الجمهور بدون تأخير.",
    to: "/vote" as const,
  },
  {
    icon: Sparkles,
    title: "خلفية ثلاثية الأبعاد",
    desc: "تتفاعل مع السكرول والماوس أثناء التنقل.",
    to: "/connect" as const,
  },
];

const STEPS = [
  {
    n: "١",
    title: "اربط قناتك",
    desc: "من صفحة الربط حط رابط قناتك أو اسمها، أو جرّب الوضع التجريبي.",
  },
  {
    n: "٢",
    title: "اختر اللعبة",
    desc: "من الشريط العلوي افتح «الخدمات» ثم الأسئلة، الكرسي، التصويت، أو التقييم.",
  },
  {
    n: "٣",
    title: "خلي الشات يلعب",
    desc: "المشاهدون يكتبون في الشات والموقع يقرأ التعليقات تلقائياً.",
  },
];

function Index() {
  const y = useScrollY();

  const heroStyle = useMemo(
    () => ({
      transform: `translateY(${y * 0.18}px) scale(${Math.max(1 - y * 0.00035, 0.88)})`,
      opacity: Math.max(1 - y / 680, 0),
    }),
    [y],
  );

  return (
    <>
      <section className="relative flex min-h-[86vh] flex-col items-center justify-center text-center">
        <div className="pointer-events-none absolute inset-x-0 top-1/4 -z-0 mx-auto h-72 max-w-3xl rounded-full bg-primary/10 blur-[90px]" />
        <div style={heroStyle} className="relative flex flex-col items-center">
          <BrandLogo size="hero" asLink={false} />
          <h1 className="sr-only">Al-Daboor</h1>
          <p className="mx-auto mt-8 max-w-lg text-base text-muted-foreground sm:text-lg">
            حوّل تعليقات بثّك على كيك إلى ألعاب تفاعلية لحظية — أسئلة، كرسي، تصويت، وتقييم.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-12 px-8 text-base font-extrabold shadow-[0_0_40px_-8px_var(--neon)]">
              <Link to="/connect">ابدأ الربط</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 border-primary/25 bg-white/3 px-8 text-base backdrop-blur">
              <a href="#how">كيف تستخدمه؟</a>
            </Button>
          </div>
        </div>
        <div className="absolute bottom-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <span>مرّر للأسفل</span>
          <span className="h-10 w-px animate-pulse bg-gradient-to-b from-primary to-transparent" />
        </div>
      </section>

      <section id="how" className="mt-6 scroll-mt-28">
        <SectionHeading
          eyebrow="تعليمات سريعة"
          title="كيف يشتغل Al-Daboor؟"
          subtitle="ثلاث خطوات فقط وتشعلل البث."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="glass panel-shine h-full rounded-3xl p-6">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-xl font-extrabold text-primary">
                  {s.n}
                </span>
                <h3 className="mt-4 text-xl font-extrabold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <SectionHeading
          eyebrow="ألعاب الدبور"
          title="المميزات والألعاب"
          subtitle="كل رابط يوديك لصفحة مستقلة من الشريط فوق."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <Link
                to={f.to}
                className="tilt-card glass panel-shine group block h-full rounded-3xl p-6 transition hover:border-primary/35"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary transition group-hover:bg-primary/20">
                  <f.icon className="size-6" />
                </span>
                <h3 className="mt-4 text-xl font-extrabold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal className="mt-24">
        <div className="glass neon-ring panel-shine relative overflow-hidden rounded-3xl p-10 text-center">
          <div className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <Plug className="relative mx-auto size-10 text-primary" />
          <h3 className="relative mt-4 text-3xl font-extrabold sm:text-4xl">
            جاهز تشعلل مع <span className="shimmer-text font-brand">Al-Daboor</span>؟
          </h3>
          <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
            اربط قناتك أولاً من صفحة الربط، بعدين روح لأي لعبة من الشريط فوق.
          </p>
          <Button asChild className="relative mt-6 h-12 px-8 text-base font-extrabold">
            <Link to="/connect">صفحة الربط</Link>
          </Button>
        </div>
      </Reveal>
    </>
  );
}
