import { useEffect, useState } from "react";
import {
  Armchair,
  BarChart3,
  Brain,
  Flag,
  Gamepad2,
  MessageSquareQuote,
  Plug,
  Puzzle,
  Skull,
  Sparkles,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGuide } from "@/contexts/GuideContext";
import { Link } from "@tanstack/react-router";

const STEPS = [
  {
    icon: Sparkles,
    title: "مرحباً في Al-Daboor",
    body: "منصة ألعاب تفاعلية للبث على كيك. الشات يقرأ تعليقات المشاهدين ويشغّل الألعاب لحظياً — وأنت تتحكم من المتصفح (شاشة ثانية مثالية).",
  },
  {
    icon: Plug,
    title: "أولاً: اربط القناة",
    body: "من صفحة «الربط» حط رابط بثك من كيك (أو اسم القناة) واضغط «ربط القناة». تقدر كمان تلصق من الحافظة، أو تفتح /connect?channel=اسمك.",
  },
  {
    icon: Gamepad2,
    title: "ثانياً: اختر اللعبة",
    body: "من الشريط العلوي افتح «الألعاب» أو من الرئيسية اختار الكرت: أسئلة، كراسي، التصويت، تقييم، الجملة، اعرف العلم، الألغاز، أو شوتر الزومبي.",
  },
  {
    icon: Brain,
    title: "أسئلة وأجوبة",
    body: "تفتح جولة، والمشاهد يكتب الجواب بالنص في الشات. أول إجابة صحيحة تفوز بالنقطة وتطلع في الترتيب.",
  },
  {
    icon: Armchair,
    title: "الكراسي",
    body: "المشاهد يكتب «دخول» لينضم. اللاعبون يلفّون حول دائرة وفي جواها كراسي. لما يوقفوا تظهر أرقام عشوائية، وأول من يكتب الرقم في الشات ياخذ الكرسي. اللي ما يلحق يطلع، والجولات تكمل لين يفوز واحد.",
  },
  {
    icon: BarChart3,
    title: "التصويت",
    body: "المشاهد يكتب نص الخيار (نعم، لا…) أو رقمه (١، ٢، ٣…) في الشات، والنتائج تتحرك لحظياً — صوت واحد لكل مستخدم.",
  },
  {
    icon: Star,
    title: "تقييم شخص",
    body: "تكتب اسم الشخص، والمشاهد يرسل رقم من ٠ إلى ١٠ في الشات. الموقع يحسب المتوسط والتوزيع تلقائياً.",
  },
  {
    icon: MessageSquareQuote,
    title: "الجملة",
    body: "الستريمر يكتب كلمة سرية ما بتطلع على الشاشة. الجمهور يخمنها في الشات، واللي يصيب يطلع اسمه بهالة كبيرة.",
  },
  {
    icon: Flag,
    title: "اعرف العلم",
    body: "يطلع علم دولة على الشاشة. الجمهور يخمن بالشات، وأول جواب صحيح يفوز. فيه ٢٠ علم سهلة وصعبة بدون تكرار لين تخلص الجولة.",
  },
  {
    icon: Puzzle,
    title: "الألغاز",
    body: "تطلع أحجية تحتاج تفكير. الحل مخفي عن الشاشة، والجمهور يخمن في الشات. تقدر تفتح تلميح أو تشوف الحل أنت بس. أول إصابة تفوز.",
  },
  {
    icon: Skull,
    title: "شوتر الزومبي",
    body: "ماب مغلقة للستريمر. المشاهد يكتب «زومبي» فينزل زومبي، وكل عدد تعليقات تختاره ينزل وحش كبير. هدايا كيك (٥٠/١٠٠) تنزّل وحوش إضافية. إذا مات الستريمر، يظهر أبطال الشات.",
  },
];

export default function WelcomeGuide() {
  const { open, closeGuide } = useGuide();
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const finish = () => {
    setStep(0);
    closeGuide(true);
  };

  const onOpenChange = (next: boolean) => {
    if (!next) finish();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass z-[90] max-h-[90vh] max-w-lg overflow-y-auto border-primary/25 p-0 sm:rounded-3xl [&>button]:left-4 [&>button]:right-auto">
        <div className="relative overflow-hidden px-6 pt-6 pb-5">
          <div className="pointer-events-none absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

          <DialogHeader className="relative space-y-3 text-center sm:text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Icon className="size-7" />
            </span>
            <DialogTitle className="font-display text-2xl font-extrabold">
              {current.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-muted-foreground sm:text-base">
              {current.body}
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-6 flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`خطوة ${i + 1}`}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-7 bg-primary" : "w-1.5 bg-secondary hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>

          <p className="relative mt-3 text-center text-xs font-bold text-muted-foreground">
            {step + 1} / {STEPS.length}
          </p>

          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={finish}
            >
              تخطّي
            </Button>

            <div className="flex gap-2">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  السابق
                </Button>
              ) : null}

              {last ? (
                <Button asChild className="font-extrabold">
                  <Link to="/connect" onClick={finish}>
                    ابدأ الربط
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="font-extrabold"
                  onClick={() => setStep((s) => s + 1)}
                >
                  التالي
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
