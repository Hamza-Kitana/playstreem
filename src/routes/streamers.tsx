import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Gamepad2,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import StreamerCard, { type VerifiedStreamer } from "@/components/StreamerCard";
import { Reveal, SectionHeading } from "@/components/Reveal";
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
    note: "ستريمر موثّق لدى Al-Daboor — مرّر على الكرت لمشاهدة البث مباشرة من كيك.",
  },
  {
    name: "xsybx",
    slug: "xsybx",
    note: "ستريمر موثّق لدى Al-Daboor — مرّر على الكرت لمشاهدة البث مباشرة من كيك.",
  },
  {
    name: "sarfndi-m",
    slug: "sarfndi-m",
    note: "ستريمر موثّق لدى Al-Daboor — مرّر على الكرت لمشاهدة البث مباشرة من كيك.",
  },
];

const BENEFITS = [
  {
    icon: BadgeCheck,
    title: "شارة موثّق",
    desc: "ظهور في صفحة الستريمر الموثقين مع رابط قناتك ومعاينة البث.",
  },
  {
    icon: Users,
    title: "وصول لجمهور جديد",
    desc: "الناس اللي تتصفح المنصة يشوفونك كستريمر معتمد ويقدرون يدخلون بثّك من الكرت.",
  },
  {
    icon: Gamepad2,
    title: "أولوية الدعم",
    desc: "الموثقين يحصلون على أولوية أعلى لو صار عطل بالربط أثناء البث.",
  },
  {
    icon: Sparkles,
    title: "تجربة مبكرة",
    desc: "دعوة لتجربة الميزات الجديدة قبل طرحها للعموم كلما أمكن.",
  },
];

const REQUIREMENTS = [
  "قناة Kick نشطة تبث بشكل منتظم (ولو عدد المتابعين صغير).",
  "استخدام Al-Daboor فعلياً في بث واحد على الأقل أو نية واضحة للاستخدام.",
  "محتوى مناسب للعائلات أو مجتمع واضح بدون مخالفات صارخة.",
  "إرسال رابط القناة + نبذة قصيرة عبر صفحة تواصل معنا (نوع الطلب: توثيق).",
];

function StreamersPage() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  return (
    <div className="space-y-20">
      <section>
        <SectionHeading
          eyebrow="شركاؤنا"
          title="الستريمر الموثقين لدينا"
          subtitle="مرّر الماوس على أي كرت عشان يشتغل البث مباشرة. ولو تبي تنضم للقائمة، التقديم من صفحة التواصل."
        />

        <Reveal>
          <div className="glass neon-ring panel-shine mb-8 rounded-3xl p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Shield className="size-6" />
              </span>
              <div>
                <h3 className="text-xl font-extrabold">وش يعني ستريمر موثّق؟</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  التوثيق عندنا يعني ظهورك بهالصفحة مع معاينة بث حي عند الهوفر، ورابط مباشر لقناتك على كيك،
                  ودعم أوضح لو احتجت مساعدة وأنت لايف.
                </p>
              </div>
            </div>
            <Button asChild className="mt-5 shrink-0 font-extrabold sm:mt-0">
              <Link to="/contact">اطلب التوثيق</Link>
            </Button>
          </div>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-3">
          {VERIFIED.map((s, i) => (
            <Reveal key={s.slug} delay={i * 70}>
              <StreamerCard
                streamer={s}
                active={activeSlug === s.slug}
                onHoverChange={setActiveSlug}
              />
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="مميزات التوثيق"
          title="ليش تصير موثّق؟"
          subtitle="فوائد عملية للستريمر اللي يستخدم المنصة بشكل منتظم."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 50}>
              <div className="glass panel-shine h-full rounded-3xl p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <b.icon className="size-5" />
                </span>
                <h3 className="mt-3 font-extrabold">{b.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="شروط بسيطة"
          title="كيف تنضم للقائمة؟"
          subtitle="ما نطلب آلاف المتابعين — نطلب استخدام حقيقي ومحتوى مناسب."
        />
        <div className="mx-auto max-w-3xl space-y-3">
          {REQUIREMENTS.map((item, i) => (
            <Reveal key={item} delay={i * 40}>
              <div className="glass flex items-start gap-3 rounded-2xl p-4 sm:p-5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm leading-7 text-muted-foreground">{item}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 text-center">
          <div className="glass neon-ring panel-shine mx-auto max-w-xl rounded-3xl p-8">
            <h3 className="text-2xl font-extrabold">جاهز للتقديم؟</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              من صفحة التواصل اختر نوع الطلب «طلب توثيق ستريمر» وأرسل رابط قناتك.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild className="h-11 px-6 font-extrabold">
                <Link to="/contact">تواصل معنا</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-6 font-bold">
                <Link to="/about">اقرأ عن المنصة</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
