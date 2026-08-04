import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  BadgeCheck,
  Clock3,
  Headphones,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — Al-Daboor" },
      {
        name: "description",
        content: "تواصل مع فريق Al-Daboor للدعم، الاقتراحات، الشراكات، أو طلب توثيق ستريمر.",
      },
    ],
  }),
  component: ContactPage,
});

const TOPICS = [
  "دعم فني / مشكلة بالربط",
  "اقتراح لعبة أو ميزة",
  "طلب توثيق ستريمر",
  "شراكة أو تعاون",
  "استفسار عام",
];

const CHANNELS = [
  {
    icon: Mail,
    title: "الإيميل الرسمي",
    body: "للاستفسارات المفصّلة وطلبات التوثيق والشراكات.",
    value: "hello@al-daboor.com",
    href: "mailto:hello@al-daboor.com",
  },
  {
    icon: MessageCircle,
    title: "النموذج السريع",
    body: "أرسل من الصفحة هذي ونوصل لك الرسالة مباشرة للفريق.",
    value: "رد خلال يوم إلى يومين عادةً",
  },
  {
    icon: Headphones,
    title: "دعم أثناء البث",
    body: "لو عندك عطل وأنت لايف، اكتب «عاجل» في بداية الرسالة عشان نرفع أولويتها.",
    value: "أفضل وقت: مساءً بتوقيت الخليج",
  },
];

const GUTTER = "px-4 sm:px-8 lg:px-12 xl:px-16";

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]!);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSent(true);
  };

  return (
    <div className="w-full space-y-16 sm:space-y-20">
      <section className={`w-full ${GUTTER}`}>
        <SectionHeading
          eyebrow="نحن قريبين"
          title="تواصل معنا"
          subtitle="جاهزين نسمعك: دعم الربط، أفكار الألعاب، طلبات التوثيق، أو أي استفسار عن Al-Daboor."
        />

        <div className="grid w-full gap-4 md:grid-cols-3">
          {CHANNELS.map((c, i) => (
            <Reveal key={c.title} delay={i * 60}>
              <div className="glass panel-shine h-full rounded-3xl p-6 lg:p-8">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <c.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold">{c.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{c.body}</p>
                {c.href ? (
                  <a
                    href={c.href}
                    className="mt-3 inline-block text-sm font-bold text-primary hover:underline"
                    dir="ltr"
                  >
                    {c.value}
                  </a>
                ) : (
                  <p className="mt-3 text-sm font-bold text-foreground">{c.value}</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={`w-full ${GUTTER}`}>
        <div className="grid w-full gap-5 lg:grid-cols-2 xl:gap-8">
          <Reveal>
            <div className="glass panel-shine h-full space-y-5 rounded-3xl p-6 sm:p-8">
              <h3 className="text-xl font-extrabold">قبل ما تراسلنا</h3>
              <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  لو عندك مشكلة ربط: اذكر اسم قناة كيك وشو الرسالة اللي طلعت عندك.
                </li>
                <li className="flex gap-3">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  لطلب التوثيق: أرسل رابط قناتك + نبذة قصيرة عن نوع البث وعدد المشاهدين التقريبي.
                </li>
                <li className="flex gap-3">
                  <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" />
                  نحاول نرد خلال ٢٤–٤٨ ساعة. الرسائل العاجلة أثناء البث تأخذ أولوية أعلى.
                </li>
              </ul>

              <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
                تبي تشوف كيف المنصة تشتغل أولاً؟
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="font-bold">
                    <Link to="/about">من نحن</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="font-bold">
                    <Link to="/connect">صفحة الربط</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <form onSubmit={submit} className="glass panel-shine h-full space-y-4 rounded-3xl p-6 sm:p-8">
              {sent ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <p className="text-2xl font-extrabold text-primary">وصلت رسالتك</p>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                    شكراً لتواصلك مع Al-Daboor. حفظنا موضوعك ({topic}) وبنراجعها ونرجع لك قريباً.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-7 font-bold"
                    onClick={() => {
                      setSent(false);
                      setName("");
                      setEmail("");
                      setMessage("");
                      setTopic(TOPICS[0]!);
                    }}
                  >
                    إرسال رسالة ثانية
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-extrabold">أرسل رسالة</h3>
                    <p className="mt-1 text-sm text-muted-foreground">كل الحقول المهمة واضحة — نقرأ كل رسالة.</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold">الاسم</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اسمك أو اسم قناتك"
                      className="h-11"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold">الإيميل (للتواصل معك)</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="h-11"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold">نوع الطلب</label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="border-input bg-background focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
                    >
                      {TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold">رسالتك</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="اكتب التفاصيل: المشكلة، الفكرة، أو رابط قناتك…"
                      required
                      rows={6}
                      className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
                    />
                  </div>

                  <Button type="submit" className="h-12 w-full font-extrabold">
                    <Send className="size-4" />
                    إرسال الرسالة
                  </Button>
                </>
              )}
            </form>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
