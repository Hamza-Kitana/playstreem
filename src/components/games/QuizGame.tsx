import { useEffect, useState } from "react";
import { AppWindow, Brain, Clock, ListChecks, Plus, Sparkles, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/hooks/useKickChat";
import { DURATION_OPTIONS } from "@/hooks/useGameSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  QUIZ_BANK,
  QUESTION_COUNT_OPTIONS,
  clampQuestionCount,
  loadQuizPack,
  pickQuizSession,
  saveQuizPack,
  type QuizQuestion,
} from "@/lib/quiz-pack";
import QuizOverlayStage from "@/components/games/QuizOverlayStage";

// Quiz accent color — violet
const ACCENT = "#8b5cf6";
const GLOW = "#c084fc";

export default function QuizGame({
  messages,
  chatActive,
}: {
  messages: ChatMessage[];
  chatActive: boolean;
}) {
  const pack = loadQuizPack();
  const [customs, setCustoms] = useState<QuizQuestion[]>([]);
  const [questionCount, setQuestionCount] = useState(() => clampQuestionCount(pack.questionCount || 10));
  const [durationSec, setDurationSec] = useState(pack.durationSec);
  const [draftQ, setDraftQ] = useState("");
  const [draftA, setDraftA] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [streamOpen, setStreamOpen] = useState(false);

  useEffect(() => {
    saveQuizPack({
      ...loadQuizPack(),
      durationSec,
      questionCount,
      questions: loadQuizPack().questions,
      index: loadQuizPack().index,
    });
  }, [durationSec, questionCount]);

  const bankPlusCustom = [...QUIZ_BANK, ...customs];
  const totalLibrary = QUIZ_BANK.length + customs.length;

  const addQuestion = () => {
    if (!draftQ.trim() || !draftA.trim()) return;
    setCustoms((l) => [...l, { q: draftQ.trim(), a: draftA.trim() }]);
    setDraftQ("");
    setDraftA("");
  };

  const removeCustom = (i: number) => {
    setCustoms((l) => l.filter((_, k) => k !== i));
  };

  const openStreamWindow = () => {
    const deck = pickQuizSession(questionCount, bankPlusCustom);
    saveQuizPack({
      questions: deck,
      durationSec,
      questionCount,
      index: 0,
    });
    setStreamOpen(true);
  };

  const durationLabel =
    DURATION_OPTIONS.find((o) => o.value === durationSec)?.label ?? `${durationSec} ث`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-stretch">
      {/* LEFT: Hero + preview info */}
      <div
        className="relative overflow-hidden rounded-[2rem] border p-6 sm:p-8"
        style={{
          borderColor: `${ACCENT}55`,
          background: `
            radial-gradient(120% 90% at 100% 0%, ${ACCENT}33, transparent 55%),
            radial-gradient(90% 100% at 0% 100%, ${GLOW}22, transparent 60%),
            linear-gradient(180deg, oklch(0.16 0.06 300 / 0.85), oklch(0.11 0.05 290 / 0.9))
          `,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 30px 80px -30px ${ACCENT}66`,
        }}
      >
        {/* floating orbs */}
        <div
          className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full opacity-45 blur-3xl"
          style={{ background: ACCENT }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full opacity-30 blur-3xl"
          style={{ background: GLOW }}
        />

        <div className="relative flex h-full flex-col">
          <div className="flex items-center gap-3">
            <span
              className="grid size-14 place-items-center rounded-2xl text-white shadow-[0_20px_50px_-16px_rgba(139,92,246,0.7)]"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})`,
              }}
            >
              <Brain className="size-7" />
            </span>
            <div>
              <span
                className="inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase"
                style={{
                  borderColor: `${ACCENT}66`,
                  color: GLOW,
                  background: `${ACCENT}18`,
                }}
              >
                لعبة تفاعلية
              </span>
              <h3 className="font-brand mt-1 text-2xl font-bold sm:text-3xl">
                نافذة الأسئلة
              </h3>
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-white/70">
            مكتبة {QUIZ_BANK.length} سؤال سهل وصعب. اختر كم سؤال للجلسة، افتح نافذة البث،
            وبعد آخر سؤال تطلع النتيجة النهائية — بدون تكرار.
          </p>

          {/* Stats grid */}
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            <StatBadge icon={<ListChecks className="size-4" />} label="أسئلة" value={String(questionCount)} accent={ACCENT} glow={GLOW} />
            <StatBadge icon={<Clock className="size-4" />} label="لكل سؤال" value={durationLabel} accent={ACCENT} glow={GLOW} />
            <StatBadge icon={<Sparkles className="size-4" />} label="بالمكتبة" value={String(totalLibrary)} accent={ACCENT} glow={GLOW} />
          </div>

          <div className="mt-auto pt-6">
            <Button
              className="h-14 w-full rounded-2xl text-base font-extrabold shadow-[0_20px_60px_-16px_rgba(139,92,246,0.9)] hover:brightness-110"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${GLOW})`,
                color: "white",
              }}
              onClick={openStreamWindow}
              disabled={questionCount < 10}
            >
              <AppWindow className="size-5" />
              افتح نافذة البث ({questionCount} سؤال)
            </Button>

            {!chatActive ? (
              <p className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm font-extrabold text-destructive">
                اربط كيك قبل ما تفتح النافذة
              </p>
            ) : (
              <p className="mt-3 text-center text-xs text-white/50">
                الربط موجود — النافذة بتقرأ الشات مباشرة.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Settings + custom */}
      <div className="glass-strong flex flex-col gap-5 rounded-[2rem] p-6 sm:p-7">
        <div>
          <span
            className="inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase"
            style={{ borderColor: `${ACCENT}55`, color: GLOW, background: `${ACCENT}14` }}
          >
            إعدادات الجلسة
          </span>
          <h4 className="font-brand mt-1 text-xl font-bold">
            اختر عدد الأسئلة والمدة
          </h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-extrabold tracking-wider text-white/60 uppercase">
              عدد الأسئلة
            </span>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(clampQuestionCount(Number(e.target.value)))}
              className="h-12 w-full rounded-2xl border border-white/12 bg-black/30 px-4 text-base font-extrabold text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
            >
              {QUESTION_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} سؤال
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-extrabold tracking-wider text-white/60 uppercase">
              مدة كل سؤال
            </span>
            <select
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="h-12 w-full rounded-2xl border border-white/12 bg-black/30 px-4 text-base font-extrabold text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white">أسئلة إضافية</p>
              <p className="mt-0.5 text-xs text-white/55">
                {customs.length > 0
                  ? `عندك ${customs.length} سؤال إضافي — ينضاف قبل السحب`
                  : "أضف أسئلة خاصة لجلستك"}
              </p>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-10 rounded-xl border-white/15 bg-white/[0.03] font-bold hover:bg-white/[0.08]">
                  <Plus className="size-4" /> إضافة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg border-border/60 bg-background sm:rounded-3xl" dir="rtl">
                <DialogHeader className="text-right">
                  <DialogTitle className="text-xl font-extrabold">أسئلة من عندك</DialogTitle>
                  <DialogDescription className="text-right">
                    المكتبة الجاهزة {QUIZ_BANK.length} سؤال. أي سؤال تضيفه هنا ينضاف للمكتبة قبل السحب.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Input
                    value={draftQ}
                    onChange={(e) => setDraftQ(e.target.value)}
                    placeholder="السؤال"
                    className="h-11 rounded-xl"
                  />
                  <Input
                    value={draftA}
                    onChange={(e) => setDraftA(e.target.value)}
                    placeholder="الإجابة"
                    className="h-11 rounded-xl"
                  />
                  <Button
                    className="w-full rounded-xl font-extrabold"
                    onClick={addQuestion}
                    disabled={!draftQ.trim() || !draftA.trim()}
                  >
                    <Plus className="size-4" /> إضافة
                  </Button>
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-border/50 bg-secondary/30 p-3">
                    {customs.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground">
                        ما في أسئلة إضافية بعد.
                      </p>
                    ) : (
                      customs.map((item, i) => (
                        <div
                          key={`${item.q}-${i}`}
                          className="flex items-start justify-between gap-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-bold">
                              <span className="ml-1 text-primary">{i + 1}.</span>
                              {item.q}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              الجواب: {item.a}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-destructive"
                            onClick={() => removeCustom(i)}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <DialogFooter className="sm:justify-start">
                  <Button variant="secondary" className="rounded-xl font-bold" onClick={() => setAddOpen(false)}>
                    تم
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ul className="mt-auto space-y-1.5 text-[13px] leading-6 text-white/60">
          <li className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
            الجواب الأول من الشات يفوز بالنقطة.
          </li>
          <li className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: GLOW }} />
            يظهر الجواب الصحيح بعد كل سؤال.
          </li>
          <li className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
            النتيجة النهائية تطلع بعد آخر سؤال.
          </li>
        </ul>
      </div>

      <Dialog open={streamOpen} onOpenChange={setStreamOpen}>
        <DialogContent
          className="max-h-[94vh] w-[min(100vw-1.5rem,56rem)] max-w-none gap-0 overflow-hidden border-primary/25 bg-[#070613] p-0 shadow-[0_0_100px_-20px_var(--neon)] sm:rounded-3xl"
          dir="rtl"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">نافذة بث الأسئلة</DialogTitle>
          {streamOpen ? (
            <QuizOverlayStage messages={messages} chatActive={chatActive} variant="modal" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBadge({
  icon,
  label,
  value,
  accent,
  glow,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  glow: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-3 text-center backdrop-blur"
      style={{
        borderColor: `${accent}40`,
        background: `linear-gradient(135deg, ${accent}18, transparent 70%)`,
      }}
    >
      <span
        className="mx-auto grid size-8 place-items-center rounded-xl"
        style={{ background: `${accent}22`, color: glow }}
      >
        {icon}
      </span>
      <p className="mt-1 text-lg font-black leading-none" style={{ color: glow }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-extrabold tracking-wider text-white/50 uppercase">
        {label}
      </p>
    </div>
  );
}
