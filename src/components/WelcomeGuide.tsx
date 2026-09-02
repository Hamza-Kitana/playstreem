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
import { useT } from "@/contexts/LocaleContext";
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

const STEPS_EN = [
  {
    icon: Sparkles,
    title: "Welcome to Al-Daboor",
    body: "Interactive games for Kick streams. Chat reads viewer messages and runs games in real time — you control everything from the browser (great for a second screen).",
  },
  {
    icon: Plug,
    title: "First: connect your channel",
    body: "On the Connect page, paste your Kick stream link (or channel name) and hit Connect. You can paste from clipboard or open /connect?channel=yourname.",
  },
  {
    icon: Gamepad2,
    title: "Second: pick a game",
    body: "Open Games from the top bar or choose a card on the home page: Quiz, Chairs, Poll, Rate, Secret Word, Flags, Riddles, or Zombie Shooter.",
  },
  {
    icon: Brain,
    title: "Quiz & Answers",
    body: "Start a round and viewers type answers in chat. The first correct answer wins the point and appears on the leaderboard.",
  },
  {
    icon: Armchair,
    title: "Musical Chairs",
    body: "Viewers type «join» to enter. Players spin around chairs — when it stops, random numbers appear and the first to type their number claims a seat. One leaves each round until a winner remains.",
  },
  {
    icon: BarChart3,
    title: "Live Poll",
    body: "Viewers vote by typing the option text (yes, no…) or its number (1, 2, 3…) in chat. Results update live — one vote per user.",
  },
  {
    icon: Star,
    title: "Rate a Person",
    body: "Enter a person's name and viewers send a number from 0 to 10 in chat. The site calculates the average and distribution automatically.",
  },
  {
    icon: MessageSquareQuote,
    title: "Secret Word",
    body: "The streamer types a secret word that stays hidden on screen. The audience guesses in chat — correct guesses get highlighted.",
  },
  {
    icon: Flag,
    title: "Name the Flag",
    body: "A country flag appears on screen. Chat guesses the country name — first correct answer wins. 20 flags, no repeats until the round ends.",
  },
  {
    icon: Puzzle,
    title: "Riddles",
    body: "A brain teaser appears — the answer stays hidden. Chat guesses; you can reveal a hint or the answer (streamer only). First correct guess wins.",
  },
  {
    icon: Skull,
    title: "Zombie Shooter",
    body: "A closed map for the streamer. Viewers type «zombie» to spawn enemies; every N messages spawns a big boss. Kick gifts (50/100) spawn extra monsters. If the streamer dies, chat heroes are shown.",
  },
];

export default function WelcomeGuide() {
  const { open, closeGuide } = useGuide();
  const { messages, locale } = useT();
  const steps = locale === "en" ? STEPS_EN : STEPS;
  const [step, setStep] = useState(0);
  const current = steps[step]!;
  const Icon = current.icon;
  const last = step === steps.length - 1;

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
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${messages.guide.stepAria} ${i + 1}`}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-7 bg-primary" : "w-1.5 bg-secondary hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>

          <p className="relative mt-3 text-center text-xs font-bold text-muted-foreground">
            {step + 1} / {steps.length}
          </p>

          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={finish}
            >
              {messages.guide.skip}
            </Button>

            <div className="flex gap-2">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  {messages.guide.prev}
                </Button>
              ) : null}

              {last ? (
                <Button asChild className="font-extrabold">
                  <Link to="/connect" onClick={finish}>
                    {messages.guide.startConnect}
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="font-extrabold"
                  onClick={() => setStep((s) => s + 1)}
                >
                  {messages.guide.next}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
