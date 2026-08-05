import { useEffect, useState } from "react";
import { AppWindow, Plus, Trash2 } from "lucide-react";
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
      // keep deck until open; just persist preferences
      questions: loadQuizPack().questions,
      index: loadQuizPack().index,
    });
  }, [durationSec, questionCount]);

  const bankPlusCustom = [...QUIZ_BANK, ...customs];

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

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="glass rounded-3xl border border-primary/20 p-6 text-center sm:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-[0_0_40px_-8px_var(--neon)]">
          <AppWindow className="size-7" />
        </div>
        <h3 className="mt-4 text-2xl font-extrabold">نافذة الأسئلة</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
          مكتبة فيها {QUIZ_BANK.length} سؤال (سهلة وصعبة). اختر كم سؤال للجلسة، وبعد آخر سؤال تطلع النتيجة النهائية — بدون إعادة.
        </p>

        <div className="mx-auto mt-6 max-w-sm space-y-3 text-right">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground">عدد أسئلة الجلسة</span>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(clampQuestionCount(Number(e.target.value)))}
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm font-bold"
            >
              {QUESTION_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} سؤال
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground">مدة كل سؤال (من برّا النافذة)</span>
            <select
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm font-bold"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-12 font-bold">
                <Plus className="size-4" /> أسئلة إضافية ({customs.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-border/60 bg-background sm:rounded-3xl" dir="rtl">
              <DialogHeader className="text-right">
                <DialogTitle className="text-xl font-extrabold">أسئلة من عندك</DialogTitle>
                <DialogDescription className="text-right">
                  المكتبة الجاهزة {QUIZ_BANK.length} سؤال. أي سؤال تضيفه هنا ينضاف للمكتبة قبل السحب العشوائي.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Input
                  value={draftQ}
                  onChange={(e) => setDraftQ(e.target.value)}
                  placeholder="السؤال"
                  className="h-11"
                />
                <Input
                  value={draftA}
                  onChange={(e) => setDraftA(e.target.value)}
                  placeholder="الإجابة"
                  className="h-11"
                />
                <Button
                  className="w-full font-extrabold"
                  onClick={addQuestion}
                  disabled={!draftQ.trim() || !draftA.trim()}
                >
                  <Plus className="size-4" /> إضافة
                </Button>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-border/50 bg-secondary/30 p-3">
                  {customs.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground">ما في أسئلة إضافية بعد.</p>
                  ) : (
                    customs.map((item, i) => (
                      <div key={`${item.q}-${i}`} className="flex items-start justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-bold">
                            <span className="ml-1 text-primary">{i + 1}.</span>
                            {item.q}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">الجواب: {item.a}</p>
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
                <Button variant="secondary" className="font-bold" onClick={() => setAddOpen(false)}>
                  تم
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            className="h-12 px-8 font-extrabold shadow-[0_0_40px_-10px_var(--neon)]"
            onClick={openStreamWindow}
            disabled={questionCount < 10}
          >
            <AppWindow className="size-4" /> فتح نافذة البث ({questionCount})
          </Button>
        </div>

        {!chatActive ? (
          <p className="mt-4 text-sm font-bold text-destructive">اربط كيك قبل ما تفتح النافذة.</p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">الربط موجود — النافذة بتقرأ الشات مباشرة.</p>
        )}
      </div>

      <Dialog open={streamOpen} onOpenChange={setStreamOpen}>
        <DialogContent
          className="max-h-[94vh] w-[min(100vw-1.5rem,56rem)] max-w-none gap-0 overflow-hidden border-primary/25 bg-[#070d0c] p-0 shadow-[0_0_80px_-20px_var(--neon)] sm:rounded-3xl"
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
