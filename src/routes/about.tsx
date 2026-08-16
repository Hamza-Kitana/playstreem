import { createFileRoute, Link } from "@tanstack/react-router";
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
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — Al-Daboor" },
      {
        name: "description",
        content:
          "تعرّف على Al-Daboor: منصة عربية تحوّل شات كيك إلى ألعاب تفاعلية لحظية للستريمرز والجمهور.",
      },
    ],
  }),
  component: AboutPage,
});

const VALUES = [
  {
    icon: Zap,
    title: "سرعة بدون تعقيد",
    desc: "تربط قناتك بكبسة، وتفتح اللعبة بنفس الجلسة. ما في لوحات إعدادات طويلة تسرق وقت البث.",
  },
  {
    icon: Users,
    title: "الجمهور شريك العرض",
    desc: "كل تعليق يصير تفاعل حقيقي: إجابة، تصويت، أو تقييم — مو مجرد شات يمر سريع.",
  },
  {
    icon: Eye,
    title: "مصمّم للشاشة الثانية",
    desc: "واجهة واضحة وكبيرة تناسب الشاشة جنب OBS، مع حالة اتصال مباشرة تظهر دائماً فوق.",
  },
  {
    icon: Heart,
    title: "عربي من الأساس",
    desc: "الاتجاه، الخطوط، والنصوص مبنية للجمهور العربي — بدون ترجمة مرتبكة أو تجربة معكوسة.",
  },
];

const SERVICES = [
  {
    icon: Brain,
    title: "أسئلة وأجوبة",
    desc: "تطرح سؤالاً، وأول مشاهد يكتب الجواب الصحيح في الشات يفوز بالنقطة ويطلع بالترتيب.",
    to: "/quiz" as const,
  },
  {
    icon: Armchair,
    title: "الكراسي",
    desc: "اكتبوا «دخول»، يلفّ اللاعبون حول الدائرة، تظهر أرقام على الكراسي، ومن ما يلحق يطلع لين يبقى فائز واحد.",
    to: "/seat" as const,
  },
  {
    icon: Flame,
    title: "التصويت",
    desc: "تصويت بأرقام الخيارات من الشات — مع نتائج تتحرك لحظياً.",
    to: "/vote" as const,
  },
  {
    icon: Star,
    title: "تقييم شخص",
    desc: "تدخل اسماً، والمشاهدون يرسلون من ٠ إلى ١٠. الموقع يحسب المتوسط والتوزيع.",
    to: "/rate" as const,
  },
  {
    icon: MessageSquareQuote,
    title: "الجملة",
    desc: "تحدد كلاماً معيّناً، واللي يكتبه بالشات يظهر اسمه بهالة كبيرة على الشاشة.",
    to: "/phrase" as const,
  },
  {
    icon: Flag,
    title: "اعرف العلم",
    desc: "يظهر علم دولة على الشاشة، وأول مشاهد يكتب اسمها صح في الشات يفوز بالنقطة.",
    to: "/flag" as const,
  },
];

const STEPS = [
  "افتح الموقع أثناء البث (يفضّل شاشة ثانية).",
  "من صفحة الربط حط رابط كيك أو اسم القناة واضغط «ربط القناة».",
  "من قائمة الألعاب أو الرئيسية اختار اللعبة اللي تناسب جو البث.",
  "خلّ الجمهور يكتب بالشات وشوف النتائج تتحرك قدامك.",
];

const GUTTER = "px-4 sm:px-8 lg:px-12 xl:px-16";

function AboutPage() {
  return (
    <div className="w-full space-y-20 sm:space-y-24">
      <section className={`w-full ${GUTTER}`}>
        <SectionHeading
          eyebrow="عن المنصة"
          title="من نحن"
          subtitle="Al-Daboor منصة ألعاب تفاعلية للستريمرز على كيك — نجعل الشات يلعب معك، مو بس يتفرج."
        />

        <Reveal>
          <div className="glass neon-ring panel-shine relative w-full overflow-hidden rounded-3xl p-8 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
              <div>
                <p className="font-brand text-sm font-bold tracking-wide text-primary">Al-Daboor · الدبور</p>
                <h3 className="mt-3 text-2xl font-extrabold sm:text-3xl">قصة المنصة باختصار</h3>
                <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">
                  كثير من البثوث فيها شات مليان طاقة، بس التفاعل ينتهي بسرعة. Al-Daboor جاء عشان يحوّل هالتعليقات إلى جزء من المشهد: ألعاب جاهزة، ردود لحظية، وترتيب يظهر قدام الجميع بدون ما تقطع البث أو تروح لتطبيق ثاني معقّد.
                </p>
                <p className="mt-3 max-w-3xl leading-8 text-muted-foreground">
                  بنينا التجربة للستريمر العربي: واجهة RTL، أسماء واضحة، وخدمات من الشريط العلوي توصل للربط أو للألعاب أو لصفحات المنصة بسهولة.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  { k: "٥+", v: "ألعاب أساسية" },
                  { k: "١", v: "حط رابط البث" },
                  { k: "RTL", v: "واجهة عربية" },
                  { k: "Live", v: "شات كيك مباشر" },
                ].map((stat) => (
                  <div key={stat.v} className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
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
          eyebrow="قيمنا"
          title="وش يهمنا؟"
          subtitle="مو بس أدوات — اتجاه واضح لكيف يكون البث التفاعلي أمتع."
        />
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {VALUES.map((item, i) => (
            <Reveal key={item.title} delay={i * 60}>
              <div className="glass panel-shine h-full rounded-3xl p-6">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <item.icon className="size-6" />
                </span>
                <h3 className="mt-4 text-xl font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`w-full ${GUTTER}`}>
        <SectionHeading
          eyebrow="الألعاب"
          title="وش تسوي المنصة؟"
          subtitle="كل لعبة لها صفحة مستقلة — من الرئيسية أو من قائمة الألعاب بالشريط."
        />
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((item, i) => (
            <Reveal key={item.title} delay={i * 60}>
              <Link
                to={item.to}
                className="group block h-full rounded-3xl border border-white/10 bg-[#121c1a] p-6 transition hover:border-primary/50"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary transition group-hover:bg-primary/20">
                  <item.icon className="size-6" />
                </span>
                <h3 className="mt-4 text-xl font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.desc}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`w-full ${GUTTER}`}>
        <SectionHeading
          eyebrow="طريقة الاستخدام"
          title="كيف تشتغل معنا أثناء البث؟"
          subtitle="أربع خطوات واضحة — من فتح الموقع لنهاية الجولة."
        />
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, i) => (
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
            <h3 className="relative mt-4 text-2xl font-extrabold sm:text-3xl">جاهز تجرب Al-Daboor؟</h3>
            <p className="relative mx-auto mt-3 max-w-lg text-muted-foreground">
              اربط قناتك الآن، أو شوف الستريمرز الموثقين، أو راسلنا لو تبي شراكة أو توثيق.
            </p>
            <div className="relative mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild className="h-12 px-7 font-extrabold">
                <Link to="/connect">
                  <PlugZap className="size-4" />
                  ابدأ الربط
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 px-7 font-bold">
                <Link to="/streamers">
                  <Sparkles className="size-4" />
                  الستريمر الموثقين
                </Link>
              </Button>
              <Button asChild variant="ghost" className="h-12 px-7 font-bold">
                <Link to="/contact">
                  <Gamepad2 className="size-4" />
                  تواصل معنا
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
